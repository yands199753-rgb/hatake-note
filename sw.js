// 畑ノート service worker：オフラインでも開けるようにする
const CACHE = 'hatake-v1';
const CORE = ['./', './index.html', './supabase.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 同じサイトのファイルだけ扱う。ネットがあれば最新を取り、遅い/無いときはキャッシュを使う
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500));
    try { return await Promise.race([net, timeout]); }
    catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
      if (hit) return hit;
      return net.catch(() => new Response('オフラインです', { status: 503 }));
    }
  })());
});
