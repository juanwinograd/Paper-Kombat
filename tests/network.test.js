import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { OnlineRoom,validCode,validMessage,validSnapshot,makeCode } from '../src/network.js';
import { VERSION } from '../src/content.js';
import { createMatch } from '../src/engine.js';
const peers=new Map();let serial=0;
class Connection extends EventEmitter {
 constructor(metadata){super();this.metadata=metadata;this.open=false;this.other=null;}
 send(m){if(this.open)queueMicrotask(()=>this.other.emit('data',JSON.parse(JSON.stringify(m))));}
 close(){if(!this.open)return;this.open=false;this.emit('close');if(this.other.open){this.other.open=false;this.other.emit('close');}}
}
class FakePeer extends EventEmitter {
 constructor(id){super();this.id=typeof id==='string'?id:'guest'+serial++;peers.set(this.id,this);queueMicrotask(()=>this.emit('open',this.id));}
 connect(id,options){
  const a=new Connection(options.metadata),b=new Connection(options.metadata);a.other=b;b.other=a;
  queueMicrotask(()=>{if(!peers.has(id)){this.emit('error',{type:'peer-unavailable'});return;}peers.get(id).emit('connection',b);a.open=b.open=true;b.emit('open');a.emit('open');});return a;
 }
 destroy(){peers.delete(this.id);}
}
const event=(room,type)=>new Promise(resolve=>room.addEventListener(type,e=>resolve(e.detail),{once:true}));
test('códigos aleatorios sin caracteres ambiguos y protocolo cerrado',()=>{
 for(let n=0;n<100;n++)assert.ok(validCode(makeCode()));
 assert.ok(!validCode('ABCD1234'));assert.ok(!validCode('abc'));
 assert.ok(validMessage({type:'pick',hero:7}));assert.ok(!validMessage({type:'pick',hero:8}));
 assert.ok(!validMessage({type:'hello',version:'old'}));
 assert.ok(!validMessage({type:'input',input:null}));
 assert.ok(!validMessage({type:'script',content:'alert(1)'}));
});
test('los snapshots del motor pasan la validación; estados rotos se descartan',()=>{
 const s=createMatch([7,7]);assert.ok(validSnapshot(s));
 const bad=structuredClone(s);bad.fighters[1].x=Infinity;assert.ok(!validSnapshot(bad));
 const badStage=structuredClone(s);badStage.stage=100;assert.ok(!validSnapshot(badStage));
 const badEffect=structuredClone(s);badEffect.effects=[{id:1,x:0,y:0,life:1,maxLife:1,kind:'hit',text:5,color:''}];assert.ok(!validSnapshot(badEffect));
});
test('dos dispositivos: handshake, selección, entradas y desconexión',async()=>{
 const host=new OnlineRoom(FakePeer,{timeout:1000,heartbeat:100}),guest=new OnlineRoom(FakePeer,{timeout:1000,heartbeat:100});
 try{
  const code=await host.open();const hp=event(host,'connected'),gp=event(guest,'connected');await guest.open(code);await Promise.all([hp,gp]);
  assert.ok(host.connected&&guest.connected);assert.ok(host.isHost&&!guest.isHost);
  const selected=event(host,'message');guest.send({type:'pick',hero:7});assert.deepEqual(await selected,{type:'pick',hero:7});
  const setup=event(guest,'message');host.send({type:'setup',heroes:[7,7],stage:2,ready:[true,false]});assert.deepEqual((await setup).heroes,[7,7]);
  const moved=event(host,'message');guest.send({type:'input',input:{left:true,right:'yes',powers:[true,'x']}});const m=await moved;
  assert.equal(m.input.left,true);assert.equal(m.input.right,false);assert.deepEqual(m.input.powers,[true,false,false,false]);
  const problem=event(host,'problem');guest.close();assert.match(await problem,/salió/);
 }finally{host.close();guest.close();}
});
test('tercer jugador no puede tomar una sala ocupada',async()=>{
 const host=new OnlineRoom(FakePeer,{timeout:1000}),guest=new OnlineRoom(FakePeer,{timeout:1000}),third=new OnlineRoom(FakePeer,{timeout:1000});
 try{
  const code=await host.open();const first=event(host,'connected');await guest.open(code);await first;
  const rejected=event(third,'problem');await third.open(code);assert.match(await rejected,/dos jugadores/);assert.ok(host.connected&&guest.connected);
 }finally{host.close();guest.close();third.close();}
});
