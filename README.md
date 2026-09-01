# SG Maid — Low-Fidelity Website Wireframe

Static, zero-build. Grayscale UX wireframe for client review.

## Pages
- `index.html` — Homepage (14 sections)
- `about.html` — About Us (11 sections)

## Controls (top bar — review tool only, not part of the design)
- Page switcher: Home / About Us
- Viewport: Desktop 1440 / Tablet 834 / Mobile 390
- UX annotations: toggle off before sending to the client

## Deploy to Vercel
No framework, no build step. Either:

**A. Vercel CLI**
```
cd sgmaid-wireframe
vercel            # preview URL
vercel --prod     # production URL
```

**B. Dashboard**
Push this folder to a Git repo → Vercel → New Project → import →
Framework Preset: **Other**, Build Command: *(empty)*, Output Directory: `./`

**C. Drag and drop**
Zip the folder and drop it into vercel.com/new.

Note: the deployed URL is public. Enable Vercel Authentication or password
protection in Project Settings → Deployment Protection if the client work
should stay private.

## Assets
`logo-black.png`, `logo-black-tagline.png` — supplied black lockups,
downsized and greyscaled to keep the wireframe monochrome.
