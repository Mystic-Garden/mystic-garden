import { AUCTION_OPEN_ACTION_MODULE_ADDRESS, BONSAI_ADDRESS, CURRENT_CHAIN_ID } from "@/app/constants";
import { auctionsOaAbi, auctionsOaAddress, erc721Abi } from "@/src/generated";
import { createConfig, http, readContract } from "@wagmi/core";
import { polygon, polygonAmoy } from "wagmi/chains";
import { parseFromLensHex } from "./utils";
import { getAuctions, getAuctionsByProfile } from "@/app/api/lensGraphql";
import { AuctionStatus } from "@/app/types/auction";
import { AxiosError } from "axios";
import { fallback } from "@wagmi/core";

const config = createConfig({
  chains: [polygonAmoy, polygon],
  transports: {
    [polygon.id]: fallback([
      http('https://polygon.llamarpc.com'),
      http('https://polygon.meowrpc.com'),
      http('https://polygon-pokt.nodies.app'),
      http('https://polygon-bor-rpc.publicnode.com'),
    ]),
    [polygonAmoy.id]: fallback([
      http('https://rpc-amoy.polygon.technology'),
    ]),
  },
});

const auctionAddress = process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ? auctionsOaAddress[137] : auctionsOaAddress[80001];
const requiredChainId = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? polygon.id : polygonAmoy.id;

export async function getAdditionalAuctionData(profileId, publicationId) {
  try {
    const auctionData = await readContract(config, {
      address: auctionAddress,
      abi: auctionsOaAbi,
      functionName: 'getAuctionData',
      args: [profileId, publicationId],
      chainId: requiredChainId,
    });

    if (!auctionData) {
      return null;
    }

    const collectNFTAddress = await readContract(config, {
      address: auctionAddress,
      abi: auctionsOaAbi,
      functionName: 'getCollectNFT',
      args: [profileId, publicationId],
      chainId: requiredChainId,
    });

    let auctionStatus = determineAuctionStatus(auctionData);

    // Check if collectAddress is the zero address
    if (collectNFTAddress === '0x0000000000000000000000000000000000000000') {
      return { ...auctionData, collectNFTAddress, owner: null, status: auctionStatus };
    }

    const ownerOf = await readContract(config, {
      address: collectNFTAddress,
      abi: erc721Abi,
      functionName: 'ownerOf',
      args: [BigInt(1)],
      chainId: requiredChainId,
    });

    auctionStatus = determineAuctionStatus(auctionData);

    // Convert BigInt to string if necessary
    const convertedResult = {
      ...Object.fromEntries(
        Object.entries(auctionData).map(([key, value]) =>
          typeof value === 'bigint' ? [key, value.toString()] : [key, value]
        )
      ),
      collectNFTAddress,
      ownerOf,
      status: auctionStatus,
      winnerProfileId: auctionData.winnerProfileId,
    };

    return convertedResult;
  } catch (error) {
    console.error('Error fetching additional auction data:', error);
    return null;
  }
}

// Simple in-memory cache
const auctionDataCache = new Map<string, any>();

// Utility function to delay execution (basic rate limiting)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAdditionalAuctionDataWithRetries(profileId: bigint, publicationId: bigint, retries = 3) {
  const cacheKey = `${profileId}-${publicationId}`;
  
  // Check cache first
  if (auctionDataCache.has(cacheKey)) {
    return auctionDataCache.get(cacheKey);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const additionalData = await getAdditionalAuctionData(profileId, publicationId);

      // Cache the result
      auctionDataCache.set(cacheKey, additionalData);
      
      return additionalData;
    } catch (error) {
      if (isAxiosError(error) && error.response && error.response.status === 429) {
        console.warn(`Rate limit exceeded. Retrying attempt ${attempt + 1}...`);
        await delay(500 * (attempt + 1)); 
      } else {
        throw error; // If it's not a rate limit error, rethrow it
      }
    }
  }

  throw new Error('Failed to fetch additional auction data after multiple retries');
}

// Type guard to check if error is an AxiosError
function isAxiosError(error: any): error is AxiosError {
  return error.isAxiosError === true;
}

export async function getAllAuctions(cursor: string | null = null) {
  try {
    const auctions = await getAuctions(cursor);
    const auctionsData = auctions.publications.items;
    const nextCursor = auctions.publications.pageInfo.next;

    let auctionsWithAdditionalData = await Promise.all(
      auctionsData.map(async (auction) => {
        const { profileId, publicationId } = parseFromLensHex(auction.id);

        // Call the function with retry and caching
        const additionalData = await getAdditionalAuctionDataWithRetries(profileId, publicationId);
        
        return { ...auction, ...additionalData };
      })
    );

    // Filter out auctions where currency is not equal to the specified address
    auctionsWithAdditionalData = auctionsWithAdditionalData.filter(
      (auction) => auction.currency === BONSAI_ADDRESS
    );

    return { auctions: auctionsWithAdditionalData, nextCursor };
  } catch (error) {
    console.error('Error fetching auctions:', error);
    return { auctions: null, nextCursor: null };
  }
}


function determineAuctionStatus(auction): AuctionStatus {
  const currentTime = Math.floor(Date.now() / 1000);
  const availableSinceTimestamp = parseInt(auction.availableSinceTimestamp);
  const startTimestamp = parseInt(auction.startTimestamp);
  const endTimestamp = parseInt(auction.endTimestamp);

  if (currentTime < availableSinceTimestamp) {
    return AuctionStatus.NOT_STARTED;
  }

  if (parseInt(auction.startTimestamp) === 0) {
    return AuctionStatus.AVAILABLE;  // Auction hasn't started yet
  }

  if (currentTime >= startTimestamp && currentTime <= endTimestamp) {
    return AuctionStatus.LIVE_AUCTION; 
  }

  if (currentTime > endTimestamp) {
    if (BigInt(auction.winnerProfileId) !== 0n && !auction.collected) {
      return AuctionStatus.PENDING_SETTLEMENT;
    }

    if (auction.collected) {
      return AuctionStatus.COLLECTED;
    }
  }

  return AuctionStatus.NOT_STARTED;
}

// Utility function to fetch auctions by creator and enrich them with additional auction data
export async function getAuctionsByCreator(profileId: string) {
  try {
    if (!profileId) {
      throw new Error('No profileId provided.');
    }

    // Fetch auctions by profile
    const auctions = await getAuctionsByProfile(profileId);
    const auctionsData = auctions.publications.items;

    // Enrich each auction with additional data from the contract
    let auctionsWithAdditionalData = await Promise.all(
      auctionsData.map(async (auction) => {
        const { profileId: parsedProfileId, publicationId } = parseFromLensHex(auction.id);
        const additionalData = await getAdditionalAuctionData(parsedProfileId, publicationId);
        return { ...auction, ...additionalData };
      })
    );

    // Filter auctions by BONSAI_ADDRESS (currency)
    auctionsWithAdditionalData = auctionsWithAdditionalData.filter(
      (auction) => auction.currency === BONSAI_ADDRESS
    );

    return {
      message: 'Auctions fetched successfully',
      data: auctionsWithAdditionalData,
    };
  } catch (error) {
    console.error('Error fetching auctions:', error);
    throw new Error('Failed to fetch auctions.');
  }
}