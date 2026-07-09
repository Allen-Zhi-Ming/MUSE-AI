<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.
https://ai.studio/apps/8257abe6-b224-493e-9889-ece52a4b6964

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
## Local dev notes

Use a clean install from `package-lock.json`:

```bash
npm ci --registry=https://registry.npmjs.org/ --loglevel=verbose
npm run dev
```

If port 3000 is already in use, the dev server will automatically try the next local port and print the actual URL.
You can also choose a port explicitly:

```bash
npm run dev -- --port 3001
```

If another Vite HMR WebSocket is causing conflicts, run without HMR:

```bash
npm run dev:no-hmr
```
