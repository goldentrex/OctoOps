import fs from "fs";
import path from "path";

// Load .env.local or .env automatically
const envPath = fs.existsSync(path.join(process.cwd(), ".env.local"))
  ? path.join(process.cwd(), ".env.local")
  : path.join(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || "").replace(/^['"]|['"]$/g, "").trim();
    }
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ Please add your GEMINI_API_KEY to .env.local first!");
  process.exit(1);
}

// Reference fluffy image for style consistency (optional text + multimodal reference)
const OUT_DIR = path.join(process.cwd(), "public", "characters");
fs.mkdirSync(OUT_DIR, { recursive: true });

const STYLE_LOCK = `Ultra-cute 3D fluffy plush octopus toy (soft fuzzy Jellycat / needle-felted fur texture with warm studio rim lighting). 
CRITICAL RULES:
- ONLY the single octopus character itself on a clean, solid soft pastel studio floor and background.
- ZERO external objects or props: NO laptops, NO computers, NO floating envelopes, NO paper stacks, NO warning signs, NO calculators, NO coins, NO text, NO watermarks.
- Signature face: Two big contiguous touching white round eyes sitting low-center on the face with large glossy black pupils, expressive floating eyebrows, and a cute small mouth right below the eyes.
- 8 short, chubby, stubby, rounded fluffy tentacles resting neatly in a circle around its base.`;

const OCTO_ROSTER = [
  {
    file: "octo-01-inko.png",
    prompt: `${STYLE_LOCK}
Character: "Inko" — Medium chubby round sky-blue (#60A5FA) fluffy plush octopus. Has a cute curly tuft of blue hair peeking out from under a soft knitted navy-blue French beret tilted on its head, and wears thin round silver wire-frame glasses. Sweet happy smile. Clean solid pastel sky-blue studio background.`,
  },
  {
    file: "octo-02-barnaby.png",
    prompt: `${STYLE_LOCK}
Character: "Barnaby" — Plump executive lavender-purple (#C084FC) velvet-fluffy plush octopus. Wears a dapper black felt top hat with a purple ribbon band tilted on its head, and a lush curly black handlebar moustache right under its eyes. Proud friendly expression. Clean solid pastel lavender studio background.`,
  },
  {
    file: "octo-03-squidney.png",
    prompt: `${STYLE_LOCK}
Character: "Squidney" — Compact round blush-pink (#F472B6) extra-fuzzy plush octopus. Has a tiny nervous pink cowlick hair tuft on top, worried arched eyebrows, a cute wavy nervous mouth, a single glossy blue sweat drop on its temple, wearing a sleek black call-center headset with a tiny mic and a miniature purple-and-white striped necktie. Clean solid pastel blush-pink studio background.`,
  },
  {
    file: "octo-04-boba.png",
    prompt: `${STYLE_LOCK}
Character: "Boba" — Tiny baby-spherical matcha-mint green (#6EE7B7) plush octopus with extra-long shaggy soft fur and a fluffy pom-pom hair tuft on top. Wears oversized round tortoiseshell glasses and a cute pastel-yellow bow on its neck. Cheerful innocent smile. Clean solid pastel mint studio background.`,
  },
  {
    file: "octo-05-waffles.png",
    prompt: `${STYLE_LOCK}
Character: "Waffles" — Wide pear-shaped chubby peach-apricot (#FDBA74) plush octopus with curly sherpa teddy-fleece fur and cute fluffy white sideburns. Wears a retro translucent green banker visor cap and a tiny red polka-dot bowtie. Clean solid pastel peach studio background.`,
  },
  {
    file: "octo-06-nori.png",
    prompt: `${STYLE_LOCK}
Character: "Nori" — Sleek oval periwinkle-indigo (#818CF8) silky micro-plush octopus with spiky anime-style blue-violet hair tufts peeking out from a slouchy mustard-yellow knitted beanie hat, wearing thick square black nerd glasses. Clean solid pastel periwinkle studio background.`,
  },
  {
    file: "octo-07-mochi.png",
    prompt: `${STYLE_LOCK}
Character: "Mochi" — Extra-wide squishy cloud-fluffy strawberry-cream white (#FBCFE8) plush octopus with rosy pink cheeks, wearing a tiny pink ribbon bow on top of its head and cute pastel-pink over-ear headphones resting around its neck. Clean solid pastel rose-cream studio background.`,
  },
  {
    file: "octo-08-gumbo.png",
    prompt: `${STYLE_LOCK}
Character: "Gumbo" — Big burly round coral-tangerine (#FB7185) thick-plush octopus with expressive bushy ginger eyebrows, wearing a dapper miniature beige felt fedora hat and a sky-blue silk necktie. Confident grin. Clean solid pastel coral studio background.`,
  },
  {
    file: "octo-09-pebble.png",
    prompt: `${STYLE_LOCK}
Character: "Pebble" — Tall-headed lilac-grey (#CBD5E1) tweed-textured fuzzy plush octopus with neat parted fluffy hair, wearing a cute houndstooth Sherlock detective cap and a single brass monocle over one eye. Clean solid pastel cool-grey studio background.`,
  },
  {
    file: "octo-10-yuzu.png",
    prompt: `${STYLE_LOCK}
Character: "Yuzu" — Bouncy round sunny lemon-yellow (#FDE047) fuzzy chick-plush octopus with a curly yellow swirl hair tuft on top, wearing a pastel-teal baseball cap backwards and tiny pink star-shaped sunglasses pushed up on its forehead. Excited open smile. Clean solid pastel butter-yellow studio background.`,
  },
  {
    file: "octo-11-truffle.png",
    prompt: `${STYLE_LOCK}
Character: "Truffle" — Chubby professor warm cocoa-taupe (#A8A29E) teddy-bear plush octopus with fluffy white Einstein hair tufts on the sides, a small fluffy white moustache, gold half-moon reading glasses perched low, and a cozy miniature knitted pastel scarf around its neck. Clean solid warm cream studio background.`,
  },
  {
    file: "octo-12-zest.png",
    prompt: `${STYLE_LOCK}
Character: "Zest" — Energetic medium-slim electric aqua-turquoise (#2DD4BF) spiky fuzzy plush octopus with a tall fluffy mohawk hair tuft on top of its head, wearing a lightweight single-ear headset and a tiny yellow necktie. Clean solid pastel aqua studio background.`,
  },
  {
    file: "board-ciso-cassandra.png",
    prompt: `${STYLE_LOCK}
Character: "Cassandra (CISO)" — Emerald-teal (#10B981) velvet-fluffy plush octopus wearing a dark-navy security captain cap with a tiny gold shield badge on the front and stylish dark rectangular glasses. Sharp attentive expression. Clean solid pastel mint-teal studio background.`,
  },
  {
    file: "board-cfo-reginald.png",
    prompt: `${STYLE_LOCK}
Character: "Reginald (CFO)" — Warm golden-amber (#F59E0B) fluffy plush octopus wearing a gold-rimmed monocle with a delicate gold chain over one eye, a fluffy white handlebar moustache, and a cute red plush bowtie. Skeptical raised eyebrow. Clean solid pastel cream-gold studio background.`,
  },
  {
    file: "board-vp-pulse.png",
    prompt: `${STYLE_LOCK}
Character: "Pulse (VP Growth)" — Cotton-candy tie-dye swirl of electric violet and coral (#A855F7 and #FB7185) fluffy plush octopus wearing futuristic glossy cyan visor sunglasses pushed up on its forehead and a tiny gold crown on top. Cool confident smile. Clean solid pastel lavender-peach studio background.`,
  },
  {
    file: "founder-octo-clean.png",
    prompt: `${STYLE_LOCK}
Character: "OctoFounder" — Bright lime-green (#4ADE80) fluffy plush octopus with floating black arched eyebrows, a happy little smile, and a tiny royal-blue necktie. Clean solid pastel mint-green studio background.`,
  },
];

