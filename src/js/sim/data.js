// Game data: calendar, years, plants, items, events, work orders, staff.
// Everything here is game content (invented) unless a line carries a `fact` id, which points into
// data/facts.json (sourced; see research/garvan-*.md). tools/check-facts.mjs scans this file.

export const SEASONS = ['sp', 'su', 'fa', 'wi'];
export const SEASON_NAME = { sp: 'Spring', su: 'Summer', fa: 'Fall', wi: 'Winter' };
export const DAYS_PER_SEASON = 28;
export const YEAR_DAYS = 112;
export const DAY_START = 360;   // 06:00, minutes since midnight
export const DAY_END = 1560;    // 02:00 next day
export const TICKS_PER_MIN = 12;
export const MAX_ENERGY = 100;
export const SKINS = ['#f2d6c0', '#e0b896', '#c08a62', '#8a5a3a', '#5a3a26'];
// Game choice: each season stands for three real months (Spring = March to May, and so on).
export const SEASON_MONTH = { sp: 2, su: 5, fa: 8, wi: 11 }; // 0-based month the season starts in

// Day of the year (0..111) from a season and day of season (1..28).
export const yd = (sea, d) => SEASONS.indexOf(sea) * DAYS_PER_SEASON + d - 1;

// ---------- years on the job ----------
// Tool tier rises at each year-end review. The player is a fictional groundskeeper.
export const YEARS = [null,
  { n: 1, title: 'Seasonal groundskeeper', tier: 1, rating: 3,
    intro: [
      'Spring, Year 1. You start work on the grounds crew at Garvan Woodland Gardens, on a forested peninsula in Lake Hamilton outside Hot Springs.',
      'The tulips are up, the azaleas are coming, and the visitors are already here. Each morning the head gardener pins work orders on the board in the maintenance barn. Keep the garden beautiful through a whole year, from the spring bloom to Holiday Lights.',
    ],
    introFacts: ['g-acres', 'g-university', 'g-verna-1956'] },
  { n: 2, title: 'Groundskeeper', tier: 2, rating: 3.5,
    intro: ['Year 2. The crew trusts you with the leaf blower, the hose reel and the utility cart. The lights crew wants you on the big pieces this fall.'],
    introFacts: ['g-46weeks'] },
  { n: 3, title: 'Senior gardener', tier: 3, rating: 4,
    intro: ['Year 3. You know every bed by name. Visitors stop you on the path to ask what is blooming.'],
    introFacts: ['g-visitors'] },
];
export const yearDef = (n) => YEARS[Math.min(n, YEARS.length - 1)];

// ---------- events (day of year ranges, inclusive) ----------
// Real dates mapped onto the game calendar; see research/garvan-operations.md.
export const EVENTS = {
  tulips: { name: 'Tulip Extravaganza', from: yd('sp', 1), to: yd('sp', 14), fact: 'g-tulips' },
  azaleas: { name: 'Azaleas and dogwoods', from: yd('sp', 12), to: yd('sp', 20), fact: 'g-azaleas' },
  pullTulips: { name: 'Pull tulips, plant summer annuals', from: yd('sp', 15), to: yd('sp', 28) },
  fallInstall: { name: 'Fall in the Woodlands goes in', from: yd('fa', 1), to: yd('fa', 4) },
  fallShow: { name: 'Fall in the Woodlands', from: yd('fa', 4), to: yd('fa', 25), fact: 'g-fall-woodlands' },
  lightsInstall: { name: 'Holiday Lights install', from: yd('fa', 5), to: yd('fa', 25), fact: 'g-lights-contract' },
  trashBash: { name: 'Trash Bash', from: yd('fa', 9), to: yd('fa', 9), fact: 'g-trashbash' },
  celebrateFall: { name: 'Celebrate Fall festival', from: yd('fa', 14), to: yd('fa', 14) },
  fallColor: { name: 'Fall color peak', from: yd('fa', 20), to: yd('fa', 25) },
  fallStrike: { name: 'Fall display comes out', from: yd('fa', 26), to: yd('fa', 28) },
  lights: { name: 'Holiday Lights', from: yd('fa', 26), to: yd('wi', 10), fact: 'g-lights' },
  thanksgiving: { name: 'Thanksgiving (closed)', from: yd('fa', 27), to: yd('fa', 27) },
  christmas: { name: 'Christmas (closed)', from: yd('wi', 8), to: yd('wi', 8) },
  closed: { name: 'Closed for January', from: yd('wi', 11), to: yd('wi', 19), fact: 'g-closed-january' },
  lightsDown: { name: 'Holiday Lights teardown', from: yd('wi', 11), to: yd('wi', 19) },
  tulipPlanting: { name: 'Tulip planting', from: yd('wi', 11), to: yd('wi', 19), fact: 'g-tulip-january' },
  daffodils: { name: 'Daffodil Days', from: yd('wi', 20), to: yd('sp', 3), fact: 'g-daffodils' },
};
export const inEvent = (id, d) => { const e = EVENTS[id]; return e.from <= e.to ? d >= e.from && d <= e.to : d >= e.from || d <= e.to; };

