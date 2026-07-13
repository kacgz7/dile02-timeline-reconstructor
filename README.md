# PWNDORA IR Lab — Incident Timeline Reconstructor (DILE-02)

BrewingSec CyberDev Summit '26 (Coimbatore). Track: DILE (DFIR Innovation Lab).

## What it does
A learner reconstructs a fictional cyber breach: drag scattered evidence cards onto a
chronological timeline, tag each with a MITRE ATT&CK technique, mark causal links
("this caused that"), then submit for an automated score vs a reference kill chain.

## Features (matches the official brief)
- Drag-and-drop timeline canvas (dnd-kit) with ≥20 evidence cards
- ATT&CK technique tagging via dropdown (attack-data.json)
- Causal-link tool (checkboxes: "caused by")
- Deterministic scoring engine (temporal + T-code + causal)
- Reveal Analysis mode (color-coded right/wrong)
- localStorage persistence

## Team (4 beginners)
- **Kacgz** — scenario.json (IR/DFIR data, ATT&CK mapping)
- **Dev1** — Timeline canvas (React + dnd-kit drag-drop)
- **Dev2** — ATT&CK tagging + causal links + scoring wiring
- **Dev3** — Reveal diff mode + localStorage + demo polish

## Run
```bash
npm install
npm run dev
```
Open the localhost URL. Drag cards → timeline, tag each, mark links, click "Score".

## Files
- `public/scenario.json` — the breach (evidence + reference kill chain)
- `public/attack-data.json` — MITRE ATT&CK technique dropdown list
- `src/score.js` — deterministic scoring engine
- `src/App.jsx` — UI: library, timeline, tagging, links, reveal
