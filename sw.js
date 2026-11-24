/* SEF Lernapp – Service Worker
   Alle App-Dateien werden gecacht, damit die App auch ohne Netz startet (z. B. im Funkloch).

   Updates: App-Seite und Fragenkatalog werden „Netz zuerst“ geladen (mit kurzem Zeitlimit, sonst aus
   dem Cache), und alle Downloads umgehen den Browser-Zwischenspeicher. So landet nach einem Update nie
   versehentlich eine alte Version im Cache (GitHub Pages erlaubt sonst 10 Min. Zwischenspeichern). */
const CACHE = 'sef-lernapp-v3';
const SHELL = [
  './',
  './index.html',
  './fragen.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];
const NET_TIMEOUT = 3500;   // ms – danach gespeicherte Version zeigen

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Die App fragt nach einem Update, welche Version aktiv ist (lädt nur neu, wenn sie älter ist) */
self.addEventListener('message', event => {
  if (event.data === 'version' && event.source) event.source.postMessage({ cache: CACHE });
});

/* Frisch vom Server holen (am Browser-Zwischenspeicher vorbei) und im Cache ablegen */
function fresh(req, key, cache) {
  return fetch(req, { cache: 'no-cache' }).then(res => {
    if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
    return res;
  });
}
const offline = () => new Response('Offline – bitte einmal mit Internetverbindung öffnen.', {
  status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
});

/* Netz zuerst, nach NET_TIMEOUT oder offline die gespeicherte Version */
function networkFirst(event, req, key) {
  return caches.open(CACHE).then(async cache => {
    const network = fresh(req, key, cache).catch(() => null);
    const cached = await cache.match(key);
    if (!cached) return (await network) || offline();
    const timeout = new Promise(r => setTimeout(() => r(null), NET_TIMEOUT));
    const res = await Promise.race([network, timeout]);
    if (res && res.ok) return res;
    event.waitUntil(network);
    return cached;
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') { event.respondWith(networkFirst(event, req, './index.html')); return; }
  if (url.pathname.endsWith('/fragen.js')) { event.respondWith(networkFirst(event, req, './fragen.js')); return; }

  // Übrige Dateien (Icons, Manifest): sofort aus dem Cache, im Hintergrund aktualisieren
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req);
    const network = fresh(req, req, cache).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    return (await network) || offline();
  }));
});
