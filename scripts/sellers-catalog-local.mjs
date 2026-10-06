// Local development bridge, never deployed as a public PWA API.
// Run from the PWA: node --env-file=.env.local scripts/sellers-catalog-local.mjs
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import {createSupabaseCatalogReader} from './sellerCatalogReader.mjs';
import {createAdminCatalogReader} from './read-admin-catalog.mjs';
import {createHash} from 'node:crypto';
const raw=JSON.parse(await fs.readFile(new URL('../data/products.json',import.meta.url),'utf8'));
const image=(p,v={})=>v.image||v.imageUrl||v.images?.[0]||p.image||p.images?.[0]||p.variants?.[0]?.images?.[0]||'';
const fallback=raw.map(p=>({...p,image:image(p),variants:p.variants.map(v=>({...v,image:image(p,v)}))}));
const allowed=new Set(fallback.flatMap(p=>[p.image,...p.variants.map(v=>v.image)]).filter(path=>/^\/product\/[a-zA-Z0-9_.-]+$/.test(path)));
const replica=createSupabaseCatalogReader({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,fallback});
if(!replica)throw Error('Falta configuración de Supabase en la PWA');
const read=createAdminCatalogReader({replica,local:fallback});
const uploaded=new Map();const storageOrigin=new URL(process.env.SUPABASE_URL).origin;
function resolveImage(image){
 if(typeof image!=='string')return '';
 if(/^\/product\/[a-zA-Z0-9_.-]+$/.test(image)){allowed.add(image);return image;}
 try{const url=new URL(image);if(url.origin!==storageOrigin||url.protocol!=='https:'||!url.pathname.startsWith('/storage/v1/object/public/product-images/')||url.username||url.password)return '';const id=createHash('sha256').update(url.href).digest('hex');uploaded.set(id,url.href);return '/uploaded-photo/'+id;}catch{return '';}
}
createServer(async(req,res)=>{
 if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){res.writeHead(403);res.end();return;}
 if(req.method!=='GET'||req.headers.origin){res.writeHead(403);res.end();return;}
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 try{
  if(path==='/api/catalog'){const data=await read();if(data.source==='snapshot'){res.writeHead(503);res.end();return;}uploaded.clear();const products=data.products.map(p=>({...p,image:resolveImage(p.image),variants:p.variants.map(v=>({...v,image:resolveImage(v.image)}))}));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(products));return;}
  if(path.startsWith('/uploaded-photo/')){const url=uploaded.get(path.slice('/uploaded-photo/'.length));if(!url){res.writeHead(404);res.end();return;}const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)});const type=response.headers.get('content-type')?.split(';')[0];if(!response.ok||!['image/png','image/jpeg','image/webp'].includes(type)){res.writeHead(404);res.end();return;}const chunks=[];let length=0;for await(const chunk of response.body){length+=chunk.length;if(length>8*1024*1024)throw Error('size');chunks.push(chunk);}res.setHeader('Content-Type',type);res.setHeader('Cache-Control','private, max-age=300');res.end(Buffer.concat(chunks));return;}
  if(allowed.has(path)){const bytes=await fs.readFile(new URL('../public'+path,import.meta.url));res.setHeader('Content-Type',/\.webp$/i.test(path)?'image/webp':/\.jpe?g$/i.test(path)?'image/jpeg':'image/png');res.end(bytes);return;}
  res.writeHead(404);res.end();
 }catch{res.writeHead(503);res.end();}
}).listen(3101,'127.0.0.1',()=>console.log('Catálogo Supabase disponible solo en esta PC, puerto 3101.'));
