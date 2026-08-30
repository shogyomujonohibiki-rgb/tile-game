const CACHE_NAME = 'game-v9.1'; // ★更新時はこのバージョン文字列を変更する
const ASSETS = [
  './',
  './index.html',
  './main.js',
  './style.css',
  './manifest.json'
];

// インストール処理：キャッシュの登録 ＋ 即時アクティベート要求
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // 新しいService Workerを待機させず即座に有効化
  );
});

// アクティベート処理：古いバージョンのキャッシュを自動削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // 新バージョン以外の古いキャッシュを全削除
          }
        })
      );
    }).then(() => self.clients.claim()) // 制御下の全クライアント（画面）に即時反映
  );
});

// フェッチ処理
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
