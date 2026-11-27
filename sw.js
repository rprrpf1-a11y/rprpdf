// RprPDF Service Worker
const CACHE_NAME = 'rprpdf-cache-v28';

const STATIC_ASSETS = [
  './',
  './index.html',
  './ads.txt',
  './googlecccccdc404ce1a05.html',
  './manifest.json',
  './css/styles.css',
  './assets/favicon.svg',
  './assets/logo.svg',
  './assets/logo-icon.svg',
  './js/vendor/pdf.min.js',
  './js/vendor/pdf-lib.min.js',
  './js/vendor/pdf-encrypt.js',
  './js/vendor/pdf.worker.min.js',
  './js/vendor/jszip.min.js',
  './js/vendor/confetti.browser.min.js',
  './js/vendor/qrcode.min.js',
  './js/vendor/jsqr.min.js',
  './js/app.js',
  './js/utils.js',
  './js/pdf-worker.js',
  './js/tools/split.js',
  './js/tools/merge.js',
  './js/tools/edit.js',
  './js/tools/rotate.js',
  './js/tools/office.js',
  './js/tools/sign.js',
  './js/tools/compress.js',
  './js/tools/watermark.js',
  './js/tools/convert.js',
  './js/tools/protect.js',
  './js/tools/numbering.js',
  './js/tools/grayscale.js',
  './js/tools/crop.js',
  './js/tools/imagecompress.js',
  './js/tools/qrcode.js',
  './js/tools/exif.js',
  './js/tools/favicon.js',
  './js/tools/textdiff.js',
  './js/tools/whatsapp.js',
  './js/tools/wadp.js',
  './js/tools/unlock.js',
  './js/tools/pdf2text.js',
  './js/tools/invoice.js',
  './js/tools/imgconvert.js',
  './js/tools/passgen.js',
  './js/tools/devformat.js',
  './js/tools/ocr.js',
  './js/tools/aihelper.js',
  './js/tools/mdpdf.js',
  './js/tools/palette.js',
  './js/tools/voicenotes.js',
  './js/tools/vault.js'
];

// Install event: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first for same-origin updates, fallback to cache for offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
