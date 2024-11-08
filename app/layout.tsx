import './globals.css';
import { ThemeProvider } from "@/app/theme-provider";
import { LensProvider } from '@/app/lens-provider';
import { Web3ModalProvider } from '@/app/web3modal-provider';
import { Nav } from '@/components/nav';
import { raleway, lato } from './fonts';
import  Footer  from '@/components/footer';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import dotenv from 'dotenv';
import { Metadata } from 'next';
import LensAuthWrapper from './lensAuthWrapper';

export const metadata: Metadata = {
  title: {
    template: 'Mystic Garden | %s ',
    default: 'Mystic Garden',
  },
  description: 'Mystic Garden is the first Lens-native platform for exclusive 1/1 art from curated artists.',
  keywords: ['NFT', 'Crypto Art', 'Digital Art', 'Lens Protocol', 'Lens NFT', 'Mystic Garden'],
  metadataBase: new URL('https://www.mysticgarden.xyz/'),
};

export default function Layout({ children }) {
  dotenv.config(); 
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-KW68FHBG');`}} />
      <noscript dangerouslySetInnerHTML={{__html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KW68FHBG" height="0" width="0" style="display:none;visibility:hidden;"></iframe>`}} />
      </head>
      <body className={`${lato.className}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Web3ModalProvider>
            <LensProvider>
              <LensAuthWrapper>
                <Nav />
                {children}
                <Footer />
              </LensAuthWrapper>
            </LensProvider>
          </Web3ModalProvider>
        </ThemeProvider>
        <SpeedInsights/>
        <Analytics/>
      </body>
    </html>
  );
}