// ---------- plants ----------
// bloom/prune/color: [from, to] day-of-year windows (may wrap the year end). col: bloom colours.
// size: 'tree' | 'shrub' | 'low'. Shrubs and trees block walking. All windows are game choices informed by the
// research notes (Hot Springs bloom times; pruning by general Southern practice).
const W = (a, b, c, d) => [yd(a, b), yd(c, d)];
export const PLANTS = {
  azalea: { name: 'Azalea', size: 'shrub', bloom: W('sp', 12, 'sp', 20), prune: W('sp', 21, 'su', 8), col: ['#e85a8a', '#f4f0f2', '#f07a5a', '#c84a9a'], leaf: '#3f6e34', ever: true, fact: 'g-azaleas' },
  camellia: { name: 'Camellia', size: 'shrub', bloom: W('wi', 14, 'sp', 4), prune: W('sp', 5, 'sp', 16), col: ['#d83a4a', '#f2c4cc', '#f4f0ea'], leaf: '#2f5a30', ever: true, fact: 'g-camellias' },
  hydrangea: { name: 'Hydrangea', size: 'shrub', bloom: W('su', 1, 'su', 14), prune: W('su', 15, 'su', 24), col: ['#6a8ae0', '#a87ad8', '#e8eef8'], leaf: '#4a7a3a', thirsty: true },
  rhododendron: { name: 'Rhododendron', size: 'shrub', bloom: W('sp', 14, 'sp', 22), prune: W('sp', 23, 'su', 6), col: ['#b84a9a', '#e86aa0'], leaf: '#2f5530', ever: true },
  rose: { name: 'Rose', size: 'shrub', bloom: W('sp', 22, 'su', 14), bloom2: W('fa', 1, 'fa', 10), prune: W('wi', 20, 'wi', 27), col: ['#c8283a', '#f4b0c0', '#f8e8a0'], leaf: '#3a6a30', thirsty: true },
  peony: { name: 'Tree peony', size: 'shrub', bloom: W('sp', 10, 'sp', 15), prune: W('fa', 26, 'wi', 6), col: ['#f4a0b8', '#f8f0e8'], leaf: '#5a7a3a' },
  conifer: { name: 'Dwarf conifer', size: 'shrub', leaf: '#2a5a48', ever: true },
  bonsai: { name: 'Bonsai', size: 'shrub', leaf: '#3a5a2a', ever: true, thirsty: true, fact: 'g-bonsai' },
  daylily: { name: 'Daylily', size: 'low', bloom: W('su', 6, 'su', 18), col: ['#f0901a', '#f4c430', '#d84a2a'], leaf: '#5a8a3a', thirsty: true },
  fern: { name: 'Cinnamon fern', size: 'low', leaf: '#4a8a3a', fallLeaf: '#b07a3a' },
  daffodil: { name: 'Daffodils', size: 'low', bloom: W('wi', 20, 'sp', 6), col: ['#f8d838', '#f8f2c8'], leaf: '#5a8a3a', fact: 'g-daffodils' },
  wildflower: { name: 'Wildflowers', size: 'low', bloom: W('sp', 15, 'su', 20), col: ['#f2d24a', '#b67ad8', '#e8803a', '#f4f0e4'], leaf: '#6a8a3a' },
  privet: { name: 'Chinese privet (invasive)', size: 'shrub', leaf: '#4a6a3a', ever: true, invasive: true },
  // Trees: drawn by the tree renderer (painted oak/pine/magnolia where available).
  jmaple: { name: 'Japanese maple', size: 'tree', color: W('fa', 18, 'fa', 27), bare: W('fa', 28, 'wi', 28), prune: W('wi', 11, 'wi', 19), leaf: '#a8322a', fallLeaf: '#e0401f', drops: true },
  dogwood: { name: 'Dogwood', size: 'tree', bloom: W('sp', 12, 'sp', 19), col: ['#f8f4ec'], color: W('fa', 15, 'fa', 25), bare: W('fa', 26, 'wi', 28), leaf: '#4a7a3a', fallLeaf: '#b0302a', drops: true },
  redbud: { name: 'Redbud', size: 'tree', bloom: W('sp', 6, 'sp', 13), col: ['#d86ab8'], bare: W('fa', 24, 'wi', 28), leaf: '#4a7a3a', fallLeaf: '#d8b030', drops: true },
  magnolia: { name: 'Southern magnolia', size: 'tree', bloom: W('sp', 24, 'su', 10), col: ['#f8f4ec'], leaf: '#2a5a34', ever: true },
  oak: { name: 'Oak', size: 'tree', bare: W('fa', 26, 'sp', 2), leaf: '#3f7a2a', fallLeaf: '#b8642a', drops: true },
  hickory: { name: 'Hickory', size: 'tree', bare: W('fa', 24, 'sp', 3), leaf: '#4a7a2a', fallLeaf: '#d8a830', drops: true },
  pine: { name: 'Shortleaf pine', size: 'tree', leaf: '#2f5a32', ever: true },
  cypress: { name: 'Bald cypress', size: 'tree', bare: W('fa', 26, 'sp', 4), leaf: '#5a8a4a', fallLeaf: '#b86a3a', drops: true },
};
export const inWindow = (w, d) => !!w && (w[0] <= w[1] ? d >= w[0] && d <= w[1] : d >= w[0] || d <= w[1]);

