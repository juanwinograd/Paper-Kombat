import { createRequire } from 'node:module';
import { readFile,mkdir } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://localhost:3108/';
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1200,height:1000}});
 // Both simulated devices keep their own game in the foreground.
 await context.addInitScript(()=>{Object.defineProperty(document,'hidden',{get:()=>false});Object.defineProperty(document,'visibilityState',{get:()=>"visible"});});
 await context.route(base+'**',async route=>{
  let p=new URL(route.request().url()).pathname.slice(1)||'index.html';if(p==='vendor/peerjs.min.js')p='tests/fixtures/peer.js';
  const file=resolve(root,p);assert.ok(file.startsWith(root));
  try{await route.fulfill({status:200,body:await readFile(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]??'application/octet-stream'});}
  catch{await route.fulfill({status:404,body:'Missing'});}
 });
 const host=await context.newPage();let guest;
 host.on('pageerror',e=>{errors.push(e.message);console.log('Error: '+e.message);});await host.goto(base);
 await host.locator('#home-roster canvas').first().waitFor();assert.match(await host.locator('#hero-count').textContent(),/^8 /);
 await host.locator('#secret-code-home').fill('no es el código');await host.locator('#home [data-secret-form] button').click();
 assert.match(await host.locator('#home [data-secret-status]').textContent(),/no abrió/);assert.match(await host.locator('#hero-count').textContent(),/^8 /);
 await host.locator('#secret-code-home').fill('Escuela Bavio 16 12');await host.locator('#home [data-secret-form] button').click();
 assert.match(await host.locator('#hero-count').textContent(),/^11 /);await host.reload();await host.locator('#home-roster canvas').first().waitFor();assert.match(await host.locator('#hero-count').textContent(),/^11 /);
 await host.locator('[data-mode=local]').click();assert.equal(await host.locator('.character-card').count(),11);
 await host.locator('[aria-label="Elegir a Wis negro"]').click();await host.locator('#select-p2').click();await host.locator('[aria-label="Elegir a Máquina de bobadas"]').click();
 await mkdir(resolve(root,'test-results'),{recursive:true});await host.screenshot({path:resolve(root,'test-results/secret-roster.png'),fullPage:true});
 await host.locator('#start').click();await host.waitForFunction(()=>document.getElementById('match-status').textContent.includes('¡A pelear!'),null,{timeout:15000});console.log('Round listo.');
 await host.keyboard.down('d');await host.waitForTimeout(1100);await host.keyboard.up('d');
 await host.keyboard.press('7');console.log('Risa solicitada.');await host.waitForFunction(()=>document.getElementById('hud-0').getAttribute('aria-label').includes('se ríe'),null,{timeout:5000});console.log('Risa activa.');
 await host.keyboard.press('1');await host.waitForTimeout(180);assert.match(await host.locator('#powers-0 button').first().getAttribute('aria-label'),/listo/);
 await host.screenshot({path:resolve(root,'test-results/laugh-power.png'),fullPage:true});
 await host.waitForFunction(()=>!document.getElementById('hud-0').getAttribute('aria-label').includes('se ríe'));
 await host.keyboard.press('2');await host.waitForTimeout(180);assert.match(await host.locator('#powers-0 button').nth(1).getAttribute('aria-label'),/recarga/);
 await host.locator('#exit-fight').click();await host.locator('#select-p1').click();await host.locator('[aria-label="Elegir a Baltazar"]').click();await host.locator('#start').click();await host.waitForTimeout(3300);
 await host.keyboard.press('2');await host.waitForTimeout(180);assert.match(await host.locator('#powers-0 button').nth(1).getAttribute('aria-label'),/recarga/);
 await host.keyboard.press('1');await host.waitForTimeout(150);assert.match(await host.locator('#powers-0 button').first().getAttribute('aria-label'),/recarga/);
 await host.locator('#exit-fight').click();await host.locator('#back').click();
 console.log('Código incorrecto/correcto, once dibujos, persistencia, risa de cinco segundos, monstruos y poderes de Baltazar: correctos.');
 guest=await context.newPage();guest.on('pageerror',e=>errors.push(e.message));await guest.addInitScript(()=>localStorage.removeItem('paper-kombat-secret-team'));await guest.goto(base);
 await host.locator('[data-mode=online]').click();await host.locator('[aria-label="Elegir a Wis negro"]').click();await host.locator('#create-room').click();await host.locator('#room-display').waitFor({state:'visible'});
 const code=await host.locator('#room-display').textContent();
 await guest.locator('[data-mode=online]').click();assert.equal(await guest.locator('.character-card').count(),8);
 await guest.locator('#room-code').fill(code);await guest.locator('#join-form button').click();
 for(const p of [host,guest])await p.waitForFunction(()=>!document.getElementById('start').disabled);
 await guest.locator('[aria-label="Elegir a Fabrizio"]').click();await host.waitForTimeout(100);
 await host.locator('#start').click();await guest.locator('#start').click();for(const p of [host,guest])await p.locator('#arena').waitFor({state:'visible'});
 for(const p of [host,guest])await p.waitForFunction(()=>document.getElementById('match-status').textContent.includes('¡A pelear!'),null,{timeout:15000});assert.equal(await guest.locator('#hud-0 strong').textContent(),'Wis negro');console.log('Round online listo.');
 const initialTimer=Number(await host.locator('#timer').textContent());await host.keyboard.down('d');await host.waitForFunction(limit=>Number(document.getElementById('timer').textContent)<=limit,initialTimer-2,{timeout:10000});await host.keyboard.up('d');await guest.keyboard.down('4');await guest.waitForTimeout(500);await guest.keyboard.up('4');console.log('Fiesta remota solicitada.');
 for(const p of [host,guest])await p.waitForFunction(()=>document.getElementById('hud-0').getAttribute('aria-label').includes('baila sin control'));
 await host.screenshot({path:resolve(root,'test-results/party-online.png'),fullPage:true});
 await host.waitForFunction(()=>!document.getElementById('hud-0').getAttribute('aria-label').includes('baila sin control'));
 await host.keyboard.down('2');await host.waitForTimeout(300);await host.keyboard.up('2');await guest.waitForFunction(()=>document.querySelectorAll('#powers-0 button')[1].getAttribute('aria-label').includes('recarga'),null,{timeout:5000});
 console.log('Online con un jugador desbloqueado y otro normal: personaje secreto, fiesta remota y monstruos correctos (transporte de prueba).');
 await context.close();assert.deepEqual(errors,[]);
}catch(e){for(const p of browser.contexts().flatMap(c=>c.pages())){console.log(await p.locator('#network-status').textContent().catch(()=>''));console.log(await p.locator('#hud-0').getAttribute('aria-label').catch(()=>''));console.log(await p.locator('#match-status').textContent().catch(()=>''));await p.screenshot({path:resolve(root,'test-results/secret-failure-'+browser.contexts().flatMap(c=>c.pages()).indexOf(p)+'.png'),fullPage:true}).catch(()=>{});}throw e;}finally{await browser.close();}
