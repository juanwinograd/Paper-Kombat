import { createRequire } from 'node:module';
import { readFile,mkdir } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://localhost:3116/';
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const errors=[];
async function context(options={}){
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,...options});
 await ctx.addInitScript(()=>{Object.defineProperty(document,'hidden',{get:()=>false});Object.defineProperty(document,'visibilityState',{get:()=>"visible"});});
 await ctx.route(base+'**',async route=>{
  let name=new URL(route.request().url()).pathname.slice(1)||'index.html';if(name==='vendor/peerjs.min.js')name='tests/fixtures/peer.js';
  const file=resolve(root,name);assert.ok(file.startsWith(root));
  try{
   let body=await readFile(file);if(name==='src/app.js')body=Buffer.from(body.toString()+'\nglobalThis.testControls=controls;globalThis.testMatch=()=>match;');
   await route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf'})[extname(file)]??'application/octet-stream'});
  }catch{await route.fulfill({status:404,body:'Missing'});}
 });
 ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return ctx;
}
async function ready(p){await p.waitForFunction(()=>globalThis.testMatch?.()?.phase==='fight',null,{timeout:15000});}
async function center(p,selector){const b=await p.locator(selector).boundingBox();assert.ok(b);return{x:b.x+b.width/2,y:b.y+b.height/2};}
async function finger(p){
 const session=await p.context().newCDPSession(p);
 return async(type,points=[])=>{await session.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(q=>({radiusX:4,radiusY:4,force:1,...q}))});await p.evaluate(()=>new Promise(requestAnimationFrame));};
}
const inputs=p=>p.evaluate(()=>testControls.read());
const reset=p=>p.evaluate(()=>!document.querySelector('#touch-stick').classList.contains('moving')&&document.querySelector('.touch-stick-knob').style.transform==='translate(0px, 0px)');
try{
 await mkdir(resolve(root,'test-results'),{recursive:true});
 const ctx=await context(),page=await ctx.newPage();await page.goto(base);
 await page.locator('[data-mode=local]').click();await page.locator('#start').click();await ready(page);
 assert.equal(await page.locator('.movement-controls button').count(),0);
 await page.locator('#touch-stick').scrollIntoViewIfNeeded();
 const c=await center(page,'#touch-stick'),touch=await finger(page),point=(x=0,y=0)=>({id:1,x:c.x+x,y:c.y+y});
 await touch('touchStart',[point(3,0)]);let input=(await inputs(page))[0];assert.ok(!input.left&&!input.right&&!input.jump,'dead zone');
 await touch('touchMove',[point(-32)]);input=(await inputs(page))[0];assert.ok(input.left&&!input.right);
 const initial=await page.evaluate(()=>testMatch().fighters[0].x);await page.waitForFunction(x=>testMatch().fighters[0].x<x-10,initial);
 await touch('touchMove',[point(32)]);input=(await inputs(page))[0];assert.ok(input.right&&!input.left,'reverse without lifting '+JSON.stringify(input));
 await touch('touchMove',[point(110)]);assert.ok((await inputs(page))[0].right,'capture beyond the base');
 await touch('touchEnd');assert.ok(await reset(page));assert.ok(!(await inputs(page))[0].right);
 const stopped=await page.evaluate(()=>testMatch().fighters[0].x);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>testMatch().fighters[0].x),stopped,'stop on release');
 const floor=await page.evaluate(()=>testMatch().fighters[0].y);
 await touch('touchStart',[point(24,-30)]);input=(await inputs(page))[0];assert.ok(input.jump&&input.right,'diagonal jump');
 await page.waitForFunction(y=>testMatch().fighters[0].y<y-10,floor);
 await page.waitForFunction(y=>testMatch().fighters[0].y===y,floor);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>testMatch().fighters[0].y),floor,'hold up does not auto-repeat jump');
 await touch('touchMove',[point()]);await page.waitForTimeout(150);await touch('touchMove',[point(0,-34)]);await page.waitForFunction(y=>testMatch().fighters[0].y<y-10,floor);
 await touch('touchCancel');assert.ok(await reset(page));assert.ok(!(await inputs(page))[0].jump);
 const a=await center(page,'[data-action=attack]');
 await touch('touchStart',[point(-32)]);await touch('touchStart',[point(-32),{...a,id:2}]);input=(await inputs(page))[0];assert.ok(input.left&&input.attack,'two thumbs: move and attack');
 await touch('touchEnd',[{...a,id:2}]);assert.ok((await inputs(page))[0].left,'lifting the right thumb keeps movement');await touch('touchEnd');
 const block=await center(page,'[data-action=block]');await touch('touchStart',[point(32)]);await touch('touchStart',[point(32),{...block,id:2}]);input=(await inputs(page))[0];assert.ok(input.right&&input.block,'move and guard');await touch('touchEnd');
 const power=await center(page,'#powers-0 button:first-child');await touch('touchStart',[point(-32)]);await touch('touchStart',[point(-32),{...power,id:2}]);input=(await inputs(page))[0];assert.ok(input.left&&input.powers[0],'move and use power');await touch('touchEnd');
 await touch('touchStart',[point(-32)]);await page.evaluate(()=>document.getElementById('pause').click());assert.ok(await reset(page));assert.ok(!(await inputs(page))[0].left);await touch('touchEnd');await page.locator('#resume').click();
 await touch('touchStart',[point(-32)]);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.ok(await reset(page));await touch('touchEnd');
 await touch('touchStart',[point(32)]);await touch('touchMove',[point(33)]);await page.locator('#touch-stick').evaluate(el=>el.releasePointerCapture([...testControls.pointers.entries()].find(([id,p])=>p.button===el)?.[0]));await touch('touchMove',[point(75)]);assert.ok(await reset(page),'lost capture '+JSON.stringify(await page.evaluate(()=>({held:[...testControls.pointers.entries()].map(([id,p])=>({id,actions:p.actions,button:p.button.className})),knob:document.querySelector('.touch-stick-knob').style.transform}))));await touch('touchEnd');
 for(const size of [{width:320,height:844},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:667,height:375}]){
  await page.setViewportSize(size);await page.locator('#touch-stick').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('#touch-stick').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'horizontal overflow '+size.width);
  const stick=await page.locator('#touch-stick').boundingBox(),arena=await page.locator('.arena-frame').boundingBox(),attack=await page.locator('[data-action=attack]').boundingBox();
  assert.ok(stick.x>=0&&stick.x+stick.width<=size.width&&stick.y>=0&&stick.y+stick.height<=size.height,'joystick fits');
  assert.ok(stick.x+stick.width<attack.x,'separate thumbs');if(size.width>size.height)assert.ok(stick.x+stick.width<=arena.x,'joystick does not cover the arena');
  await page.screenshot({path:resolve(root,'test-results/joystick-'+size.width+'.png'),fullPage:true});
 }
 const d=await center(page,'#touch-stick');await touch('touchStart',[{...d,id:1,x:d.x+25}]);await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!testControls.pointers.size);assert.ok(await reset(page),'rotation clears held direction');await touch('touchEnd');
 console.log('Joystick: movimiento real, zona central, cambio de dirección, captura, salto diagonal, dos dedos, pausa, cancelación y rotación correctos.');
 await ctx.close();
 const net=await context({viewport:{width:844,height:390}}),host=await net.newPage(),guest=await net.newPage();
 await host.goto(base);await host.locator('[data-mode=online]').click();await host.locator('#create-room').click();await host.locator('#room-display').waitFor({state:'visible'});const code=await host.locator('#room-display').textContent();
 await guest.goto(base+'#sala='+code);await guest.locator('#join-form button').click();
 for(const p of [host,guest])await p.waitForFunction(()=>!document.getElementById('start').disabled);
 await host.locator('#start').click();await guest.locator('#start').click();await ready(host);await ready(guest);
 const gt=await finger(guest),g=await center(guest,'#touch-stick'),before=await host.evaluate(()=>testMatch().fighters.map(f=>f.x));
 await gt('touchStart',[{id:1,x:g.x+28,y:g.y}]);input=await inputs(guest);assert.ok(input[1].right&&!input[0].right,'guest controls player 2');
 await host.waitForFunction(x=>testMatch().fighters[1].x>x+15,before[1]);assert.equal(await host.evaluate(()=>testMatch().fighters[0].x),before[0]);
 await gt('touchEnd');await host.waitForFunction(()=>testMatch().fighters[1].vx===0);
 console.log('Online: el joystick del invitado mueve al jugador 2 y se detiene al soltar (transporte de prueba).');await net.close();
 const desktop=await context({hasTouch:false,isMobile:false,viewport:{width:1200,height:900}}),pc=await desktop.newPage();await pc.goto(base);await pc.locator('[data-mode=local]').click();await pc.locator('#start').click();await ready(pc);assert.ok(!await pc.locator('#touch-controls').isVisible());
 await pc.keyboard.down('d');assert.ok((await inputs(pc))[0].right);await pc.keyboard.up('d');await desktop.close();assert.deepEqual(errors,[]);
 console.log('Diseño 320/390/768 y horizontal 844/667 sin desbordes. Teclado de escritorio conservado.');
}finally{await browser.close();}
