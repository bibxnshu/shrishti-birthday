# Shrishti's birthday website

The complete current website: HTML, CSS, JavaScript, local animation libraries, illustrations, and both music tracks. No installation or build step is needed.

## Publish on GitHub Pages

1. Extract this ZIP on your computer.
2. Upload the extracted contents to your GitHub repository. Keep `index.html`, `style.css`, `app.js`, and the `assets` folder together at the repository root. Upload the files, rather than the ZIP itself.
3. In the repository, open **Settings > Pages**.
4. Select **Deploy from a branch**, choose your **main** branch and **/(root)** folder, then save.
5. Wait for publication and open the HTTPS website address shown by GitHub. That is the address to use for the birthday QR code.

Official setup guide: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Included in this version

- Blooming sunflower bouquets, garden scenery, butterflies, and character poses.
- Your latest four wishes, farewell letter, and complete downloadable bouquet message.
- Pulsing golden rings and clickable hints around the interactive parts.
- Indila's Love Story: a 2 minute 30 second edit, followed by the Epic version. They repeat in 1-2-1-2 order.
- Page volume starts at 100% on each visit; the listener can adjust or pause it.
- Headphone reminder, microphone candle interaction, and a tap alternative.

## Preview locally

From the extracted folder, run:

    python -m http.server 8000

Then open http://localhost:8000 in your browser. A local server is preferable to double-clicking the HTML file for browser media and canvas features.

## Useful notes

- Phones may require one tap on **Tap to begin with music** before playing sound.
- The microphone works on HTTPS or localhost and asks for permission. Audio is not recorded or uploaded.
- Keep the asset folder names and paths unchanged.
- The page requests Cormorant Garamond and DM Sans from Google Fonts. Its fallback fonts work if Google Fonts cannot load.
- Edit the messages in `index.html`, appearance in `style.css`, and interactions in `app.js`.
