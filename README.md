# PWNDORA IR Lab — Incident Timeline Reconstructor (DILE-02)

BrewingSec CyberDev Summit '26 — Coimbatore. Track: DILE (DFIR Innovation Lab).

## What it does
A learner reconstructs a fictional cyber breach: drag scattered evidence cards onto a
chronological timeline, tag each with a MITRE ATT&CK technique, draw causal links, then
submit for an automated score against a reference kill chain.

## Team (4 beginners)
- **Kacgz** — scenario.json (IR/DFIR data, ATT&CK mapping)
- **Dev1** — Timeline canvas (React + dnd-kit drag-drop)
- **Dev2** — ATT&CK tagging UI + causal links + scoring wiring
- **Dev3** — Reveal diff mode + localStorage + demo polish

## Run it
```bash
npm install
npm run dev
```
Open the localhost URL it prints. Drag a card onto the timeline, click "Score".

## Files
- `public/scenario.json` — the breach story (evidence + reference kill chain)
- `src/score.js` — deterministic scoring engine (pure JS)
- `src/App.jsx` — UI: evidence library, timeline, scoring
