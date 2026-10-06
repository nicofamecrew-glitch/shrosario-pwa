const number=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)&&n>=0?n:0;};
const string=v=>String(v??'').trim();
export function mergeAdminCatalog(replica, products, variants, local) {
  const result=new Map(replica.map(p=>[p.id,p]));
  for(const row of products){
    const id=string(row.id);if(!id)continue;
    if(row.status==='paused'){result.delete(id);continue;}
    const photo=local.find(p=>p.id===id);const prior=result.get(id);
    const image=string(row.image)||prior?.image||photo?.image||'';
    const items=variants.filter(v=>string(v.product_id)===id&&string(v.status)!=='paused'&&string(v.sku)).map(v=>{
      const size=string(v.size),sku=string(v.sku);
      const original=photo?.variants.find(p=>p.sku===sku)||photo?.variants.find(p=>string(p.size).toLowerCase()===size.toLowerCase());
      const old=prior?.variants.find(p=>p.sku===sku);
      const stock=string(v.stock)===''?null:Number(v.stock);
      return {sku,size,priceRetail:number(v.priceRetail),priceWholesale:number(v.priceWholesale),stock:Number.isInteger(stock)&&stock>=0?stock:null,status:'active',image:string(v.image)||string(row.image)||old?.image||original?.image||image};
    });
    if(!items.length){result.delete(id);continue;}
    result.set(id,{id,name:string(row.name),brand:string(row.brand),line:string(row.line),category:string(row.category),image,variants:items});
  }
  return [...result.values()];
}
