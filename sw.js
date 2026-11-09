/* CRM Asesorantho — service worker: permite abrir la app sin wifi.
   Al publicar una versión nueva, cambia el número de CACHE. */
const CACHE = 'crm-asesorantho-v1.1.0';
const ARCHIVOS = ['./', './index.html', './xlsx.full.min.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca guardar en caché las llamadas al servidor de datos (Google Apps Script)
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;

  // Fuentes de Google: caché primero
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => r))));
    return;
  }

  if (url.origin !== location.origin) return;

  // Archivos de la app: responder desde caché y actualizar en segundo plano
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const cached = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
      const red = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      return cached || (await red) || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })
  );
});
