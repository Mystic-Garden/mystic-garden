'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { BidsQueryDocument, BidsQueryQuery, execute } from '../.graphclient';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfiles, profileId, ProfileId } from '@lens-protocol/react-web';

const AuctionBids = ({ auctionId, auctionStatus, winningBid, winnerProfileId }) => {
  const [data, setData] = useState<BidsQueryQuery>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [profileIds, setProfileIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchBids = async () => {
      const publicationId = auctionId.split('-');
      const profileIdBigInt = BigInt(publicationId[0]);
      const collectedPubIdBigInt = BigInt(publicationId[1]);
      try {
        const result = await execute(BidsQueryDocument, { profileId: String(profileIdBigInt), pubId: String(collectedPubIdBigInt) });
        setData(result.data);
        const ids = result.data.bidPlaceds.map(bid => {
          let hexId = BigInt(bid.bidderProfileId).toString(16);
          if (hexId.length % 2 !== 0) { 
            hexId = '0' + hexId; 
          }
          return '0x' + hexId; 
        });
        setProfileIds(ids);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBids();
  }, [auctionId]);

  const { data: profilesData, loading: profilesLoading, error: profilesError } = useProfiles({
    where: { profileIds: profileIds.length > 0 ? profileIds.map(id => profileId(id)) : ['0x00' as ProfileId]}
  });

  if (loading || profilesLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (profilesError) return <p>Error: {profilesError.message}</p>;

  const profilesMap = profilesData?.reduce((map, profile) => {
    map[Number(profile.id)] = profile;
    return map;
  }, {}) || {};

  const sortedBids = data?.bidPlaceds.slice().sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="">
      <div className="grid gap-4">
        {auctionStatus === "Auction ended, pending collection" || auctionStatus === "Art collected" ? (
          <div className="flex items-center gap-4 p-2 border border-emerald-500 rounded-md">
            <Avatar>
              <AvatarImage src={profilesMap[Number(winnerProfileId)]?.metadata?.picture?.optimized?.uri || "/images/placeholder-avatar.jpeg"} />
              <AvatarFallback>{profilesMap[Number(winnerProfileId)]?.handle?.localName.slice(-2) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{profilesMap[Number(winnerProfileId)]?.handle?.localName + ' won the auction' || 'Auction won'}</p>
              <p className="text-xs text-muted-foreground">
                &middot; <span className="text-base font-bold ml-auto">{winningBid} BONSAI</span>
              </p>
            </div>
          </div>
        ) : null}
        {profileIds.length === 0 ? (
          <p>There are no bids yet.</p>
        ) : (
          sortedBids && sortedBids.map((bid) => {
            const profile = profilesMap[bid.bidderProfileId];
            return (
              <div key={bid.id} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={profile?.metadata?.picture?.optimized?.uri || "/images/placeholder-avatar.jpeg"} />
                  <AvatarFallback>{profile?.handle?.localName.slice(-2) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{profile?.handle?.localName + ' placed a bid' || 'Bid placed'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(bid.timestamp * 1000).toLocaleString()} &middot; <span className="text-base font-bold ml-auto">{bid.amount / 1000000000000000000} BONSAI</span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AuctionBids;
