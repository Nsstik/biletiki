// Сохраняет сайт на устройстве, чтобы он открывался без интернета.
var CACHE='bilety-2';
var FILES=['./','index.html','cards.js','logic.js','ui.js','manifest.webmanifest','img/icon-180.png','img/icon-512.png','img/ml-p112.jpg','img/ml-p113.jpg','img/tv-p025.jpg','img/tv-p048.jpg','img/tv-p097.jpg','img/tv-p100.jpg','img/tv-p127.jpg','img/tv-p128.jpg'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n!==CACHE;}).map(function(n){return caches.delete(n);}));}));self.clients.claim();});
self.addEventListener('fetch',function(e){e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(function(r){return r||fetch(e.request);}));});