// Bed plantings (temporary). Tulips: one bed tile stands for about 1,000 bulbs (game scale).
export const TULIP_COLORS = { red: '#d8283a', yellow: '#f6cc2a', white: '#f6f2ea', pink: '#f08ab0', purple: '#7a3aa8', orange: '#f0802a' };
export const BEDS = {
  tulip: { name: 'Tulips', bloom: W('sp', 1, 'sp', 14) },
  annual: { name: 'Summer annuals', bloom: W('sp', 24, 'fa', 20), col: ['#e8406a', '#f4f0f0', '#8a5ae0', '#f08a2a'], thirsty: true },
};

// ---------- items ----------
// kind: tool | material | display | food | wear. Tool names change with tier (see toolName).
export const ITEMS = {
  pruners: { name: 'Hand pruners', kind: 'tool', ic: ['shears', '#c83a3a', '#9aa0a8'] },
  trowel: { name: 'Trowel', kind: 'tool', ic: ['trowel', '#3a7a4a', '#9aa0a8'] },
  rake: { name: 'Leaf rake', kind: 'tool', ic: ['rake', '#a8783a', '#c8a050'] },
  can: { name: 'Watering can', kind: 'tool', ic: ['can', '#3a8a5a', '#2a5a3a'] },
  grabber: { name: 'Litter grabber', kind: 'tool', ic: ['grabber', '#f2a541', '#5a5a62'] },
  saw: { name: 'Pruning saw', kind: 'tool', ic: ['saw', '#9aa0a8', '#a8783a'] },
  mower: { name: 'Push mower', kind: 'tool', ic: ['mower', '#d8402a', '#2a2a2a'] },
  reel: { name: 'Light reel', kind: 'tool', ic: ['reel', '#3a3a42', '#ffd860'] },
  straw: { name: 'Pine straw bale', kind: 'material', ic: ['bale', '#c88a3a', '#8a5a22'], desc: 'Mulch one bed tile.' },
  'bulb:red': { name: 'Red tulip bulbs', kind: 'material', ic: ['bulb', '#d8283a', '#c8a878'], desc: 'A crate of about 1,000 bulbs: one bed tile.' },
  'bulb:yellow': { name: 'Yellow tulip bulbs', kind: 'material', ic: ['bulb', '#f6cc2a', '#c8a878'], desc: 'A crate of about 1,000 bulbs: one bed tile.' },
  'bulb:white': { name: 'White tulip bulbs', kind: 'material', ic: ['bulb', '#f6f2ea', '#c8a878'], desc: 'A crate of about 1,000 bulbs: one bed tile.' },
  'bulb:pink': { name: 'Pink tulip bulbs', kind: 'material', ic: ['bulb', '#f08ab0', '#c8a878'], desc: 'A crate of about 1,000 bulbs: one bed tile.' },
  'bulb:purple': { name: 'Purple tulip bulbs', kind: 'material', ic: ['bulb', '#7a3aa8', '#c8a878'], desc: 'A crate of about 1,000 bulbs: one bed tile.' },
  'bulb:orange': { name: 'Orange tulip bulbs', kind: 'material', ic: ['bulb', '#f0802a', '#c8a878'], desc: 'A crate of about 1,000 bulbs: one bed tile.' },
  annuals: { name: 'Flat of annuals', kind: 'material', ic: ['flower', '#e8406a', '#3a7a3a'], desc: 'Summer color for one bed tile.' },
  cloth: { name: 'Frost cloth', kind: 'material', ic: ['cloth', '#eef2f4', '#9aa8b0'], desc: 'Covers one tulip bed tile for a freezing night.' },
  seed: { name: 'Bird seed', kind: 'material', ic: ['bag', '#c8a050', '#8a6a3a'], desc: 'Refills a Birdsong Trail feeder.' },
  decor: { name: 'Fairy Village decor', kind: 'material', ic: ['basket', '#c8a050', '#e86aa0'], desc: 'This season\'s tiny decorations for the Fairy Village.' },
  kit: { name: 'Wedding kit', kind: 'material', ic: ['chest', '#f4f0ea', '#c8a050'], desc: 'Chairs, an arch and an aisle runner for today\'s ceremony.' },
  // Display pieces (placed on their marked spots).
  'hl:pole': { name: 'Pole tree (lights)', kind: 'display', ic: ['cone', '#3aa86a', '#ffd860'] },
  'hl:set': { name: 'Lit set piece', kind: 'display', ic: ['gear', '#e8b030', '#ffd860'] },
  'hl:blossom': { name: 'Color blossom', kind: 'display', ic: ['flower', '#e858c8', '#4ac8f0'] },
  'hl:arch': { name: 'Light tunnel arch', kind: 'display', ic: ['hut', '#8ad8f8', '#e8f8ff'] },
  'hl:rose': { name: 'Rose Tree frame section', kind: 'display', ic: ['cone', '#e8405a', '#ffd860'] },
  'hl:cocoa': { name: 'Hot chocolate stand', kind: 'display', ic: ['cup', '#f4ead8', '#7a4a2a'] },
  'fd:mums': { name: 'Mum display', kind: 'display', ic: ['flower', '#e8a020', '#3a6a2a'] },
  'fd:pumpkins': { name: 'Pumpkins and gourds', kind: 'display', ic: ['gourd', '#e87a1a', '#3a6a2a'] },
  // Food from the Chipmunk Café (game prices).
  sandwich: { name: 'Chipmunk club sandwich', kind: 'food', energy: 30, ic: ['wedge', '#e8c890', '#7a9a3a'] },
  soup: { name: 'Bowl of soup', kind: 'food', energy: 35, ic: ['cup', '#d88a3a', '#f4ead8'] },
  nachos: { name: 'Nachos', kind: 'food', energy: 25, ic: ['wedge', '#f4c430', '#e8a020'] },
  lemonade: { name: 'Lemonade', kind: 'food', energy: 12, ic: ['bottle', '#f8e870', '#f4f0d0'] },
  cookie: { name: 'Cookie', kind: 'food', energy: 10, ic: ['round', '#c8904a', '#6a3a1a'] },
  cocoa: { name: 'Hot chocolate', kind: 'food', energy: 15, ic: ['cup', '#7a4a2a', '#f4ead8'] },
  // GardenShop (cosmetic hats; use one to wear it).
  'hat:cap': { name: 'Garden cap', kind: 'wear', hat: 'cap', hatColor: '#3a6a3a', ic: ['bag', '#3a6a3a', '#2a4a2a'] },
  'hat:brim': { name: 'Wide-brim sun hat', kind: 'wear', hat: 'brim', hatColor: '#c8a870', ic: ['bag', '#c8a870', '#8a6a3a'] },
  'hat:toque': { name: 'Knit winter hat', kind: 'wear', hat: 'toque', hatColor: '#a8323a', ic: ['bag', '#a8323a', '#f4f0ea'] },
};
export const TOOLS = ['pruners', 'trowel', 'rake', 'can', 'grabber', 'saw', 'mower', 'reel'];
const TOOL_TIER = {
  pruners: ['Hand pruners', 'Loppers', 'Pole pruner'], rake: ['Leaf rake', 'Leaf blower', 'Backpack blower'],
  can: ['Watering can', 'Hose reel', 'Hose reel'], saw: ['Pruning saw', 'Chainsaw', 'Chainsaw'], mower: ['Push mower', 'Zero-turn mower', 'Zero-turn mower'],
};
export const toolName = (id, tier) => (TOOL_TIER[id] ? TOOL_TIER[id][Math.min(2, tier - 1)] : ITEMS[id] ? ITEMS[id].name : id);
export const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : id);
export const CAN_CAP = [0, 10, 30, 40];
export const ENERGY = { pruners: 2, trowel: 1, rake: 1, can: 1, grabber: 0, saw: 3, mower: 1, reel: 1, place: 1 };

