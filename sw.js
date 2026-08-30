const CACHE_NAME = 'game-v10'; // ★更新時はここを書き換える
const ASSETS = [
  './',
  './index.html',
  './main.js',
  './style.css',
  './manifest.json'
];

// インストール：アセットの事前キャッシュ ＋ 即時スキップ待機
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート：古いキャッシュの全削除 ＋ 即時コントロール獲得
self.addEventListener('activate', (e) => {
  e.waitUntil(
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

// フェッチ：ネットワーク優先（Network First）
// オンライン時は常にサーバーから最新を取得し、失敗時（オフライン時）にキャッシュを使う
self.addEventListener('fetch', (e) => {
  // HTTP / HTTPS 以外のリクエスト（chrome-extension等）は除外
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // 取得成功したらキャッシュも更新しておく
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // オフライン等でネットワーク失敗時はキャッシュから返す
        return caches.match(e.request);
      })
  );
});
