/* Public application files only. Never cache user GPS, DOM snapshots or routes. */
const CACHE='cmc-mawqifi-v8-20261104-r2';
const APP_VERSION='8.0.0';
const BASE=new URL('./',self.location.href),INDEX=new URL('index.html',BASE).href;
const STATIC=['index.html','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png','assets/cmc-logo.svg','assets/cmc-mark.svg'].map(p=>new URL(p,BASE).href);
let current={phase:'checking',completed:0,total:STATIC.length},preparing=null;
function message(extra={}){return {type:'CMC_OFFLINE_STATUS',cacheName:CACHE,...current,...extra};}
async function broadcast(){const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows)client.postMessage(message());}
function prepareOffline(){
 if(preparing)return preparing;
 preparing=(async()=>{
  const cache=await caches.open(CACHE),existing=await Promise.all(STATIC.map(url=>cache.match(url)));
  current={phase:existing.every(Boolean)?'saved':'downloading',completed:existing.filter(Boolean).length,total:STATIC.length};await broadcast();
  for(let index=0;index<STATIC.length;index++){
   const url=STATIC[index];let response=existing[index];
   if(!response){
    response=await fetch(new Request(url,{cache:'reload'}));
    if(!response.ok||response.type==='opaque')throw Error('A public application file could not be downloaded.');
    if(url===INDEX){const html=await response.clone().text();if(!html.includes('name="cmc-version" content="'+APP_VERSION+'"'))throw Error('The response is not the expected public application HTML.');}
    await cache.put(url,response);current.completed++;await broadcast();
   }
  }
  current.phase='saved';await broadcast();return true;
 })().catch(async error=>{current.phase='error';await broadcast();throw error;}).finally(()=>{preparing=null;});
 return preparing;
}
self.addEventListener('install',event=>event.waitUntil(prepareOffline().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await prepareOffline();
 await Promise.all((await caches.keys()).filter(k=>k.startsWith('cmc-mawqifi-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();current.phase='ready';await broadcast();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='CMC_PREPARE_OFFLINE')return;
 event.waitUntil(prepareOffline().then(async()=>{
  if(!self.registration.installing&&!self.registration.waiting&&self.registration.active?.state==='activated'){current.phase='ready';await broadcast();}
  event.source?.postMessage(message());
 }).catch(()=>{event.source?.postMessage(message({phase:'error'}));}));
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==BASE.origin||!url.href.startsWith(BASE.href))return;
 // Cache-first navigation opens immediately even on restricted/slow networks.
 // New releases are installed atomically by a new, versioned service worker.
 if(req.mode==='navigate'&&(url.pathname===BASE.pathname||url.pathname===new URL(INDEX).pathname)){
  event.respondWith((async()=>{const cached=await(await caches.open(CACHE)).match(INDEX);return cached||fetch(req);})());return;
 }
 if(STATIC.includes(url.href))event.respondWith((async()=>{const cached=await(await caches.open(CACHE)).match(req);return cached||fetch(req);})());
});