// ---------- shops ----------
export const SHOPS = {
  cafe: { name: 'Chipmunk Café', open: [600, 900], stock: [['sandwich', 9], ['soup', 7], ['nachos', 8], ['lemonade', 3], ['cookie', 2]] },
  gift: { name: 'GardenShop', open: [540, 1080], stock: [['hat:cap', 18], ['hat:brim', 24], ['hat:toque', 16]] },
};
export const WAGE = 96;   // per day worked (game pay)

// ---------- work orders ----------
// Templates the morning board draws from. zone: '*' = any visitor zone. weight = how often it appears.
// The generator (orders.js) fills in a zone and a count and checks `when`.
export const ORDER_TYPES = {
  litter: { verb: 'Pick up litter', tool: 'grabber', unit: 'pieces', pay: 6 },
  weed: { verb: 'Weed the beds', tool: 'trowel', unit: 'tiles', pay: 8 },
  rake: { verb: 'Clear leaves', tool: 'rake', unit: 'tiles', pay: 8 },
  mulch: { verb: 'Mulch with pine straw', tool: 'straw', unit: 'bed tiles', pay: 8 },
  water: { verb: 'Water the plantings', tool: 'can', unit: 'plants', pay: 8 },
  mow: { verb: 'Mow the lawn', tool: 'mower', unit: 'tiles', pay: 8 },
  prune: { verb: 'Prune', tool: 'pruners', unit: 'plants', pay: 10 },
  debris: { verb: 'Clear storm debris', tool: 'saw', unit: 'limbs', pay: 12 },
  invasive: { verb: 'Cut out invasive privet', tool: 'saw', unit: 'shrubs', pay: 12 },
  plantBulbs: { verb: 'Plant tulip bulbs to the design', tool: 'bulb', unit: 'bed tiles', pay: 10 },
  pullBulbs: { verb: 'Pull spent tulips', tool: 'trowel', unit: 'bed tiles', pay: 8 },
  plantAnnuals: { verb: 'Plant summer annuals', tool: 'annuals', unit: 'bed tiles', pay: 8 },
  pullAnnuals: { verb: 'Pull tired annuals', tool: 'trowel', unit: 'bed tiles', pay: 6 },
  cover: { verb: 'Cover the tulips (freeze tonight)', tool: 'cloth', unit: 'bed tiles', pay: 12 },
  install: { verb: 'Install display pieces', tool: 'display', unit: 'pieces', pay: 12 },
  test: { verb: 'Test the lights', tool: 'reel', unit: 'pieces', pay: 8 },
  repair: { verb: 'Fix dark light pieces', tool: 'reel', unit: 'pieces', pay: 10 },
  strike: { verb: 'Take down display pieces', tool: 'reel', unit: 'pieces', pay: 10 },
  wedding: { verb: 'Set up the wedding', tool: 'kit', unit: 'setup', pay: 20 },
  unwed: { verb: 'Strike the wedding setup', tool: 'kit', unit: 'setup', pay: 10 },
  bonsai: { verb: 'Water the bonsai', tool: 'can', unit: 'trees', pay: 6 },
  koi: { verb: 'Skim leaves off the koi pond', tool: 'rake', unit: 'tiles', pay: 8 },
  track: { verb: 'Clear the model-train track', tool: 'rake', unit: 'tiles', pay: 6 },
  feeders: { verb: 'Fill the Birdsong Trail feeders', tool: 'seed', unit: 'feeders', pay: 6 },
  fairy: { verb: 'Change the Fairy Village decor', tool: 'decor', unit: 'village', pay: 8 },
  peafowl: { verb: 'Shoo a peafowl out of the tulips', tool: 'talk', unit: 'bird', pay: 6 },
};

