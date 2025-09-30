// sw.js
const CACHE_NAME = 'gestor-veiculos-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/supabase-config.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});