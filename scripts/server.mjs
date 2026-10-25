import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf','.json':'application/json; charset=utf-8'};
export function createServer(){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');let pathname=decodeURIComponent(url.pathname);
   if(pathname.startsWith('/Paper-Kombat/'))pathname=pathname.slice('/Paper-Kombat'.length);
   if(pathname.endsWith('/'))pathname+='index.html';
   const file=resolve(root,'.'+pathname);
   if(!(file.startsWith(root+sep))||pathname.split('/').some(p=>p.startsWith('.')||p==='node_modules')||!['GET','HEAD'].includes(req.method)){res.writeHead(403).end();return;}
   if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}
   const data=await readFile(file);
   res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
   res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end('No encontramos esa viñeta.');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT??3000);
 createServer().listen(port,'0.0.0.0',()=>console.log('Paper Kombat: http://localhost:'+port));
}
