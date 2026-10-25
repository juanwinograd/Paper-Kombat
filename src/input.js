import { cleanInput } from './engine.js';
const MAPS=[
  {KeyA:'left',KeyD:'right',KeyW:'jump',KeyF:'attack',KeyG:'block',Digit1:'power0',Digit2:'power1',Digit3:'power2',Digit4:'power3'},
  {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',KeyK:'attack',KeyL:'block',Digit7:'power0',Digit8:'power1',Digit9:'power2',Digit0:'power3'}
];
export class Controls {
  constructor(getContext,onPause){
    this.getContext=getContext;this.keys=new Set();this.pointers=new Map();this.pulses=[new Map(),new Map()];this.onPause=onPause;
    window.addEventListener('keydown',e=>{
      const ctx=this.getContext();if(e.code==='Escape'&&ctx.screen==='arena'){e.preventDefault();if(!e.repeat)this.onPause();return;}
      if(ctx.screen!=='arena'||ctx.blocked||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      if(MAPS.some(m=>m[e.code])){e.preventDefault();this.keys.add(e.code);const first=MAPS[0][e.code];if(first)this.pulse(ctx.mode==='online'?ctx.side:0,first);if(ctx.mode==='local'&&MAPS[1][e.code])this.pulse(1,MAPS[1][e.code]);}
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.clear());
    window.addEventListener('pointerup',e=>this.release(e.pointerId));
    window.addEventListener('pointercancel',e=>this.release(e.pointerId));
  }
  bind(button,action,side=null){
    button.addEventListener('pointerdown',e=>{
      const ctx=this.getContext();if(ctx.screen!=='arena'||ctx.blocked||button.disabled)return;
      const player=side??ctx.side;
      if(ctx.mode==='online'&&player!==ctx.side||ctx.mode==='cpu'&&player!==0)return;
      e.preventDefault();this.pulse(player,action);button.setPointerCapture?.(e.pointerId);this.pointers.set(e.pointerId,{action,side:player,button});button.classList.add('active');
    });
    button.addEventListener('pointerup',e=>this.release(e.pointerId));
    button.addEventListener('pointercancel',e=>this.release(e.pointerId));
    button.addEventListener('lostpointercapture',e=>this.release(e.pointerId));
    button.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){const ctx=this.getContext();if(ctx.screen==='arena'&&!ctx.blocked){this.pulse(side??ctx.side,action);this.pointers.set('key-'+action,{action,side:side??ctx.side,button});e.preventDefault();}}});
    button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')this.release('key-'+action);});
    button.addEventListener('blur',()=>this.release('key-'+action));
  }
  pulse(side,action){if(action!=='block'&&action!=='left'&&action!=='right')this.pulses[side].set(action,performance.now()+140);}
  release(id){const p=this.pointers.get(id);if(p){p.button.classList.remove('active');this.pointers.delete(id);}}
  clear(){this.keys.clear();this.pulses.forEach(p=>p.clear());for(const id of [...this.pointers.keys()])this.release(id);}
  read(){
    const ctx=this.getContext(),out=[cleanInput(),cleanInput()];
    if(ctx.screen!=='arena'||ctx.blocked)return out;
    const assign=(side,action)=>{if(action.startsWith('power'))out[side].powers[Number(action.slice(5))]=true;else out[side][action]=true;};
    for(const code of this.keys){
      const primary=MAPS[0][code];if(primary)assign(ctx.mode==='online'?ctx.side:0,primary);
      if(ctx.mode==='local'&&MAPS[1][code])assign(1,MAPS[1][code]);
    }
    for(const {side,action}of this.pointers.values())assign(side,action);
    this.pulses.forEach((p,side)=>{for(const [action,until]of p){if(until>performance.now())assign(side,action);else p.delete(action);}});
    const pads=Array.from(navigator.getGamepads?.()??[]).filter(Boolean);
    pads.slice(0,ctx.mode==='local'?2:1).forEach((p,i)=>{
      const side=ctx.mode==='online'?ctx.side:i,input=out[side],b=n=>p.buttons[n]?.pressed;
      input.left ||= p.axes[0]<-.3||b(14);input.right ||= p.axes[0]>.3||b(15);input.jump ||= b(0)||b(12);
      input.attack ||= b(2);input.block ||= b(1);
      [4,5,6,7].forEach((index,k)=>input.powers[k] ||= b(index));
    });
    return out;
  }
}
