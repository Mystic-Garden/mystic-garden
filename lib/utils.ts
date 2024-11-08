import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  image,
  video,
  audio,
  article,
  MediaImageMimeType,
  MediaAudioMimeType,
  MediaVideoMimeType,
} from '@lens-protocol/metadata';
import { OpenActionModuleType, Post, Profile } from '@lens-protocol/react-web';
import { AUCTION_OPEN_ACTION_MODULE_ADDRESS, GENESIS_ARTIST_PROFILE_IDS, VERIFIED_ARTIST_PROFILE_IDS, WEBSITE_THUMBNAIL } from '@/app/constants'; // Import the array of curated profile IDs
import { FALLBACK_IMAGE_URL } from "@/app/constants";
import { getChainId, switchChain } from "@wagmi/core";
import { wagmiConfig } from "@/app/web3modal-provider";
import { polygon, polygonAmoy } from "wagmi/chains";
import { ThirdwebStorage } from "@thirdweb-dev/storage";
import { createThirdwebClient } from "thirdweb";
import { upload } from "thirdweb/storage";
import { AuctionWithPublicationId } from "@/app/types/auction";
import {UnknownOpenActionModuleSettings} from "@lens-protocol/react-web";
import { UploadableFile } from "thirdweb/dist/types/storage/upload/types";

const requiredChainId = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? polygon.id : polygonAmoy.id;
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per chunk

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MAX_TITLE_LENGTH = 50; // Set a maximum title length

export const getTitle = (publication) => {
  if (!publication || !publication.metadata) {
    return 'Untitled';
  }

  const title = publication.metadata.marketplace?.name;
  const description = publication.metadata.content;

  if (title && !title.toLowerCase().startsWith("image by") && !title.toLowerCase().startsWith("video by") && !title.toLowerCase().startsWith("post by") && !title.toLowerCase().startsWith("text by") && !title.toLowerCase().startsWith("audio by")) {
    return truncateText(title, MAX_TITLE_LENGTH);
  }

  if (description) {
    const firstLine = description.split('\n')[0];
    return truncateText(firstLine, MAX_TITLE_LENGTH);
  }

  return 'Untitled';
};

const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text;
};

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/uploadFile', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    const data = await response.json();
    return data.ipfsUri;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    return '';
  }
};

export const uploadBigFile = async (file: File): Promise<string> => {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('totalChunks', String(totalChunks));
    formData.append('fileName', file.name);

    try {
      const response = await fetch('/api/uploadChunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex} upload failed`);
      }
    } catch (error) {
      console.error(`Error uploading chunk ${chunkIndex}:`, error);
      return '';
    }
  }

  try {
    const response = await fetch('/api/completeUpload', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('File upload completion failed');
    }

    const data = await response.json();
    return data.ipfsUri;
  } catch (error) {
    console.error('Error completing file upload:', error);
    return '';
  }
};

export const uploadData = async (metadata: any): Promise<string> => {
  //todo: substituir log de erro por toast de erro com interrupção
  try {
    const response = await fetch('/api/uploadMetadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.receiptId;
  } catch (error) {
    console.error('Error uploading data:', error);
  }

  return '';
};

export const createMetadata = (fileUrl: string, title: string, description: string, file?: File, coverUrl?: string) => {
  const commonMetadata = {
    title: title,
    content: description,
    appId: 'mysticgarden',
    marketplace: {
      name: title,
      description: description,
      external_url: "https://mysticgarden.xyz",  //colocar url pra página do artista
      image: fileUrl,
      animation_url: ""
    },
  };

  if (!file) {
    return article({
      ...commonMetadata,
      content: description,
    });
  }

  const extension = file?.name?.split('.')?.pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return image({
        ...commonMetadata,
        image: {
          item: fileUrl,
          type: file.type as MediaImageMimeType,
        },
      });
    case 'mp4':
    case 'mkv':
    case 'mov': 
    case 'avi':
      return video({
        ...commonMetadata,
        marketplace: {
          ...commonMetadata.marketplace,
          animation_url: fileUrl,
          image: coverUrl || fileUrl,
        },
        video: {
          item: fileUrl,
          type: file.type as MediaVideoMimeType,
          cover: coverUrl,
        },
      });
    case 'mp3':
    case 'wav':
    case 'flac':
      return audio({
        ...commonMetadata,
        marketplace: {
          ...commonMetadata.marketplace,
          animation_url: fileUrl,
          image: coverUrl || fileUrl,
        },
        audio: {
          item: fileUrl,
          type: file.type as MediaAudioMimeType,
          cover: coverUrl,
        },
      });
    default:
      return article({
        ...commonMetadata,
        content: description,       
      });
  }
};

