// All site content. Copied verbatim from the live v8 build (dashedthoughts.github.io/portfolio).
// Stats: CV-verified numbers only. Memes: only u/dashedthoughts. Contact: anur.dash@gmail.com.

const NOTION = 'https://dashedthoughts.notion.site/';

// Paths are relative to /lab/index.html, so shared files at the repo root are one level up.
export const ROOT = '../';

export const EMAIL = 'anur.dash@gmail.com';
export const REDDIT = 'https://www.reddit.com/user/dashedthoughts';
export const LINKEDIN = 'https://www.linkedin.com/in/adash14/';
export const NOTION_HOME = NOTION;
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
    notion: NOTION + 'Reelationships-a-B2B-Creator-Collaboration-App-2aaf7852775b8122bd25f8bb72a96f53',
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
    notion: NOTION + 'Revamped-Maps-Experience-for-MakeMyTrip-2aaf7852775b8102a6a7d69318fc6518',
  },
  {
    slug: 'tathya-dpi',
    title: 'Data as a DPI with Tathya',
    tagline: 'DPI for MSMEs, now easier',
    tags: ['MVP', 'User Research'],
    collaborators: [],
    category: 'Featured',
    sticker: 'FEATURED',
    notion: NOTION + 'Data-as-a-DPI-with-Tathya-2abf7852775b8082a808ed09ba3affe5',
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
    notion: NOTION + 'Netflix-Remixed-2abf7852775b8094afc4c61e0d603dd4',
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
    notion: NOTION + 'Spotify-Remixed-2abf7852775b809fac14d591f425c130',
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
    notion: NOTION + 'Nothing-Frame-Experience-2abf7852775b80bbab5ad54d739f3482',
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
    notion: NOTION + 'Zepto-2aaf7852775b8191bfc1dadce619a5db',
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
    notion: NOTION + 'Zerodha-2abf7852775b8032ae0be3c1c57f5d90',
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
    notion: NOTION + 'Ferrari-2aaf7852775b81269402c29d886480b1',
  },
  {
    slug: 'finance-chatbot',
    title: 'AI Chatbot for Personal Finance App',
    tagline: 'Conversational finance, minus the jargon',
    tags: ['User Research', 'PRD', 'User Journey Map'],
    collaborators: ['Jasjeev Singh Sahni', 'Ekta Gola', 'Gaurang Sultania'],
    category: 'Journeys',
    sticker: 'JOURNEY',
    notion: NOTION + 'AI-Chatbot-for-Personal-Finance-App-2aaf7852775b8132badcde8aae107de1',
  },
];

export const categories = ['Featured', 'Research & Remixes', 'Teardowns & Brand Research', 'Journeys'];

// Case-study bodies: ['h', heading] · ['p', text] · ['embed', url] · ['pdf', path, label]
export const caseStudies = {
  reelationships: [
    ['h', 'MVP · live prototype'],
    ['embed', 'https://reelationships.lovable.app/'],
    ['h', 'User Research, Personas & User Journey'],
    ['pdf', 'assets/reelationships__Reelationships_User_Research.pdf', 'User Research Deck'],
    ['h', 'Product Brief'],
    ['pdf', 'assets/reelationships__Reelationships_Product_Brief.pdf', 'Product Brief · A B2B Marketplace Where Brands Meet Influencers'],
  ],
  'makemytrip-maps': [
    ['h', 'Problem Hypothesis, User Journey, Prototypes & GTM'],
    ['pdf', 'assets/makemytrip-maps__ISB_SWOTs_Up_MMT.pdf', 'Full Presentation'],
    ['h', 'MVP 1 · Lovable'],
    ['embed', 'https://dynamic-trip-planner.lovable.app/'],
    ['h', 'MVP 2 · v0'],
    ['embed', 'https://v0-make-my-trip-canvas.vercel.app/'],
  ],
  'tathya-dpi': [
    ['p', 'Built with Sauhard Aggarwal, Ekta Gola, Vidita Dhingra & Aryan Mulchandani.'],
    ['h', 'Live platform'],
    ['embed', 'https://tathya-dpi-platform.vercel.app/'],
    ['h', 'The deck'],
    ['pdf', 'assets/tathya-dpi__Tathya.pdf', 'Tathya · Data as a DPI'],
  ],
  'netflix-remixed': [
    ['h', 'The remix deck'],
    ['pdf', 'assets/netflix-remixed__Netflix_PDF.pdf', 'Netflix Remixed'],
  ],
  'spotify-remixed': [
    ['h', 'The remix deck'],
    ['pdf', 'assets/spotify-remixed__Blitz_spotifyAI.pdf', 'Spotify AI DJ · Blitz'],
  ],
  'nothing-frame': [
    ['p', 'Designed Nothing Frame (1), a lightweight mixed-reality eyewear concept blending digital and physical worlds through gaze, voice, and gesture control. With Gaurang Sultania and Subrat Shukla, built a fully clickable Nothing X prototype using Rocket to demo real-world interactions like "frame your focus" and "frame your path," showing how seamless spatial computing could be.'],
    ['h', 'Clickable prototype'],
    ['embed', 'https://preview.builtwithrocket.new/nothing-frame-4umvi56'],
    ['h', 'Poster'],
    ['pdf', 'assets/nothing-frame__NothingIncubator_Sub.pdf', 'Incubator Submission'],
  ],
  'zepto-teardown': [
    ['h', 'Product Teardown'],
    ['pdf', 'assets/zepto-teardown__ZEPTO_Teardown.pdf', 'Zepto · Product Teardown'],
  ],
  'zerodha-teardown': [
    ['p', 'A quick brief with user flows.'],
    ['pdf', 'assets/zerodha-teardown__ZERODHA_Teardown.pdf', 'Zerodha · Product Teardown'],
  ],
  ferrari: [
    ['h', 'The Amazing World of Ferrari'],
    ['pdf', 'assets/ferrari__Ferrari_Scuderia_FFT_MKTGvF.pdf', 'Scuderia · Marketing Deep-Dive'],
  ],
  'finance-chatbot': [
    ['h', 'PRD & Research'],
    ['pdf', 'assets/finance-chatbot__FINAL_Minimum_Viable_Powerhouse_ISB.pdf', 'Minimum Viable Powerhouse'],
  ],
};

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
