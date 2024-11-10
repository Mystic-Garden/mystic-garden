'use client';

import React, { useState, useEffect } from 'react';
import { Post, PublicationReactionType, useCreateMirror, useCreateQuote, useLastLoggedInProfile, usePublication, useSession } from '@lens-protocol/react-web';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useOpenAction, OpenActionKind } from '@lens-protocol/react-web';
import { useAccount } from 'wagmi';
import Link from "next/link";
import { getTitle, getPostSellType, getProfileAvatarImageUri, isVerifiedProfile } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { FALLBACK_IMAGE_URL, LIKE_AWARD, MIRROR_AWARD } from '../../constants';
import AuctionComponent from '../../../components/AuctionComponent';
import { awardPoints } from '@/lib/utils';
import { COLLECT_PERCENT_AWARD, BONSAI_ADDRESS } from '@/app/constants';
import { useReadErc20Allowance, useReadErc721OwnerOf, useWriteErc20Approve } from '@/src/generated';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { Address } from 'viem';
import ReactPlayer from 'react-player';
import { getChainId, switchChain, getBalance } from '@wagmi/core';
import { wagmiConfig } from '@/app/web3modal-provider';
import { PublicationId } from '@lens-protocol/metadata';
import { getSimpleOrMultirecipientFeeCollectOpenActionModule } from '@/lib/publicationUtils';
import { PrimaryPublication, useReactionToggle } from '@lens-protocol/react-web';
import { Heart, Share, ArrowLeftRight, MessageSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import QuoteModal from '@/components/QuoteModal';

function getMediaSource(post: Post): { type: 'image' | 'video' | 'audio' | 'text', src: string, cover?: string } | null {
  if (!post?.metadata) {
    return null;
  }

  switch (post.metadata.__typename) {
    case 'AudioMetadataV3':
      return {
        type: 'audio',
        src: post.metadata.asset?.audio?.optimized?.uri || FALLBACK_IMAGE_URL,
        cover: post.metadata.asset?.cover?.optimized?.uri || FALLBACK_IMAGE_URL
      };
    case 'VideoMetadataV3':
      return { type: 'video', src: post.metadata.asset?.video?.optimized?.uri || FALLBACK_IMAGE_URL };
    case 'ImageMetadataV3':
      return { type: 'image', src: post.metadata.asset?.image?.optimized?.uri || FALLBACK_IMAGE_URL };
    default:
      return { type: 'text', src: FALLBACK_IMAGE_URL };
  }
}

function GalleryPostDetails({ id}: { id: PublicationId }) {
  const fallbackImage = '/images/fallback-image.png';
  const CHAIN_ID = process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ? polygon.id : polygonAmoy.id;

  
  const [isCollected, setIsCollected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaleEnded, setIsSaleEnded] = useState(false);
  const { address } = useAccount();
  const { data: sessionData } = useSession();
  const [moduleAddress, setModuleAddress] = useState<Address | undefined>(undefined);
  const walletAddress = sessionData?.authenticated ? sessionData.address : undefined;
  const requiredChainId = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? polygon.id : polygonAmoy.id;
  const { data, error, loading } = usePublication({ forId: id });
  const post = data as Post;
  const { execute: toggle, loading: reactionLoading, error: reactionError } = useReactionToggle();
  const { execute: createQuote, loading: quoteLoading, error: quoteError } = useCreateQuote();
  const { execute: createMirror, loading: mirrorLoading, error: mirrorError } = useCreateMirror();
  const [showShareOptions, setShowShareOptions] = useState(false); // State to control share options
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const collectModule = getSimpleOrMultirecipientFeeCollectOpenActionModule(post);
  const nftAddress = collectModule?.collectNft;

  const { data: nftOwnerAddress, error: nftOwnerError, isLoading: isOwnerLoading } = useReadErc721OwnerOf({
    args: [BigInt(1)],
    address: collectModule?.collectNft ? collectModule.collectNft : '',
    chainId: requiredChainId,
  });

  //todo: melhorar essa implementação, pois fica dando erro 400
  const { data: ownerProfile, error: profileError, loading: isProfileLoading } = useLastLoggedInProfile({ for: nftOwnerAddress || "0x1234567890123456789012345678901234567890" });

  const { execute } = useOpenAction({
    action: {
      kind: OpenActionKind.COLLECT,
    },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadErc20Allowance({
    address: BONSAI_ADDRESS,
    chainId: CHAIN_ID,
    args: [walletAddress as Address, moduleAddress as Address]
  });

  const { writeContractAsync } = useWriteErc20Approve();

  const checkAndApproveAllowance = async () => {

    if (!allowance || allowance < BigInt((postPrice + 1) * (10 ** 18))) {

      try {
        const tx = await writeContractAsync({
          address: BONSAI_ADDRESS,
          chainId: CHAIN_ID,
          args: [moduleAddress as Address, BigInt((postPrice + 1) * (10 ** 18))]
        });
      } catch (error) {
        console.error("Failed to approve allowance:", error);
        window.alert("Failed to approve allowance.");
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (post && post.__typename === 'Post' && post?.stats.collects > 0) {
      setIsCollected(true);
    }

    if (post && post.openActionModules) {
      for (let actionModule of post.openActionModules) {
        if (
          actionModule.__typename === "SimpleCollectOpenActionSettings" ||
          actionModule.__typename === "MultirecipientFeeCollectOpenActionSettings"
        ) {
          setModuleAddress(actionModule.contract.address as Address);
          const endsAt = actionModule.endsAt;
          if (endsAt && new Date(endsAt) < new Date()) {
            setIsSaleEnded(true);
            break;
          }
        }
      }
    }
  }, [post]);

  const collect = async () => {
    if (!address) {
      alert('Connect your wallet first');
      return;
    } else if (!sessionData?.authenticated) {
      alert('Login first');
      return;
    }
    if (!post) {
      alert('Post is undefined');
      return;
    }

    const currentChainId = getChainId(wagmiConfig);
    if (currentChainId !== requiredChainId)
      await switchChain(wagmiConfig, { chainId: requiredChainId });

    const allowanceApproved = await checkAndApproveAllowance();
    if (!allowanceApproved) return;

    const result = await execute({ publication: post });

    if (result.isFailure()) {
      alert('There was an error broadcasting the transaction: ' + result.error.message);
      setIsLoading(false);
      return;
    }

    const completion = await result.value.waitForCompletion();

    if (completion.isFailure()) {
      throw new Error(completion.error.message || 'There was an error processing the transaction');
    }

    setIsCollected(true);
    setIsLoading(false);

    if (completion.isSuccess()) {
      if (sessionData?.address != post.by.ownedBy.address) {
        awardPoints(sessionData?.address, COLLECT_PERCENT_AWARD * postPrice, 'Collect (Buyer)', null);
        awardPoints(post.by.ownedBy.address, COLLECT_PERCENT_AWARD * postPrice, 'Collect (Seller)', null);
      } else {
        awardPoints(post.by.ownedBy.address, 0, 'Try selling to someone else =)', null);
      }
    }

    alert('Post collected!');
  };

  const postTitle = getTitle(post);

  let postPrice: number = 0;
  if (post && post.openActionModules) {
    for (let actionModule of post.openActionModules) {
      if (actionModule.__typename === "SimpleCollectOpenActionSettings" || actionModule.__typename === "MultirecipientFeeCollectOpenActionSettings" && Number(actionModule.amount.value) > 0) {
        postPrice = Math.floor(Number(actionModule.amount.value));
        break;
      }
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Post not found!</div>;

  const formattedPrice = postPrice ? ` ${postPrice} BONSAI` : 'Not for sale';

  const mediaSource = getMediaSource(post);

  const displayName = post?.by?.metadata?.displayName || 'Unknown Artist';
  const handleName = post?.by?.handle?.localName || 'unknown';

  const profilePictureUri = post?.by?.metadata?.picture?.__typename === 'ImageSet' 
    ? post.by.metadata.picture.optimized?.uri 
    : post.by?.metadata?.picture?.__typename === 'NftImage' 
    ? post.by.metadata.picture.image?.optimized?.uri 
    : '/placeholder-avatar.jpg';

  const content = post.metadata.__typename !== 'EventMetadataV3' 
    ? post.metadata.content
    : "";

  const sellType = getPostSellType(post);

  const handleLike = async () => {
    const isUpvote = !post.operations.hasUpvoted;

    const result = await toggle({
      reaction: PublicationReactionType.Upvote,
      publication: post,
    });

    if(result.isSuccess() && sessionData?.authenticated && isUpvote) {
      const awardUniqueId = `${sessionData?.address}-${post.id}`; //the user will only receive points once per liked post
      awardPoints(sessionData?.address, LIKE_AWARD, 'Like', awardUniqueId);
    }
  };

  const handleQuoteClick = () => {
    setShowShareOptions(false);
    setShowQuoteModal(true);
  };

  const handleMirrorClick = async () => {
    setShowShareOptions(false);
    const result = await createMirror({
      mirrorOn: post.id,
    });

    if (result.isFailure()) {
      window.alert(result.error.message);
      return;
    }

    if(sessionData?.authenticated) {
      const awardUniqueId = `${sessionData?.address}-${post.id}`; //the user will only receive points once per mirrored post
      awardPoints(sessionData?.address, MIRROR_AWARD, 'Mirror', awardUniqueId);
    }

    window.alert("Mirrored successfully!");
  };

  console.log("Post operations", post.operations);
  console.log("Session Type", sessionData?.type);
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto py-12 px-4 md:px-6 mt-20">
      <div className="md:col-span-2 flex flex-col gap-4 md:sticky md:top-24">
          {(mediaSource?.type === 'image' || mediaSource?.type === 'text') && (
            <img src={mediaSource.src || fallbackImage} alt="NFT Image" className="rounded-sm object-cover aspect-square" />
          )}
          {mediaSource?.type === 'video' && (
            <ReactPlayer url={mediaSource.src} controls playing muted width='100%'
            height='auto' className="rounded-sm object-cover" />
          )}
          {mediaSource?.type === 'audio' && (
            <div className="flex flex-col items-center">
              <img src={mediaSource?.cover || '/images/fallback-image.jpg'} alt="Cover" className="rounded-sm object-cover aspect-square" />
              <ReactPlayer height='50px' width='100%' url={mediaSource.src} controls className="w-full" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Link href={`/${handleName}`}>
              <Avatar>
                <AvatarImage alt={displayName} src={profilePictureUri} />
                <AvatarFallback>{handleName.slice(0, 2)}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <h3 className="text-lg font-semibold">{displayName}</h3>
              <p className="text-gray-500 dark:text-gray-400">{"@" + handleName}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">{postTitle}</h1>
            <ReactMarkdown className="text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
              {content || 'This NFT is a unique digital artwork created by the artist.'}
            </ReactMarkdown>
          </div>
          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={reactionLoading || !sessionData?.authenticated}
                className="flex items-center gap-2"
              >
                <Heart className={`w-5 h-5 ${post.operations.hasUpvoted ? 'fill-current text-red-500' : ''}`} />
                {post?.stats.upvotes || 0}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={mirrorLoading || quoteLoading || !sessionData?.authenticated} 
                  className="flex items-center gap-2">
                    <ArrowLeftRight className={`${post.operations.hasMirrored ? 'fill-current text-red-500' : ''}  w-5 h-5`} />
                    Share
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2">
                <button onClick={handleQuoteClick} className="flex block w-full text-left text-sm px-4 py-1 hover:bg-gray-200"><MessageSquare className='w-5 h-5 pr-2'/> Quote</button>
                <button onClick={handleMirrorClick} className="flex block w-full text-left text-sm px-4 py-1 hover:bg-gray-200"><ArrowLeftRight className='w-5 h-5 pr-2'/> Mirror</button>
                </PopoverContent>
            </Popover>
            <QuoteModal
              isOpen={showQuoteModal}
              onClose={() => setShowQuoteModal(false)}
              postId={id}
            />
            </div>
            <Separator className="my-2" />
            {sellType === 'buy_now' && (
              <div>
  <div className="grid mb-4">
    <div>
      <h3 className="text-s">
        {ownerProfile || nftOwnerAddress ? "Last Sold" : "List Price"}: 
        <span className="text-xl font-semibold">{formattedPrice}</span>
      </h3>
    </div>
  </div>
  <Button className='rounded-sm w-full' onClick={collect} disabled={isCollected || isLoading || isSaleEnded || !sessionData?.authenticated}>
                  {isLoading ? 'Loading...' : !sessionData?.authenticated ? 'Login to Lens First.' : isCollected ? 'Sold Out' : isSaleEnded ? 'Sale Ended' : 'BUY NOW'}
                </Button>
  <div className="mt-4">
    {ownerProfile ? (
      <>
          <h3 className="text-base font-semibold">Current Owner</h3>
      <div className="flex items-center mt-2">
        <Link className="flex items-center mt-2" href={`/${ownerProfile.handle?.localName}`}>
        <Avatar className="w-8 h-8">
          <AvatarImage src={getProfileAvatarImageUri(ownerProfile)} />
          <AvatarFallback>{ownerProfile.handle?.localName.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="ml-2">{ownerProfile.handle?.localName}</div>
        </Link>
      </div>
       <h3 className="text-base font-semibold mb-2 mt-4">On-Chain Data</h3>
       <div className="text-sm">
         <a href={`https://opensea.io/assets/matic/${nftAddress}/1`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
           View on OpenSea
         </a>
       </div>
       </>
      
    ) : nftOwnerAddress ? (
      <>
      <h3 className="text-base font-semibold">Current Owner</h3>
      <div className="flex items-center mt-2">
        <a href={`https://opensea.io/${nftOwnerAddress}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {nftOwnerAddress.slice(0, 8)}
        </a>
      </div>
      </>
    ) : (
<></>
    )}
  </div>
</div>

            )}
            {sellType === 'auction' && (
              <AuctionComponent post={post} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default GalleryPostDetails;
