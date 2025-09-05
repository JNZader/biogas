const CACHE_NAME = 'biogas-ops-cache-v1';

// URLs de los recursos principales de la aplicación para cachear (App Shell)
// Incluyendo las dependencias clave del importmap
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/icon.svg',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1/client',
  'https://aistudiocdn.com/@tanstack/react-router@1.40.0',
  'https://aistudiocdn.com/@tanstack/react-query@^5.51.1'
];

// Evento 'install': se dispara cuando el service worker se instala por primera vez.
self.addEventListener('install', (event) => {
  // Esperamos a que la promesa de instalación se resuelva.
  event.waitUntil(
    // Abrimos la caché con el nombre definido.
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Agregamos todos los recursos del App Shell a la caché.
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Evento 'activate': se dispara cuando el service worker se activa.
// Es un buen momento para limpiar cachés antiguas.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Si la caché no está en nuestra lista blanca, la eliminamos.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento 'fetch': se dispara cada vez que la aplicación realiza una petición de red.
self.addEventListener('fetch', (event) => {
  // Respondemos a la petición, ya sea desde la caché o desde la red.
  event.respondWith(
    // Buscamos una coincidencia para la petición en la caché.
    caches.match(event.request)
      .then((response) => {
        // Si encontramos una respuesta en la caché, la devolvemos.
        if (response) {
          return response;
        }
        // Si no, realizamos la petición a la red.
        return fetch(event.request);
      }
    )
  );
});