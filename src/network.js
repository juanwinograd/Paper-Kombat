import { VERSION, heroIndex, stageIndex } from './content.js';
import { cleanInput } from './engine.js';
const PREFIX='paper-kombat-';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode(){
  const bytes=crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');
}
export function validCode(code){return typeof code==='string'&&/^[A-HJ-NP-Z2-9]{8}$/.test(code);}
export function validMessage(m){
  if(!m||typeof m!=='object'||Array.isArray(m))return false;
  switch(m.type){
    case 'hello':return m.version===VERSION;
    case 'pick':return heroIndex(m.hero);
    case 'setup':return Array.isArray(m.heroes)&&m.heroes.length===2&&m.heroes.every(heroIndex)&&stageIndex(m.stage)&&Array.isArray(m.ready)&&m.ready.length===2&&m.ready.every(v=>typeof v==='boolean');
    case 'ready':case 'pause':return typeof m.value==='boolean';
    case 'input':return !!m.input&&typeof m.input==='object';
    case 'ping':case 'pong':return Number.isFinite(m.time);
    case 'start':return Array.isArray(m.heroes)&&m.heroes.length===2&&m.heroes.every(heroIndex)&&stageIndex(m.stage);
    case 'state':return validSnapshot(m.state);
    case 'rematch':case 'leave':case 'busy':return true;
    default:return false;
  }
}
export function validSnapshot(s){
  if(!s||!['countdown','fight','roundOver','matchOver'].includes(s.phase)||!stageIndex(s.stage)||!Number.isFinite(s.clock)||!Number.isFinite(s.time)||s.time<0||s.time>60||!Number.isFinite(s.phaseTime)||!Number.isInteger(s.round)||s.round<1||typeof s.paused!=='boolean'||!(s.winner===null||s.winner===0||s.winner===1)||!(s.roundWinner===null||s.roundWinner===0||s.roundWinner===1))return false;
  if(!Array.isArray(s.wins)||s.wins.length!==2||!s.wins.every(v=>Number.isInteger(v)&&v>=0&&v<=2))return false;
  if(!Array.isArray(s.fighters)||s.fighters.length!==2)return false;
  const nums=['x','y','vx','vy','facing','hp','attackCd','stun','root','slow','blind','invisible','shield','reflect','small','wind','invulnerable','trapImmune','guardMeter','poseTime'];
  if(!s.fighters.every((f,i)=>heroIndex(f.hero)&&f.side===i&&nums.every(k=>Number.isFinite(f[k]))&&f.hp>=0&&f.hp<=100&&Math.abs(f.x)<2000&&Math.abs(f.y)<2000&&typeof f.pose==='string'&&f.pose.length<30&&Array.isArray(f.cds)&&f.cds.length===4&&f.cds.every(Number.isFinite)&&(!f.pending||(f.pending.kind==='hammer'&&Number.isFinite(f.pending.time)))))return false;
  for(const [key,max,fields]of [['projectiles',40,['x','y','vx','vy','life','r']],['clones',2,['x','y','life','attackCd']],['effects',35,['id','x','y','life','maxLife']],['hazards',10,['x','timer','r']]]){
    if(!Array.isArray(s[key])||s[key].length>max||!s[key].every(p=>p&&fields.every(k=>Number.isFinite(p[k]))&&(key==='effects'?typeof p.kind==='string'&&p.kind.length<30&&typeof p.text==='string'&&p.text.length<40&&typeof p.color==='string'&&p.color.length<20:(p.side===0||p.side===1)&&(key==='clones'||heroIndex(p.hero)))))return false;
  }
  return true;
}
export class OnlineRoom extends EventTarget {
  constructor(PeerClass=globalThis.Peer,{timeout=12000,heartbeat=1000}={}){
    super();this.PeerClass=PeerClass;this.timeout=timeout;this.heartbeat=heartbeat;this.peer=null;this.conn=null;this.connected=false;this.isHost=false;this.closed=false;this.lastSeen=0;this.timer=null;this.openTimer=null;
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  async open(code=null){
    if(!this.PeerClass)throw Error('No se pudo cargar la conexión online. Recargá la página.');
    if(code!==null&&!validCode(code))throw Error('El código debe tener 8 letras o números.');
    this.isHost=code===null;this.code=code??makeCode();
    const options={debug:0,secure:true,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]}};
    this.peer=this.isHost?new this.PeerClass(PREFIX+this.code,options):new this.PeerClass(options);
    this.peer.on('error',error=>{
      const messages={'peer-unavailable':'No encontramos esa sala. Revisá el código y que tu amigo siga conectado.','unavailable-id':'Ese código ya está ocupado. Volvé a crear la sala.','network':'No pudimos conectar. Probá otra red y volvé a intentarlo.','browser-incompatible':'Este navegador no permite la conexión online. Probá uno actualizado.'};
      this.emit('problem',messages[error.type]??'La conexión se interrumpió. Volvé a crear o entrar a una sala.');
      if(!this.connected)this.close();
    });
    this.peer.on('disconnected',()=>{if(!this.closed&&!this.peer.destroyed){try{this.peer.reconnect();}catch{}}});
    this.peer.on('connection',conn=>{
      if(!this.isHost||this.conn||conn.metadata?.version!==VERSION){conn.on('open',()=>{conn.send({type:'busy'});setTimeout(()=>conn.close(),200);});return;}
      this.attach(conn);
    });
    return new Promise((resolve,reject)=>{
      this.openTimer=setTimeout(()=>{this.close();reject(Error('La sala tardó demasiado en responder. Probá otra conexión.'));},this.timeout);
      this.peer.on('open',()=>{
        clearTimeout(this.openTimer);
        if(!this.isHost)this.attach(this.peer.connect(PREFIX+this.code,{reliable:true,serialization:'json',metadata:{version:VERSION}}));
        this.emit('room',{code:this.code,isHost:this.isHost});resolve(this.code);
      });
      this.peer.on('error',e=>reject(Error(e.type==='peer-unavailable'?'No encontramos esa sala.':'No pudimos abrir la sala. Probá de nuevo.')));
    });
  }
  attach(conn){
    this.conn=conn;let validated=false,windowStart=Date.now(),count=0;
    const connectionTimer=this.connectionTimer=setTimeout(()=>{if(!this.connected){this.emit('problem','No se pudieron conectar los dos dispositivos. Probá otra red.');this.close();}},this.timeout);
    conn.on('open',()=>this.send({type:'hello',version:VERSION}));
    conn.on('data',m=>{
      if(this.closed)return;
      if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}
      if(++count>150)return;
      if(m?.type==='busy'){this.emit('problem','La sala ya tiene dos jugadores o usa otra versión.');this.close();return;}
      if(!validMessage(m))return;
      this.lastSeen=Date.now();
      if(m.type==='hello'){
        if(validated)return;validated=true;this.connected=true;clearTimeout(connectionTimer);
        this.timer=setInterval(()=>{if(Date.now()-this.lastSeen>7000){this.emit('problem','Perdimos la conexión con tu amigo.');this.close();}else this.send({type:'ping',time:Date.now()});},this.heartbeat);
        this.emit('connected',{isHost:this.isHost});return;
      }
      if(!validated)return;
      if(m.type==='ping'){this.send({type:'pong',time:m.time});return;}
      if(m.type==='pong'){this.emit('latency',Date.now()-m.time);return;}
      if(m.type==='input')m={type:'input',input:cleanInput(m.input)};
      this.emit('message',m);
    });
    conn.on('close',()=>{clearTimeout(connectionTimer);if(!this.closed){this.emit('problem','Tu amigo salió de la sala.');this.close();}});
    conn.on('error',()=>{this.emit('problem','La conexión falló. Probá otra red.');this.close();});
  }
  send(message){
    if(this.conn?.open){if(message.type==='state'&&this.conn.bufferSize>2)return;try{this.conn.send(message);}catch{}}
  }
  close(){
    this.closed=true;this.connected=false;clearInterval(this.timer);clearTimeout(this.openTimer);clearTimeout(this.connectionTimer);
    try{this.conn?.close();this.peer?.destroy();}catch{}
  }
}
