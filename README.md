# AyahFlow

AyahFlow is an installable Quran reading and recitation companion built for smooth, continuous study. It can identify a recited ayah, stay within the correct surah, follow the next ayah naturally, and highlight words as the recitation progresses.

**[Open the live app](https://ayahflow-live.zlatif1.chatgpt.site)**

## Highlights

- Live Quran recitation matching with same-surah safeguards to prevent incorrect jumps
- Ayah-by-ayah and continuous 604-page Mushaf reading views
- Real-time ayah and word highlighting while reciting
- Optional practice and mistake-detection modes
- Uthmani Arabic font with attributed tajweed coloring
- Contextual English with bracketed clarifications, six translation comparisons, and Ibn Kathir tafsir
- Search across all 6,236 ayahs, bookmarks, reading history, and responsive navigation
- Installable Progressive Web App with offline app-shell caching
- Mobile-first microphone control and reduced-motion accessibility support
- 48 automated contract and recitation-engine tests

## Technology

- JavaScript, HTML, and CSS
- Web Speech API
- Service Worker and Web App Manifest
- Quran and translation data from Al Quran Cloud
- Tafsir data from Quran Foundation APIs
- Node.js built-in test runner

## Run locally

No application dependencies are required.

```bash
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000` in a supported browser. Live recitation uses the browser's speech-recognition support and may vary by browser and device.

## Test

```bash
npm test
```

## Privacy

AyahFlow does not store microphone recordings. Speech recognition is provided by the user's browser, whose processing behavior depends on the browser and platform.

## Translation and tafsir note

Translations and commentary are displayed separately and remain attributed to their named sources. Bracketed English words are translator-supplied clarifications and are not additional words in the Arabic Quran.

