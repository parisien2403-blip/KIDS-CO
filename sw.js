// Service Worker — Kids & Co
// Pages et fichiers de l'appli : réseau d'abord (toujours la dernière version), cache si hors ligne.
// SDK Firebase et polices Google : cache d'abord. Les échanges de données Firebase ne passent pas par ici.

const CACHE_NAME = 'kidsandco-3.7'; // suivre le numéro de version.js
const CORE_ASSETS = ['./', './index.html', './style.css', './app.js', './config.js', './version.js', './qrcode.js', './manifest.json', './logo.png', './icon-192.png', './favicon.ico'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)).catch(() => {}));
});

self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  const isSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isSdk || isFont) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // « no-cache » : on redemande toujours au serveur si le fichier a changé (jamais de vieille version en mémoire).
  // Navigation (ouverture de l'appli) : requête d'origine, telle quelle, pour que les redirections (ex. /index.html → /) restent valides.
  const fresh = req.mode === 'navigate' ? fetch(req) : fetch(req, { cache: 'no-cache' });
  event.respondWith(
    fresh
      .then((res) => {
        if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match('./').then((r) => r || caches.match('./index.html')) : undefined)))
  );
});

// Notification push reçue (même appli fermée).
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Kids & Co', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || './' },
  }));
});

// Toucher une notification ouvre l'appli (sur le bon onglet).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const win = list.find((c) => 'focus' in c);
      if (win) { win.postMessage({ type: 'open-view', url }); return win.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
