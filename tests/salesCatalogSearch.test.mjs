import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";
const source=fs.readFileSync(new URL("../lib/server/salesCatalogSearch.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m=new Module("salesCatalogSearch.cjs"); m.filename="salesCatalogSearch.cjs"; m.paths=modulePaths(); m._compile(js,m.filename);
function modulePaths(){return []}
const search=m.exports.searchSalesCatalog;
const catalog=[
 {id:"oss-shampoo-color",brand:"Ossono",name:"Shampoo Color",category:"Shampoo",variants:[{sku:"OSS-300",size:"300ml",status:"active"},{sku:"OSS-1000",size:"1000 ml",status:"active"}]},
 {id:"oss-mascara-color",brand:"Ossono",name:"Máscara Color",category:"Máscara",variants:[{sku:"OSS-MASK",size:"1000 gr",status:"active"}]},
 {id:"vexa-shampoo",brand:"Vexa",name:"Shampoo Color",category:"Shampoo",variants:[{sku:"VEX-1000",size:"1L",status:"active"}]},
 {id:"oss-paused",brand:"Ossono",name:"Shampoo Detox",category:"Shampoo",variants:[{sku:"OFF",size:"1 litro",status:"paused"}]}
];
test("cantidad y litro identifican la variante exacta",()=>{
 const r=search("3 shampoos Ossono de 1 litro",catalog);
 assert.equal(r.quantity,3);assert.equal(r.status,"exact");assert.equal(r.matches[0].sku,"OSS-1000");
});
test("marca y tipo filtran sin inventar",()=>{
 const r=search("shampoo Vexa de 1000ml",catalog);assert.equal(r.status,"exact");assert.equal(r.matches[0].sku,"VEX-1000");
});
test("no confunde mascara en gramos con shampoo en mililitros",()=>{
 const r=search("máscara Ossono 1 kg",catalog);assert.equal(r.status,"exact");assert.equal(r.matches[0].sku,"OSS-MASK");
});
test("variantes pausadas no aparecen",()=>{
 const r=search("shampoo Ossono Detox 1 litro",catalog);assert.equal(r.status,"not_found");
});
test("solicitud ambigua pide más detalle",()=>{
 const r=search("shampoo Ossono",catalog);assert.equal(r.status,"ambiguous");assert.equal(r.matches.length,2);
});
test("consulta sin producto no fabrica una respuesta",()=>{
 const r=search("hola",catalog);assert.equal(r.status,"not_found");assert.equal(r.matches.length,0);
});
