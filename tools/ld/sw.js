/* ---------------------------------------------------------------------------
   Service worker: lets the test open and run without a connection.

   Strategy is network-first with a cache fallback, so a participant on a live
   connection always gets the current files (edit items.js and the next load
   picks it up — no cache-busting needed), while a phone with no signal falls
   back to the last copy it saw.

   Only same-origin GETs are touched. The POSTs to Apps Script pass straight
   through and are never cached or replayed here — the app's own queue in
   localStorage handles those.
   --------------------------------------------------------------------------- */

const CACHE = 'ld-v1';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './items.js',
  './app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;                       // leave the POSTs alone
  if (new URL(req.url).origin !== self.location.origin) return;   // not our files

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
