// Service Worker for 每日剧本背诵 PWA
const CACHE_NAME = 'script-memorization-v1.2.0';
const ASSETS = [
  './',
  './app.html',
  './manifest.json',
  './version.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装时缓存基础文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 缓存策略：网络优先（确保用户拿到最新版本），网络失败时回退缓存
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // version.json 永远走网络（不缓存）
  if (event.request.url.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./version.json');
      })
    );
    return;
  }

  // HTML 文件：网络优先
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./app.html');
        });
      })
    );
    return;
  }

  // 其他资源：缓存优先，网络回退
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // 离线时返回应用壳
        if (event.request.mode === 'navigate') {
          return caches.match('./app.html');
        }
      });
    })
  );
});
