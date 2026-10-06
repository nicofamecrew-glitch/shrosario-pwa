// Server-only, read-only catalogue access. Never use this key for seller authentication.
export function createSupabaseCatalogReader({url,key,fallback=[],fetcher=fetch,now=Date.now}={}) {
  if(!url||!key)return null;
  const base=new URL(url);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('Origen de catálogo Supabase inválido');
  let cached,at=0,inFlight;
  async function table(name,columns){
    const rows=[];
    for(let offset=0;offset<20000;offset+=1000){
      const response=await fetcher(`${base.origin}/rest/v1/${name}?select=${columns}&order=${name==='catalog_products'?'id':'sku'}.asc&limit=1000&offset=${offset}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},redirect:'error',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('catalog unavailable');const page=await response.json();if(!Array.isArray(page)||page.length>1000)throw Error('catalog invalid');rows.push(...page);if(page.length<1000)return rows;
    }
    throw Error('catalog too large');
  }
  return async()=>{
    if(cached&&now()-at<60000)return cached;if(inFlight)return inFlight;
    inFlight=(async()=>{try{
      const [products,variants]=await Promise.all([table('catalog_products','id,name,brand,line,category,updated_at'),table('catalog_variants','sku,product_id,size,price_retail,price_wholesale,stock,status,updated_at')]);
      const price=n=>Number.isFinite(Number(n))&&Number(n)>=0&&Number(n)<=1e9?Number(n):0;
      const stock=n=>n!==null&&n!==''&&Number.isInteger(Number(n))&&Number(n)>=0?Number(n):null;
      const clean=s=>String(s??'').slice(0,250);
      const result=products.map(p=>{
        const local=fallback.find(row=>row.id===p.id);
        return {id:clean(p.id),name:clean(p.name),brand:clean(p.brand),line:clean(p.line),category:clean(p.category),image:local?.image||'',variants:variants.filter(v=>v.product_id===p.id&&v.status!=='paused').map(v=>{
          const photo=local?.variants.find(row=>row.sku===v.sku)||local?.variants.find(row=>row.size.toLowerCase().replace(/\s/g,'')===String(v.size).toLowerCase().replace(/\s/g,''));
          return {sku:clean(v.sku),size:clean(v.size),priceRetail:price(v.price_retail),priceWholesale:price(v.price_wholesale),stock:stock(v.stock),status:'active',image:photo?.image||local?.image||''};
        })};
      }).filter(p=>p.id&&p.variants.length);
      if(!result.length)throw Error('empty');
      cached={products:result,source:'supabase',fetched_at:new Date(now()).toISOString(),notice:'Precios y stock desde Supabase · Fotos de la PWA. Disponibilidad sujeta a confirmación al enviar.'};at=now();return cached;
    }catch{return {products:cached?.products||fallback,source:cached?'cached':'snapshot',notice:'No se pudo actualizar Supabase. Mostrando la última copia disponible; precios y stock a confirmar.'};}finally{inFlight=null;}})();return inFlight;
  };
}
