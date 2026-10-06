import { sellerSheetCatalog } from './catalog';
import { supabaseAdmin } from '@/lib/lib/supabase-server';
import productsJson from '@/data/products.json';
// @ts-ignore The existing shared catalog merger is a JavaScript module.
import { mergeAdminCatalog } from '@/scripts/merge-admin-catalog.mjs';

export async function sellerCatalog(): Promise<any[]> {
  async function table(name: string, columns: string) {const rows:any[]=[];for(let offset=0;offset<20000;offset+=1000){const {data,error}=await supabaseAdmin.from(name).select(columns).order(name==='catalog_products'?'id':'sku').range(offset,offset+999);if(error||!data)throw Error('Catálogo no disponible');rows.push(...data);if(data.length<1000)return rows;}throw Error('Catálogo demasiado grande');}
  const [sheets,products,variants]=await Promise.all([sellerSheetCatalog(),table('catalog_products','id,name,brand,line,category'),table('catalog_variants','sku,product_id,size,price_retail,price_wholesale,stock,status')]);
  const local=(productsJson as any[]).map(p=>({...p,image:p.image||p.images?.[0]||p.variants?.[0]?.image||p.variants?.[0]?.images?.[0]||'',variants:p.variants.map((v:any)=>({...v,image:v.image||v.images?.[0]||p.image||p.images?.[0]||''}))}));
  const replica=products.map((p:any)=>({...p,image:local.find(l=>l.id===p.id)?.image||'',variants:variants.filter((v:any)=>v.product_id===p.id&&v.status!=='paused').map((v:any)=>({...v,priceRetail:Number(v.price_retail),priceWholesale:Number(v.price_wholesale),image:local.find(l=>l.id===p.id)?.variants.find((i:any)=>i.sku===v.sku)?.image||''}))}));
  // Admin sheets override replicated prices; Supabase-only products remain included.
  return mergeAdminCatalog(replica,sheets,sheets.flatMap(p=>p.variants.map((v:any)=>({...v,product_id:p.id}))),local);
}
