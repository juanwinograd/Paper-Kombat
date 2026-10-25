import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root=resolve(new URL('../',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
let count=0;
for(const folder of ['src','scripts','tests']){
 for(const file of await readdir(resolve(root,folder))){if(!/\.(js|mjs)$/.test(file))continue;
  const result=spawnSync(process.execPath,['--check',resolve(root,folder,file)],{encoding:'utf8'});
  if(result.status!==0){console.error(result.stderr||result.error);process.exit(1);}count++;
 }
}
console.log('Sintaxis correcta: '+count+' módulos.');
