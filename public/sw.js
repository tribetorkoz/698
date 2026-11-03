/* Cache only public, static application files. Never cache location data. */
const CACHE='cmc-mawqifi-v6-20261103-r1';
const BASE=new URL('./',self.location.href);
const INDEX=new URL('index.html',BASE).href;
const STATIC=['index.html','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cmc-mawqifi-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==BASE.origin||!url.href.startsWith(BASE.href))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(INDEX,copy));}return response;}).catch(()=>caches.match(INDEX)));return;
 }
 if(STATIC.includes(url.href))event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
