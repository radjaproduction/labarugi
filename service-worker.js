// Naikkan versi ini tiap kali deploy perubahan baru, supaya browser mendeteksi
// service-worker.js berubah dan memicu alur update (lihat 'updatefound' di index.html).
const CACHE_NAME = 'laporan-keuangan-v1';

const APP_SHELL = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Terima perintah skip waiting dari halaman (tombol "Update" di banner)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Jangan pernah cache: request non-GET, atau request ke domain lain (Supabase,
    // CDN Tailwind/FontAwesome/Google Fonts, dsb) — biar data laporan selalu fresh
    // dan library eksternal selalu ambil versi terbaru.
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
        return;
    }

    // App shell (HTML/manifest/icon): cache-first, fallback ke network kalau belum ada,
    // supaya app tetap bisa dibuka walau koneksi lagi hilang.
    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || networkFetch;
        })
    );
});
