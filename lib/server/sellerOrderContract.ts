type Product = { id: string; name: string; brand?: string; variants: { sku: string; size: string; priceRetail: number; priceWholesale: number; status?: string; stock?: unknown }[] };
export class SellerOrderError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const sellerUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const money = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 999999999 && Math.abs(v * 100 - Math.round(v * 100)) < 0.0001;
// This pricing is exclusive to Sellers; the wholesale store keeps its catalog prices.
export function sellerCatalogPricing(catalog: Product[]): Product[] {
  return catalog.map(p=>({...p,variants:p.variants.map(v=>({...v,priceWholesale:Math.round(Math.round(v.priceRetail*100)*82/100)/100}))}));
}
export function pricedSellerOrder(body: unknown, catalog: Product[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SellerOrderError('Pedido inválido');
  const b = body as Record<string, any>;
  if (Object.keys(b).some(k => !['customer_id','client_ref','items','notes','payment','method'].includes(k)) || !sellerUuid(b.customer_id) || !sellerUuid(b.client_ref)) throw new SellerOrderError('Campos inválidos');
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 100 || typeof b.notes !== 'string' || b.notes.length > 250 || !money(b.payment) || !['Efectivo','Transferencia a mi alias','Otro'].includes(b.method)) throw new SellerOrderError('Revisá el pedido y el pago');
  const seen = new Set<string>();
  const items = b.items.map((i: any) => {
    if (!i || typeof i !== 'object' || Object.keys(i).some(k => !['product_id','sku','qty','expected_price','expected_cost','sale_price'].includes(k)) || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 10000 || !money(i.expected_price)) throw new SellerOrderError('Artículo inválido');
    const matches = catalog.filter(p => p.id === i.product_id);
    const p = matches[0]; const variants = p?.variants.filter(v => v.sku === i.sku) || []; const v = variants[0];
    const key = String(i.product_id) + ':' + String(i.sku);
    if (matches.length !== 1 || variants.length !== 1 || seen.has(key) || v.status === 'paused') throw new SellerOrderError('Presentación no disponible');
    seen.add(key);
    const retail = Math.round(v.priceRetail * 100) / 100; const cost = Math.round(v.priceWholesale * 100) / 100;
    if (!money(retail) || retail <= 0 || !money(cost) || cost <= 0) throw new SellerOrderError('Precio o costo pendiente de confirmar');
    if (retail !== i.expected_price) throw new SellerOrderError('El precio cambió. Actualizá el catálogo y revisá el pedido.',409);
    if(i.expected_cost!==undefined&&(!money(i.expected_cost)||i.expected_cost!==cost))throw new SellerOrderError('El costo cambió. Actualizá el catálogo y revisá el pedido.',409);
    const sale=i.sale_price===undefined?retail:i.sale_price;
    if(!money(sale)||sale<=0||sale>100000000)throw new SellerOrderError('Ingresá un precio de venta válido');
    const stock = v.stock === '' || v.stock === null || v.stock === undefined ? null : Number(v.stock);
    if (stock !== null && Number.isInteger(stock) && stock < i.qty) throw new SellerOrderError('La cantidad supera la disponibilidad');
    return {product_id:p.id,sku:v.sku,name:`${p.brand || ''} ${p.name} · ${v.size}`.trim().slice(0,250),qty:i.qty,unit_price:sale,cost_price:cost,suggested_price:retail};
  });
  if (items.reduce((n: number,i: any)=>n+Math.round(i.unit_price*100)*i.qty,0)>99999999900 || items.reduce((n: number,i: any)=>n+Math.round(i.cost_price*100)*i.qty,0)>99999999900) throw new SellerOrderError('El importe supera el máximo');
  return {customer_id:b.customer_id,client_ref:b.client_ref,items,notes:b.notes.trim(),payment:b.payment,method:b.method};
}
