# OctoOps — Architecture & Qoder Hackathon Guide

> **Tagline:** *One Founder. Eight Arms. Zero Employees.*  
> **Track 2:** AI Governance, Security & Decision-Making (QwenWork x Hashmeta AI One-Person Company Hackathon)

## 1. What Is Already Built (Pre-Hackathon Foundation)

- **60fps Layered 2.5D Octopus Puppet Engine (`src/components/OctoPuppet.tsx`)**:
  - Zero Higgsfield/video credits required.
  - Real-time cursor-tracking pupils, natural blinking, squish-and-bounce spring physics (`Framer Motion`), waving tentacles, and role-specific props:
    - **Inko** (*Blue Content Octopus*): French beret, round wire glasses, typing furiously on dual MacBooks.
    - **Barnaby** (*Purple Operations Octopus*): Silk top hat, lush handlebar moustache, juggling document stacks and priority envelopes.
    - **Squidney** (*Pink CRM Lead Octopus*): Call-center headset, striped necktie, flying sweat drops, and pulsing warning triangle.
    - **The Octo-Board Bench**: **Cassandra** (AvePoint Detective CISO), **Reginald** (Gold-Monocle CFO), and **Pulse** (Visor-Shades Growth VP).
- **Tactile "Vibe-Coded" Staff Roster (`src/components/AgentStaffCard.tsx`)**:
  - Faithfully implements your OctoHR / OctoOps card concept with chunky 3D borders, rubber-stamp overlays (`ON PROBATION`, `PROMOTED`, `1st WRITE-UP`), star ratings, briefcase/envelope progress bars, and steaming/spilling coffee cups.
- **Deep Animated Octo-Board Tribunal (`src/components/OctoBoardModal.tsx`)**:
  - Interactive 3-judge executive war room where Cassandra, Reginald, and Pulse cross-examine intercepted payloads, score a 4-pillar governance rubric, flip vote paddles, and slam a giant animated rubber stamp (`PROMOTED`, `1st WRITE-UP`, or `FIRED & TERMINATED`).
- **Hashmeta AI 3-Pillar Client Trust Portal (`src/components/HashmetaTrustPortal.tsx`)**:
  - Covers all 3 parts of Hashmeta AI (worth **15%** of judging criteria):
    1. **AI CMS**: Public *"Meet Our AI Workforce"* embeddable directory where enterprise clients verify which agent handles their account.
    2. **AI Visibility**: Citation-based promotions (ChatGPT, Gemini, Perplexity citation tracking).
    3. **AI CRM**: Earned lead permissions (`Draft-Only` on probation vs. `Direct External Email` at 4+ stars).
- **3-Minute Demo Director Bar (`src/app/page.tsx`)**:
  - Bottom floating control dock to trigger the Wrong-Client Leak, Board Tribunal, and Hashmeta Visibility Promotion on cue during your 3-minute video recording.

## 2. Where to Plug In QwenWork & Hashmeta AI at Kickoff

1. **QwenWork Agent Binding**:
   - Open `src/lib/adapters.ts` and connect `evaluateAgentActionGuardrail()` + board deliberation prompts to your QwenWork agent endpoints.
2. **Hashmeta AI CMS Embed**:
   - Deploy this Next.js app (or embed `/hashmeta_portal` via iframe/script) directly into your Hashmeta AI CMS site so judges can click the live staff trust cards.
