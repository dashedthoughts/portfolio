// All site content. Carried over from the live portfolio (dashedthoughts.github.io/portfolio).
// Stats: CV-verified numbers only. Memes: only u/dashedthoughts. Contact: anur.dash@gmail.com.


// Paths are relative to index.html at the repo root.
export const ROOT = './';

export const EMAIL = 'anur.dash@gmail.com';
export const REDDIT = 'https://www.reddit.com/user/dashedthoughts';
export const LINKEDIN = 'https://www.linkedin.com/in/adash14/';
export const CLASSIC = 'https://dashedthoughts.github.io/portfolio/';
export const RESUME = ROOT + 'resume.pdf';

export const projects = [
  {
    slug: 'reelationships',
    title: 'Reelationships',
    tagline: 'A B2B Creator Collaboration App',
    tags: ['MVP', 'User Research', 'Demo', 'User Journey Map'],
    collaborators: [],
    category: 'Featured',
    sticker: 'FEATURED',
  },
  {
    slug: 'makemytrip-maps',
    brand: 'makemytrip',
    title: 'Revamped Maps Experience for MakeMyTrip',
    tagline: 'Rethinking how travellers navigate trips',
    tags: ['User Journey Map', 'MVP', 'User Research'],
    collaborators: ['Vidita Dhingra', 'Jasjeev Singh Sahni'],
    category: 'Featured',
    sticker: 'FEATURED',
  },
  {
    slug: 'tathya-dpi',
    title: 'Data as a DPI with Tathya',
    tagline: 'DPI for MSMEs, now easier',
    tags: ['MVP', 'User Research'],
    collaborators: [],
    category: 'Featured',
    sticker: 'FEATURED',
  },
  {
    slug: 'netflix-remixed',
    brand: 'netflix',
    title: 'Netflix Remixed',
    tagline: 'Engineering Lite. Fun Heavy stuff for Netflix',
    tags: ['Remix'],
    collaborators: [],
    category: 'Research & Remixes',
    sticker: 'REMIX',
  },
  {
    slug: 'spotify-remixed',
    brand: 'spotify',
    title: 'Spotify Remixed',
    tagline: 'What if Spotify AI DJ could do a lot more?',
    tags: ['Remix'],
    collaborators: [],
    category: 'Research & Remixes',
    sticker: 'REMIX',
  },
  {
    slug: 'nothing-frame',
    brandUrl: 'https://www.google.com/s2/favicons?domain=nothing.tech&sz=128',
    title: 'Nothing Frame Experience',
    tagline: 'An MVP concept for Nothing',
    tags: ['MVP'],
    collaborators: ['Gaurang Sultania', 'Subrat Shukla'],
    category: 'Research & Remixes',
    sticker: 'MVP',
  },
  {
    slug: 'zepto-teardown',
    brand: 'zepto',
    title: 'Zepto',
    tagline: 'Product Teardown',
    tags: ['Product Teardown'],
    collaborators: [],
    category: 'Teardowns & Brand Research',
    sticker: 'TEARDOWN',
  },
  {
    slug: 'zerodha-teardown',
    brand: 'zerodha',
    title: 'Zerodha',
    tagline: 'Product Teardown',
    tags: ['Product Teardown'],
    collaborators: [],
    category: 'Teardowns & Brand Research',
    sticker: 'TEARDOWN',
  },
  {
    slug: 'ferrari',
    brand: 'ferrari',
    title: 'Ferrari',
    tagline: 'The Amazing World of Ferrari',
    tags: ['Brand Research'],
    collaborators: [],
    category: 'Teardowns & Brand Research',
    sticker: 'BRAND',
  },
  {
    slug: 'finance-chatbot',
    title: 'AI Chatbot for Personal Finance App',
    tagline: 'Conversational finance, minus the jargon',
    tags: ['User Research', 'PRD', 'User Journey Map'],
    collaborators: ['Jasjeev Singh Sahni', 'Ekta Gola', 'Gaurang Sultania'],
    category: 'Journeys',
    sticker: 'JOURNEY',
  },
];

export const categories = ['Featured', 'Research & Remixes', 'Teardowns & Brand Research', 'Journeys'];

export { caseStudies } from './cases.js';

export const memes = [
  {
    title: 'Learning, but at what cost',
    src: 'https://i.redd.it/learning-but-at-what-cost-v0-njh6bb7y8ab61.gif?format=png8&s=976adf3b091717c6a6f0b619315eef049ee6c045',
  },
  {
    title: 'Tomorrow never comes',
    src: 'https://i.redd.it/tomorrow-never-comes-v0-mvmya0cy82v51.jpg?s=d328d2181b1e46ee7d717bb00be47cc9c46ce85e',
  },
];

export const tickerA = ['MARKETING', 'USER JOURNEYS', 'PROBLEM SOLVING', 'MEMELORE', 'STRATEGY', 'FERRARI'];
export const tickerB = ['r/MEMES 35.4M', 'UNILEVER', 'ISB PGP', 'NIT TRICHY GOLD MEDAL', 'NASA CITIZEN SCIENTIST', '2 PATENTS'];

export const stats = [
  { n: '35.4M', l: 'members at r/memes, grown from 15.9M · 7th largest community on Reddit' },
  { n: '875K+', l: 'lifetime upvotes; inducted to Reddit Creator Council (64 of 680M+)' },
  { n: '9+', l: 'digital transformation projects led end-to-end at Tata Steel DPL' },
  { n: '50+Cr', l: 'INR topline boost · Digital Dynamo Award, MD recognition (1/350+)' },
];

// Courier ranks for the REDLINE game (by case files decrypted in a run)
export const ranks = [
  [0, 'ROOKIE'],
  [1, 'RUNNER'],
  [3, 'COURIER'],
  [5, 'NIGHT SHIFT'],
  [8, 'LEGEND OF THE RING ROAD'],
];
export const rankFor = (files) => ranks.reduce((acc, [n, r]) => (files >= n ? r : acc), ranks[0][1]);
