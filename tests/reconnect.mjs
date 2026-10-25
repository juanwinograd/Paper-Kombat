import { createRequire } from 'node:module';
import { readFile,mkdir } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const base='http://localhost:3108/';
const errors=[];
console.log('Preparando dos pestañas y transporte de prueba…');
try{
 const context=await browser.newContext({viewport:{width:1100,height:950}});
 await context.route(base+'**',async route=>{
  const url=new URL(route.request().url());let p=url.pathname.slice(1)||'index.html';if(p==='vendor/peerjs.min.js')p='tests/fixtures/peer.js';
  const file=resolve(root,p);assert.ok(file.startsWith(root));
  try{await route.fulfill({status:200,body:await readFile(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]??'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Missing'});}
 });
 const host=await context.newPage(),guest=await context.newPage();
 for(const p of [host,guest])p.on('pageerror',e=>(errors.push(e.message),console.log('Error de página: '+e.message)));
 await host.goto(base);await host.locator('[data-mode=online]').click();await host.locator('#create-room').click();await host.locator('#room-display').waitFor({state:'visible'});
 const code=await host.locator('#room-display').textContent();console.log('Sala creada.');
 await guest.goto(base+'#sala='+code);await guest.locator('#join-form button').click();
 for(const p of [host,guest])await p.waitForFunction(()=>!document.getElementById('start').disabled,null,{timeout:15000});console.log('Dos jugadores conectados.');
 await host.locator('[aria-label="Elegir a Amaral"]').click();await guest.locator('[aria-label="Elegir a Benicio"]').click();await host.waitForTimeout(100);
 await host.locator('#start').click();await guest.locator('#start').click();
 for(const p of [host,guest])await p.locator('#arena').waitFor({state:'visible'});
 await host.waitForTimeout(3300);await host.keyboard.press('2');await host.waitForTimeout(200);
 assert.equal(await guest.locator('#hud-1 .health-value').textContent(),'95');
 await host.locator('#pause').click();await guest.locator('#resume').waitFor({state:'visible'});
 const time=await host.locator('#timer').textContent(),round=await host.locator('#round').textContent();
 async function restored(){
  for(const p of [host,guest]){
   await p.locator('#arena').waitFor({state:'visible'});
   await p.waitForFunction(()=>!document.getElementById('resume').hidden&&!document.getElementById('fight-overlay').hidden&&document.getElementById('overlay-description').textContent.includes('Volvieron'),null,{timeout:20000});
   assert.equal(await p.locator('#room-display').textContent(),code);
   assert.equal(await p.locator('#hud-1 .health-value').textContent(),'95');
   assert.equal(await p.locator('#timer').textContent(),time);assert.equal(await p.locator('#round').textContent(),round);
  }
 }
 await guest.reload();await restored();console.log('Invitado recarga: misma sala, vida y tiempo.');
 await host.reload();await restored();console.log('Anfitrión recarga: misma sala, vida y tiempo.');
 await guest.goto('about:blank');await host.waitForTimeout(250);await guest.goBack();await restored();console.log('Salir por accidente y volver con Atrás: recupera la partida.');
 await Promise.all([host.reload(),guest.reload()]);await restored();console.log('Ambos recargan: recuperan la misma partida pausada.');
 await guest.locator('#resume').click();await host.waitForFunction(()=>document.getElementById('fight-overlay').hidden);
 await guest.keyboard.press('1');await host.waitForTimeout(200);assert.match(await host.locator('#powers-1 button').first().getAttribute('aria-label'),/recarga/);
 await mkdir(resolve(root,'test-results'),{recursive:true});await host.screenshot({path:resolve(root,'test-results/reconnected-online.png'),fullPage:true});
 await guest.locator('#exit-fight').click();await host.locator('#overlay-description').filter({hasText:'salió de la sala'}).waitFor({state:'visible'});
 assert.deepEqual(errors,[]);console.log('Reanudar, poderes remotos y salida explícita: correctos. Transporte de prueba, sin WebRTC externo.');
}finally{await browser.close();}
