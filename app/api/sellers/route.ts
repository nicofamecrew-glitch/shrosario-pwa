import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/lib/supabase-server';
import { sellerCatalog } from '@/lib/server/sellerCatalog';
import { pricedSellerOrder, sellerUuid, SellerOrderError } from '@/lib/server/sellerOrderContract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'no-store'};
const requests=new Map<string,{count:number;until:number}>();

async function owner(req: Request) {
  const value=req.headers.get('authorization') || '';
  if (!/^Bearer \S+$/.test(value)) throw new SellerOrderError('Iniciá sesión',401);
  const token=value.slice(7); const {data,error}=await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new SellerOrderError('Sesión inválida',401);
  let claims; try { claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()); } catch { throw new SellerOrderError('Sesión inválida',401); }
  if (claims.sub !== data.user.id || claims.aal !== 'aal2' || !Number.isFinite(claims.exp) || claims.exp*1000<=Date.now()) throw new SellerOrderError('Completá la verificación en dos pasos',403);
  const {data:member,error:memberError}=await supabaseAdmin.from('seller_members').select('active').eq('user_id',data.user.id).maybeSingle();
  const {data:seller,error:sellerError}=await supabaseAdmin.from('seller_accounts').select('id,status').eq('user_id',data.user.id).maybeSingle();
  if(memberError||sellerError) throw new SellerOrderError('Servicio no disponible',503);
  if (member?.active===false || seller?.status !== 'active') throw new SellerOrderError('Cuenta no habilitada',403);
  const now=Date.now();for(const [id,v] of requests)if(v.until<now)requests.delete(id);const current=requests.get(data.user.id)||{count:0,until:now+60000};if(++current.count>60||requests.size>10000)throw new SellerOrderError('Esperá un minuto y volvé a intentar',429);requests.set(data.user.id,current);
  return {user:data.user.id,seller:seller.id};
}
function failure(e: unknown) { return NextResponse.json({error:e instanceof SellerOrderError?e.message:'No se pudo validar el catálogo o guardar el pedido'}, {status:e instanceof SellerOrderError?e.status:503,headers}); }

export async function GET(req: Request) {
  try {
    await owner(req);
    const catalog=await sellerCatalog();
    const origin=new URL(req.url).origin;
    const image=(p:any,v:any={})=>{const raw=v.image||v.imageUrl||v.images?.[0]||p.image||p.defaultImage||p.images?.[0]||'';try{const url=new URL(raw,origin);return !raw?'':url.origin===origin?url.pathname+url.search:url.origin===new URL(process.env.SUPABASE_URL!).origin?url.href:'';}catch{return '';}};
    const products=catalog.map((p:any)=>({id:p.id,name:p.name,brand:p.brand,line:p.line,category:p.category,image:image(p),variants:p.variants.map((v:any)=>({sku:v.sku,size:v.size,priceRetail:v.priceRetail,priceWholesale:v.priceWholesale,stock:v.stock===''||v.stock==null?null:Number(v.stock),status:v.status,image:image(p,v)}))}));
    return NextResponse.json({products,notice:'Catálogo del admin · Precios vigentes. Disponibilidad a confirmar por SH.'},{headers});
  } catch(e) { return failure(e); }
}
export async function POST(req: Request) {
  try {
    const actor=await owner(req);
    if (Number(req.headers.get('content-length')||0)>65536) throw new SellerOrderError('Pedido demasiado grande',413);
    const raw=await req.text();if(Buffer.byteLength(raw)>65536)throw new SellerOrderError('Pedido demasiado grande',413);
    let body;try{body=JSON.parse(raw);}catch{throw new SellerOrderError('Pedido inválido');}
    if(!body||!sellerUuid(body.client_ref)||!sellerUuid(body.customer_id))throw new SellerOrderError('Cliente inválido');
    const {data:customer,error:customerError}=await supabaseAdmin.from('seller_customers').select('id').eq('seller_id',actor.seller).eq('id',body.customer_id).maybeSingle();
    if(customerError)throw new SellerOrderError('Servicio no disponible',503);if(!customer)throw new SellerOrderError('Cliente no encontrado',404);
    // Reintentos del mismo pedido recuperan el precio pactado, sin volver a cotizar.
    const {data:existing,error:existingError}=await supabaseAdmin.from('seller_orders').select('*').eq('seller_id',actor.seller).eq('client_ref',body.client_ref).maybeSingle();
    if(existingError)throw new SellerOrderError('Servicio no disponible',503);
    const savedCatalog=existing ? Object.values(existing.items.reduce((groups:any,i:any)=>{groups[i.product_id] ||= {id:i.product_id,name:i.name,brand:'',variants:[]};groups[i.product_id].variants.push({sku:i.sku,size:'',priceRetail:i.unit_price,priceWholesale:i.cost_price});return groups;},{})) as any[] : null;
    const catalog=savedCatalog || await sellerCatalog();
    const order=pricedSellerOrder(body,catalog);
    if(existing)order.items=order.items.map((i:any)=>({...i,name:existing.items.find((v:any)=>v.product_id===i.product_id&&v.sku===i.sku).name}));
    const {data,error}=await supabaseAdmin.rpc('submit_priced_seller_order',{p_user_id:actor.user,p_customer_id:order.customer_id,p_items:order.items,p_client_ref:order.client_ref,p_notes:order.notes,p_payment:order.payment,p_method:order.method});
    if(error)throw new SellerOrderError(error.code==='23505'?'Este pedido ya fue guardado con otros datos':'No se pudo guardar el pedido',error.code==='23505'?409:503);
    return NextResponse.json({data},{status:existing?200:201,headers});
  } catch(e) { return failure(e); }
}
