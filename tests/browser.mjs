import { createRequire } from 'node:module';
import { mkdir,readFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../scripts/server.mjs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright');
const server=createServer();await new Promise(r=>server.listen(3107,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const base='http://127.0.0.1:3107/Paper-Kombat/';
if(process.env.TEST_OFFLINE==='1'){
 const originalNewContext=browser.newContext.bind(browser);
 browser.newContext=async options=>{const context=await originalNewContext(options);await context.route('http://127.0.0.1:3107/**',async route=>{const url=new URL(route.request().url());let p=url.pathname.replace('/Paper-Kombat/','');if(!p)p='index.html';const file=resolve(fileURLToPath(new URL('../',import.meta.url)),p);try{const body=await readFile(file);await route.fulfill({status:200,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.ttf':'font/ttf','.svg':'image/svg+xml'})[extname(file)]??'application/octet-stream',body});}catch{await route.fulfill({status:404,body:'Missing'});}});return context;};
}
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:960}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('#home-roster canvas').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:new URL('../test-results/home-desktop.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await page.locator('[data-mode=local]').click();assert.equal(await page.locator('.character-card').count(),8);
 await page.locator('[aria-label="Elegir a Benicio"]').click();await page.locator('#select-p2').click();await page.locator('[aria-label="Elegir a Benicio"]').click();
 await page.locator('#start').click();await page.waitForTimeout(3400);
 assert.equal(await page.locator('#hud-0 strong').textContent(),'Benicio');assert.equal(await page.locator('#hud-1 strong').textContent(),'Benicio');
 await page.keyboard.press('1');await page.waitForTimeout(150);assert.match(await page.locator('#powers-0 button').getAttribute('aria-label'),/recarga/);
 await page.keyboard.press('7');await page.waitForTimeout(100);assert.match(await page.locator('#powers-1 button').getAttribute('aria-label'),/recarga/);
 await page.locator('#pause').click();await page.locator('#resume').waitFor({state:'visible'});const timer=await page.locator('#timer').textContent();await page.waitForTimeout(1200);assert.equal(await page.locator('#timer').textContent(),timer);await page.locator('#resume').click();
 await page.screenshot({path:new URL('../test-results/fight-desktop.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await page.locator('#exit-fight').click();await page.locator('#back').click();
 await page.locator('[data-mode=cpu]').click();await page.locator('[aria-label="Elegir a Luca"]').click();await page.locator('#start').click();await page.waitForTimeout(3300);await page.keyboard.press('1');await page.waitForTimeout(100);assert.match(await page.locator('#powers-0 button').first().getAttribute('aria-label'),/recarga/);
 await page.locator('#help').click();await page.locator('#help-dialog').waitFor({state:'visible'});await page.locator('#help-done').click();
 for(const width of [320,390,768]){
  const mobile=await browser.newContext({viewport:{width,height:width===768?1024:844},hasTouch:true,isMobile:true});const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('#home-roster canvas').first().waitFor();await p.evaluate(()=>document.fonts.ready);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width)+' home overflow');
  await p.locator('[data-mode=cpu]').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width)+' setup overflow');
  await p.locator('#start').click();await p.waitForTimeout(3300);assert.ok(await p.locator('#touch-controls').isVisible());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width)+' arena overflow');
  const button=p.locator('#powers-0 button').first();const box=await button.boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(120);assert.match(await button.getAttribute('aria-label'),/recarga/);
  await p.screenshot({path:new URL('../test-results/fight-'+width+'.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});await mobile.close();
 }
 if(process.env.TEST_ONLINE==='1'){
  const hostContext=await browser.newContext(),guestContext=await browser.newContext();const host=await hostContext.newPage(),guest=await guestContext.newPage();
  await host.goto(base);await host.locator('[data-mode=online]').click();await host.locator('#create-room').click();await host.locator('#room-display').waitFor({state:'visible',timeout:20000});const code=await host.locator('#room-display').textContent();
  await guest.goto(base+'#sala='+code);await guest.locator('#join-form button').click();
  await host.waitForFunction(()=>!document.getElementById('start').disabled,{timeout:20000});await guest.waitForFunction(()=>!document.getElementById('start').disabled,{timeout:20000});
  await host.locator('#start').click();await guest.locator('#start').click();await host.locator('#arena').waitFor({state:'visible'});await guest.locator('#arena').waitFor({state:'visible'});await host.waitForTimeout(3500);
  await guest.keyboard.press('1');await host.waitForTimeout(400);assert.match(await host.locator('#powers-1 button').first().getAttribute('aria-label'),/recarga/);
  await guest.locator('#pause').click();await host.locator('#resume').waitFor({state:'visible'});await host.locator('#resume').click();
  await guestContext.close();await host.locator('#overlay-title').filter({hasText:'Se cortó'}).waitFor({state:'visible'});await hostContext.close();
  console.log('Online real: sala, conexión WebRTC, selección, partida, poder remoto, pausa y salida correctos.');
 }
 assert.deepEqual(errors,[]);console.log('Navegador: selección espejo, dos teclados, PC, poderes, pausa, ayuda, rutas /Paper-Kombat/, tamaños 320/390/768 y controles táctiles correctos.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