export function getPostSellType(post: Post): 'auction' | 'buy_now' | 'none' {

  if (!post.openActionModules || post.openActionModules.length === 0) {
    return 'none';
  }

  const openActionModule = post.openActionModules[0];

  if (openActionModule.type === OpenActionModuleType.UnknownOpenActionModule && openActionModule.contract.address === AUCTION_OPEN_ACTION_MODULE_ADDRESS) {
    return 'auction';
  }

  if (
    openActionModule.__typename === 'SimpleCollectOpenActionSettings' ||
    openActionModule.__typename === 'MultirecipientFeeCollectOpenActionSettings'
  ) {
    return 'buy_now';
  }

  return 'none';
}

/**
 * Converts BigInt profileId and publicationId to hex format string.
 * 
 * @param profileId - The BigInt profileId.
 * @param publicationId - The BigInt publicationId.
 * @returns The concatenated hex format string of profileId and publicationId.
 */
export function formatToLensHex(profileId: bigint, publicationId: bigint): string {
  const profileIdHex = convertProfileIdToHex(profileId.toString());
  const publicationIdHex = convertProfileIdToHex(publicationId.toString());

  return `${profileIdHex}-${publicationIdHex}`;
}

/**
 * Converts a hex format string to BigInt profileId and publicationId.
 * 
 * @param hexString - The hex format string.
 * @returns An object containing the BigInt profileId and publicationId.
 */
export function parseFromLensHex(hexString: string): { profileId: bigint; publicationId: bigint } {
  const [profileIdHex, publicationIdHex] = hexString.split('-');

  const profileId = BigInt(profileIdHex);
  const publicationId = BigInt(publicationIdHex);

  return { profileId, publicationId };
}

export const awardPoints = async (userWallet, points, event , uniqueId): Promise<string> => {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "production")
    return '';

  try {
    const response = await fetch('/api/awardPoints', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          userWallet: userWallet,
          points: points, 
          event: event,
          uniqueId: uniqueId
      }),
  });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.receiptId;
  } catch (error) {
    console.error('Error uploading data:', error);
  }

  return '';
};

/**
 * Checks if the given profile ID is curated.
 * 
 * @param profileId - The profile ID to check.
 * @returns {boolean} - True if the profile is curated, false otherwise.
 */
export function isVerifiedProfile(profileId: string): boolean {
  return VERIFIED_ARTIST_PROFILE_IDS.includes(profileId);
}

export function isGenesisDropArtist(profileId: string): boolean {
  return GENESIS_ARTIST_PROFILE_IDS.includes(profileId);
}

export function getPublicationAsset(post: Post) {
  if (!post.metadata) {
    return { type: 'text', src: FALLBACK_IMAGE_URL };
  }

  switch (post.metadata.__typename) {
    case 'AudioMetadataV3':
      return { 
        type: 'audio', 
        src: post.metadata.asset?.audio?.optimized?.uri || FALLBACK_IMAGE_URL,
        cover: post.metadata.asset?.cover?.optimized?.uri || FALLBACK_IMAGE_URL
      };
    case 'VideoMetadataV3':
      return { type: 'video', 
              src: post.metadata.asset?.video?.optimized?.uri,
              cover: post.metadata.asset?.cover?.optimized?.uri || FALLBACK_IMAGE_URL };
    case 'ImageMetadataV3':
      return { type: 'image', src: post.metadata.asset?.image?.optimized?.uri || FALLBACK_IMAGE_URL,
        cover: post.metadata.asset?.image?.optimized?.uri
       };
    default:
      return { type: 'text', src: FALLBACK_IMAGE_URL, cover: FALLBACK_IMAGE_URL };
  }
}

