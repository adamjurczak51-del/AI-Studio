// PWA Service Worker for Domowy Budżet & Spiżarnia AI
const CACHE_NAME = 'domowy-budzet-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Chromium / Google Chrome requires a registered fetch event listener
// to recognize the PWA and display the "Install app" ("Zainstaluj aplikację") button
self.addEventListener('fetch', (event) => {
  // Pass-through to network: ensures 100% compatibility with Vite and Cloud Run
  // without any caching errors or stale script crashes
});
