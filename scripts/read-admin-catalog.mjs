import {google} from 'googleapis';
import {mergeAdminCatalog} from './merge-admin-catalog.mjs';
export function createAdminCatalogReader({replica,local,env=process.env}){
  const encoded=env.GOOGLE_SHEETS_SA_B64;
  const credentials=encoded?JSON.parse(encoded.trim().startsWith('{')?encoded:Buffer.from(encoded,'base64').toString('utf8')):null;
  const auth=new google.auth.GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
  const sheets=google.sheets({version:'v4',auth});let cache,at=0,pending;
  async function table(name,id){const response=await sheets.spreadsheets.values.get({spreadsheetId:id,range:name+'!A:Z'},{timeout:15000});const rows=response.data.values||[];const headers=rows[0]||[];return rows.slice(1).map(row=>Object.fromEntries(headers.map((h,i)=>[String(h).trim(),row[i]??''])));}
  return async()=>{
    if(cache&&Date.now()-at<60000)return cache;if(pending)return pending;
    pending=(async()=>{
      const db=await replica();
      try{
        const [products,variants]=await Promise.all([table(env.PRODUCTS_SHEET_NAME||'products',env.PRODUCTS_SHEET_ID||env.GOOGLE_SHEETS_SHEET_ID),table(env.VARIANTS_SHEET_NAME||'variants',env.VARIANTS_SHEET_ID||env.GOOGLE_SHEETS_SHEET_ID)]);
        cache={products:mergeAdminCatalog(db.products,products,variants,local),source:'admin',notice:'Catálogo del admin actualizado · Precios y fotos de sus altas.'};at=Date.now();return cache;
      }catch{return cache?{...cache,source:'cached'}:db;}
      finally{pending=null;}
    })();return pending;
  };
}
