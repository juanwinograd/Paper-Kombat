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
    case 'hello':return m.version===VERSION&&validSession(m.session);
    case 'pick':return heroIndex(m.hero);
    case 'setup':return Array.isArray(m.heroes)&&m.heroes.length===2&&m.heroes.every(heroIndex)&&stageIndex(m.stage)&&Array.isArray(m.ready)&&m.ready.length===2&&m.ready.every(v=>typeof v==='boolean');
    case 'ready':case 'pause':return typeof m.value==='boolean';
    case 'input':return !!m.input&&typeof m.input==='object';
    case 'ping':case 'pong':return Number.isFinite(m.time);
    case 'start':return Array.isArray(m.heroes)&&m.heroes.length===2&&m.heroes.every(heroIndex)&&stageIndex(m.stage);
    case 'state':return validSnapshot(m.state);
    case 'restore':return Array.isArray(m.heroes)&&m.heroes.length===2&&m.heroes.every(heroIndex)&&stageIndex(m.stage)&&(m.state===null||(validSnapshot(m.state)&&m.state.stage===m.stage&&m.state.fighters.every((f,i)=>f.hero===m.heroes[i])));
    case 'checkpoint':return validSnapshot(m.state);
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
export const RESUME_WINDOW=120000;
export function makeSession(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
export function validSession(value){return typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);}
export class OnlineRoom extends EventTarget {
  constructor(PeerClass=globalThis.Peer,{timeout=12000,heartbeat=1000,retryDelay=1500,resumeWindow=RESUME_WINDOW}={}){
    super();Object.assign(this,{PeerClass,timeout,heartbeat,retryDelay,resumeWindow});
    this.peer=null;this.conn=null;this.connected=false;this.isHost=false;this.closed=false;
    this.session=makeSession();this.opponentSession=null;this.hasConnected=false;this.reconnecting=false;this.deadline=0;
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  async open(code=null,{isHost=code===null,session=this.session,opponentSession=null,resume=false,expiresAt=0}={}){
    if(!this.PeerClass)throw Error('No se pudo cargar la conexión online. Recargá la página.');
    if(code!==null&&!validCode(code))throw Error('El código debe tener 8 letras o números.');
    if(!validSession(session)||(opponentSession!==null&&!validSession(opponentSession)))throw Error('La sesión guardada no es válida.');
    this.isHost=isHost;this.code=code??makeCode();this.session=session;this.opponentSession=opponentSession;
    this.hasConnected=opponentSession!==null;this.restoring=resume;this.closed=false;
    return new Promise((resolve,reject)=>{
      this.resolveOpen=resolve;this.rejectOpen=reject;
      if(resume)this.recover('Volviendo a la sala…',expiresAt);
      this.createPeer();
    });
  }
  createPeer(){
    if(this.closed||this.creatingPeer)return;
    this.creatingPeer=true;
    const old=this.peer;this.peer=null;try{old?.destroy();}catch{}
    const options={debug:0,secure:true,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]}};
    let peer;
    try{peer=this.isHost?new this.PeerClass(PREFIX+this.code,options):new this.PeerClass(options);}
    catch{this.creatingPeer=false;this.fail('Este navegador no pudo abrir la conexión online.');return;}
    this.peer=peer;
    clearTimeout(this.openTimer);
    this.openTimer=setTimeout(()=>{
      if(this.peer!==peer||this.closed)return;
      this.creatingPeer=false;
      if(this.reconnecting){this.peer=null;try{peer.destroy();}catch{}}
      else this.fail('La sala tardó demasiado en responder. Probá otra conexión.');
    },this.timeout);
    peer.on('open',()=>{
      if(this.peer!==peer||this.closed)return;
      clearTimeout(this.openTimer);this.creatingPeer=false;
      if(!this.announced){this.announced=true;this.emit('room',{code:this.code,isHost:this.isHost});}
      this.resolveOpen?.(this.code);this.resolveOpen=null;this.rejectOpen=null;
      if(!this.isHost)this.dial();
    });
    peer.on('error',error=>{
      if(this.peer!==peer||this.closed)return;
      clearTimeout(this.openTimer);this.creatingPeer=false;
      if(error.type==='browser-incompatible'||error.type==='invalid-id'){this.fail('Este navegador no permite la conexión online. Probá uno actualizado.');return;}
      if(this.hasConnected||this.restoring||this.reconnecting){
        if(error.type==='unavailable-id'||peer.destroyed){this.peer=null;try{peer.destroy();}catch{}}
        this.recover('Esperando a que tu amigo vuelva…');return;
      }
      const messages={'peer-unavailable':'No encontramos esa sala. Revisá el código y que tu amigo siga conectado.','unavailable-id':'Ese código ya está ocupado. Volvé a crear la sala.','network':'No pudimos conectar. Probá otra red y volvé a intentarlo.'};
      this.fail(messages[error.type]??'La conexión se interrumpió. Volvé a intentar.');
    });
    peer.on('disconnected',()=>{
      if(this.peer!==peer||this.closed)return;
      try{if(!peer.destroyed)peer.reconnect();else this.recover();}catch{this.recover();}
    });
    peer.on('close',()=>{if(this.peer===peer&&!this.closed){this.peer=null;this.creatingPeer=false;this.recover();}});
    peer.on('connection',conn=>{
      if(this.peer!==peer||this.closed)return;
      const identity=conn.metadata?.session;
      if(!this.isHost||conn.metadata?.version!==VERSION||!validSession(identity)||(this.opponentSession&&identity!==this.opponentSession)||(this.conn&&!this.opponentSession)){
        conn.on('open',()=>{conn.send({type:'busy'});setTimeout(()=>conn.close(),200);});return;
      }
      // The returning player's private token can replace a stale data channel.
      if(this.conn)this.dropConnection();
      this.attach(conn);
    });
  }
  dial(){
    if(this.closed||this.isHost||this.conn||!this.peer||this.peer.destroyed||this.peer.disconnected||this.creatingPeer)return;
    try{this.attach(this.peer.connect(PREFIX+this.code,{reliable:true,serialization:'json',metadata:{version:VERSION,session:this.session}}));}
    catch{this.recover();}
  }
  dropConnection(){
    clearInterval(this.timer);clearTimeout(this.connectionTimer);
    const conn=this.conn;this.conn=null;this.connected=false;
    try{conn?.close();}catch{}
  }
  recover(message='Esperando a que tu amigo vuelva…',expiresAt=0){
    if(this.closed)return;
    if(!this.hasConnected&&!this.restoring){this.fail('No se pudieron conectar los dos dispositivos. Probá otra red.');return;}
    this.dropConnection();
    if(!this.reconnecting){
      this.reconnecting=true;this.deadline=expiresAt||Date.now()+this.resumeWindow;
      this.emit('reconnecting',{deadline:this.deadline,message});
      this.expiryTimer=setTimeout(()=>this.fail('Pasaron dos minutos sin reconectar. La sala se cerró.'),Math.max(0,this.deadline-Date.now()));
      this.retryTimer=setInterval(()=>this.retry(),this.retryDelay);
    }
  }
  retry(){
    if(this.closed||!this.reconnecting)return;
    if(Date.now()>=this.deadline){this.fail('Pasaron dos minutos sin reconectar. La sala se cerró.');return;}
    if(!this.peer||this.peer.destroyed){this.createPeer();return;}
    if(this.peer.disconnected){try{this.peer.reconnect();}catch{};return;}
    this.dial();
  }
  reconnect(){this.recover();this.retry();}
  attach(conn){
    if(this.closed)return;
    this.conn=conn;let validated=false,windowStart=Date.now(),count=0;
    clearTimeout(this.connectionTimer);
    this.connectionTimer=setTimeout(()=>{if(this.conn===conn&&!this.connected)this.recover();},this.timeout);
    conn.on('open',()=>{if(this.conn===conn&&!this.closed)this.send({type:'hello',version:VERSION,session:this.session});});
    conn.on('data',m=>{
      if(this.closed||this.conn!==conn)return;
      if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}
      if(++count>150)return;
      if(m?.type==='busy'){this.fail('La sala ya tiene dos jugadores, está reservada para tu amigo o usa otra versión.');return;}
      if(!validMessage(m))return;
      this.lastSeen=Date.now();
      if(m.type==='hello'){
        if(validated)return;
        if((this.opponentSession&&m.session!==this.opponentSession)||(this.isHost&&m.session!==conn.metadata?.session)){
          this.send({type:'busy'});this.recover();return;
        }
        const rejoined=this.reconnecting||this.hasConnected||this.restoring;
        validated=true;this.opponentSession=m.session;this.connected=true;this.hasConnected=true;this.restoring=false;this.reconnecting=false;this.deadline=0;
        clearTimeout(this.connectionTimer);clearTimeout(this.expiryTimer);clearInterval(this.retryTimer);clearInterval(this.timer);
        this.timer=setInterval(()=>{
          if(this.conn!==conn||this.closed)return;
          if(Date.now()-this.lastSeen>7000)this.recover();
          else this.send({type:'ping',time:Date.now()});
        },this.heartbeat);
        this.emit('connected',{isHost:this.isHost,rejoined});return;
      }
      if(!validated)return;
      if(m.type==='ping'){this.send({type:'pong',time:m.time});return;}
      if(m.type==='pong'){this.emit('latency',Date.now()-m.time);return;}
      if(m.type==='input')m={type:'input',input:cleanInput(m.input)};
      this.emit('message',m);
    });
    conn.on('close',()=>{if(this.conn===conn&&!this.closed)this.recover();});
    conn.on('error',()=>{if(this.conn===conn&&!this.closed)this.recover();});
  }
  send(message){
    if(this.conn?.open){if(message.type==='state'&&this.conn.bufferSize>2)return;try{this.conn.send(message);}catch{}}
  }
  leave(){this.send({type:'leave'});setTimeout(()=>this.close(),100);}
  fail(message){
    if(this.closed)return;
    this.rejectOpen?.(Error(message));this.rejectOpen=null;this.resolveOpen=null;
    this.emit('problem',message);this.close();
  }
  close(){
    this.closed=true;this.connected=false;this.reconnecting=false;
    this.resolveOpen?.(this.code);this.resolveOpen=null;this.rejectOpen=null;
    clearTimeout(this.openTimer);clearTimeout(this.expiryTimer);clearInterval(this.retryTimer);this.dropConnection();
    const peer=this.peer;this.peer=null;try{peer?.destroy();}catch{}
  }
}
