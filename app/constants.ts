import { polygon, polygonAmoy } from "wagmi/chains";

export const DEVNET_PROVIDER_URL = "https://rpc-amoy.polygon.technology";
export const REV_WALLET = "0x2F059872781f8310C65C735720d3F089Dc0eC78F";
export const FALLBACK_IMAGE_URL = "/images/no-image-available.jpg";
export const WEBSITE_THUMBNAIL = "/images/site-thumbnail.jpg";
export const BONSAI_ADDRESS = "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c";
export const AUCTION_OPEN_ACTION_MODULE_ADDRESS = process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ? '0x857b5e09d54AD26580297C02e4596537a2d3E329' : '0xd935e230819AE963626B31f292623106A3dc3B19';
export const CURRENT_CHAIN_ID = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? polygon.id : polygonAmoy.id;

export const GENESIS_ARTIST_PROFILE_IDS = [
    '0x021135', // aoife
    '0x73b1',   // jessy 
    '0x012a99',  //  tiny
    '0x1087', // christina spinei
    '0xf6b0', // Andres Briceno
    '0x018ccc', // zo
    '0x01837b', // losi
    '0x042318', //chloee
    '0x6079', //carla mooni
    '0xc4b8', // soju
    '0x01c90b', // gremiana
    '0x01bbee', // maze mari
    '0x326c', // grams
    '0x01a14e' //definn*
  ];

  export const VERIFIED_ARTIST_PROFILE_IDS = [
    '0x021135', // aoife
    '0x73b1',   // jessy 
    '0x012a99',  //  tiny
    '0x1087', // christina spinei
    '0xf6b0', // Andres Briceno
    '0x018ccc', // zo
    '0x01837b', // losi
    '0x042318', //chloee
    '0x6079', //carla mooni
    '0xc4b8', // soju
    '0x01c90b', // gremiana
    '0x01bbee', // maze mari
    '0x326c', // grams --------Genesis artists
    '0xf71a',   // internetfase
    '0x020d1f', //deadstartalk
    '0x02152a', //princesstutti
    '0x015f34', //datartist*
    '0x054fa2', //@ogunkizmaz
    '0x01a5d6', //eduardmsmr
  ];

  export const BID_AWARD = 100; // será que coloco proporcional?
  export const CREATE_NEW_AWARD = 500;
  export const COLLECT_PERCENT_AWARD = 0.2; 
  export const NEW_PROFILE_AWARD = 1000;
  export const NEW_PROFILE_AWARD_REFERRAL = 500;
  export const LIKE_AWARD = 10;
  export const MIRROR_AWARD = 20;

  export const MYSTIC_DROP_IMAGES_URLS = [
    '/images/dropMari.webp',
    '/images/dropCristina.webp',
    '/images/dropGremiana.webp',
    '/images/dropZo.webp',
    '/images/dropchloe.jpg',
    '/images/dropTiny.png',
    '/images/dropGrams.jpg',
    '/images/dropSoju.gif',
    '/images/dropAeoife.png',
    '/images/dropLosi.webp',
    '/images/dropJessy.png',
    '/images/dropCarla.webp',
    '/images/dropAndres.png',
    '/images/dropAndres.png'
  ]

  //todo: pegar esses dados online
  export const HERO_IMAGES_LIGHT  = [
    { url: '/images/dropMari.webp', artist: 'MazeMari', link: '/gallery/0x01bbee-0x2035' },
    { url: '/images/dropGremiana.webp', artist: 'cybernovae', link: '/gallery/0x01c90b-0x023f' },
    { url: '/images/dropAeoife.png', artist: "Aoife O'Dwyer", link: '/gallery/0x021135-0x018e' },
    { url: '/images/dropJessy.png', artist: 'Princess Je$$yFries', link: '/gallery/0x73b1-0x59b5' },
  ]

  export const HERO_IMAGES_DARK  = [
    { url: '/images/dropCristina.webp', artist: 'Cristina Spinei', link: '/gallery/0x1087-0x0ade' },
    { url: '/images/dropZo.webp', artist: 'Zo', link: '/gallery/0x018ccc-0x2b62' },
    { url: '/images/dropchloe.jpg', artist: 'Chloe', link: '/gallery/0x042318-0x01db' },
    { url: '/images/dropTiny.png', artist: 'tinyrainboot', link: '/gallery/0x012a99-0x046c' },
    { url: '/images/dropGrams.jpg', artist: 'GRAMS', link: '/gallery/0x326c-0x101f' },
    { url: '/images/dropLosiSShot.png', artist: 'Losi', link: '/gallery/0x01837b-0x0290' },
    { url: '/images/dropCarla.webp', artist: 'Carla Monni', link: '/gallery/0x6079-0x127c' },
    { url: '/images/dropAndres.png', artist: 'Andrés Briceño', link: '/gallery/0xf6b0-0x110b' },
    { url: '/images/dropSoju.gif', artist: 'SOJU', link: '/gallery/0xc4b8-0x032b' },
  ]

  export const MYSTIC_DROP_IDS = [
    '0x021135-0x018e' , //aeoife
    '0xc4b8-0x032b', // Soju
    '0xf6b0-0x110b', //andres
    '0x01bbee-0x2035', // maze mari
    '0x6079-0x127c', // carla
    '0x012a99-0x046c', //tiny
    '0x042318-0x01db', //chloe
    '0x01837b-0x0290', // losi
    '0x326c-0x101f', // grams
    '0x01c90b-0x023f', //gremiana
    '0x73b1-0x59b5', //jessy
    '0x018ccc-0x2b62', // zo
    '0x1087-0x0ade', // cristina
    
  ]

  export const FEATURED_IDS = [
    '0x021135-0x018e' , //aeoife
    '0xc4b8-0x032b', // Soju
    '0xf6b0-0x110b', //andres
    '0x01bbee-0x2035', // maze mari
    '0x6079-0x127c', // carla
    '0x012a99-0x046c', //tiny
    '0x042318-0x01db', //chloe
    '0x01837b-0x0290', // losi
    '0x326c-0x101f', // grams
    '0x01c90b-0x023f', //gremiana
    '0x73b1-0x59b5', //jessy
    '0x018ccc-0x2b62', // zo
    '0x1087-0x0ade', // cristina
    
  ]

