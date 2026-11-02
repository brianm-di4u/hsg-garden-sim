# Image-generation prompts

Every painted image in `assets/` was made with the image generation tool of the OpenAI Codex CLI (session model GPT-6.1 Sol) from one of the
prompts below, then packed by `tools/pack-art.mjs` with the settings in `art.json` (white keyed out, trimmed,
resized, textures made seamless). The prompts are copied verbatim. They were written when the game lived in a
monorepo, so most paths start `games/farm-sim/`; that folder is now the root of this repository.

Style references: the first batch (the pilot) had none. Every later batch names earlier generated images from
`art-src/` (the approved pilot, or an earlier output) as its style reference. No photographs or third-party images
were given to the generator, as references or as image-to-image inputs.

The characters are not generated images: they are Blender renders from `art-src/blender/characters.py`.
Generated source PNGs are kept out of git (`art-src/**/*.png`); the packed WebP files in `assets/` are the shipped
output.

## 1. Pilot: painted style set (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task (use your image generation tool; copy each final image to the exact repo path given). Do not edit any other files.

We are making original hand-painted art for a top-down farming/life sim set in the Hot Springs, Arkansas valley. This is a STYLE PILOT: 4 images that will become the style reference for ~100 later images, so make them excellent and mutually consistent.

STYLE (all images): hand-painted gouache storybook game art; clean, readable shapes; soft sunlight from the upper left; gentle cel-like shading with visible painterly brush texture; thin warm dark-brown outlines (not black); rich but natural colours; crisp edges, no blur, no vignette, no text, no lettering, no logos, no signatures.
CAMERA for objects: high-angle three-quarter top-down view (camera tilted about 55 degrees down, orthographic, no perspective convergence): you see the roof/top from above AND the front (south-facing) side below it, like a classic top-down farming game. The object is centred, fills the frame width, its base touches the bottom of the frame. Pure flat white background (#FFFFFF), no ground, no cast shadow on the ground (shadows are added in code).

1. `games/farm-sim/art-src/pilot-plankbath.png` — square 1024x1024. A small 1870s frontier wooden bathhouse (rough-sawn vertical plank walls, weathered grey-brown wood, wood-shingle gable roof with ridge running left–right, a plain board door centred on the front, two small square windows, a stovepipe with a thin wisp of steam, a tiny plank porch step). Its footprint is square: it should fill the image width.
2. `games/farm-sim/art-src/pilot-oak.png` — portrait 768x1024. A broad southern red oak in summer: rounded clumpy canopy made of a few big painted leaf clusters, short thick trunk visible below the canopy, roots flaring at the base. Base of trunk at bottom-centre.
3. `games/farm-sim/art-src/pilot-grass.png` — square 1024x1024, a frameless TEXTURE seen straight from above (not three-quarter): short meadow grass, painterly clumps and strokes in a few mid-greens with small lighter and darker variation, very even overall tone and evenly lit (no light gradient, no vignette, no large features, no flowers, no objects) so it can tile seamlessly.
4. `games/farm-sim/art-src/pilot-cabin.png` — landscape 1536x1024. An 1807 frontier log farm cabin (single-pen saddle-notched round-log cabin, clay chinking, split-shake roof with ridge running left–right, fieldstone stick-and-mud chimney at the left gable end, a plank door, one small shuttered window, a short front porch). Footprint 6 wide by 4 deep. Fills the width.

Report the four paths when done.
```

## 2. Batch 1: buildings 1807-1871 (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Original hand-painted art for a top-down farming sim set in the Hot Springs, Arkansas valley. STYLE REFERENCES (open and match them closely: camera angle, painting style, light, level of detail, outline colour): `games/farm-sim/art-src/pilot-plankbath.png` and `games/farm-sim/art-src/pilot-cabin.png`. Slightly simplify fine texture compared to the references so shapes read well when shown small (~200 px wide), but keep the same painterly look.

COMMON RULES for every image: hand-painted gouache storybook game art; soft sunlight from the upper left; thin warm dark-brown outlines; high-angle three-quarter top-down view (camera tilted ~55° down, orthographic, no perspective convergence): roof seen from above and the south-facing front below it; roof ridge runs left–right unless stated; the building is centred and fills the image width, its front base touches the bottom of the image; pure flat white background (#FFFFFF); NO ground, NO grass base, NO cast shadow, NO people, NO text, NO lettering, NO signs with words, NO logos. Where a sign board is mentioned it must be BLANK (plain painted board; the game writes the words). Historically plausible for the Arkansas Ouachita frontier.

Square images are 1024x1024 (building footprint 5 wide × 5 deep). Landscape images are 1536x1024 (footprint 6 wide × 4 deep, or as stated).

Files (all under `games/farm-sim/art-src/`):
1. `bld-tent.png` (square): an 1807 river trader's camp: a large canvas wall tent with the front flaps tied open, a plank trade counter in front with a few bundles, a barrel, a stack of beaver pelts and a small keg; canvas off-white with faint red stripe trim.
2. `bld-cabin.png` (square): a trapper's one-room round-log cabin (saddle-notched logs, split-shake roof, stick-and-mud chimney on the right gable end), deer hides stretched on a pole frame against the left wall, a woodpile.
3. `bld-hut.png` (square): an 1807 health-seeker's shelter: a small pole-and-brush lean-to hut with a bark-slab roof, a hanging blanket for a door, a split-log bench in front.
4. `bld-plankstore.png` (square): an 1871 frontier general store: one-storey board-and-batten building with a tall square FALSE FRONT facing south (blank sign board on it), a plank boardwalk porch with a shed roof on posts, crates and a barrel on the porch, a double door and two small-paned windows.
5. `bld-plankhotel.png` (square): an 1871 two-storey frame boardinghouse: white-washed clapboard, a two-level front gallery (porch below, balcony above) with simple posts, a gable roof with wood shingles, a central door, six-over-six windows, a blank sign board over the porch.
6. `bld-house2.png` (square): a modest 1870s one-and-a-half storey frame house: weatherboard painted pale buff, wood-shingle gable roof, a small front porch, a brick chimney, a picket fence segment is NOT included.
7. `bld-mill.png` (landscape, footprint 5 wide × 4 deep): an 1870s water-powered grist mill: two-storey heavy timber-frame building with weathered board siding and a shingle roof, a big wooden overshot water wheel on the LEFT side of the building with a wooden flume (millrace) coming in from the top-left, a loading door with a hoist beam high on the front, a few grain sacks by the front door.
8. `bld-farm-plank.png` (landscape, footprint 6 × 4): an 1871 farmhouse: a single-storey dogtrot-turned-box house, vertical board-and-batten walls, a long front porch with a shed roof on posts, a wood-shingle roof, a fieldstone chimney on the left gable, two windows and a centre door.
9. `bld-farm-brick.png` (landscape, 6 × 4): an 1886 two-storey red-brick I-house farmhouse: symmetrical front, a one-storey front porch with turned posts and a little gingerbread trim, a standing-seam tin roof, brick end chimneys, tall two-over-two windows with dark green shutters.
10. `bld-farm-bungalow.png` (landscape, 6 × 4): a 1931 craftsman bungalow farmhouse: low-pitched front gable, deep eaves with exposed rafter tails, a full-width porch with tapered square columns on brick piers, cream-painted lap siding with brown trim, a brick chimney.
11. `bld-farm-ranch.png` (landscape, 6 × 4): a 1955 ranch house: long and low, a shallow hip roof with dark asphalt shingles, pale yellow siding with a band of red brick wainscot, a picture window, a small carport on the right, a turquoise front door.
12. `bld-farm-restored.png` (landscape, 6 × 4): the same old farmhouse restored in 2026: a two-storey white board-and-batten farmhouse with a deep front porch, a dark standing-seam metal roof carrying a neat row of black solar panels on the roof, rain barrels, a porch swing, potted herbs.

When done, list the files written and their pixel sizes.
```

## 3. Batch 4: trees, rocks, props (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool (use image editing from a reference where stated) and copy each final file to the exact repo path given. Do not edit any other files.

Original hand-painted art for a top-down farming sim set in the Hot Springs, Arkansas valley (Ouachita Mountains). STYLE REFERENCES (open and match closely): `games/farm-sim/art-src/pilot-oak.png` (trees and plants) and `games/farm-sim/art-src/pilot-plankbath.png` (man-made objects).

COMMON RULES: hand-painted gouache storybook game art; soft sunlight from the upper left; thin warm dark-brown outlines; high-angle three-quarter top-down view (camera ~55° down, orthographic); object centred, base touching the bottom-centre of the image; pure flat white background (#FFFFFF); NO ground patch, NO cast shadow, NO text, NO logos.

Files (all under `games/farm-sim/art-src/`), sizes in brackets:
1. `tree-oak-sp.png` [768x1024] EDIT of pilot-oak.png: identical tree and silhouette, early spring: fresh pale yellow-green new leaves, a little sparser so a few branches show, tiny reddish catkins.
2. `tree-oak-fa.png` [768x1024] EDIT of pilot-oak.png: identical tree, autumn: rusty orange, deep red and brown leaves, slightly thinner canopy.
3. `tree-oak-wi.png` [768x1024] EDIT of pilot-oak.png: identical trunk and branch structure, winter: bare branches only, a few dry brown leaves clinging; no snow.
4. `tree-pine.png` [768x1024]: a shortleaf pine (Pinus echinata) of the Ouachitas: tall straight reddish-brown plated trunk, irregular open crown of dark blue-green needle tufts in layered clumps (not a perfect cone), the lower trunk bare.
5. `tree-magnolia.png` [768x1024]: a southern magnolia street tree: dense rounded-pyramidal crown of large glossy dark green leaves with bronze undersides, a few big white flowers, short trunk.
6. `rock.png` [768x768]: a waist-high grey Ouachita sandstone boulder with lichen spots and a little moss at the base.
7. `outcrop.png` [768x768]: a small outcrop of white novaculite (very fine-grained, waxy white to pale grey stone with sharp conchoidal fractured edges, faint pink staining) jutting from the ground among a few pebbles.
8. `crystal.png` [768x768]: a cluster of clear Arkansas quartz crystal points (six-sided, glassy, slightly milky at the base) growing out of red-brown clay rock.
9. `tuft.png` [768x768]: a clump of tall wild grass and little bluestem with a few seed heads, about knee-high.
10. `bush.png` [768x768]: a low wild shrub (American beautyberry with purple berry clusters), roundish.
11. `bin.png` [768x768]: a wooden shipping crate on legs with a hinged slanted lid, iron straps, a rope handle; weathered planks.
12. `trough.png` [1024x768]: a long wooden water trough on a timber frame, water visible inside, a bucket beside it.
13. `sign.png` [768x768]: a weathered wooden notice board on two posts with a small gabled cap; the board is BLANK.
14. `campfire.png` [768x768]: a ring of stones with a small crackling campfire and a cast-iron pot on a tripod.

When done, list the files written and their pixel sizes.
```

## 4. Batch T: terrain textures (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Ground TEXTURES for a hand-painted top-down farming sim set in the Hot Springs, Arkansas valley. STYLE REFERENCE (open it and match its painting style, brush texture and scale of detail exactly): `games/farm-sim/art-src/pilot-grass.png`.

COMMON RULES for every texture: square 1024x1024; seen STRAIGHT FROM ABOVE (orthographic, no perspective, no horizon); frameless and evenly lit over the whole image (no light gradient, no vignette, no darker corners); even overall tone with only small-scale variation so it can be tiled; no large single features, no objects, no people, no text; hand-painted gouache game-art look like the reference.

Files (all under `games/farm-sim/art-src/`):
1. `tex-forest.png`: forest floor under oaks and shortleaf pines: brown pine needles, dry oak leaves, patches of moss and a few tiny twigs; muted browns and olive greens.
2. `tex-path.png`: a packed earth footpath: warm tan-brown dirt with small pebbles and faint footprints.
3. `tex-road.png`: an unpaved 1870s wagon road: rutted reddish-brown Arkansas clay, faint parallel wheel ruts running left-to-right, hoof marks, a little gravel.
4. `tex-gravel.png`: an 1880s crushed-stone (macadam) street: compacted grey-tan gravel with dust.
5. `tex-brick.png`: a 1920s street paved with worn red-brown vitrified paving bricks in a running bond, rows running left-to-right, sandy joints.
6. `tex-asphalt.png`: a 1950s asphalt road surface: dark grey with fine aggregate, a few patches and hairline cracks; no painted lines.
7. `tex-pavers.png`: 2026 restored downtown pavement: tidy red and terracotta clay pavers in a herringbone pattern with fine sand joints.
8. `tex-flagstone.png`: a sidewalk/plaza of pale grey-buff concrete and sandstone flagstones with thin joints.
9. `tex-sand.png`: a lake beach / shoreline of light tan sand with a few pebbles.
10. `tex-clay.png`: raw red Arkansas clay mud of a newly flooded lake shore: wet red-orange clay with drying cracks and small stumps-of-roots? NO stumps — just clay, cracks and pebbles.
11. `tex-tufa.png`: calcareous tufa / travertine on a hot-spring slope: cream, ivory and pale ochre stone with fine rippled flowstone texture, thin orange-brown mineral streaks and a few small patches of blue-green algae.
12. `tex-creek.png`: shallow clear creek water over a bed of rounded grey, tan and white (novaculite) pebbles, gentle ripple highlights; blue-green tint.
13. `tex-lake.png`: lake water seen from above: deep blue-green with soft painted ripples and small light glints; no bottom visible.
14. `tex-soil.png`: freshly tilled garden soil: dark brown crumbly earth in soft furrow ridges running left-to-right.
15. `tex-soil-wet.png`: the same tilled soil freshly watered: darker, wet sheen, a few small puddles in furrows.
16. `tex-snow.png`: a thin layer of fresh snow over ground: mostly white with cool blue shadows in small drifts, a few grass tips poking through.
17. `tex-rock.png`: exposed ridge-top bedrock: grey sandstone ledges and white novaculite with cracks and lichen.

When done, list the files written and their pixel sizes.
```

## 5. Batch 2: 1871/1886 buildings (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Original hand-painted building art for a top-down farming sim set in Hot Springs, Arkansas. STYLE REFERENCES (open and match closely: camera angle, painting style, light, outline colour, level of detail): `games/farm-sim/art-src/pilot-plankbath.png` and `games/farm-sim/art-src/pilot-cabin.png`. Slightly simplify fine texture so shapes read well when shown ~220 px wide.

COMMON RULES: hand-painted gouache storybook game art; soft sunlight from the upper left; thin warm dark-brown outlines; high-angle three-quarter top-down view (camera ~55° down, orthographic, no perspective convergence): roof seen from above and the south-facing front below it; the building is centred, fills the image width, and its front base touches the bottom edge; pure flat white background (#FFFFFF); NO ground, NO grass, NO cast shadow, NO people, NO text, NO lettering, NO logos; any sign board must be BLANK. These are generic, fictional buildings in period style — do not copy any specific real building.

Square = 1024x1024 (footprint 5 wide × 5 deep). Wide = 1536x1024 (footprint 10 wide × 5 deep; the building fills the full width and is wider than tall).

Files (under `games/farm-sim/art-src/`):
1. `bld-plankbath2.png` (square): a second 1870s frontier bathhouse, different from the pilot: board-and-batten walls stained reddish-brown, a low hip roof of wood shingles with a square vent cupola letting out a wisp of steam, a covered porch on posts along the front, two doors.
2. `bld-stage.png` (square): an 1870s stagecoach stop and livery office: board-and-batten building with a false front (blank sign), a wide covered porch, a hitching rail, a water barrel, and a small fenced corral corner at one side.
3. `bld-drug.png` (square): an 1870s frontier druggist's shop: narrow clapboard building with a false front (blank sign), a big multi-pane show window displaying rows of coloured glass bottles, a mortar-and-pestle shape carved on a blank bracket board, a plank porch.
4. `bld-tent2.png` (square): a smaller 1807 canvas A-frame wall tent used as a home: tied-back flap, a camp stool, a kettle on a small stone fire ring, a bedroll.
5. `bld-vicbath-free.png` (square): an 1880s plain public bathhouse: modest one-storey frame building painted pale grey with white trim, a simple gable roof with a steam vent, a wide central door with a transom, a plain porch, a blank sign board over the door.
6. `bld-vicbath-1.png` (square): an ornate 1880s Victorian wooden bathhouse: two storeys, painted cream with dark green trim, a corner tower with a pointed roof, decorative shingles, a deep wrap-around veranda with turned posts and gingerbread brackets, tall windows.
7. `bld-vicbath-2.png` (square): an 1880s Victorian bathhouse in a different style: red-painted clapboard with white trim, a mansard roof with patterned slate shingles and dormer windows, a central entry porch with a little pediment, a rooftop belvedere with steam rising.
8. `bld-vicbath-3.png` (square): an 1880s brick bathhouse with Moorish/exotic touches: buff brick, horseshoe-arched windows, a small onion-domed cupola, a striped awning over the entry.
9. `bld-brickstore.png` (square): an 1880s two-storey red-brick commercial building: cast-iron storefront with big display windows and a recessed door below, tall arched upper windows with stone hoods, a corbelled brick cornice, a blank sign band between the floors, a striped canvas awning.
10. `bld-house3.png` (square): an 1880s Victorian cottage: one-and-a-half storeys, painted sage green with cream and maroon trim, a steep front-facing gable with fish-scale shingles, a front porch with spindles, a brick chimney.
11. `bld-depot.png` (square): an 1880s small-town railway depot: one-storey board-and-batten building painted mustard yellow with brown trim, a very wide low hip roof with deep overhangs on big curved brackets, a bay window for the telegraph office, a baggage cart beside it.
12. `bld-grandhotel.png` (wide): an 1880s grand resort hotel: a long three-to-four storey building in Second Empire / Queen Anne style, red brick and white wood trim, a mansard roof with dormers, two corner towers with pointed roofs and a taller central tower, a long two-level front veranda with many columns, many tall windows.

When done, list the files written and their pixel sizes.
```

## 6. Batch 3: 1931 buildings (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Original hand-painted building art for a top-down farming sim set in Hot Springs, Arkansas. STYLE REFERENCES (open and match closely: camera angle, painting style, light, outline colour, level of detail): `games/farm-sim/art-src/pilot-plankbath.png` and `games/farm-sim/art-src/pilot-cabin.png`. Slightly simplify fine texture so shapes read well when shown ~220 px wide.

COMMON RULES: hand-painted gouache storybook game art; soft sunlight from the upper left; thin warm dark-brown outlines; high-angle three-quarter top-down view (camera ~55° down, orthographic, no perspective convergence): roof seen from above and the south-facing front below it; the building is centred, fills the image width, and its front base touches the bottom edge; pure flat white background (#FFFFFF); NO ground, NO grass, NO cast shadow, NO people, NO cars, NO text, NO lettering, NO logos; any sign must be BLANK. These are generic, fictional buildings in period style — do not copy any specific real building.

Square = 1024x1024 (footprint 5 wide × 5 deep). Wide = 1536x1024 (footprint 10 wide × 5 deep; the building fills the full width and is wider than tall).

The four "row" bathhouses are the 1910s–1920s generation of a spa-town bathhouse row; they must look like four DIFFERENT buildings of one family (similar height, all facing the street), each in its own revival style:
1. `bld-row-1.png` (square): Spanish Mission Revival bathhouse: smooth cream stucco walls, a curved scalloped parapet on the front, red clay barrel-tile roof, an arcaded loggia of round arches across the front, small bell-tower-like corner piers.
2. `bld-row-2.png` (square): Spanish Colonial / Mediterranean bathhouse crowned by a broad low DOME covered in glazed tiles (blue, gold and white mosaic pattern), cream stucco, a central arched entry with a tiled surround, small flanking domes or finials.
3. `bld-row-3.png` (square): Neoclassical bathhouse: buff-yellow brick, a flat roof hidden behind a stone balustrade, a central portico with four white Ionic columns and steps, tall arched windows with keystones.
4. `bld-row-4.png` (square): Renaissance Revival bathhouse: light grey-tan brick with terracotta trim, a low hipped red tile roof with wide bracketed eaves, a row of arched first-floor windows, a copper-and-glass marquee canopy over the door, stained-glass transoms.
5. `bld-club.png` (square): a 1930s downtown nightclub/supper club: two-storey dark red brick front with streamline-moderne curved corners, glass-block panels, a black-and-chrome entry with a canvas canopy, a tall vertical blade sign (BLANK, edged with unlit neon tubes) on the corner.
6. `bld-radio.png` (square): a 1930s small radio station: one-storey white Art Deco building with stepped parapet and vertical fluting, a round porthole window, and a tall steel lattice transmitting mast with guy wires rising behind it from the roof.
7. `bld-house4.png` (square): a 1930s small Tudor-revival cottage: steep front gable with a swooping roof line, cream stucco and brown half-timbering, an arched front door, a big chimney of mixed brick and stone.
8. `bld-twinhotel.png` (wide): a large 1920s Spanish Colonial Revival resort hotel: cream stucco, red tile roofs, TWIN bell-tower-like towers rising from the front façade, many rows of windows, an arcaded ground-floor loggia, a grand central entrance with a porte-cochère.
9. `bld-court.png` (wide): a 1930s tourist court (motor court): a U-shaped row of small identical stucco cottages painted white with green trim and red tile roofs, each with a little covered carport between cottages, a small office cottage in the centre, a lawn with a flagpole in the courtyard.
10. `bld-brickstore4.png` (square): EDIT/variant of a two-storey red-brick commercial building from the 1880s as it looks in 1931: same cast-iron storefront and arched upper windows, now with a faded painted wall ad space (blank), a green-and-white striped awning, sacks of feed and a seed display by the door.

When done, list the files written and their pixel sizes.
```

## 7. Batch C: crops, animals, lamps (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files. Up to 28 images; you may run several generations in parallel.

Original hand-painted art for a top-down farming sim. STYLE REFERENCES (open and match closely: painting style, light from upper left, warm dark-brown outlines, level of detail): `games/farm-sim/art-src/pilot-oak.png` (plants) and `games/farm-sim/art-src/pilot-plankbath.png` (objects).

COMMON RULES: hand-painted gouache storybook game art; high-angle three-quarter top-down view (camera ~55° down, orthographic); pure flat white background (#FFFFFF); NO soil patch, NO ground, NO cast shadow, NO text, NO labels.

A. CROP GROWTH SHEETS — each 1536x1024 landscape, showing the SAME plant at FIVE growth stages left to right in five equal columns, all standing on one common invisible baseline near the bottom, consistent scale across the five (a ripe corn plant is much taller than its sprout): (1) a small mound of planted seed with one or two seeds visible, (2) a tiny sprout, (3) a young leafy plant, (4) a full-grown plant not yet ripe, (5) the ripe plant with its produce clearly visible and colourful. Keep each stage well inside its column with white space between columns. Files under `games/farm-sim/art-src/`:
1. `crop-radish.png` — Washita radish: round red radishes with leafy green tops (ripe: red root shoulders showing).
2. `crop-corn.png` — field corn: tall stalk, ripe with two ears with husks and tassels.
3. `crop-beans.png` — pole beans on a short stake, ripe with hanging green pods.
4. `crop-squash.png` — winter squash vine with big leaves, ripe with an orange-tan squash.
5. `crop-wheat.png` — a small clump of wheat, ripe golden heads.
6. `crop-potato.png` — potato plant, ripe stage shows a few potatoes unearthed at the base.
7. `crop-cabbage.png` — cabbage, ripe pale green round head.
8. `crop-tomato.png` — staked tomato plant, ripe red tomatoes.
9. `crop-strawberry.png` — low strawberry plant, ripe red berries and white flowers.
10. `crop-sweetpotato.png` — sweet potato vine, ripe stage shows reddish sweet potatoes at the base.
11. `crop-pepper.png` — bell pepper plant, ripe green and red peppers.
12. `crop-peanut.png` — bushy peanut plant, ripe stage shows peanuts pulled up at the roots.
13. `crop-collards.png` — collard greens, large blue-green leaves.
14. `crop-sweetcorn.png` — sweet corn, ripe with yellow ears peeking from husks.
15. `crop-okra.png` — okra plant with pale yellow flower, ripe green pods pointing up.
16. `crop-watermelon.png` — watermelon vine, ripe big striped green watermelon.
17. `crop-heirloom.png` — staked heirloom tomato plant, ripe lumpy purple-red and yellow tomatoes.
18. `crop-hops.png` — hop bine climbing a twine pole, ripe pale green hop cones.
19. `crop-blueberry.png` — blueberry bush, ripe clusters of dusty blue berries.
20. `crop-tulip.png` — a clump of tulips, ripe with bright red and yellow blooms.

B. ANIMALS (single images, the animal seen from the three-quarter top-down view facing RIGHT, standing):
21. `animal-cow.png` [1024x1024] — a Jersey milk cow, fawn brown with darker face.
22. `animal-goat.png` [1024x1024] — a brown-and-white meat goat with small horns.
23. `animal-hen.png` [1024x1024] — a red-brown laying hen.

C. STREET LAMPS (single tall portrait images 512x1024, the lamp centred, its foot at the bottom centre, unlit daytime look):
24. `lamp-lantern.png` — an 1870s wooden post with a hanging tin-and-glass oil lantern on an iron hook.
25. `lamp-gas.png` — an 1880s cast-iron gas street lamp: fluted dark green post, four-sided glass lantern head with a crown top.
26. `lamp-deco.png` — a 1920s ornamental downtown lamp: a tall cast-iron post holding a CLUSTER of five white glass globes (one on top, four on curved arms).
27. `lamp-sodium.png` — a 1950s–60s galvanised steel street light pole with a curved arm and a 'cobra-head' luminaire.
28. `lamp-led.png` — a 2020s heritage-style black metal pole with a slim modern LED lantern head.

When done, list the files written and their pixel sizes.
```

## 8. Batch 5: 1955/2026 buildings (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Original hand-painted building art for a top-down farming sim set in Hot Springs, Arkansas. STYLE REFERENCES (open and match closely: camera angle, painting style, light, outline colour, level of detail): `games/farm-sim/art-src/pilot-plankbath.png`, `games/farm-sim/art-src/bld-farm-ranch.png` and `games/farm-sim/art-src/bld-farm-restored.png`. Slightly simplify fine texture so shapes read well when shown ~220 px wide.

COMMON RULES: hand-painted gouache storybook game art; soft sunlight from the upper left; thin warm dark-brown outlines; high-angle three-quarter top-down view (camera ~55° down, orthographic, no perspective convergence): roof seen from above and the south-facing front below it; the building is centred, fills the image width, and its front base touches the bottom edge; pure flat white background (#FFFFFF); NO ground, NO grass, NO parking lot, NO cast shadow, NO people, NO cars, NO text, NO lettering, NO logos; any sign must be BLANK. Generic fictional buildings in period style.

Square = 1024x1024 (footprint 5 wide × 5 deep). Wide = 1536x1024 (footprint 10 wide × 5 deep; fills the full width, wider than tall).

Files (under `games/farm-sim/art-src/`):
1. `bld-modernstore.png` (square): a 1955 farm-supply store: flat-roofed one-storey building with a pale concrete-block body, a full-width band of plate-glass windows with aluminium frames, a cantilevered flat canopy with a coral-red fascia, stacked feed sacks and a red wheelbarrow by the door, a BLANK rectangular sign board on the parapet.
2. `bld-drivein.png` (square): a 1950s roadside drive-in diner: low building with a big angled 'butterfly' roof, turquoise and white enamel panels, a walk-up window with a striped awning, a tall BLANK boomerang-shaped pylon sign beside it edged with unlit neon tubes.
3. `bld-ranchhouse.png` (square): a 1955 small ranch house: low hip roof with grey asphalt shingles, pale mint-green siding with a red-brick wainscot, a picture window, a front stoop with wrought-iron rail, a little carport on the side.
4. `bld-hardware.png` (square): a 2026 independent hardware store in a renovated two-storey brick building: painted dark green storefront with big windows, a black metal awning, potted plants and a bench by the door, a BLANK hanging blade sign.
5. `bld-house6.png` (square): a 2026 cottage: a restored craftsman bungalow painted soft blue-grey with white trim, a dark metal roof with a few black solar panels, a porch with rocking chairs and planters, a bicycle rack.
6. `bld-motel.png` (wide): a 1955 two-storey motor hotel: long building with an exterior walkway along the upper floor with a white steel railing, rows of turquoise doors and windows, coral-red accents, a flat roof, a breezeway, and a tall BLANK starburst/arrow pylon sign at one end edged with unlit neon tubes.
7. `bld-barn.png` (wide): a 1950s big red gambrel-roof barn used for a roadside trained-animal show: red board-and-batten walls with white trim, white X-braced doors, a hay loft door, a striped ticket booth canopy at the entrance, little bunting flags.
8. `bld-market.png` (wide): a 2026 downtown farmers' market: an open-sided steel-and-timber pavilion with a long standing-seam metal roof on slim posts, rows of market tables under it with crates of colourful produce, flowers and baskets, string lights along the eaves, a few canvas umbrellas.

When done, list the files written and their pixel sizes.
```

## 9. Batch 6: restored Row + vistas (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool (use image EDITING from the named source where stated) and copy the final file to the exact repo path given. Do not edit any other files.

PART A — four 2026 versions of existing building paintings, by EDITING the 1931 originals so each keeps the SAME building, camera, outline style and white background, now restored a century later for new uses (no text, no lettering, no logos; signs BLANK; no people, no cars, no ground, no cast shadow; output 1024x1024):
1. `games/farm-sim/art-src/bld-row-1r.png` from `games/farm-sim/art-src/bld-row-1.png`: restored and reused as a brewery: fresh cream stucco, new red tile, the loggia now a patio with a few café tables and big copper brewing kettles visible through tall glass doors, string lights, planters.
2. `games/farm-sim/art-src/bld-row-2r.png` from `bld-row-2.png`: restored as a spa: the tiled dome gleaming and repaired, crisp paint, potted palms by the arched entry, a blank wooden menu board.
3. `games/farm-sim/art-src/bld-row-3r.png` from `bld-row-3.png`: restored as a cultural centre: cleaned brick, white columns, a pair of blank vertical banners hung between columns, benches.
4. `games/farm-sim/art-src/bld-row-4r.png` from `bld-row-4.png`: restored as a boutique hotel: new copper marquee with warm lights, flower boxes in the windows, a doorman's lamp, a small luggage cart.

PART B — six era panoramas (landscape 1536x1024 each) for the title screen and chapter transitions of a historical farming game set in the Hot Springs valley, Arkansas. Same painting style family as `games/farm-sim/art-src/pilot-plankbath.png` but as wide scenic landscape illustrations: hand-painted gouache storybook look, rich light, depth with atmospheric perspective. SAME COMPOSITION in all six so they cross-fade well: the viewer stands on a gentle rise in the creek-bottom farmland; in the left foreground a family farmhouse and a small field of crops beside a split creek; a small creek winds from the foreground into the middle distance; in the centre middle distance a narrow valley town (the spa town) nestled at the foot of a forested mountain on the right whose lower slope steams with hot springs (white wisps rising from the hillside); long, low, rounded forested Ouachita Mountain ridges run left to right in layered blue-green bands behind; a big sky. Keep the most important things inside the central 60% of the width (it will be cropped on phones). NO text, NO logos, NO borders, NO people in the foreground (tiny distant figures are fine).
5. `games/farm-sim/art-src/vista-1.png` — 1807, early spring morning: untouched oak-and-shortleaf-pine forest, no town at all; only a few brush huts and a canvas trader's tent by the steaming springs, campfire smoke; the farm is a tiny round-log cabin with a stick chimney and a small new clearing with stumps.
6. `games/farm-sim/art-src/vista-2.png` — 1871, overcast late afternoon: a raw frontier boomtown squeezed into the narrow valley: two lines of plank bathhouses and false-front stores along a muddy street beside the open creek, wooden footbridges, stumps on the hills, a stagecoach; the farm is a board-and-batten house with a split-rail fence and a cow.
7. `games/farm-sim/art-src/vista-3.png` — 1886, golden summer evening: a booming Victorian resort: ornate wooden bathhouses with little towers and verandas in a row, red-brick business blocks, a large many-towered resort hotel on the hillside, a small railway with a steam train and depot, gas lamps; the farm is a red-brick two-storey farmhouse with orchards.
8. `games/farm-sim/art-src/vista-4.png` — 1931, bright clear day, colours like a 1930s linen postcard (saturated, slightly chalky): a row of cream-stucco and red-tile Mediterranean revival bathhouses, one with a tiled dome; a big twin-towered Spanish-style hotel; 1930s cars; and in the right middle distance a brand-new lake (just dammed) with raw red-clay shores and drowned tree stumps; the farm is a craftsman bungalow with a Model-A truck.
9. `games/farm-sim/art-src/vista-5.png` — 1955, warm sunset, Kodachrome colours: motor hotels with tall neon pylon signs (unlit or just lighting up, no readable words), a drive-in, tail-finned cars, the bathhouse row still there; the lake now mature with docks, fishing boats and a few lake cabins; the farm is a ranch house with a big red barn and a tractor.
10. `games/farm-sim/art-src/vista-6.png` — 2026, cool blue dusk with warm windows: the restored bathhouse row glowing with warm light and string lights, modern LED street lights, a farmers' market pavilion, lake homes and docks along the lake, a few solar panels on roofs; the farm is a restored white farmhouse with solar panels, raised beds and a greenhouse.

When done, list the files written and their pixel sizes.
```

## 10. Batch D: era farm props (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Original hand-painted props for a top-down farming sim. STYLE REFERENCES (open and match closely: camera angle, painting style, light from upper left, warm dark-brown outlines, level of detail): `games/farm-sim/art-src/pilot-plankbath.png`, `games/farm-sim/art-src/bin.png`, `games/farm-sim/art-src/trough.png`.

COMMON RULES: hand-painted gouache storybook game art; high-angle three-quarter top-down view (camera ~55° down, orthographic); object centred, its base touching the bottom-centre of the image; pure flat white background (#FFFFFF); NO ground patch, NO grass, NO cast shadow, NO people, NO text, NO logos. Size 1024x1024 unless stated.

Files (all under `games/farm-sim/art-src/`):
1. `deco-woodpile.png` — a stacked woodpile of split oak logs with a chopping block and an axe stuck in it.
2. `deco-haybale.png` — two small square hay bales stacked, golden straw, twine.
3. `deco-haystack.png` — a traditional round haystack of loose hay on a pole (19th-century style).
4. `deco-scarecrow.png` — a scarecrow on a pole with a straw hat and patched shirt, arms out.
5. `deco-barrels.png` — two wooden barrels and a crate.
6. `deco-wagon.png` [1536x1024] — an empty 1870s wooden farm wagon with spoked wheels, side view slightly from above, facing right.
7. `deco-modelA.png` [1536x1024] — a 1930s dark green Ford-Model-A-style pickup truck (generic, no badges), facing right.
8. `deco-tractor.png` [1536x1024] — a 1950s small red farm tractor (generic, no badges), facing right.
9. `deco-greenhouse.png` [1536x1024] — a small 2026 hoop greenhouse with clear plastic over metal hoops, seedlings inside.
10. `deco-raisedbeds.png` [1536x1024] — three cedar raised garden beds with lettuces and herbs and a drip line.
11. `deco-beehives.png` — two white wooden beehive boxes on a stand.
12. `deco-pump.png` — a cast-iron hand water pump on a short plank platform with a bucket.

When done, list the files written and their pixel sizes.
```

## 11. Batch S: street props, vehicles (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Original hand-painted props for a top-down farming sim set in a spa town (Hot Springs, Arkansas) across eras. STYLE REFERENCES (open and match closely: camera angle, painting style, light from upper left, warm dark-brown outlines, level of detail): `games/farm-sim/art-src/pilot-plankbath.png`, `games/farm-sim/art-src/bin.png`, `games/farm-sim/art-src/lamp-gas.png`.

COMMON RULES: hand-painted gouache storybook game art; high-angle three-quarter top-down view (camera ~55° down, orthographic); object centred, its base touching the bottom-centre of the image; pure flat white background (#FFFFFF); NO ground, NO road, NO cast shadow, NO people/drivers, NO text, NO badges, NO logos, NO licence plates. Vehicles are generic (no real brand), shown in side view slightly from above, facing RIGHT. Size 1536x1024 for vehicles, 1024x1024 for the rest.

Files (all under `games/farm-sim/art-src/`):
1. `street-buggy.png` — an 1870s–1880s one-horse buggy: a brown horse harnessed to a black open buggy with tall spoked wheels.
2. `street-carriage.png` — an 1880s two-horse closed carriage (hack) in dark green with brass lamps, two bay horses.
3. `street-sedan31.png` — a 1930s black four-door sedan with running boards, spare wheel, round headlights.
4. `street-coupe31.png` — a 1930s maroon two-door coupe with spoked wheels.
5. `street-car55a.png` — a 1955 two-tone turquoise-and-white sedan with chrome bumpers and small tail fins.
6. `street-car55b.png` — a 1955 coral-red-and-cream station wagon with chrome trim.
7. `street-car26a.png` — a 2026 small silver electric hatchback.
8. `street-car26b.png` — a 2026 dark blue compact SUV.
9. `street-bench.png` — a cast-iron and wood park bench.
10. `street-planter.png` — a large stone planter with flowering shrubs.
11. `street-hitch.png` — a wooden hitching rail with a water bucket.
12. `street-hydrant.png` — a red fire hydrant.
13. `street-bikes.png` — two bicycles in a bike rack (2026).
14. `street-umbrella.png` — a café table with two chairs and a canvas umbrella.

When done, list the files written and their pixel sizes.
```

## 12. Icons batch A (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Inventory ICONS for a hand-painted farming game. STYLE REFERENCE (open it and match its painting style, light from upper left and warm dark-brown outlines): `games/farm-sim/art-src/pilot-plankbath.png`; also `games/farm-sim/art-src/bin.png`.

Each file is a 1536x1024 landscape STRIP with exactly SIX icons in ONE horizontal row, left to right in the order listed, evenly spaced, each icon about the same size (roughly 200 px), centred vertically, with clear white space between icons so they can be cut apart. Icon style: chunky, bold, instantly readable at 40 px: a single object, slight three-quarter angle, rich colour, thick warm-brown outline, soft painted shading, small highlight. Pure flat white background (#FFFFFF), NO shadows on the ground, NO frames or slots, NO text, NO numbers.

Files (all under `games/farm-sim/art-src/`):
1. `icons-1.png`: hoe (wooden handle, iron blade) · watering can (tin, with a spout) · axe · pickaxe · scythe · bamboo fishing pole with line and red bobber.
2. `icons-2.png`: a split log of wood · a grey stone · a white novaculite whetstone-rock shard (waxy white with faint pink) · a clear quartz crystal point · a bundle of golden hay tied with twine · a burlap sack of animal feed.
3. `icons-3.png`: a small pile of iron hardware (nails, hinge, bolt) · an empty stoneware jug · a corked glass bottle of steaming hot spring water (blue-green, steam wisp) · a corked glass bottle of cold clear spring water (pale blue, droplets) · a bunch of wild greens (dandelion/poke leaves) · a resinous pine knot.
4. `icons-4.png`: a cluster of three hickory nuts · two acorns with caps · a cluster of blackberries with a leaf · a woodland chanterelle mushroom · a single oak leaf with maple-like lobes (green) · a tin pail of milk.
5. `icons-5.png`: a glass bottle of goat milk · a brown egg · a small cloth sack of yellow cornmeal · a bundle of cedar shingles · a stack of curved barrel staves · lumps of black charcoal.
6. `icons-6.png`: a whetstone (rectangular honing stone) · a cup of green tea · a jar of red fruit preserves with a cloth lid · a round wheel of white goat cheese with a wedge cut · a picnic basket with a checked cloth · a short section of split-rail fence.
7. `icons-7.png`: a small wooden storage chest · a brass lawn sprinkler · a coil of black drip-irrigation hose with an emitter · a tiny wooden rental hut (cabin) · a small roadside produce stand with a striped awning · an old enamel bathtub on wheels decorated for a race.

When done, list the files written and their pixel sizes.
```

## 13. Icons batch B (2026-10-29)

```text
Working directory: C:\Video Game Projects. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Inventory ICONS for a hand-painted farming game. STYLE REFERENCE (open it and match its painting style, light from upper left and warm dark-brown outlines): `games/farm-sim/art-src/pilot-plankbath.png`; also `games/farm-sim/art-src/bin.png`.

Each file is a 1536x1024 landscape STRIP with exactly SIX icons in ONE horizontal row, left to right in the order listed, evenly spaced, each icon about the same size (roughly 200 px), centred vertically, with clear white space between icons so they can be cut apart. Icon style: chunky, bold, instantly readable at 40 px: a single object, slight three-quarter angle, rich colour, thick warm-brown outline, soft painted shading, small highlight. Pure flat white background (#FFFFFF), NO shadows on the ground, NO frames or slots, NO text, NO numbers. Fish are shown whole, side view, facing right, accurate species markings.

Files (all under `games/farm-sim/art-src/`):
1. `icons-8.png`: bluegill bream · channel catfish (whiskers, spotted grey) · longnose gar · freshwater drum (silvery, humped back) · largemouth bass · white crappie.
2. `icons-9.png`: white bass (silver with faint stripes) · striped bass (bold dark stripes) · walleye (golden, glassy eye) · rainbow trout (pink stripe, spots) · a red round radish with leaves · an ear of field corn with husk.
3. `icons-10.png`: a handful of green bean pods · an orange-tan winter squash · a sheaf of golden wheat · two brown potatoes · a pale green cabbage head · a red tomato with green calyx.
4. `icons-11.png`: a red strawberry with leaves · a reddish sweet potato · a green bell pepper and a red one · a handful of peanuts in shells · a bunch of blue-green collard leaves · an ear of yellow sweet corn with husk pulled back.
5. `icons-12.png`: two green okra pods · a striped green watermelon with a slice cut · a lumpy purple-red heirloom tomato · a cluster of pale green hop cones · a handful of blueberries · a bunch of red and yellow tulips.
6. `icons-13.png`: a plain kraft-paper seed packet with a folded top (blank, no picture, no text) · a small cloth seed sack (blank) · a wooden crate (blank) · a woven basket (empty) · a brass key · a gold coin.

When done, list the files written and their pixel sizes.
```

## 14. Paints spring props (2026-10-29)

```text
Working directory: C:\Video Game Projects\repos\hsg-garden-sim. Image-generation task: generate each image with your image generation tool and copy the final file to the exact repo path given. Do not edit any other files.

Props for a hand-painted top-down farming game set in the Hot Springs valley. STYLE REFERENCE (open them and match the painting style: gouache storybook look, three-quarter top-down view, soft light from the upper left, warm dark-brown outlines): `art-src/pilot-plankbath.png` and `art-src/deco-pump.png`.

Each image: one object only, centred, on a pure flat white background (#FFFFFF), with NO ground, NO cast shadow on the ground, NO frame, NO text, NO people, and white space all round it.

Files (all under `art-src/`):
1. `prop-springbox.png` (1024x1024): a small 1890s covered hot-spring box: a low square box of rough cream-and-grey tufa (porous travertine) masonry blocks about knee high, with a heavy dark iron hatch lid on top (bolted rim, ring handle), a thin trickle of warm water weeping from one lower corner and a little blue-green algae and rusty-orange mineral stain below it. Seen from the same three-quarter top-down angle as the reference (top face and front face both visible). Square footprint.
2. `prop-soakpool.png` (1024x1024): a square outdoor stone soaking basin built into the ground, as seen from three-quarter top-down: a rim of dressed cream limestone/tufa blocks around a sunken basin of clear turquoise hot-spring water, deeper teal in the middle, a few stone steps down into it on the near (bottom) side, ripples and soft highlights on the water, faint steam wisps over the water, a little blue-green algae on the inner rim. Square footprint filling most of the image.
3. `prop-culvert.png` (1536x1024): a Victorian stone creek culvert headwall seen from the downstream side at three-quarter top-down: a low wall of cut grey sandstone blocks about 2.5x as wide as it is tall, with one round-topped arch opening in the middle (dark inside), a carved keystone, and a coping of flat stones along the top. Water from the arch spills out at the bottom into a short foamy riffle. Keep the water short (just the spill), the wall is the subject.

When done, list the files written and their pixel sizes.
```

## 15. Garvan batch: garden buildings, trees, peafowl, pine straw, title panorama (2026-11-01)

For the conversion to Woodland Gardens Keeper. Run with the Codex CLI image tool (GPT-6.1 Sol) via the codex-rescue agent. Styles follow the pilot images; no photographs were given as references.

```text
Working directory: C:\Video Game Projects\repos\hsg-garden-sim. Image-generation task: generate each image with your image generation tool and copy the final file to the exact path given (all under art-src/). Do not edit any other files. Report the paths when done.

Original hand-painted art for a top-down gardening sim set at a woodland botanical garden on a lake in the Ouachita Mountains of Arkansas (Garvan Woodland Gardens, Hot Springs). Paint from the written descriptions only; do not reproduce any photograph.

STYLE REFERENCES (open and match them closely: camera angle, painting style, light, level of detail, outline colour): art-src/pilot-plankbath.png and art-src/pilot-cabin.png for buildings; art-src/pilot-oak.png for trees; art-src/animal-hen.png for animals; art-src/pilot-grass.png for the texture; art-src/vista-6.png for the panorama. Slightly simplify fine texture so shapes read when shown small (~200 px wide), keeping the same painterly look.

COMMON RULES: hand-painted gouache storybook game art; soft sunlight from the upper left; thin warm dark-brown outlines (not black); rich but natural colours; crisp edges, no blur, no vignette. NO text, NO lettering, NO logos, NO signatures, NO people. Where a sign board is mentioned it must be BLANK.
Objects (buildings, trees, animals): high-angle three-quarter top-down view (camera tilted ~55° down, orthographic, no perspective convergence): roofs/tops seen from above and the south-facing front below; centred, filling the image width, base touching the bottom of the image; pure flat white background (#FFFFFF); NO ground, NO grass base, NO cast shadow.

BUILDINGS (landscape 1536x1024 unless stated; fill the width):
1. art-src/bld-chapel.png — portrait 1024x1536 (footprint 6 wide × 8 deep): a modern woodland wedding chapel in the organic Ozark architecture tradition: a very tall, steep gable roof of dark grey standing-seam metal; the long walls are almost entirely floor-to-ceiling glass set in a dense lattice of pale golden yellow-pine posts and crossing beams, so the timber frame shows through the glass like a forest of trunks; a narrow stone base; tall glass double doors centred on the south gable end with a small flagstone landing.
2. art-src/bld-carillon.png — portrait 512x1536 (footprint 1 wide, very tall): a slender free-standing bell tower made of 16 tall, thin copper-clad columns rising in a tight square cluster, warm copper with a little green patina at the tops, on a low square stone plinth.
3. art-src/bld-welcome.png — footprint 8 × 5: a garden visitor center built of native fieldstone and dark-stained wood, a long low building with a broad hipped roof of brown shingles and deep eaves on timber brackets, a row of tall windows, wooden double doors centred on the front, stone planters either side. The sign board over the door is BLANK.
4. art-src/bld-pavilion.png — footprint 6 × 5: an open-air garden pavilion by an organic-modernist architect: warm sandstone piers and low sandstone walls, redwood beams, and a faceted, crystalline steel-and-glass roof that rises to a central oculus shaped like an unfolding flower; open sides, a flagstone floor visible inside.
5. art-src/bld-cafe.png — square 1024x1024 (footprint 5 × 4): a small rustic garden café of stained wood and fieldstone with a green metal roof, a covered porch with a few small round tables and chairs, a serving window, and a BLANK sign board.
6. art-src/bld-treehouse.png — square 1024x1024 (footprint 5 × 4): a modern sculptural treehouse raised on slender dark steel columns: walls of curved heat-treated pine slats forming an organic lantern-like shape, a steep ramp-walkway leading up to it, open lookout decks.
7. art-src/bld-greenhouse.png — landscape 1536x1024 (footprint 5 × 4): a working glass greenhouse with a white metal frame and gable roof, potting benches with seedling flats visible through the glass, a few clay pots by the door.
8. art-src/bld-storage.png — landscape 1536x1024 (footprint 5 × 3): a plain grey corrugated-metal storage barn with a big roll-up door, a few wooden pallets and coiled cables by it; a BLANK sign board above the door.
9. art-src/bld-brides.png — square 1024x1024 (footprint 4 × 3): a small elegant stone-and-timber cottage (a bride's dressing hall) with a steep slate-grey roof, a timber porch and window boxes of white flowers.
10. art-src/bld-restroom.png — landscape 1536x1024 (footprint 3 × 2): a small park restroom building of fieldstone with a dark shingle roof and two wooden doors.

TREES (portrait 768x1024; base of trunk at bottom-centre; same scale feel as pilot-oak.png but smaller trees):
11. art-src/tree-jmaple.png — a Japanese maple in summer: graceful layered, horizontal tiers of finely cut deep red-purple leaves on a low, wide, slightly twisting trunk.
12. art-src/tree-jmaple-fa.png — EDIT of tree-jmaple.png: identical tree, autumn: blazing scarlet and orange leaves.
13. art-src/tree-jmaple-wi.png — EDIT of tree-jmaple.png: identical trunk and branches, winter: bare, elegant twiggy branches.
14. art-src/tree-dogwood.png — a flowering dogwood in summer: small tree with a layered, spreading crown of soft green oval leaves.
15. art-src/tree-dogwood-sp.png — EDIT of tree-dogwood.png: identical tree in full spring bloom, covered in white four-petalled flowers, few leaves.
16. art-src/tree-dogwood-fa.png — EDIT of tree-dogwood.png: identical tree, autumn: deep burgundy-red leaves and a few red berries.
17. art-src/tree-dogwood-wi.png — EDIT of tree-dogwood.png: identical trunk and branches, winter: bare grey branches with small round flower buds.
18. art-src/tree-redbud-sp.png — an eastern redbud in spring bloom: small tree with dark branches thickly covered in magenta-pink pea-like flowers, no leaves yet.
19. art-src/tree-redbud.png — EDIT of tree-redbud-sp.png: identical tree in summer: heart-shaped green leaves.
20. art-src/tree-cypress.png — a bald cypress by a lake: tall narrow pyramidal tree with soft feathery green needles, a buttressed flared base with a few knobby "knees".

ANIMALS (square 1024x1024, facing RIGHT, three-quarter top-down like animal-hen.png):
21. art-src/animal-peacock.png — an Indian blue peacock walking: iridescent royal-blue neck and breast, a small fan-shaped crest, long green-and-bronze train of eye-feathers trailing behind on the ground, folded.
22. art-src/animal-peacock-fan.png — the same peacock displaying: the train raised in a huge upright semicircular fan of green feathers covered in blue-and-bronze "eyes", seen from the front-right, the blue body small in front of it.
23. art-src/animal-peahen.png — an Indian peahen: mottled grey-brown body, white belly, a metallic green lower neck and a small crest; short tail.

TEXTURE:
24. art-src/tex-pinestraw.png — square 1024x1024, a frameless TEXTURE seen straight from above (not three-quarter): a garden bed mulched with long-leaf pine straw: a dense, even mat of long thin russet, copper and tan pine needles crossing at random angles, very even overall tone and evenly lit (no light gradient, no vignette, no large features, no objects) so it can tile seamlessly.

PANORAMA:
25. art-src/vista-garvan.png — landscape 1536x1024, a full painted scene (not on white; this is a title-screen panorama in the style of vista-6.png): spring morning at a woodland garden on a lake in the Ouachita Mountains: in the foreground a lawn edged with drifts of pink and white azaleas and beds of red, yellow and white tulips; in the middle distance, among tall shortleaf pines, a modern wood-and-glass chapel with a very tall steep gable; behind it a blue lake with forested ridges beyond; a blue peacock with its train trailing walks on the lawn. No people, no text.
```

Follow-up (same session): `tree-dogwood.png` came back with flowers; it was regenerated with: "Regenerate art-src/tree-dogwood.png (portrait 768x1024): EDIT of art-src/tree-dogwood-sp.png — identical tree, trunk, branch structure and silhouette, but in SUMMER: NO flowers at all, the crown fully covered in soft mid-green oval dogwood leaves. Same painted style, same white #FFFFFF background, base of trunk at bottom-centre, no ground, no shadow, no text."