// ---------- staff (fictional) ----------
// sched: [minute of day, place name in world.places]. Lines may cite a fact.
export const PEOPLE = {
  ruth: { name: 'Ruth Okafor', role: 'Head gardener', home: 'staffLot',
    look: { shirt: '#3a6a3a', pants: '#4a4238', hat: 'brim', hatColor: '#c8a870', hair: '#2a2420', skin: 3 },
    sched: [[360, 'board'], [480, 'greenhouse'], [720, 'cafeFront'], [780, 'pavilionFront'], [960, 'board'], [1080, 'staffLot']],
    gifts: { love: ['soup', 'kind:wear'], like: ['kind:food'], dislike: ['nachos'] },
    lines: [
      { h: 0, t: 'Orders are on the board every morning. Do the ones that matter to visitors first: litter and leaves on the paths.' },
      { h: 0, t: 'Mrs. Garvan laid this place out herself, path by path. We keep it the way she meant it to be walked.', fact: 'g-verna-1956' },
      { h: 1, t: 'This peninsula was timberland before it was a garden. Then the dam came and the lake wrapped around it.', fact: 'g-cook-timber' },
      { h: 1, t: 'Tulips here are annuals. Zone 8 is too warm for them to come back, so we plant every bed fresh.', fact: 'g-tulip-annual' },
      { h: 2, t: 'We plant tulips in January now, when the gates are shut. Plant any earlier and they bloom for nobody.', fact: 'g-tulip-january' },
      { h: 2, s: 'sp', t: 'Watch the forecast in early spring. A hard freeze in the mid-twenties will burn the tulip blooms.', fact: 'g-tulip-freeze' },
      { h: 3, t: 'The whole place belongs to the University of Arkansas. The architecture school runs it, which is why the buildings are what they are.', fact: 'g-university' },
      { h: 4, t: 'You have good hands for this. Most people rush the pruning. You don\'t.' },
    ] },
  dale: { name: 'Dale Whitfield', role: 'Holiday Lights lead', home: 'staffLot',
    look: { shirt: '#2a4a7a', pants: '#3a3a44', hat: 'cap', hatColor: '#f2a541', hair: '#5a4a3a', skin: 1, beard: true },
    sched: [[420, 'storage'], [600, 'lawnEast'], [840, 'storage'], [1020, 'lawnEast'], [1320, 'staffLot']],
    gifts: { love: ['cocoa', 'sandwich'], like: ['kind:food'], dislike: ['lemonade'] },
    lines: [
      { h: 0, t: 'Lights are a year-round job. We start hanging them in September and we\'re still pulling them in January.', fact: 'g-46weeks' },
      { h: 0, s: 'fa', t: 'The install crew does the heavy pieces. You carry what you can from storage and set it on the marked spots.', fact: 'g-lights-contract' },
      { h: 1, t: 'The Rose Tree is the one people drive in for. Fifty feet of lights and a music show.', fact: 'g-rosetree' },
      { h: 2, t: 'Test every piece after you set it. A dark piece on opening night is a bad night for me.' },
      { h: 3, s: 'wi', t: 'Opening night, people stand on the Great Lawn and just go quiet. That\'s why we do it.' },
    ] },
  mariana: { name: 'Mariana Reyes', role: 'Events and weddings coordinator', home: 'staffLot',
    look: { shirt: '#a8325a', pants: '#2a2a33', hat: 'none', hair: '#1f1a16', skin: 2, dress: true },
    sched: [[480, 'welcomeFront'], [600, 'chapelFront'], [900, 'welcomeFront'], [1080, 'staffLot']],
    gifts: { love: ['lemonade', 'kind:wear'], like: ['kind:food'], dislike: ['nachos'] },
    lines: [
      { h: 0, t: 'We host about two hundred weddings a year. When I say the chairs go out by two, I mean by two.', fact: 'g-weddings' },
      { h: 0, t: 'The chapel is all wood and glass. When the light comes through the pines it doesn\'t look real.', fact: 'g-chapel' },
      { h: 1, t: 'The bell tower next to the chapel is the carillon. Sixteen copper columns.', fact: 'g-carillon' },
      { h: 2, t: 'The Pavilion was Fay Jones and Maurice Jennings. Look up at the roof sometime: it opens like a flower.', fact: 'g-pavilion' },
      { h: 3, t: 'Couples ask for the Full Moon Bridge for photos. Keep that path spotless on wedding days and I\'ll owe you.', fact: 'g-fullmoon' },
    ] },
  bev: { name: 'Bev Lindqvist', role: 'Volunteer coordinator', home: 'staffLot',
    look: { shirt: '#f2a541', pants: '#4a5a6a', hat: 'brim', hatColor: '#f4ead8', hair: '#d8d0c8', skin: 0, glasses: true },
    sched: [[480, 'greenhouse'], [600, 'pinewindPath'], [780, 'cafeFront'], [900, 'childrenPath'], [1020, 'staffLot']],
    gifts: { love: ['cookie', 'seed'], like: ['kind:food'], dislike: [] },
    lines: [
      { h: 0, t: 'My volunteers will pull weeds and pick up litter all day. Machinery is staff only. That\'s a liability rule, not mine.', fact: 'g-46weeks' },
      { h: 0, s: 'fa', t: 'Trash Bash is our big day on the shoreline. Every bag counts.', fact: 'g-trashbash' },
      { h: 1, t: 'The Japanese garden sits in a ravine. Four pools, cascades, a waterfall and the koi pond.', fact: 'g-pinewind' },
      { h: 2, t: 'The Sunrise Bridge was named by the mayor of Hanamaki, our sister city in Japan.', fact: 'g-sunrise' },
      { h: 2, t: 'See the white azaleas by the Floating Cloud Bridge? We clip them to look like clouds.', fact: 'g-cloud' },
      { h: 3, t: 'The Birdsong Trail feeders go through seed fast. The preserve is forty-five acres of birds.', fact: 'g-hixson' },
    ] },
  tomas: { name: 'Tomás Herrera', role: 'Chipmunk Café cook', home: 'staffLot',
    look: { shirt: '#f4f0ea', pants: '#2a2a33', hat: 'toque', hair: '#2a2420', skin: 2 },
    sched: [[540, 'cafeFront'], [1260, 'staffLot']],
    gifts: { love: ['kind:wear'], like: ['cookie'], dislike: [] },
    lines: [
      { h: 0, t: 'Grill opens at ten, closes at three. Holiday Lights nights we stay open late and pour hot chocolate.' },
      { h: 1, t: 'George sits on my railing every lunch. He\'s figured out which table drops the most chips.', fact: 'g-george' },
      { h: 2, t: 'The train garden out back has little copies of the Cook family\'s brick plant and lumber mill.', fact: 'g-train' },
      { h: 3, t: 'You work harder than anyone out there. Next sandwich is on me. (Don\'t tell Ruth.)' },
    ] },
  opal: { name: 'Opal Prentiss', role: 'Welcome desk', home: 'staffLot',
    look: { shirt: '#5a7a9a', pants: '#3a3a44', hat: 'none', hair: '#8a8078', skin: 1, glasses: true, dress: true },
    sched: [[510, 'welcomeFront'], [1110, 'staffLot']],
    gifts: { love: ['lemonade', 'cookie'], like: ['kind:food'], dislike: [] },
    lines: [
      { h: 0, t: 'Welcome to Garvan! Two hundred and ten acres, four and a half miles of shoreline, and one very vain peacock.', fact: 'g-acres' },
      { h: 0, t: 'George? He\'s usually right out front. He knows the visitors bring snacks.', fact: 'g-george' },
      { h: 1, t: 'This building is wood and native stone. A Hot Springs architect designed it.', fact: 'g-welcome' },
      { h: 1, t: 'Dogs are welcome on a short leash, just not in the chapel or the treehouse.', fact: 'g-dogs' },
      { h: 2, t: 'The garden was dedicated in April 2002. I was here that week.', fact: 'g-opened-2002' },
      { h: 3, t: 'The peahens are shy. If you see one, stand still and she\'ll walk right past you.' },
    ] },
};

