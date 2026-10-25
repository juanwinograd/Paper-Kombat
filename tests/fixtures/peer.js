// Transport fixture for browser tests. No signaling service or WebRTC is simulated as a real network.
(() => {
 class Emitter{constructor(){this.events=new Map();}on(type,fn){const list=this.events.get(type)??[];list.push(fn);this.events.set(type,list);return this;}emit(type,data){for(const fn of this.events.get(type)??[])fn(data);}}
 class Connection extends Emitter{
  constructor(peer,remote,id,metadata){super();Object.assign(this,{peer,remote,id,metadata,open:false,bufferSize:0});}
  send(data){if(this.open)this.peer.post({op:'data',to:this.remote,id:this.id,data});}
  close(){if(!this.open)return;this.open=false;this.peer.post({op:'close',to:this.remote,id:this.id});this.emit('close');}
 }
 class Peer extends Emitter{
  constructor(id){super();this.id=typeof id==='string'?id:crypto.randomUUID();this.destroyed=false;this.disconnected=false;this.connections=new Map();this.bus=new BroadcastChannel('paper-kombat-test-transport');
   this.bus.onmessage=e=>this.receive(e.data);setTimeout(()=>{if(!this.destroyed)this.emit('open',this.id);},10);
  }
  post(message){if(!this.destroyed)this.bus.postMessage({...message,from:this.id});}
  connect(remote,{metadata}){
   const id=crypto.randomUUID(),conn=new Connection(this,remote,id,metadata);this.connections.set(id,conn);
   this.post({op:'connect',to:remote,id,metadata});setTimeout(()=>{if(!conn.open&&!this.destroyed)this.emit('error',{type:'peer-unavailable'});},200);return conn;
  }
  receive(m){
   if(this.destroyed||m.to!==this.id)return;
   if(m.op==='connect'){
    const conn=new Connection(this,m.from,m.id,m.metadata);this.connections.set(m.id,conn);this.emit('connection',conn);
    this.post({op:'accepted',to:m.from,id:m.id});conn.open=true;conn.emit('open');return;
   }
   const conn=this.connections.get(m.id);if(!conn||conn.remote!==m.from)return;
   if(m.op==='accepted'){conn.open=true;conn.emit('open');}
   if(m.op==='data'&&conn.open)conn.emit('data',m.data);
   if(m.op==='close'&&conn.open){conn.open=false;conn.emit('close');}
  }
  reconnect(){this.disconnected=false;setTimeout(()=>this.emit('open',this.id),10);}
  destroy(){if(this.destroyed)return;for(const conn of this.connections.values())conn.close();this.destroyed=true;this.bus.close();}
 }
 globalThis.Peer=Peer;
})();
