import fs from "fs";
import path from "path";
import { execSync, execFileSync } from "child_process";

const DOWNLOADS_DIR = path.join(process.env.HOME, "Downloads");
const CHAR_DIR = path.join(process.cwd(), "public", "characters");
const VIDEO_DIR = path.join(process.cwd(), "public", "videos");
fs.mkdirSync(VIDEO_DIR, { recursive: true });

// Priority Queue: Unique, non-duplicated videos for every character state & custom job prop!
const VIDEO_QUEUE = [
  {
    id: "boba-working",
    inputFile: "16x9-scene-boba-working.jpg",
    outputFile: "boba-working.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute shaggy matcha-mint plush octopus with tortoiseshell glasses and yellow bow types cheerfully on the silver mini laptop with its chubby mint tentacles next to the stacked mail envelopes and INTERN desk badge. Occasionally it blinks with smooth, plain matcha-mint plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "nori-working",
    inputFile: "16x9-scene-nori-working.jpg",
    outputFile: "nori-working.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute periwinkle fluffy plush octopus in a mustard knit beanie and dark square glasses gently sweeps the glowing translucent teal magnifying security shield back and forth over the sealed white envelope on the desk while nodding carefully. Occasionally it blinks with smooth, plain periwinkle plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "mochi-working",
    inputFile: "16x9-scene-mochi-working.jpg",
    outputFile: "mochi-working.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute strawberry-cream fluffy plush octopus with pink bow and pastel headphones types cheerfully on the silver mini laptop with its chubby tentacles while swaying slightly beside the pink podcast microphone. Occasionally it blinks with smooth, plain strawberry-pink plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "gumbo-working",
    inputFile: "16x9-scene-gumbo-working.jpg",
    outputFile: "gumbo-working.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute coral-tangerine fluffy plush octopus in a beige fedora and sky-blue tie taps the buttons of the mint-green 3D desk calculator with one chubby coral tentacle while checking the spiral financial ledger beside the gold coins. Occasionally it blinks with smooth, plain coral-tangerine plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "truffle-working",
    inputFile: "16x9-scene-truffle-working.jpg",
    outputFile: "truffle-working.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute cocoa-taupe professor plush octopus with white side-hair, gold glasses, and plaid scarf holds the brass magnifying glass over the confidential dossiers, nodding thoughtfully while inspecting the documents. Occasionally it blinks with smooth, plain cocoa-taupe plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "zest-working",
    inputFile: "16x9-scene-zest-working.jpg",
    outputFile: "zest-working.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute aqua-turquoise fluffy plush octopus with a mohawk tuft, headset, and yellow tie bobs energetically next to the teal-and-pink megaphone and points happily toward the rising green 3D growth bar chart. Occasionally it blinks with smooth, plain aqua-turquoise plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "plum-working",
    inputFile: "16x9-scene-plum-working.jpg",
    outputFile: "plum-working.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. Preserve the exact chunky round fluffy sherpa-fleece plush toy texture, short chubby compact tentacles, cat-eye glasses, and pearl necklace of the royal-plum violet plush octopus from the reference image — do NOT elongate or flatten the tentacles. It taps its short chubby front tentacle thoughtfully beside the HR clipboard, fountain pen, and sealed envelopes. Keep the eyes simple round white plush toy spheres with solid black pupils, blinking occasionally with smooth plain plum-violet plush eyelids. Smooth 3D plush animation.",
  },
  {
    id: "zest-panicked",
    inputFile: "16x9-octo-12-zest.jpg",
    outputFile: "zest-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute aqua-turquoise fluffy plush octopus with a mohawk tuft, headset, and yellow tie widens its eyes in panicked shock, raising two chubby aqua tentacles nervously toward its cheeks and trembling in alarm. Occasionally it blinks with smooth, plain aqua-turquoise plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "plum-panicked",
    inputFile: "16x9-octo-14-plum.jpg",
    outputFile: "plum-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. Preserve the exact chunky round fluffy sherpa-fleece plush toy texture, short chubby compact tentacles, cat-eye glasses, and pearl necklace of the royal-plum violet plush octopus from the reference image — do NOT elongate or flatten the tentacles. It widens its eyes in surprised shock and raises two short chubby front tentacles nervously while trembling slightly. Keep the eyes simple round white plush toy spheres with solid black pupils, blinking occasionally with smooth plain plum-violet plush eyelids. Smooth 3D plush animation.",
  },
  {
    id: "boba-panicked",
    inputFile: "16x9-octo-04-boba.jpg",
    outputFile: "boba-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute shaggy matcha-mint plush octopus with tortoiseshell glasses and yellow bow widens its eyes in panicked shock, raising two chubby mint tentacles to its cheeks and trembling nervously with a worried open expression. Occasionally it blinks with smooth, plain matcha-mint plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "nori-panicked",
    inputFile: "16x9-octo-06-nori.jpg",
    outputFile: "nori-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute periwinkle-blue fluffy plush octopus in a mustard knit beanie and square glasses widens its eyes in panicked shock, raising both front periwinkle tentacles in alarm and trembling nervously behind its glasses. Occasionally it blinks with smooth, plain periwinkle plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "mochi-panicked",
    inputFile: "16x9-octo-07-mochi.jpg",
    outputFile: "mochi-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute strawberry-cream fluffy plush octopus with pink headphones widens its eyes in panicked shock, raising two chubby strawberry-pink tentacles in alarm and trembling nervously. Occasionally it blinks with smooth, plain strawberry-pink plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "truffle-panicked",
    inputFile: "16x9-octo-11-truffle.jpg",
    outputFile: "truffle-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute cocoa-taupe fluffy plush octopus professor with white eyebrows, gold glasses, and scarf widens its eyes in panicked shock, raising its front tentacles nervously while trembling in alarm. Occasionally it blinks with smooth, plain cocoa-taupe plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "gumbo-panicked",
    inputFile: "16x9-octo-08-gumbo.jpg",
    outputFile: "gumbo-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute coral-tangerine fluffy plush octopus in a beige fedora and blue tie widens its eyes in panicked shock, raising two chubby coral tentacles to hold its trembling fedora in alarm. Occasionally it blinks with smooth, plain coral-tangerine plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "plum-promoted",
    inputFile: "16x9-octo-14-plum.jpg",
    outputFile: "plum-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. Preserve the exact chunky round fluffy sherpa-fleece plush toy texture, short chubby compact tentacles, cat-eye glasses, and pearl necklace of the royal-plum violet plush octopus from the reference image — do NOT elongate or flatten the tentacles. It bounces gently up and down with a happy smile and waves two short chubby front tentacles. Keep the eyes simple round white plush toy spheres with solid black pupils, blinking occasionally with smooth plain plum-violet plush eyelids. Smooth 3D plush animation.",
  },
  {
    id: "truffle-sleeping",
    inputFile: "16x9-octo-11-truffle.jpg",
    outputFile: "truffle-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute cocoa-taupe fluffy plush octopus professor with white eyebrows, gold glasses, and scarf closes its smooth plain cocoa-taupe plush eyelids into a peaceful horizontal line, rests softly on its folded front tentacles, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "truffle-promoted",
    inputFile: "16x9-octo-11-truffle.jpg",
    outputFile: "truffle-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute cocoa-taupe fluffy plush octopus professor with white eyebrows, gold glasses, and scarf bounces cheerfully in victory celebration, raising its front tentacles proudly with a warm beaming smile. Occasionally it blinks with smooth, plain cocoa-taupe plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "gumbo-sleeping",
    inputFile: "16x9-octo-08-gumbo.jpg",
    outputFile: "gumbo-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute coral-tangerine fluffy plush octopus in a beige fedora and blue tie closes its smooth plain coral-tangerine plush eyelids into a peaceful horizontal line, tilts its fedora slightly forward, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "zest-sleeping",
    inputFile: "16x9-octo-12-zest.jpg",
    outputFile: "zest-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute aqua-turquoise fluffy plush octopus with a mohawk tuft, headset, and yellow tie closes its smooth plain aqua-turquoise plush eyelids into a peaceful horizontal line, rests softly on its folded front tentacles, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "gumbo-promoted",
    inputFile: "16x9-octo-08-gumbo.jpg",
    outputFile: "gumbo-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute coral-tangerine fluffy plush octopus in a beige fedora and blue tie leaps up joyfully in a victory celebration, waving its chubby coral tentacles happily with a big cheerful smile. Occasionally it blinks with smooth, plain coral-tangerine plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "zest-promoted",
    inputFile: "16x9-octo-12-zest.jpg",
    outputFile: "zest-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute aqua-turquoise fluffy plush octopus with a mohawk tuft, headset, and yellow tie bounces joyfully in victory celebration, throwing its chubby aqua tentacles up with a big excited smile. Occasionally it blinks with smooth, plain aqua-turquoise plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "mochi-sleeping",
    inputFile: "16x9-octo-07-mochi.jpg",
    outputFile: "mochi-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute strawberry-cream fluffy plush octopus with pink headphones closes its smooth plain strawberry-pink plush eyelids into a peaceful horizontal line, rests softly on its folded front tentacles, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "boba-promoted",
    inputFile: "16x9-octo-04-boba.jpg",
    outputFile: "boba-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute shaggy matcha-mint plush octopus with tortoiseshell glasses and yellow bow leaps up joyfully in a victory celebration, waving its chubby mint tentacles happily with a big cheerful smile. Occasionally it blinks with smooth, plain matcha-mint plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "nori-promoted",
    inputFile: "16x9-octo-06-nori.jpg",
    outputFile: "nori-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute periwinkle-blue fluffy plush octopus in a mustard knit beanie and square glasses bounces joyfully in a victory celebration, raising its chubby periwinkle tentacles high in a cheer with a bright happy smile. Occasionally it blinks with smooth, plain periwinkle plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "mochi-promoted",
    inputFile: "16x9-octo-07-mochi.jpg",
    outputFile: "mochi-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute strawberry-cream fluffy plush octopus with pink headphones bounces joyfully in a happy dance, throwing its chubby strawberry-pink tentacles up in celebration with a bright happy smile. Occasionally it blinks with smooth, plain strawberry-pink plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "plum-sleeping",
    inputFile: "16x9-octo-14-plum.jpg",
    outputFile: "plum-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute royal-plum violet plush octopus with silver-streaked pompadour, cat-eye glasses, and pearl necklace closes its smooth plain plum-violet plush eyelids into a peaceful horizontal line and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "inko-panicked",
    inputFile: "16x9-scene-inko-panicked.jpg",
    outputFile: "inko-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The panicked sky-blue fluffy plush octopus in a navy beret and silver round glasses trembles nervously with its front tentacles raised in shock behind the open silver laptop and glowing red-orange alert triangle badge, glancing worriedly toward the laptop screen. Occasionally it blinks with smooth, plain sky-blue plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "barnaby-panicked",
    inputFile: "16x9-scene-barnaby-working.jpg",
    outputFile: "barnaby-panicked.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lavender-purple fluffy plush octopus in a black top hat and curly black moustache suddenly widens its eyes in panicked shock, raising both front lavender tentacles to clutch its cheeks nervously while looking down at the stacked white envelopes on the desk as its top hat wobbles slightly. Occasionally it blinks with smooth, plain lavender plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "boba-sleeping",
    inputFile: "16x9-octo-04-boba.jpg",
    outputFile: "boba-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute shaggy matcha-mint plush octopus with tortoiseshell glasses and yellow bow closes its smooth plain matcha-mint plush eyelids into a peaceful horizontal line, rests its chin softly on its folded front tentacles, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "nori-sleeping",
    inputFile: "16x9-octo-06-nori.jpg",
    outputFile: "nori-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute periwinkle-blue fluffy plush octopus in a mustard knit beanie and dark square glasses closes its smooth plain periwinkle plush eyelids into a peaceful horizontal line, rests softly on its folded front tentacles, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "mochi-sleeping",
    inputFile: "16x9-octo-07-mochi.jpg",
    outputFile: "mochi-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute strawberry-cream fluffy plush octopus with pink headphones closes its smooth plain strawberry-pink plush eyelids into a peaceful horizontal line, rests softly on its folded front tentacles, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "squidney-promoted",
    inputFile: "16x9-octo-03-squidney.jpg",
    outputFile: "squidney-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute pastel-pink fluffy plush octopus with headset and purple striped tie bounces joyfully in victory celebration, throwing its chubby pink tentacles high into the air with a huge happy smile. Occasionally it blinks with smooth, plain pastel-pink plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "waffles-skeptical",
    inputFile: "16x9-scene-board-cfo.jpg",
    outputFile: "waffles-skeptical.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute peach-orange fluffy plush octopus CFO judge in a green banker visor and polka-dot bowtie frowns sternly and shakes its head with strong disapproval while scrutinizing a suspicious financial ledger and tapping a tentacle skeptically on the wooden tribunal table. Occasionally it narrows its eyes and blinks with smooth, plain peach-orange plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "yuzu-skeptical",
    inputFile: "16x9-scene-board-vp.jpg",
    outputFile: "yuzu-skeptical.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lemon-yellow fluffy plush octopus VP judge in a backwards teal cap and star sunglasses frowns sternly with disapproval, crossing its chubby yellow tentacles tightly and shaking its head skeptically at the 3D growth chart on the wooden tribunal table. Smooth 3D plush animation.",
  },
  {
    id: "pebble-promoted",
    inputFile: "16x9-scene-board-ciso.jpg",
    outputFile: "pebble-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lilac-grey fluffy plush octopus CISO judge in a houndstooth Sherlock cap and brass monocle smiles warmly with relief and nods approvingly while giving a happy front tentacle gesture behind the mahogany tribunal table. Occasionally it blinks with smooth, plain lilac-grey plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "waffles-promoted",
    inputFile: "16x9-scene-board-cfo.jpg",
    outputFile: "waffles-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute peach-orange fluffy plush octopus CFO judge in a green banker visor and polka-dot bowtie beams with a big happy smile, nodding enthusiastically and raising two chubby peach tentacles in an approving cheer behind the wooden tribunal table. Occasionally it blinks with smooth, plain peach-orange plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "yuzu-promoted",
    inputFile: "16x9-scene-board-vp.jpg",
    outputFile: "yuzu-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lemon-yellow fluffy plush octopus VP judge in a backwards teal cap and star sunglasses grins excitedly, bouncing happily behind the wooden tribunal table and lifting its megaphone in a celebratory cheer. Smooth 3D plush animation.",
  },
  {
    id: "squidney-idle",
    inputFile: "16x9-octo-03-squidney.jpg",
    outputFile: "squidney-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute happy pastel-pink plush octopus with a warm smile, headset, and purple striped tie sways cheerfully from side to side and lifts one front chubby pink tentacle to wave a friendly hello while resting on break. Occasionally it blinks with smooth, plain pastel-pink plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "barnaby-promoted",
    inputFile: "16x9-octo-02-barnaby.jpg",
    outputFile: "barnaby-promoted.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lavender-purple fluffy plush octopus leaps up joyfully in a victory celebration, throwing its front chubby fluffy tentacles high into the air in a cheer while tipping its black felt top hat proudly and wiggling its curly black moustache. Occasionally it blinks with smooth, plain lavender plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "inko-sleeping",
    inputFile: "16x9-octo-01-inko.jpg",
    outputFile: "inko-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute sky-blue fluffy plush octopus closes its smooth plain sky-blue plush eyelids into a peaceful horizontal line, rests its chubby cheek against two folded front tentacles like a cozy pillow, and gently rises and falls in a slow sleepy snoozing rhythm while its navy beret tilts softly. Smooth 3D plush animation.",
  },
  {
    id: "barnaby-sleeping",
    inputFile: "16x9-octo-02-barnaby.jpg",
    outputFile: "barnaby-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lavender-purple fluffy plush octopus closes its smooth plain lavender plush eyelids into a peaceful horizontal line, pulls its black top hat slightly forward while snoozing peacefully, and gently rises and falls in a slow sleepy breathing rhythm as its curly black moustache bobs softly. Smooth 3D plush animation.",
  },
  {
    id: "squidney-sleeping",
    inputFile: "16x9-octo-03-squidney.jpg",
    outputFile: "squidney-sleeping.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute pastel-pink fluffy plush octopus with headset and purple striped tie closes its smooth plain pastel-pink plush eyelids into a peaceful horizontal line, leans softly onto its folded front pink tentacles, and gently rises and falls in a slow sleepy snoozing rhythm. Smooth 3D plush animation.",
  },
  {
    id: "pebble-slams-gavel",
    inputFile: "16x9-scene-board-ciso.jpg",
    outputFile: "pebble-slams-gavel.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lilac-grey fluffy plush octopus CISO judge in a houndstooth Sherlock cap and brass monocle raises the wooden judge gavel high with its front tentacle and slams it firmly onto the wooden sound block on the mahogany tribunal table with serious determination. Occasionally it blinks with smooth, plain lilac-grey plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "boba-idle",
    inputFile: "16x9-octo-04-boba.jpg",
    outputFile: "boba-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute baby matcha-mint green shaggy plush octopus gently bounces and wiggles its tiny chubby fluffy tentacles happily, tilting its head so its fluffy pom-pom hair tuft, oversized tortoiseshell glasses, and yellow bow bob softly. Occasionally it blinks with smooth, plain mint-green plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "waffles-idle",
    inputFile: "16x9-octo-05-waffles.jpg",
    outputFile: "waffles-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute curly sherpa-fleece peach plush octopus gently bounces and wiggles its chubby fluffy tentacles cheerfully, tilting its head slightly so its translucent green banker visor cap and red polka-dot bowtie bob softly. Occasionally it blinks with smooth, plain peach plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "pebble-idle",
    inputFile: "16x9-octo-09-pebble.jpg",
    outputFile: "pebble-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lilac-grey tweed-fluffy plush octopus gently bounces and wiggles its chubby tentacles thoughtfully, tilting its head so its houndstooth Sherlock detective cap and brass monocle bob softly. Occasionally it blinks with smooth, plain lilac-grey plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "yuzu-idle",
    inputFile: "16x9-octo-10-yuzu.jpg",
    outputFile: "yuzu-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute lemon-yellow fuzzy plush octopus bounces energetically and wiggles its chubby tentacles happily, tilting its head so its backwards pastel-teal baseball cap and pink star sunglasses bob cheerfully. Occasionally it blinks with smooth, plain yellow plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "nori-idle",
    inputFile: "16x9-octo-06-nori.jpg",
    outputFile: "nori-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute periwinkle-indigo fluffy plush octopus gently bounces and wiggles its chubby fluffy tentacles happily, tilting its head so its spiky blue hair tufts, mustard knitted beanie, and square black glasses bob softly. Occasionally it blinks with smooth, plain periwinkle plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "mochi-idle",
    inputFile: "16x9-octo-07-mochi.jpg",
    outputFile: "mochi-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute cloud-fluffy strawberry-cream plush octopus gently bounces and wiggles its chubby fluffy tentacles sweetly, tilting its head so its pink hair bow and pastel-pink headphones around its neck bob softly. Occasionally it blinks with smooth, plain pastel-pink plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "gumbo-idle",
    inputFile: "16x9-octo-08-gumbo.jpg",
    outputFile: "gumbo-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute coral-tangerine fluffy plush octopus gently bounces and wiggles its thick chubby tentacles confidently, tilting its head so its beige fedora hat, bushy ginger eyebrows, and sky-blue tie bob softly. Occasionally it blinks with smooth, plain coral plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "truffle-idle",
    inputFile: "16x9-octo-11-truffle.jpg",
    outputFile: "truffle-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute warm cocoa-taupe professor plush octopus gently nods and wiggles its chubby tentacles wisely, tilting its head so its fluffy white side-hair, gold reading glasses, white moustache, and knitted scarf bob softly. Occasionally it blinks with smooth, plain taupe plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "zest-idle",
    inputFile: "16x9-octo-12-zest.jpg",
    outputFile: "zest-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute electric aqua-turquoise spiky plush octopus bounces and wiggles its chubby tentacles energetically, tilting its head so its tall fluffy mohawk tuft, headset, and yellow tie bob softly. Occasionally it blinks with smooth, plain aqua plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "pistachio-idle",
    inputFile: "16x9-octo-13-pistachio.jpg",
    outputFile: "pistachio-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute pistachio-green curly-fleece plush octopus gently bounces and wiggles its chubby tentacles cheerfully, tilting its head so its puffy white baker beret and brown handlebar moustache bob softly. Occasionally it blinks with smooth, plain pistachio-green plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "cinnamon-idle",
    inputFile: "16x9-octo-15-cinnamon.jpg",
    outputFile: "cinnamon-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute warm cinnamon-terracotta fluffy plush octopus gently bounces and wiggles its chubby tentacles happily, tilting its head so its cream cable-knit beanie, round tortoiseshell glasses, and tiny teal bowtie bob softly. Occasionally it blinks with smooth, plain cinnamon-orange plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "cloud-idle",
    inputFile: "16x9-octo-16-cloud.jpg",
    outputFile: "cloud-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute pure snow-white cloud-fluffy plush octopus gently sways and wiggles its chubby tentacles sleepily, tilting its head so its pastel baby-blue pom-pom nightcap bobs softly. Occasionally it blinks with smooth, plain white plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "matcha-idle",
    inputFile: "16x9-octo-17-matcha.jpg",
    outputFile: "matcha-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute forest-matcha green fuzzy plush octopus gently nods and wiggles its chubby tentacles thoughtfully, tilting its head so its neat side-part hair tuft, gold glasses, and burgundy tartan bowtie bob softly. Occasionally it blinks with smooth, plain matcha-green plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "berry-idle",
    inputFile: "16x9-octo-18-berry.jpg",
    outputFile: "berry-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute raspberry-magenta sherpa plush octopus bounces and wiggles its chubby tentacles cheerfully, tilting its head so its blonde curly hair puff, white retro sunglasses on its head, and yellow neckerchief bob softly. Occasionally it blinks with smooth, plain magenta-pink plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "cobalt-idle",
    inputFile: "16x9-octo-19-cobalt.jpg",
    outputFile: "cobalt-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute deep royal-cobalt blue velvety plush octopus gently bounces and wiggles its chubby tentacles with authority, tilting its head so its white-and-gold sea captain cap, silver eyebrows, and silver goatee bob softly. Occasionally it blinks with smooth, plain cobalt-blue plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
  {
    id: "honey-idle",
    inputFile: "16x9-octo-20-honey.jpg",
    outputFile: "honey-idle.mp4",
    alsoCopyTo: [],
    prompt:
      "Static locked camera, wide framing, do not zoom in. The cute golden honey-amber fuzzy plush octopus gently bounces and wiggles its chubby tentacles happily, tilting its head so its curly pompadour tuft, black geek glasses, and green striped necktie bob softly. Occasionally it blinks with smooth, plain honey-amber plush eyelids that close into a simple clean horizontal line. Keep the eyes simple round white plush toy spheres with solid black pupils. Smooth 3D plush animation.",
  },
];

function runChromeJS(jsCode) {
  return execFileSync("osascript", [
    "-e",
    "on run argv",
    "-e",
    'tell application "Google Chrome" to execute active tab of first window javascript (item 1 of argv)',
    "-e",
    "end run",
    jsCode,
  ])
    .toString()
    .trim();
}

function reloadChromeTab() {
  execFileSync("osascript", [
    "-e",
    'tell application "Google Chrome" to reload active tab of first window',
  ]);
}

function navigateNewGeminiChat() {
  execFileSync("osascript", [
    "-e",
    'tell application "Google Chrome" to set URL of active tab of first window to "https://gemini.google.com/app"',
  ]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getLatestMp4InDownloads(sinceTimeMs) {
  if (!fs.existsSync(DOWNLOADS_DIR)) return null;
  const files = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter((f) => f.endsWith(".mp4") && !f.endsWith(".crdownload"))
    .map((f) => {
      const full = path.join(DOWNLOADS_DIR, f);
      const stat = fs.statSync(full);
      return { full, mtimeMs: stat.mtimeMs, size: stat.size };
    })
    .filter((f) => f.mtimeMs > sinceTimeMs && f.size > 100000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0]?.full || null;
}

async function submitPromptToGemini(item) {
  console.log(
    `\n🚀 Opening fresh Gemini chat & submitting [${item.id}] (${item.inputFile})...`
  );
  navigateNewGeminiChat();
  await sleep(4500);

  const imgPath = path.join(CHAR_DIR, item.inputFile);
  const b64 = fs.readFileSync(imgPath).toString("base64");

  // Step 1: Activate "Vidéos" tool in the fresh chat
  const chipStatus = runChromeJS(`
    (function() {
      const chips = Array.from(document.querySelectorAll("button, mat-chip, [role=button]"));
      const hasVideoChip = chips.some(b => (b.innerText || "").trim() === "Vidéos");
      if (!hasVideoChip) {
        const toolsBtn = Array.from(document.querySelectorAll("button")).find(b => {
          const aria = b.getAttribute("aria-label") || "";
          return aria.includes("Importation") || aria.includes("outils");
        });
        if (toolsBtn) toolsBtn.click();
      }
      return hasVideoChip ? "VIDEO_CHIP_ACTIVE" : "OPENED_MENU";
    })()
  `);
  if (chipStatus === "OPENED_MENU") {
    await sleep(800);
    runChromeJS(`
      (function() {
        const createVid = Array.from(document.querySelectorAll("button, [role=menuitem]")).find(b =>
          (b.innerText || "").includes("Créer une vidéo")
        );
        if (createVid) createVid.click();
        return "SELECTED_VIDEO";
      })()
    `);
    await sleep(900);
  }

  // Step 2: Paste image into .ql-editor
  runChromeJS(`
    (function() {
      const b64 = "${b64}";
      const byteChars = atob(b64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const file = new File([byteArray], "${item.inputFile}", { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(file);
      const editor = document.querySelector(".ql-editor");
      editor.focus();
      editor.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt }));
      return "PASTED_IMAGE";
    })()
  `);
  await sleep(2800);

  // Step 3: Set prompt text via textContent and wait for Quill MutationObserver
  runChromeJS(`
    (function() {
      const editor = document.querySelector(".ql-editor");
      editor.focus();
      const p = editor.querySelector("p") || editor;
      p.textContent = ${JSON.stringify(item.prompt)};
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      return "SET_TEXT";
    })()
  `);
  await sleep(1000);

  // Step 4: Click Send
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = runChromeJS(`
      (function() {
        const btns = Array.from(document.querySelectorAll("button"));
        const sendBtn = btns.find(b => {
          const aria = b.getAttribute("aria-label") || "";
          return aria.includes("Envoyer") || aria.includes("Send");
        });
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          return "CLICKED_SEND";
        }
        return "WAITING_FOR_UPLOAD";
      })()
    `);
    if (res === "CLICKED_SEND") {
      console.log(`   ✉️ Prompt & image submitted for [${item.id}]!`);
      break;
    }
    await sleep(1000);
  }
}

async function waitForVideoAndDownload(item) {
  // Check immediately (5s after submit) if Gemini returned a daily limit message
  await sleep(5500);
  const initialCheck = runChromeJS(`
    (function() {
      const t = document.body.innerText || "";
      if (
        t.includes("limit resets") ||
        t.includes("can create more videos") ||
        t.includes("limite")
      ) {
        return "LIMIT_REACHED";
      }
      return "OK";
    })()
  `);
  if (initialCheck === "LIMIT_REACHED") {
    console.error(
      "\n🛑 Gemini video generation limit reached ('I can create more videos as soon as your limit resets'). Stopping script immediately."
    );
    process.exit(0);
  }

  console.log(`⏳ Waiting ~60s for Gemini backend to render [${item.id}]...`);
  await sleep(60000);

  for (let cycle = 0; cycle < 10; cycle++) {
    console.log(`🔄 Reloading tab to check if [${item.id}] video is ready (cycle ${cycle + 1}/10)...`);
    reloadChromeTab();
    await sleep(5500);

    const statusJson = runChromeJS(`
      (function() {
        const vids = Array.from(document.querySelectorAll("video")).filter(v => v.src && v.src.length > 5);
        const bodyText = document.body.innerText || "";
        return JSON.stringify({
          videoCount: vids.length,
          lastVideoSrc: vids[vids.length - 1]?.src || null,
          limitReached: bodyText.includes("limit resets") || bodyText.includes("can create more videos"),
          hasError: bodyText.includes("Something went wrong") || bodyText.includes("Une erreur")
        });
      })()
    `);

    let state;
    try {
      state = JSON.parse(statusJson);
    } catch {
      continue;
    }

    if (state.limitReached) {
      console.error(
        "\n🛑 Gemini video generation limit reached. Stopping script immediately."
      );
      process.exit(0);
    }

    if (state.videoCount > 0 && state.lastVideoSrc) {
      console.log(`🎉 Video element ready in DOM! Downloading [${item.id}]...`);
      const beforeDlTime = Date.now() - 2000;

      runChromeJS(`
        (function() {
          const dlBtns = Array.from(document.querySelectorAll("button, a")).filter(b => {
            const aria = (b.getAttribute("aria-label") || "").toLowerCase();
            return aria.includes("télécharger") || aria.includes("download");
          });
          if (dlBtns.length > 0) {
            dlBtns[dlBtns.length - 1].click();
            return "CLICKED_DL";
          }
          return "NO_DL_BTN";
        })()
      `);

      for (let i = 0; i < 15; i++) {
        await sleep(1000);
        const downloadedFile = getLatestMp4InDownloads(beforeDlTime);
        if (downloadedFile) {
          console.log(`📥 Downloaded to: ${downloadedFile}`);
          return downloadedFile;
        }
      }
    }

    if (state.hasError) {
      throw new Error(`Gemini reported an error rendering ${item.id}`);
    }

    await sleep(20000);
  }
  throw new Error(`Timed out waiting for ${item.id}`);
}

function processWithFfmpeg(rawMp4, item) {
  const finalOut = path.join(VIDEO_DIR, item.outputFile);
  console.log(`🎬 Converting ${rawMp4} -> seamless 720x720 loop: ${finalOut}`);
  execSync(
    `ffmpeg -y -loglevel error -i "${rawMp4}" -filter_complex "[0:v]crop=720:720:280:0,fps=24,split[fwd][rev];[rev]reverse[r];[fwd][r]concat=n=2:v=1:a=0" -an -c:v libx264 -pix_fmt yuv420p -crf 19 -preset fast -movflags +faststart "${finalOut}"`
  );
  for (const extra of item.alsoCopyTo || []) {
    fs.copyFileSync(finalOut, path.join(VIDEO_DIR, extra));
    console.log(`   ↳ Also linked to public/videos/${extra}`);
  }
}

async function deleteCurrentGeminiChat() {
  try {
    const opened = runChromeJS(`
      (function() {
        const menuBtn = Array.from(document.querySelectorAll("button")).find(b => {
          const aria = (b.getAttribute("aria-label") || "").toLowerCase();
          return aria.includes("actions de conversation") || aria.includes("conversation actions") || aria.includes("more options");
        });
        if (menuBtn) {
          menuBtn.click();
          return "OPENED_MENU";
        }
        return "NO_MENU";
      })()
    `);
    if (opened !== "OPENED_MENU") return;
    await sleep(600);

    const clickedDelete = runChromeJS(`
      (function() {
        const items = Array.from(document.querySelectorAll("button, [role=menuitem]"));
        const del = items.find(el => {
          const txt = (el.innerText || "").trim().toLowerCase();
          return txt === "supprimer" || txt === "delete" || txt.includes("supprimer");
        });
        if (del) {
          del.click();
          return "CLICKED_DELETE";
        }
        return "NO_DELETE";
      })()
    `);
    if (clickedDelete !== "CLICKED_DELETE") return;
    await sleep(700);

    const confirmed = runChromeJS(`
      (function() {
        const btns = Array.from(document.querySelectorAll("mat-dialog-container button, [role=dialog] button, button"));
        const confirmBtn = btns.reverse().find(b => {
          const txt = (b.innerText || "").trim().toLowerCase();
          return txt === "supprimer" || txt === "delete";
        });
        if (confirmBtn) {
          confirmBtn.click();
          return "CONFIRMED_DELETE";
        }
        return "NO_CONFIRM";
      })()
    `);
    if (confirmed === "CONFIRMED_DELETE") {
      console.log("🗑️ Deleted temporary Gemini conversation.");
      await sleep(1000);
    }
  } catch {
    // Non-fatal if UI selector differs
  }
}

async function main() {
  for (let i = 0; i < VIDEO_QUEUE.length; i++) {
    const item = VIDEO_QUEUE[i];
    const finalOut = path.join(VIDEO_DIR, item.outputFile);
    if (fs.existsSync(finalOut) && fs.statSync(finalOut).size > 100000) {
      console.log(`⏭️ Skipping [${item.id}] (${item.outputFile} already exists)`);
      continue;
    }

    try {
      await submitPromptToGemini(item);
      const rawMp4Path = await waitForVideoAndDownload(item);
      processWithFfmpeg(rawMp4Path, item);
      await deleteCurrentGeminiChat();
      console.log(`✅ Completed [${i + 1}/${VIDEO_QUEUE.length}]: ${item.outputFile}!`);
      await sleep(2000);
    } catch (err) {
      console.error(`⚠️ Error on ${item.id}:`, err.message);
    }
  }
  console.log("\n🎉 ALL OCTOPUS VIDEOS GENERATED AND PROCESSED INTO /public/videos/!");
}

main();
