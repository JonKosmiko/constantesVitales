const CACHE_NAME = 'monitor-v3';
const ASSETS = [
  './',
  './index.html',
  './css/estilos.css',
  './script.js',
  './fonts/Roboto-Bold.ttf',
  "./fonts/Roboto-Regular.ttf"
];

// INSTALA Y GUARDA EN CACHÉ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// CARGAR DESDE CACHE SI NO HAY INTERNET
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
