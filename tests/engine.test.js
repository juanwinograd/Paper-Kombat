import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch,step,cleanInput,createAI } from '../src/engine.js';
import { HEROES,FLOOR } from '../src/content.js';
const input=(extra={})=>cleanInput(extra);
const tick=(s,n=1,a=input(),b=input())=>{for(let i=0;i<n;i++)step(s,[a,b]);return s;};
function fight(heroes=[0,1]){const s=createMatch(heroes);s.phase='fight';return s;}
function cast(s,side,index){const i=input({powers:[0,1,2,3].map(k=>k===index)});step(s,side?[input(),i]:[i,input()]);return s;}
test('ocho personajes, poderes propios y selección espejo',()=>{
 assert.equal(HEROES.filter(h=>!h.secret).length,8);assert.equal(HEROES.length,11);assert.equal(createMatch([7,7]).fighters[1].hero,7);
 assert.equal(HEROES[1].powers.length,4);assert.equal(HEROES[6].powers[0].kind,'sword');
 assert.throws(()=>createMatch([-1,0]));assert.throws(()=>createMatch([0,0],50));
});
test('cuenta regresiva, salto, suelo, límites y pausa',()=>{
 const s=createMatch();tick(s,190);assert.equal(s.phase,'fight');
 const x=s.fighters[0].x;tick(s,20,input({right:true}));assert.ok(s.fighters[0].x>x);
 tick(s,1,input({jump:true}));assert.ok(s.fighters[0].y<FLOOR);
 tick(s,80);assert.equal(s.fighters[0].y,FLOOR);
 s.paused=true;const before=JSON.stringify(s);tick(s,100,input({attack:true}));assert.equal(JSON.stringify(s),before);
 s.paused=false;tick(s,500,input({left:true}));assert.ok(s.fighters[0].x>=45);
});
test('golpe, defensa frontal y recuperación',()=>{
 const open=fight();open.fighters[0].x=400;open.fighters[1].x=480;tick(open,1,input(),input({block:true}));tick(open,1,input({attack:true}),input({block:true}));
 assert.equal(open.fighters[1].hp,99);assert.ok(open.fighters[1].guardMeter<100);
 const bare=fight();bare.fighters[0].x=400;bare.fighters[1].x=480;tick(bare,1,input({attack:true}));assert.equal(bare.fighters[1].hp,92);
});
test('los poderes recargan, no se disparan al mantener apretado',()=>{
 const s=fight();cast(s,0,0);assert.ok(s.fighters[0].cds[0]>6);assert.equal(s.projectiles.length,1);
 tick(s,30,input({powers:[true]}));assert.equal(s.projectiles.length,1);
 tick(s,430);assert.equal(s.fighters[0].cds[0],0);
});
test('todos los poderes se activan y el estado se puede serializar',()=>{
 HEROES.forEach((h,hero)=>h.powers.forEach((p,index)=>{
   const s=fight([hero,(hero+1)%HEROES.length]);s.fighters[0].x=400;s.fighters[1].x=490;
   cast(s,0,index);assert.ok(s.fighters[0].cds[index]>0,p.name);
   tick(s,60);assert.doesNotThrow(()=>JSON.parse(JSON.stringify(s)));
   assert.ok(s.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.hp)));
 }));
});
test('prisma temporal, inmunidad a cadenas y burbuja que ralentiza',()=>{
 const s=fight([0,5]);s.fighters[0].x=400;s.fighters[1].x=520;cast(s,0,0);tick(s,12);
 assert.ok(s.fighters[1].root>0);assert.ok(s.fighters[1].trapImmune>0);tick(s,70);assert.equal(s.fighters[1].root,0);
 const t=fight([5,0]);t.fighters[0].x=400;t.fighters[1].x=520;cast(t,0,0);tick(t,12);assert.ok(t.fighters[1].slow>0);
});
test('un clon como máximo, seis segundos, y se elimina de un golpe',()=>{
 const s=fight([7,3]);s.fighters[0].x=400;s.fighters[1].x=650;cast(s,0,0);assert.equal(s.clones.length,1);
 s.fighters[0].cds[0]=0;tick(s);cast(s,0,0);assert.equal(s.clones.length,1);
 s.clones[0].x=580;tick(s,1,input(),input({attack:true}));assert.equal(s.clones.length,0);
 const t=fight([7,0]);cast(t,0,0);tick(t,365);assert.equal(t.clones.length,0);
});
test('escudo protege e inmoviliza, cubo devuelve ataques',()=>{
 const s=fight([2,1]);s.fighters[0].x=400;s.fighters[1].x=480;cast(s,0,2);const x=s.fighters[0].x;tick(s,10,input({left:true}),input({attack:true}));assert.equal(s.fighters[0].hp,100);assert.equal(s.fighters[0].x,x);
 const t=fight([0,1]);t.fighters[0].x=350;t.fighters[1].x=650;cast(t,1,0);cast(t,0,0);tick(t,35);assert.ok(t.projectiles.some(p=>p.side===1));tick(t,80);assert.ok(t.fighters[0].hp<100);
});
test('sol ciega brevemente; martillo avisa y se puede esquivar',()=>{
 const s=fight([4,0]);cast(s,0,1);assert.ok(s.fighters[1].blind>0);tick(s,110);assert.equal(s.fighters[1].blind,0);
 const t=fight([6,0]);t.fighters[0].x=400;t.fighters[1].x=520;cast(t,0,1);assert.ok(t.fighters[0].pending);tick(t,32,input(),input({right:true}));assert.equal(t.fighters[1].hp,100);
});
test('fin por tiempo, empate y victoria al ganar dos rounds',()=>{
 const s=fight();s.time=.001;s.fighters[1].hp=80;tick(s);assert.equal(s.phase,'roundOver');assert.deepEqual(s.wins,[1,0]);
 tick(s,350);assert.equal(s.phase,'fight');assert.equal(s.fighters[1].hp,100);
 s.time=.001;s.fighters[1].hp=90;tick(s);assert.equal(s.phase,'matchOver');assert.equal(s.winner,0);
 const tie=fight();tie.time=.001;tick(tie);assert.equal(tie.roundWinner,null);assert.deepEqual(tie.wins,[0,0]);tick(tie,350);assert.equal(tie.phase,'fight');
});
test('la IA completa partidas con cualquiera de los once personajes',()=>{
 for(let hero=0;hero<HEROES.length;hero++){
  const s=createMatch([hero,(hero+3)%HEROES.length]),a=createAI('normal',()=>.42),b=createAI('hard',()=>.71);
  for(let n=0;n<20000&&s.phase!=='matchOver';n++)step(s,[a(s,0,1/60),b(s,1,1/60)]);
  assert.equal(s.phase,'matchOver',HEROES[hero].name);
 }
});

