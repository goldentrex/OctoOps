import fs from "fs";
import path from "path";
import { execSync, execFileSync } from "child_process";

const DOWNLOADS_DIR = path.join(process.env.HOME, "Downloads");
const CHAR_DIR = path.join(process.cwd(), "public", "characters");
fs.mkdirSync(CHAR_DIR, { recursive: true });

const STYLE_GUARD =
  "Preserve the exact chunky round fluffy sherpa-fleece plush toy texture, short compact tentacles, accessories, and clean pastel studio background from the reference image. Simple round white plush toy sphere eyes with solid black pupils only, NO eyelashes. Centered 1:1 studio composition with comfortable headroom and side margin.";

const IMAGE_QUEUE = [
  // === 7 Setup #2 Primary Working Scenes ===
  {
    id: "scene-boba-working",
    refFile: "octo-04-boba.jpg",
    outputFile: "scene-boba-working.jpg",
    bgHex: "#ECF7F1",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The matcha-mint shaggy plush octopus Boba (keeping pom-pom tuft, tortoiseshell glasses, yellow bow) is sitting cheerfully at a clean pastel mint-cream studio desk typing on a sleek silver mini laptop next to a neat stack of white mail envelopes and a tiny yellow "INTERN" desk badge. ${STYLE_GUARD}`,
  },
  {
    id: "scene-nori-working",
    refFile: "octo-06-nori.jpg",
    outputFile: "scene-nori-working.jpg",
    bgHex: "#ECF0FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The periwinkle fluffy plush octopus Nori (keeping mustard knit beanie, spiky hair, dark square glasses) is sitting at a clean pastel periwinkle studio desk holding up a glowing translucent teal magnifying security shield while inspecting a sealed white envelope. ${STYLE_GUARD}`,
  },
  {
    id: "scene-mochi-working",
    refFile: "octo-07-mochi.jpg",
    outputFile: "scene-mochi-working.jpg",
    bgHex: "#FCF0F2",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The strawberry-cream fluffy plush octopus Mochi (keeping pink hair bow and pastel-pink headphones) is sitting happily at a clean pastel pink-cream studio desk behind a sleek silver mini laptop and a cute pastel-pink desktop podcast microphone. ${STYLE_GUARD}`,
  },
  {
    id: "scene-gumbo-working",
    refFile: "octo-08-gumbo.jpg",
    outputFile: "scene-gumbo-working.jpg",
    bgHex: "#FBEAE6",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The coral-tangerine fluffy plush octopus Gumbo (keeping beige fedora, ginger eyebrows, sky-blue tie) is sitting confidently at a clean pastel coral-cream studio desk behind a chunky mint-green 3D desk calculator, a spiral financial ledger, and a small stack of gold coins. ${STYLE_GUARD}`,
  },
  {
    id: "scene-truffle-working",
    refFile: "octo-11-truffle.jpg",
    outputFile: "scene-truffle-working.jpg",
    bgHex: "#F4EFEA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The cocoa-taupe professor plush octopus Prof. Truffle (keeping white side-hair, gold glasses, white moustache, plaid scarf) is sitting thoughtfully at a clean pastel cream studio desk holding a brass magnifying glass next to stacked tan security dossiers. ${STYLE_GUARD}`,
  },
  {
    id: "scene-zest-working",
    refFile: "octo-12-zest.jpg",
    outputFile: "scene-zest-working.jpg",
    bgHex: "#EBF8FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The aqua-turquoise fluffy plush octopus Zest (keeping tall mohawk tuft, headset, yellow tie) is sitting energetically at a clean pastel aqua studio desk next to a 3D teal-and-pink megaphone and a rising green 3D growth bar chart. ${STYLE_GUARD}`,
  },
  {
    id: "scene-plum-working",
    refFile: "octo-14-plum.jpg",
    outputFile: "scene-plum-working.jpg",
    bgHex: "#F3ECF8",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The royal-plum violet plush octopus Madame Plum (keeping silver-streaked pompadour, black cat-eye glasses, pearl necklace) is sitting at a clean pastel lavender studio desk behind a wooden HR clipboard, fountain pen, and neat sealed envelopes. ${STYLE_GUARD}`,
  },
  // === 20 Secondary Job Scenes (Jobs 2 & 3 for all 10 agents) ===
  {
    id: "scene-inko-crm",
    refFile: "octo-01-inko.jpg",
    outputFile: "scene-inko-crm.jpg",
    bgHex: "#E8F4FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The sky-blue fluffy plush octopus Inko (keeping navy beret and round silver glasses, adding a sleek dark call-center headset over the beret) is typing happily at a clean pastel sky-blue studio desk behind a neat stack of white CRM mail envelopes and a white office mug. ${STYLE_GUARD}`,
  },
  {
    id: "scene-inko-growth",
    refFile: "octo-01-inko.jpg",
    outputFile: "scene-inko-growth.jpg",
    bgHex: "#E8F4FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The sky-blue fluffy plush octopus Inko (keeping navy beret and round silver glasses) is cheering happily at a clean pastel sky-blue studio desk next to a 3D teal-and-pink megaphone and a rising green 3D growth bar chart. ${STYLE_GUARD}`,
  },
  {
    id: "scene-barnaby-finance",
    refFile: "octo-02-barnaby.jpg",
    outputFile: "scene-barnaby-finance.jpg",
    bgHex: "#EFEAF8",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The lavender-purple fluffy plush octopus Barnaby (keeping black top hat and curly black handlebar moustache) is sitting at a clean pastel lavender studio desk behind a chunky mint-green 3D desk calculator and a spiral-bound financial ledger. ${STYLE_GUARD}`,
  },
  {
    id: "scene-barnaby-dlp",
    refFile: "octo-02-barnaby.jpg",
    outputFile: "scene-barnaby-dlp.jpg",
    bgHex: "#EFEAF8",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The lavender-purple fluffy plush octopus Barnaby (keeping black top hat and curly black handlebar moustache) is sitting at a clean pastel lavender studio desk holding up a glowing translucent teal magnifying security shield while inspecting a sealed envelope. ${STYLE_GUARD}`,
  },
  {
    id: "scene-squidney-growth",
    refFile: "octo-03-squidney.jpg",
    outputFile: "scene-squidney-growth.jpg",
    bgHex: "#FBF3EC",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The pastel-pink fluffy plush octopus Squidney (keeping headset and purple striped tie) is smiling happily at a clean pastel cream studio desk next to a 3D teal-and-pink megaphone and a rising green 3D growth bar chart. ${STYLE_GUARD}`,
  },
  {
    id: "scene-squidney-ops",
    refFile: "octo-03-squidney.jpg",
    outputFile: "scene-squidney-ops.jpg",
    bgHex: "#FBF3EC",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The pastel-pink fluffy plush octopus Squidney (keeping headset and purple striped tie) is sitting at a clean pastel cream studio desk behind stacked white priority envelopes with gold wax seals and a wooden rubber stamp. ${STYLE_GUARD}`,
  },
  {
    id: "scene-boba-cms",
    refFile: "octo-04-boba.jpg",
    outputFile: "scene-boba-cms.jpg",
    bgHex: "#ECF7F1",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The matcha-mint shaggy plush octopus Boba (keeping pom-pom tuft, tortoiseshell glasses, yellow bow) is typing happily at a clean pastel mint-cream studio desk between dual sleek silver mini laptops. ${STYLE_GUARD}`,
  },
  {
    id: "scene-boba-growth",
    refFile: "octo-04-boba.jpg",
    outputFile: "scene-boba-growth.jpg",
    bgHex: "#ECF7F1",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The matcha-mint shaggy plush octopus Boba (keeping pom-pom tuft, tortoiseshell glasses, yellow bow) is cheering happily at a clean pastel mint-cream studio desk next to a 3D teal-and-pink megaphone and a rising green 3D growth bar chart. ${STYLE_GUARD}`,
  },
  {
    id: "scene-nori-ops",
    refFile: "octo-06-nori.jpg",
    outputFile: "scene-nori-ops.jpg",
    bgHex: "#ECF0FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The periwinkle fluffy plush octopus Nori (keeping mustard knit beanie, spiky hair, dark square glasses) is sitting at a clean pastel periwinkle studio desk behind stacked white priority envelopes with gold seals and a wooden audit stamp. ${STYLE_GUARD}`,
  },
  {
    id: "scene-nori-cms",
    refFile: "octo-06-nori.jpg",
    outputFile: "scene-nori-cms.jpg",
    bgHex: "#ECF0FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The periwinkle fluffy plush octopus Nori (keeping mustard knit beanie, spiky hair, dark square glasses) is typing intently at a clean pastel periwinkle studio desk behind dual sleek silver mini laptops. ${STYLE_GUARD}`,
  },
  {
    id: "scene-mochi-growth",
    refFile: "octo-07-mochi.jpg",
    outputFile: "scene-mochi-growth.jpg",
    bgHex: "#FCF0F2",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The strawberry-cream fluffy plush octopus Mochi (keeping pink bow and pastel-pink headphones) is cheering happily at a clean pastel pink-cream studio desk next to a 3D teal-and-pink megaphone and a rising green 3D growth bar chart. ${STYLE_GUARD}`,
  },
  {
    id: "scene-mochi-crm",
    refFile: "octo-07-mochi.jpg",
    outputFile: "scene-mochi-crm.jpg",
    bgHex: "#FCF0F2",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The strawberry-cream fluffy plush octopus Mochi (keeping pink bow and pastel-pink headphones) is sitting cheerfully at a clean pastel pink-cream studio desk behind a neat CRM inbox tray of white mail envelopes and a white office coffee mug. ${STYLE_GUARD}`,
  },
  {
    id: "scene-gumbo-ops",
    refFile: "octo-08-gumbo.jpg",
    outputFile: "scene-gumbo-ops.jpg",
    bgHex: "#FBEAE6",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The coral-tangerine fluffy plush octopus Gumbo (keeping beige fedora, ginger eyebrows, sky-blue tie) is sitting at a clean pastel coral-cream studio desk behind stacked priority invoice envelopes and a wooden rubber stamp. ${STYLE_GUARD}`,
  },
  {
    id: "scene-gumbo-dlp",
    refFile: "octo-08-gumbo.jpg",
    outputFile: "scene-gumbo-dlp.jpg",
    bgHex: "#FBEAE6",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The coral-tangerine fluffy plush octopus Gumbo (keeping beige fedora, ginger eyebrows, sky-blue tie) is sitting at a clean pastel coral-cream studio desk holding a glowing translucent teal magnifying security shield over a folder. ${STYLE_GUARD}`,
  },
  {
    id: "scene-truffle-finance",
    refFile: "octo-11-truffle.jpg",
    outputFile: "scene-truffle-finance.jpg",
    bgHex: "#F4EFEA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The cocoa-taupe professor plush octopus Prof. Truffle (keeping white side-hair, gold glasses, white moustache, plaid scarf) is sitting at a clean pastel cream studio desk behind a chunky mint 3D desk calculator and a spiral-bound audit ledger. ${STYLE_GUARD}`,
  },
  {
    id: "scene-truffle-cms",
    refFile: "octo-11-truffle.jpg",
    outputFile: "scene-truffle-cms.jpg",
    bgHex: "#F4EFEA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The cocoa-taupe professor plush octopus Prof. Truffle (keeping white side-hair, gold glasses, white moustache, plaid scarf) is typing thoughtfully on a sleek silver research laptop at a clean pastel cream studio desk. ${STYLE_GUARD}`,
  },
  {
    id: "scene-zest-crm",
    refFile: "octo-12-zest.jpg",
    outputFile: "scene-zest-crm.jpg",
    bgHex: "#EBF8FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The aqua-turquoise fluffy plush octopus Zest (keeping tall mohawk tuft, headset, yellow tie) is sitting at a clean pastel aqua studio desk behind a sleek mini laptop, CRM mail envelopes, and a white coffee mug. ${STYLE_GUARD}`,
  },
  {
    id: "scene-zest-cms",
    refFile: "octo-12-zest.jpg",
    outputFile: "scene-zest-cms.jpg",
    bgHex: "#EBF8FA",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The aqua-turquoise fluffy plush octopus Zest (keeping tall mohawk tuft, headset, yellow tie) is typing cheerfully at a clean pastel aqua studio desk behind dual sleek silver mini laptops. ${STYLE_GUARD}`,
  },
  {
    id: "scene-plum-dlp",
    refFile: "octo-14-plum.jpg",
    outputFile: "scene-plum-dlp.jpg",
    bgHex: "#F3ECF8",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The royal-plum violet plush octopus Madame Plum (keeping silver-streaked pompadour, black cat-eye glasses, pearl necklace) is sitting at a clean pastel lavender studio desk holding a glowing translucent teal magnifying security shield while inspecting a sealed envelope. ${STYLE_GUARD}`,
  },
  {
    id: "scene-plum-finance",
    refFile: "octo-14-plum.jpg",
    outputFile: "scene-plum-finance.jpg",
    bgHex: "#F3ECF8",
    prompt: `Generate a 1:1 square image based on the attached plush octopus. The royal-plum violet plush octopus Madame Plum (keeping silver-streaked pompadour, black cat-eye glasses, pearl necklace) is sitting at a clean pastel lavender studio desk behind a chunky mint 3D desk calculator and a spiral-bound financial ledger. ${STYLE_GUARD}`,
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

function navigateNewGeminiChat() {
  execFileSync("osascript", [
    "-e",
    'tell application "Google Chrome" to set URL of active tab of first window to "https://gemini.google.com/app"',
  ]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getLatestImageInDownloads(sinceTimeMs) {
  if (!fs.existsSync(DOWNLOADS_DIR)) return null;
  const files = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter(
      (f) =>
        (/\.(png|jpe?g|webp)$/i.test(f) && !f.endsWith(".crdownload"))
    )
    .map((f) => {
      const full = path.join(DOWNLOADS_DIR, f);
      const stat = fs.statSync(full);
      return { full, mtimeMs: stat.mtimeMs, size: stat.size };
    })
    .filter((f) => f.mtimeMs > sinceTimeMs && f.size > 40000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0]?.full || null;
}

async function submitImagePromptToGemini(item) {
  console.log(`\n🎨 Opening fresh Gemini chat & submitting [${item.id}] (ref: ${item.refFile})...`);
  navigateNewGeminiChat();
  await sleep(4500);

  const imgPath = path.join(CHAR_DIR, item.refFile);
  const tmpRef = "/tmp/octo_ref_512.jpg";
  execSync(`ffmpeg -y -loglevel error -i "${imgPath}" -vf "scale=512:512" -q:v 4 "${tmpRef}"`);
  const b64 = fs.readFileSync(tmpRef).toString("base64");

  // Step 1: Activate "Créer des images" / "Create images" tool if available
  const chipStatus = runChromeJS(`
    (function() {
      const chips = Array.from(document.querySelectorAll("button, mat-chip, [role=button]"));
      const hasImgChip = chips.some(b => {
        const t = (b.innerText || "").trim().toLowerCase();
        return t === "images" || t === "imagen" || t === "créer des images" || t === "create images";
      });
      if (!hasImgChip) {
        const toolsBtn = Array.from(document.querySelectorAll("button")).find(b => {
          const aria = (b.getAttribute("aria-label") || "").toLowerCase();
          return aria.includes("importation") || aria.includes("outils") || aria.includes("tools");
        });
        if (toolsBtn) toolsBtn.click();
      }
      return hasImgChip ? "IMG_CHIP_ACTIVE" : "OPENED_MENU";
    })()
  `);
  if (chipStatus === "OPENED_MENU") {
    await sleep(800);
    runChromeJS(`
      (function() {
        const createImg = Array.from(document.querySelectorAll("button, [role=menuitem]")).find(b => {
          const t = (b.innerText || "").toLowerCase();
          return t.includes("créer une image") || t.includes("créer des images") || t.includes("create image");
        });
        if (createImg) createImg.click();
        return "SELECTED_IMAGE";
      })()
    `);
    await sleep(900);
  }

  // Step 2: Paste reference image into .ql-editor
  runChromeJS(`
    (function() {
      const b64 = "${b64}";
      const byteChars = atob(b64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const file = new File([byteArray], "${item.refFile}", { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(file);
      const editor = document.querySelector(".ql-editor");
      editor.focus();
      editor.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt }));
      return "PASTED_IMAGE";
    })()
  `);
  await sleep(2800);

  // Step 3: Set prompt text
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
      console.log(`   ✉️ Prompt & ref image submitted for [${item.id}]!`);
      break;
    }
    await sleep(1000);
  }
}

async function waitForImageAndDownload(item) {
  console.log(`⏳ Waiting ~18s for Gemini Imagen to render [${item.id}]...`);
  await sleep(18000);

  for (let cycle = 0; cycle < 12; cycle++) {
    const statusJson = runChromeJS(`
      (function() {
        const bodyText = document.body.innerText || "";
        const respImgs = Array.from(document.querySelectorAll("model-response img, generated-image img, .response-container img"))
          .filter(img => img.naturalWidth >= 400 && !(img.src || "").startsWith("data:image/svg"));
        return JSON.stringify({
          imgCount: respImgs.length,
          limitReached: bodyText.includes("limit resets") || bodyText.includes("can create more images") || bodyText.includes("limite"),
          hasError: bodyText.includes("Something went wrong") || bodyText.includes("Une erreur")
        });
      })()
    `);

    let state;
    try {
      state = JSON.parse(statusJson);
    } catch {
      await sleep(5000);
      continue;
    }

    if (state.limitReached) {
      console.error("\n🛑 Gemini image generation limit reached. Stopping script immediately.");
      process.exit(0);
    }

    if (state.imgCount > 0) {
      console.log(`🎉 Generated image ready in DOM! Downloading [${item.id}]...`);
      const beforeDlTime = Date.now() - 2000;

      runChromeJS(`
        (function() {
          const dlBtns = Array.from(document.querySelectorAll("model-response button, model-response a, button, a")).filter(b => {
            const aria = (b.getAttribute("aria-label") || "").toLowerCase();
            return aria.includes("télécharger") || aria.includes("download full") || aria.includes("download");
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
        const downloadedFile = getLatestImageInDownloads(beforeDlTime);
        if (downloadedFile) {
          console.log(`📥 Downloaded to: ${downloadedFile}`);
          return downloadedFile;
        }
      }
    }

    if (state.hasError) {
      throw new Error(`Gemini reported an error rendering ${item.id}`);
    }

    await sleep(5000);
  }
  throw new Error(`Timed out waiting for ${item.id}`);
}

function processImageWithFfmpeg(rawImg, item) {
  const squareOut = path.join(CHAR_DIR, item.outputFile);
  const wideOut = path.join(CHAR_DIR, `16x9-${item.outputFile}`);
  console.log(`🖼️ Converting ${rawImg} -> 1024x1024 JPG (${squareOut}) & 1920x1080 (${wideOut})`);
  execSync(
    `ffmpeg -y -loglevel error -i "${rawImg}" -vf "scale=1024:1024:force_original_aspect_ratio=increase,crop=1024:1024" -q:v 2 "${squareOut}"`
  );
  execSync(
    `ffmpeg -y -loglevel error -i "${squareOut}" -vf "scale=1080:1080,pad=1920:1080:420:0:color=${item.bgHex}" -q:v 2 "${wideOut}"`
  );
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
    // Non-fatal
  }
}

async function main() {
  for (let i = 0; i < IMAGE_QUEUE.length; i++) {
    const item = IMAGE_QUEUE[i];
    const squareOut = path.join(CHAR_DIR, item.outputFile);
    if (fs.existsSync(squareOut) && fs.statSync(squareOut).size > 40000) {
      console.log(`⏭️ Skipping [${item.id}] (${item.outputFile} already exists)`);
      continue;
    }

    try {
      await submitImagePromptToGemini(item);
      const rawImgPath = await waitForImageAndDownload(item);
      processImageWithFfmpeg(rawImgPath, item);
      await deleteCurrentGeminiChat();
      console.log(`✅ Completed [${i + 1}/${IMAGE_QUEUE.length}]: ${item.outputFile}!`);
      await sleep(2000);
    } catch (err) {
      console.error(`⚠️ Error on ${item.id}:`, err.message);
    }
  }
  console.log("\n🎉 ALL SCENE IMAGES GENERATED AND PADDED INTO /public/characters/!");
}

main();