// ---------- peafowl ----------
// George is named in the garden's own photo captions; the two peahens are game additions.
export const PEAFOWL = [
  { id: 'george', name: 'George', sex: 'm', home: 'welcomeFront' },
  { id: 'hen1', name: 'Peahen', sex: 'f', home: 'cafeFront' },
  { id: 'hen2', name: 'Peahen', sex: 'f', home: 'trainYard' },
];

// Signs: plaques at named spots; reading one shows its facts (map positions in world.js).
export const SIGNS = {
  welcome: { title: 'Pratt Welcome Center', facts: ['g-welcome', 'g-acres', 'g-44acres'] },
  chapel: { title: 'Anthony Chapel', facts: ['g-chapel', 'g-carillon', 'g-weddings'] },
  pavilion: { title: 'Verna C. Garvan Pavilion', facts: ['g-pavilion', 'g-verna-1956', 'g-trust-1985'] },
  pinewind: { title: 'Garden of the Pine Wind', facts: ['g-pinewind', 'g-fullmoon', 'g-sunrise', 'g-cloud'] },
  bonsai: { title: 'Weyerhaeuser Bonsai Garden', facts: ['g-bonsai'] },
  canopy: { title: 'Millsap Canopy Bridge', facts: ['g-canopy'] },
  children: { title: 'Evans Children\'s Adventure Garden', facts: ['g-children', 'g-treehouse'] },
  hixson: { title: 'Hixson Family Nature Preserve', facts: ['g-hixson'] },
  perry: { title: 'Perry Wildflower Overlook', facts: ['g-perry', 'g-cook-timber'] },
  train: { title: 'Sugg Model Train Garden', facts: ['g-train', 'g-george'] },
  klipsch: { title: 'Klipsch Amphitheater', facts: ['g-klipsch'] },
  history: { title: 'A garden on a peninsula', facts: ['g-cook-timber', 'g-verna-1956', 'g-trust-1985', 'g-opened-2002', 'g-visitors'] },
};
