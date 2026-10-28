// Identificación conservadora: una coincidencia solo es válida con SKU real.
export type SalesProduct = { id?: string; name?: string; brand?: string; line?: string; category?: string; tags?: string[] | string; variants?: Array<{ sku?: string; size?: string; status?: string; stock?: number | string }> };
const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.,]+/g, " ").trim();
const words = (v: unknown) => norm(v).split(/\s+/).filter(Boolean);
const types: Record<string,string[]> = {
 shampoo:["shampoo","shampoos","shampu","champu","shampues"],
 acondicionador:["acondicionador","acondicionadores","enjuague"],
 mascara:["mascara","mascaras","mascarilla","mascarillas"],
 ampolla:["ampolla","ampollas"],
 coloracion:["coloracion","tintura","tinturas"]
};
const brands = ["lisse extreme","ossono","vexa","coalix","fidelite","kleno"];
const filler = new Set(["necesito","quiero","dame","mandame","pasame","tenes","tienen","de","del","la","el","los","las","un","una","por","favor","para","que","me","y","con","x","unas","unos","al","en","botellas","botella","frascos","frasco","unidad","unidades"]);
type Size = { amount: number; kind: "ml"|"g" };
function parseSize(source: string): Size | null {
 const m=norm(source).match(/\b(\d+(?:[.,]\d+)?)\s*(litros?|lts?|lt|l|ml|cc|gr|gramos?|g|kg|kilos?)\b/);
 if(!m) return null;
 const n=Number(m[1].replace(",",".")), u=m[2];
 if(!Number.isFinite(n)||n<=0) return null;
 const mass=["g","gr","gramo","gramos","kg","kilo","kilos"].includes(u);
 const factor=["l","lt","lts","litro","litros","kg","kilo","kilos"].includes(u)?1000:1;
 return {amount:n*factor,kind:mass?"g":"ml"};
}
function identifyType(source: string) {
 const s=words(source);
 return Object.entries(types).find(([,aliases])=>aliases.some(a=>s.includes(a)))?.[0]??null;
}
function parseQuantity(source:string) {
 const s=norm(source);
 const m=s.match(/\b(\d{1,3})\s*(?:unidades?|u|x)?\s*(?=(?:shampoo|shampu|champu|acondicionador|mascara|mascarilla|ampolla|tintura|coloracion|ossono|vexa|coalix|fidelite|kleno)\b)/);
 return m ? Number(m[1]) : null;
}
export function searchSalesCatalog(query:string,catalog:SalesProduct[]) {
 const q=norm(query);
 if(!q||q.length>180) return {status:"invalid" as const,quantity:null,matches:[],question:"Decime qué producto buscás.",totalMatches:0};
 const quantity=parseQuantity(query), kind=identifyType(query), size=parseSize(query);
 const brand=brands.find(b=>q.split(" ").join(" ").includes(b))??null;
 const sizeTokens=size ? (norm(query).match(/\b\d+(?:[.,]\d+)?\s*(?:litros?|lts?|lt|l|ml|cc|gr|gramos?|g|kg|kilos?)\b/)?.[0]??"") : "";
 let remaining=q.replace(sizeTokens," ");
 if(quantity) remaining=remaining.replace(new RegExp("\\b"+quantity+"\\s*(?:unidades?|u|x)?\\s*(?=(?:shampoo|shampu|champu|acondicionador|mascara|mascarilla|ampolla|tintura|coloracion|ossono|vexa|coalix|fidelite|kleno)\\b)")," ")," ");
 if(brand) remaining=remaining.replace(brand," ");
 const typeWords=new Set(Object.values(types).flat());
 const terms=words(remaining).filter(t=>!filler.has(t)&&!typeWords.has(t)&&!/^\d+$/.test(t));
 if(!brand&&!kind&&!terms.length) return {status:"invalid" as const,quantity,matches:[],question:"¿Qué producto y marca necesitás?",totalMatches:0};
 const matches=catalog.flatMap(p=>{
  if(brand&&norm(p.brand)!==brand) return [];
  if(kind&&identifyType([p.name,p.category,p.line].join(" "))!==kind) return [];
  const productWords=new Set(words([p.name,p.brand,p.line,p.category,...(Array.isArray(p.tags)?p.tags:String(p.tags??"").split(","))].join(" ")));
  if(terms.some(t=>!productWords.has(t)))return [];
  return (p.variants??[]).filter(v=>{
   if(!v.sku || norm(v.status??"active")==="paused")return false;
   if(!size)return true;
   const vs=parseSize(String(v.size??""));
   return !!vs&&vs.kind===size.kind&&vs.amount===size.amount;
  }).map(v=>({productId:String(p.id??""),name:String(p.name??""),brand:String(p.brand??""),sku:String(v.sku),size:String(v.size??""),stock:v.stock??null}));
 }).filter(m=>m.productId);
 const status=matches.length===0?"not_found":matches.length===1?"exact":"ambiguous";
 return {status,quantity,filters:{brand,kind,size},matches:matches.slice(0,15),totalMatches:matches.length,
  question:status==="ambiguous"?"Encontré varias opciones. ¿Qué línea o presentación querés?":status==="not_found"?"No encontré esa variante exacta. ¿Confirmás marca, línea y tamaño?":null};
}