test('risa: cinco segundos sin control, luego se recupera y evita cadenas',()=>{
 const s=fight([9,0]);s.fighters[0].x=400;s.fighters[1].x=620;cast(s,0,0);
 assert.equal(s.fighters[1].laugh,0);assert.equal(s.fighters[0].pending.kind,'laugh');
 tick(s,42);const f=s.fighters[1];assert.ok(f.laugh>4.8&&f.laugh<=5);const x=f.x;
 tick(s,60,input(),input({right:true,jump:true,attack:true,powers:[true,true,true,true]}));
 assert.equal(f.x,x);assert.equal(f.y,FLOOR);assert.equal(f.attackCd,0);assert.ok(f.cds.every(cd=>cd===0));
 tick(s,Math.ceil(f.laugh*60)+2);assert.equal(f.laugh,0);assert.ok(f.controlImmune>0);
 tick(s,1,input(),input({right:true}));assert.ok(f.x>x);
});
test('fiesta de Fabrizio hace bailar y se recarga; defensa y distancia la evitan',()=>{
 const s=fight([1,0]);s.fighters[0].x=400;s.fighters[1].x=620;cast(s,0,3);tick(s,36);
 assert.ok(s.fighters[1].dance>2.3);assert.ok(s.fighters[0].party>0);assert.ok(s.fighters[0].cds[3]>13);
 tick(s,30,input(),input({attack:true,powers:[true]}));assert.equal(s.fighters[1].attackCd,0);assert.equal(s.fighters[1].cds[0],0);
 const guarded=fight([1,0]);guarded.fighters[0].x=400;guarded.fighters[1].x=620;tick(guarded,1,input(),input({block:true}));
 tick(guarded,1,input({powers:[false,false,false,true]}),input({block:true}));tick(guarded,40,input(),input({block:true}));assert.equal(guarded.fighters[1].dance,0);
 const far=fight([9,0]);far.fighters[0].x=100;far.fighters[1].x=700;cast(far,0,0);tick(far,45);assert.equal(far.fighters[1].laugh,0);
});
test('las burlas se pueden interrumpir y no encadenar; daño reducido mientras duran',()=>{
 const s=fight([9,0]);s.fighters[0].x=400;s.fighters[1].x=480;cast(s,0,0);tick(s,1,input(),input({attack:true}));assert.equal(s.fighters[0].pending,null);tick(s,45);assert.equal(s.fighters[1].laugh,0);
 const immune=fight([9,0]);immune.fighters[0].x=400;immune.fighters[1].x=620;immune.fighters[1].controlImmune=3;cast(immune,0,0);tick(immune,42);assert.equal(immune.fighters[1].laugh,0);
 const damage=fight([0,9]);damage.fighters[0].x=400;damage.fighters[1].x=480;damage.fighters[1].laugh=5;tick(damage,1,input({attack:true}));assert.equal(damage.fighters[1].hp,96);
});
test('Wis negro crea hasta dos monstruos por lado, temporales y eliminables',()=>{
 const s=fight([8,8]);cast(s,0,1);cast(s,1,1);assert.equal(s.clones.length,4);assert.ok(s.clones.every(c=>c.kind==='ink'&&c.hero===8));
 s.clones[0].x=s.fighters[1].x-60;tick(s,1,input(),input({attack:true}));assert.ok(s.clones.length<4);
 tick(s,280);assert.equal(s.clones.length,0);
});
test('tinta y cuadrados golpean; Baltazar se camufla y atacar lo revela',()=>{
 for(const hero of [8,10]){
  const s=fight([hero,0]);s.fighters[0].x=350;s.fighters[1].x=600;cast(s,0,0);
  assert.equal(s.projectiles[0].kind,hero===8?'ink':'square');tick(s,35);assert.ok(s.fighters[1].hp<100);
 }
 const s=fight([10,0]);cast(s,0,1);assert.ok(s.fighters[0].invisible>2.7);tick(s,1,input({attack:true}));assert.equal(s.fighters[0].invisible,0);
});
