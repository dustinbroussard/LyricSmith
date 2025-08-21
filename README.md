# LyricSmith

## Progressive Web App

LyricSmith is a fully installable PWA with offline support powered by a service worker.

### Test installability

1. Serve the project over HTTPS (e.g. `npx http-server -p 8080`).
2. Open the site in Chrome and visit **Application → Manifest** in DevTools to verify install readiness.
3. In **Application → Service Workers**, confirm the worker is installed and `lyricsmith-v3` cache exists.
4. Toggle **Offline** in DevTools to verify pages continue to work without a network.
5. Use the built-in install banner or Chrome's install option to add the app to your device.

### Generate an Android APK with Bubblewrap

1. Install Bubblewrap globally: `npm i -g @bubblewrap/cli`.
2. Initialize: `npx bubblewrap init --manifest=manifest.webmanifest --asset-prefix=/ --base-uri=/`.
3. Build the project: `bubblewrap build`.
4. Sign and install the generated APK on your device.

