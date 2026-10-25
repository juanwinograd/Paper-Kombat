import { cp,mkdir,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=new URL('../dist/',import.meta.url);
await mkdir(out,{recursive:true});
for(const file of ['index.html','src','assets','vendor'])await cp(new URL(file,new URL('../',import.meta.url)),new URL(file,out),{recursive:true});
await writeFile(new URL('.nojekyll',out),'');
console.log('Edición estática lista en '+fileURLToPath(out));
