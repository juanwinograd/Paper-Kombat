import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { OnlineRoom,validCode,validMessage,validSnapshot,makeCode,makeSession,RESUME_WINDOW } from '../src/network.js';
import { VERSION } from '../src/content.js';
import { createMatch } from '../src/engine.js';
import { saveSession,readSession,clearSession,SESSION_KEY } from '../src/session.js';
const peers=new Map();let serial=0;
class Connection extends EventEmitter {
 constructor(metadata){super();this.metadata=metadata;this.open=false;this.other=null;}
 send(m){if(this.open)queueMicrotask(()=>{if(this.other.open)this.other.emit('data',JSON.parse(JSON.stringify(m)));});}
 close(){if(!this.open)return;this.open=false;this.emit('close');if(this.other.open){this.other.open=false;this.other.emit('close');}}
}
class FakePeer extends EventEmitter {
 constructor(id){
  super();this.id=typeof id==='string'?id:'guest'+serial++;this.connections=new Set();this.destroyed=false;
  if(peers.has(this.id)){queueMicrotask(()=>this.emit('error',{type:'unavailable-id'}));return;}
  peers.set(this.id,this);queueMicrotask(()=>{if(!this.destroyed)this.emit('open',this.id);});
 }
 connect(id,options){
  const a=new Connection(options.metadata),b=new Connection(options.metadata);a.other=b;b.other=a;this.connections.add(a);
  queueMicrotask(()=>{
   if(this.destroyed)return;
   const remote=peers.get(id);if(!remote){this.emit('error',{type:'peer-unavailable'});return;}
   remote.connections.add(b);remote.emit('connection',b);a.open=b.open=true;b.emit('open');a.emit('open');
  });return a;
 }
 destroy(){this.destroyed=true;if(peers.get(this.id)===this)peers.delete(this.id);for(const c of this.connections)c.close();this.connections.clear();}
}
const event=(room,type)=>new Promise((resolve,reject)=>{
 const listener=e=>{clearTimeout(timer);resolve(e.detail);};
 const timer=setTimeout(()=>{room.removeEventListener(type,listener);reject(Error('No llegó '+type));},1500);
 room.addEventListener(type,listener,{once:true});
});
const opts={timeout:150,heartbeat:50,retryDelay:15,resumeWindow:1000};
const identity=r=>({session:r.session,opponentSession:r.opponentSession,isHost:r.isHost,resume:true});
async function pair(){
 const host=new OnlineRoom(FakePeer,opts),guest=new OnlineRoom(FakePeer,opts);const code=await host.open();
 const hp=event(host,'connected'),gp=event(guest,'connected');await guest.open(code);await Promise.all([hp,gp]);return{host,guest,code};
}
test('códigos aleatorios y protocolo de sesión cerrado',()=>{
 for(let n=0;n<100;n++)assert.ok(validCode(makeCode()));
 assert.ok(!validCode('ABCD1234'));assert.ok(!validCode('abc'));
 assert.ok(validMessage({type:'hello',version:VERSION,session:makeSession()}));assert.ok(!validMessage({type:'hello',version:VERSION}));
 assert.ok(validMessage({type:'pick',hero:7}));assert.ok(!validMessage({type:'pick',hero:11}));
 assert.ok(!validMessage({type:'input',input:null}));assert.ok(!validMessage({type:'script',content:'alert(1)'}));
});
test('snapshots y recuperación validan estado antes de aceptarlo',()=>{
 const s=createMatch([7,7]);assert.ok(validSnapshot(s));
 assert.ok(validMessage({type:'restore',heroes:[7,7],stage:0,state:s}));assert.ok(validMessage({type:'checkpoint',state:s}));
 const bad=structuredClone(s);bad.fighters[1].x=Infinity;assert.ok(!validSnapshot(bad));
 assert.ok(!validMessage({type:'restore',heroes:[7,7],stage:0,state:bad}));
 const badStage=structuredClone(s);badStage.stage=100;assert.ok(!validSnapshot(badStage));
});
test('selección y entradas; salir de la página conserva la sala del otro',async()=>{
 const {host,guest}=await pair();
 try{
  const selected=event(host,'message');guest.send({type:'pick',hero:7});assert.deepEqual(await selected,{type:'pick',hero:7});
  const moved=event(host,'message');guest.send({type:'input',input:{left:true,right:'yes',powers:[true,'x']}});const m=await moved;
  assert.equal(m.input.left,true);assert.equal(m.input.right,false);assert.deepEqual(m.input.powers,[true,false,false,false]);
  const waiting=event(host,'reconnecting');guest.close();await waiting;
  assert.ok(host.reconnecting&&!host.closed);assert.ok(host.peer&&!host.peer.destroyed);
 }finally{host.close();guest.close();}
});
test('el invitado recarga: vuelve a la misma sala y recibe la partida guardada',async()=>{
 const {host,guest,code}=await pair();const credentials=identity(guest),peer=host.peer;let returned;
 try{
  guest.close();assert.ok(host.reconnecting);returned=new OnlineRoom(FakePeer,opts);
  const hp=event(host,'connected'),gp=event(returned,'connected');await returned.open(code,credentials);
  assert.equal((await hp).rejoined,true);await gp;assert.equal(host.peer,peer);assert.equal(host.code,code);
  const state=createMatch([4,7],2);state.fighters[0].hp=37;state.wins=[1,0];state.paused=true;
  const received=event(returned,'message');host.send({type:'restore',heroes:[4,7],stage:2,state});
  const restored=await received;assert.equal(restored.state.fighters[0].hp,37);assert.deepEqual(restored.state.wins,[1,0]);assert.equal(restored.state.paused,true);
 }finally{host.close();guest.close();returned?.close();}
});
test('el anfitrión recarga: el invitado reintenta hasta recuperar el mismo código',async()=>{
 const {host,guest,code}=await pair();const credentials=identity(host);let returned;
 try{
  host.close();assert.ok(guest.reconnecting);returned=new OnlineRoom(FakePeer,opts);
  const hp=event(returned,'connected'),gp=event(guest,'connected');await returned.open(code,credentials);await Promise.all([hp,gp]);
  assert.ok(returned.isHost&&returned.connected&&guest.connected);assert.equal(returned.code,code);
 }finally{host.close();guest.close();returned?.close();}
});
test('corte transitorio: se reconectan automáticamente sin cambiar la identidad',async()=>{
 const {host,guest}=await pair();const hs=host.session,gs=guest.session;
 try{
  const hp=event(host,'connected'),gp=event(guest,'connected');guest.conn.close();await Promise.all([hp,gp]);
  assert.equal(host.session,hs);assert.equal(guest.session,gs);assert.ok(!host.reconnecting&&!guest.reconnecting);
 }finally{host.close();guest.close();}
});
test('la sala reservada no acepta a un tercero mientras espera al jugador original',async()=>{
 const {host,guest,code}=await pair();const original=identity(guest);let third,returned;
 try{
  guest.close();third=new OnlineRoom(FakePeer,opts);const rejected=event(third,'problem');await third.open(code);
  assert.match(await rejected,/reservada/);assert.ok(host.reconnecting&&!host.closed);
  returned=new OnlineRoom(FakePeer,opts);const hp=event(host,'connected');await returned.open(code,original);await hp;assert.ok(host.connected);
 }finally{host.close();guest.close();third?.close();returned?.close();}
});
test('un ID de anfitrión que tarda en liberarse se reintenta sin crear otra sala',async()=>{
 const {host,guest,code}=await pair();const returned=new OnlineRoom(FakePeer,opts);
 try{
  const connected=event(returned,'connected');const opening=returned.open(code,identity(host));
  await new Promise(resolve=>setTimeout(resolve,35));host.close();await opening;await connected;
  assert.ok(returned.isHost&&returned.connected);assert.equal(returned.code,code);
 }finally{host.close();guest.close();returned.close();}
});
test('el plazo de espera termina y limpia el transporte',async()=>{
 const host=new OnlineRoom(FakePeer,{...opts,resumeWindow:45}),guest=new OnlineRoom(FakePeer,opts);
 try{
  const code=await host.open();const connected=event(host,'connected');await guest.open(code);await connected;
  const expired=event(host,'problem');guest.close();assert.match(await expired,/dos minutos/);assert.ok(host.closed&&!host.connected);
 }finally{host.close();guest.close();}
});
function memoryStorage(){
 const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
}
test('guardado temporal conserva roles, personajes, vida, reloj y rounds al recargar',()=>{
 const storage=memoryStorage(),now=100000,state=createMatch([3,5],1);state.id=makeSession();state.fighters[1].hp=48;state.time=23;state.wins=[1,1];state.paused=true;
 const record={code:makeCode(),session:makeSession(),opponentSession:makeSession(),isHost:true,heroes:[3,5],stage:1,state};
 assert.ok(saveSession(storage,record,now));const saved=readSession(storage,now+1000);
 assert.equal(saved.state.time,23);assert.equal(saved.state.fighters[1].hp,48);assert.deepEqual(saved.state.wins,[1,1]);assert.ok(saved.isHost);
 assert.equal(readSession(storage,now+RESUME_WINDOW+1),null);assert.equal(storage.getItem(SESSION_KEY),null);
});
test('guardado corrupto o almacenamiento bloqueado no impiden seguir jugando',()=>{
 const storage=memoryStorage();storage.setItem(SESSION_KEY,'broken');assert.equal(readSession(storage),null);
 const unavailable={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
 assert.equal(readSession(unavailable),null);assert.equal(saveSession(unavailable,{}),false);assert.doesNotThrow(()=>clearSession(unavailable));
 const state=createMatch([0,1]);const s={code:makeCode(),session:makeSession(),opponentSession:null,isHost:true,heroes:[2,3],stage:0,state};
 saveSession(storage,s);assert.equal(readSession(storage),null);
});
