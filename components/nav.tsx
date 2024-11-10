'use client';

import { Button } from '@/components/ui/button';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect } from 'wagmi';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModeToggle } from '@/components/dropdown';
import { ChevronRight, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import SearchProfiles from './searchProfiles';
import MysticIcon from './mysticIcon';
import { Input } from "@/components/ui/input"
import ProfileSelectDialog from './ProfileSelectDialog';
import { useSession, useLogin, useLogout, useProfilesManaged, ProfileId } from '@lens-protocol/react-web';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from './ui/navigation-menu';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import ShineBorder from './magicui/shine-border';

export function Nav() {
  const { open } = useWeb3Modal();
  const { address, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const pathname = usePathname();
  const { execute: exLogout } = useLogout();
  const { data: sessionData } = useSession();
  const [openSearch, setOpenSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { execute: exLogin, data: loginData } = useLogin();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const login = useCallback((profileId: ProfileId) => {
    if (!address) {
      alert('Address is not defined');
      return;
    }
    exLogin({
      address: address,
      profileId: profileId,
    }).then(() => {
    }).catch(error => {
      console.error('Login failed:', error);
    });
  }, [address, exLogin]);

  const logout = useCallback(() => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    exLogout().then(() => {
      setIsDialogOpen(false);
      setLogoutLoading(false);
    }).catch(error => {
      console.error('Logout failed:', error);
      setLogoutLoading(false);
    });
  }, [exLogout, logoutLoading]);

  useEffect(() => {
    if ((sessionData?.authenticated && !address) || (sessionData?.authenticated && sessionData?.address !== address)) {
      logout();
    }
  }, [address, sessionData, logout]);

  return (
    <>
      {/* Donation Callout 
      <div className="w-full bg-purple-900 text-white text-center p-2 fixed top-0 z-50">
        Support our magical space! <a href="https://explorer.gitcoin.co/#/round/42161/608/123" target="_blank" rel="noopener noreferrer" className="underline">Donate on Gitcoin</a>
      </div>
     >>> change the top-0 to top-10 from the section bellow when using the message above  */}
      {/* Navigation Bar */}
      <nav className="w-full fixed top-0 left-0 z-40 shadow-md bg-white/80 dark:bg-neutral-950/70">
        <div className="container flex flex-col md:flex-row items-center justify-between py-3">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="flex items-center" prefetch={false}>
                <MysticIcon className="h-8 w-8" />
                <p className={`ml-2 mr-4 text-lg font-semibold`}>Mystic Garden</p>
              </Link>
              <ul className="hidden md:flex items-center gap-6">
                <li><Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Home</Link></li>
                <li><Link href="/drops/mystic" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Mystic Drop</Link></li>
                <li><Link href="/explore" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Buy Now</Link></li>
                <li><Link href="/auctions" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Auctions</Link></li>
                <li><Link href="/gallery/mint" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Create New</Link></li>
              </ul>
            </div>
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon"><MenuIcon className="h-6 w-6" /></Button>
                </SheetTrigger>
                <SheetContent side="top" className="w-full">
                  <div className="flex flex-col gap-4 p-4">
                    <SearchProfiles />
                    <ul className="flex flex-col gap-2">
                      <li><Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Home</Link></li>
                      <li><Link href="/explore" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Buy Now</Link></li>
                      <li><Link href="/auctions" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Auctions</Link></li>
                      <li><Link href="/gallery/mint" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Create New</Link></li>
                      <li><Link href="/drops/mystic" className="hover:text-gray-700 dark:hover:text-gray-300" prefetch={false}>Mystic Drop</Link></li>
                    </ul>
                    {address ? (
                      sessionData?.authenticated ? (
                        <AvatarMenu sessionData={sessionData} logout={logout} />
                      ) : (
                        <ProfileSelectDialog address={address} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
                      )
                    ) : <w3m-button />}
                    <ModeToggle />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0 hidden md:flex">
            {address ? (
              <>
                {sessionData?.authenticated ? (
                  <AvatarMenu sessionData={sessionData} logout={logout} />
                ) : (
                  <ProfileSelectDialog address={address} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
                )}
              </>
            ) : <w3m-button />}
            <SearchProfiles />
            <ModeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}

function MenuIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function AvatarMenu({ sessionData, logout }) {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={sessionData.profile?.metadata?.picture?.__typename === 'ImageSet' ? sessionData.profile.metadata.picture.optimized?.uri : undefined}
                alt={sessionData.profile?.handle?.localName}
              />
              <AvatarFallback>{sessionData.profile?.handle?.localName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="ml-2">{sessionData.profile?.handle?.localName}</span>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuItem asChild><w3m-button /></NavigationMenuItem>
            <NavigationMenuItem asChild className="min-w-32">
              <NavigationMenuLink asChild>
                <Link href="/profile" className="group grid h-auto w-full items-center justify-start gap-1 rounded-md p-4 text-sm font-medium transition-colors">My Profile</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem asChild>
              <NavigationMenuLink asChild>
                <Button onClick={logout} variant="ghost" className="group grid h-auto w-full items-center justify-start gap-1 rounded-md p-4 text-sm font-medium transition-colors">Logout</Button>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