export async function validateChainId() {
const currentChainId = getChainId(wagmiConfig);
    if (currentChainId !== requiredChainId) 
      {
        await switchChain(wagmiConfig, { chainId: requiredChainId });
      }
  }

  export function getCurrentRequiredChainId() {
    return requiredChainId;
  }

  export const uploadFileFront_old = async (file: File): Promise<string> => {

        if (!file) {
            return '';
        }

        const fileBuffer = Buffer.from(await (file as Blob).arrayBuffer())

        const storage = new ThirdwebStorage({
            clientId: "225aae9221a0837de48f5618d4aa0c3c",
            secretKey: "a-_e7NohBSIu7ZdZe19YJcTvX0TgrERp7bC-AVC6ioRODdXTyx-m0Al1LsfuiZ3m40h3YbgWcY1ENKseigghyA",
        });

        const ipfsUri = await storage.upload(fileBuffer);
        return ipfsUri;
  };

  //esse método estava dando erros com .mov e arquivos grandes. Usar o uploadFile que chama a API.
  export const uploadFileFront = async (file: File): Promise<string> => {
    if (!file) {
      return '';
    }
  
    try {
        const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "225aae9221a0837de48f5618d4aa0c3c";
    
        const client = createThirdwebClient({
          clientId: clientId,
        });
    
        console.log('Uploading file:', file.name, 'size:', file.size);
    
        const uploadPromise = upload({
          client,
          files: [file],
        });
        
        console.log('NON MEMINIT');
        const uris = await uploadPromise;
    
        console.log("Upload successful, URIs:", uris);
    
        if (Array.isArray(uris)) {
          return uris[0];
        } else {
          return uris;
        }
    } catch (error) {
        console.error("Error during file upload:", error);
        throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  

  export const convertProfileIdToHex = (profileId: string): string => {
    let hexId = BigInt(profileId).toString(16);
    if (hexId.length % 2 !== 0) { 
      hexId = '0' + hexId; 
    }
    return '0x' + hexId;
  };


  export const getProfileAvatarImageUri = (profile: Profile | undefined ) => {
    if(!profile) {
      return '/images/placeholder-avatar.jpeg';
    }

    const profilePictureUri = profile?.metadata?.picture?.__typename === 'ImageSet' 
    ? profile?.metadata.picture.optimized?.uri 
    : profile?.metadata?.picture?.__typename === 'NftImage' 
    ? profile.metadata.picture.image?.optimized?.uri 
    : '/images/placeholder-avatar.jpeg';

    return profilePictureUri;
  };

  export function getPostMediaSource(post: Post): { type: 'image' | 'video' | 'audio' | 'text', src: string, cover: string } {
    if (!post?.metadata) {
      return { type: 'text', src: FALLBACK_IMAGE_URL, cover: FALLBACK_IMAGE_URL }; //todo: pensar se precisa colocar um tipo "desconhecido"
    }
  
    switch (post.metadata.__typename) {
      case 'AudioMetadataV3':
        return {
          type: 'audio',
          src: post.metadata.asset?.audio?.optimized?.uri || FALLBACK_IMAGE_URL,
          cover: post.metadata.asset?.cover?.optimized?.uri || FALLBACK_IMAGE_URL
        };
      case 'VideoMetadataV3':
        return { type: 'video', src: post.metadata.asset?.video?.optimized?.uri || FALLBACK_IMAGE_URL, cover: post.metadata.asset?.cover?.optimized?.uri || WEBSITE_THUMBNAIL };
      case 'ImageMetadataV3':
        return { type: 'image', src: post.metadata.asset?.image?.optimized?.uri || FALLBACK_IMAGE_URL, cover: post.metadata.asset?.image?.optimized?.uri || FALLBACK_IMAGE_URL };
      default:
        return { type: 'text', src: FALLBACK_IMAGE_URL, cover: FALLBACK_IMAGE_URL };
    }
  }

  export function getAuctionMediaSource(auction: AuctionWithPublicationId): { type: 'image' | 'video' | 'audio' | 'text', src: string, cover: string } {
    if (!auction?.metadata) {
      return { type: 'text', src: FALLBACK_IMAGE_URL, cover: FALLBACK_IMAGE_URL }; //todo: pensar se precisa colocar um tipo "desconhecido"
    }
  
    const isVideo = !!auction.metadata.asset.video?.optimized?.uri;
    const isAudio = !!auction.metadata.asset.audio?.optimized?.uri;
    const isImage = !!auction.metadata.asset.image?.optimized?.uri;
    const coverUrl = auction.metadata.asset.cover?.optimized?.uri || WEBSITE_THUMBNAIL;  //todo: pensar um cover melhor

    if (isVideo) {
      const videoUrl = auction.metadata.asset.video?.optimized?.uri || FALLBACK_IMAGE_URL;
      return { type: 'video', src: videoUrl, cover: coverUrl };
    } 
    else if (isAudio) {
      const audioUrl = auction.metadata.asset.audio?.optimized?.uri || FALLBACK_IMAGE_URL;
      return { type: 'audio', src: audioUrl, cover: coverUrl };
    } 
    else if (isImage) {
      const imageUrl = auction.metadata.asset.image?.optimized?.uri || FALLBACK_IMAGE_URL;
      return { type: 'image', src: imageUrl, cover: imageUrl };
    } 
    else {
      return { type: 'text', src: FALLBACK_IMAGE_URL, cover: coverUrl };
    }

  }

  export function getProfileName(profile: Profile) {
    return profile?.metadata?.displayName ||
      profile?.handle?.suggestedFormatted.localName ||
      profile?.handle?.localName ||
      profile?.id.toString();
  }

  export function splitIntoChunks(arr: string[], chunkSize: number): string[][] {
    const result: string[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }