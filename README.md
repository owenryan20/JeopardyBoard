# Jeff Hardy

A local-first Jeopardy-style board builder and game hosting tool. Create, edit, import, export, preview, and play custom boards — no account or backend required.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically http://localhost:5173).

## Build for static hosting

```bash
npm run build
```

Deploy the `dist/` folder to GitHub Pages or any static host.

## GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that builds and deploys on every push to `main`.

**One-time setup:**

1. Push to GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. After the workflow runs, the site will be at `https://<username>.github.io/JeopardyBoard/`

The build uses base path `/JeopardyBoard/` automatically. For a custom domain or user site (`username.github.io`), update `repoBase` in `vite.config.ts`.

## Features

- **Local-first storage** — boards saved in browser localStorage
- **Dashboard & My Boards** — create, import, duplicate, export, delete
- **Templates** — blank, trivia night, office party, and kids & family starters
- **Board editor** — 6×5 grid, clue editor, Final Jeopardy setup
- **Preview mode** — player view without marking tiles used
- **Game mode** — full-screen game board, team scoring (2–10 teams)
- **Final Jeopardy wagers** — collect wagers, reveal clue/answer, apply results
- **Import/export** — JSON, printable board, clipboard copy, backup download

## Tech stack

- Vite + React + TypeScript
- React Router
- Lucide icons