// Candidate model IDs from the user's quota table (Nano Banana 2 / Nano Banana Pro / Gemini 2.5 Flash Preview Image)
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-exp-image-generation",
];

async function resolveWorkingImageModel() {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const data = await res.json();
    if (data.models) {
      const availableNames = data.models.map((m) =>
        m.name.replace("models/", "")
      );
      console.log(
        "🔍 Available image models on your key:",
        availableNames.filter(
          (n) => n.includes("image") || n.includes("banana") || n.includes("imagen")
        )
      );
      for (const candidate of CANDIDATE_MODELS) {
        const match = availableNames.find((n) => n.includes(candidate) || candidate.includes(n));
        if (match) return match;
      }
      const anyFlashImage = availableNames.find(
        (n) => n.includes("flash") && n.includes("image")
      );
      if (anyFlashImage) return anyFlashImage;
    }
  } catch (err) {
    console.warn("Could not list models, falling back to default:", err.message);
  }
  return "gemini-2.5-flash-preview-image";
}

async function generateOneOcto(modelId, item) {
  const outPath = path.join(OUT_DIR, item.file);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [{ text: item.prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData && p.inlineData.data);

  if (!imgPart) {
    throw new Error(`No image returned for ${item.file}`);
  }

  const buffer = Buffer.from(imgPart.inlineData.data, "base64");
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Saved clean prop-free fluffy octopus: public/characters/${item.file}`);
}

async function main() {
  const modelId = await resolveWorkingImageModel();
  console.log(`🚀 Using model: ${modelId}`);

  for (const item of OCTO_ROSTER) {
    try {
      await generateOneOcto(modelId, item);
    } catch (err) {
      console.error(`⚠️ Error on ${item.file}:`, err.message);
    }
  }
  console.log("🎉 All 16 Fluffy Octopuses generated in public/characters/!");
}

main();
