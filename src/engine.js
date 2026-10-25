import { HEROES, FLOOR, RULES, heroIndex, stageIndex } from './content.js';
export const EMPTY_INPUT=Object.freeze({left:false,right:false,jump:false,attack:false,block:false,powers:[false,false,false,false]});
export function cleanInput(input={}) {
  return {left:input?.left===true,right:input?.right===true,jump:input?.jump===true,attack:input?.attack===true,block:input?.block===true,powers:[0,1,2,3].map(i=>input?.powers?.[i]===true)};
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fighter(hero,side) {
  return {hero,side,x:side?700:260,y:FLOOR,vx:0,vy:0,facing:side?-1:1,hp:RULES.health,cds:[0,0,0,0],attackCd:0,stun:0,root:0,slow:0,blind:0,invisible:0,shield:0,reflect:0,small:0,wind:0,invulnerable:0,trapImmune:0,guard:false,guardMeter:100,pose:'idle',poseTime:0,prev:cleanInput(),pending:null};
}
export function createMatch(heroes=[0,1],stage=0) {
  if(!Array.isArray(heroes)||heroes.length!==2||!heroes.every(heroIndex)||!stageIndex(stage))throw Error('Selección inválida');
  return {fighters:heroes.map(fighter),stage,phase:'countdown',phaseTime:3.1,time:RULES.roundSeconds,round:1,wins:[0,0],winner:null,roundWinner:null,projectiles:[],clones:[],effects:[],hazards:[],clock:0,eventId:0,paused:false,pauseReason:''};
}
function effect(s,kind,x,y,color='',text='') {
  s.effects.push({id:++s.eventId,kind,x,y,color,text,life:kind==='teleport'?.5:.65,maxLife:kind==='teleport'?.5:.65});
  if(s.effects.length>35)s.effects.shift();
}
function animate(f,pose,time=.3){f.pose=pose;f.poseTime=time;}
function target(s,f){return s.fighters[1-f.side];}
function hit(s,from,to,damage,options={}) {
  if(to.hp<=0||to.invulnerable>0)return false;
  if(to.shield>0){effect(s,'block',to.x,to.y-65,'#20b5d5','¡PLOP!');return false;}
  const frontal=(from.x-to.x)*to.facing>=-4;
  const guarded=to.guard && frontal && to.guardMeter>0;
  const dealt=guarded?Math.max(1,Math.round(damage*.18)):damage;
  to.hp=clamp(to.hp-dealt,0,RULES.health);
  to.vx=(to.x>=from.x?1:-1)*(guarded?65:options.push??180);
  to.invulnerable=guarded?.22:.38;to.stun=guarded?.06:.17;
  if(guarded){to.guardMeter=clamp(to.guardMeter-25,0,100);if(to.guardMeter===0){to.stun=.65;effect(s,'hit',to.x,to.y-95,'#e3ad32','¡CRAC!');}}
  else {
    if(options.root&&to.trapImmune<=0){to.root=options.root;to.trapImmune=options.root+2;}
    if(options.slow)to.slow=options.slow;
    if(options.blind)to.blind=options.blind;
    animate(to,'hurt',.24);
  }
  effect(s,guarded?'block':'hit',to.x,to.y-65,HEROES[from.hero]?.color,guarded?'¡TAC!':['¡PAF!','¡PUM!','¡ZAS!'][s.eventId%3]);
  return true;
}
function melee(s,f,damage,reach,options={}) {
  const other=target(s,f);
  if(Math.abs(other.x-f.x)<=reach && (other.x-f.x)*f.facing>=-18 && Math.abs(other.y-f.y)<(other.small>0?65:105))hit(s,f,other,damage,options);
  for(const clone of s.clones)if(clone.side!==f.side&&Math.abs(clone.x-f.x)<reach&&(clone.x-f.x)*f.facing>=-18)clone.life=0;
  animate(f,options.pose??'attack',options.duration??.27);
}
function projectile(s,f,kind,damage,speed=470,extra={}) {
  s.projectiles.push({id:++s.eventId,kind,side:f.side,hero:f.hero,x:f.x+f.facing*40,y:f.y-(f.small>0?35:65),vx:f.facing*speed,vy:0,life:1.8,damage,r:14,...extra});
}
function power(s,f,index) {
  const p=HEROES[f.hero].powers[index];
  if(!p||f.cds[index]>0||f.pending)return;
  if(p.kind==='clone'&&s.clones.some(c=>c.side===f.side))return;
  f.cds[index]=p.cooldown;animate(f,p.kind,.4);f.invisible=0;
  effect(s,'cast',f.x,f.y-70,HEROES[f.hero].color);
  switch(p.kind) {
    case 'prism': projectile(s,f,'prism',6,440,{root:.75});break;
    case 'gift': projectile(s,f,'gift',8,490,{root:.6});break;
    case 'teleport': {
      effect(s,'teleport',f.x,f.y-65,HEROES[f.hero].color);
      const other=target(s,f);f.x=clamp(other.x-other.facing*110,55,905);f.y=FLOOR;f.vx=0;f.vy=0;f.invulnerable=.3;f.facing=f.x<other.x?1:-1;
      effect(s,'teleport',f.x,f.y-65,HEROES[f.hero].color);break;
    }
    case 'reflect': f.reflect=2;break;
    case 'invisible': f.invisible=2.8;break;
    case 'spikes': projectile(s,f,'spikes',12,580);break;
    case 'lightning': projectile(s,f,'lightning',12,880,{life:.85});break;
    case 'storm': {const other=target(s,f);s.hazards.push({side:f.side,hero:f.hero,x:other.x,timer:.8,kind:'storm',damage:17,r:85});break;}
    case 'shield': f.shield=2;f.vx=0;break;
    case 'mini': f.small=3;break;
    case 'stretch': melee(s,f,14,275,{push:150,pose:'stretch',duration:.4});break;
    case 'punch': melee(s,f,20,115,{push:330,pose:'punch',duration:.45});break;
    case 'potato': projectile(s,f,'potato',17,390,{vy:-220,life:.8,r:17,gravity:750});break;
    case 'fog': f.invisible=2.7;break;
    case 'sun': {const other=target(s,f);if(Math.abs(other.x-f.x)<650)hit(s,f,other,5,{blind:1.6,push:60});break;}
    case 'wind': f.wind=1.4;projectile(s,f,'wind',11,470,{push:330,r:28,life:1.5});break;
    case 'time': projectile(s,f,'time',9,410,{slow:2,life:1.7,r:22});break;
    case 'sword': melee(s,f,15,150,{pose:'sword',duration:.35});break;
    case 'hammer': f.pending={time:.42,kind:'hammer'};f.root=.45;break;
    case 'stone': projectile(s,f,'stone',14,470,{r:18});break;
    case 'clone': s.clones.push({id:++s.eventId,side:f.side,x:clamp(f.x-f.facing*65,50,910),y:FLOOR,life:6,attackCd:.7});break;
  }
}
function advanceFighter(s,f,input,dt) {
  for(const key of ['attackCd','stun','root','slow','blind','invisible','shield','reflect','small','wind','invulnerable','trapImmune','poseTime'])f[key]=Math.max(0,f[key]-dt);
  f.cds=f.cds.map(cd=>Math.max(0,cd-dt));
  if(f.poseTime<=0)f.pose='idle';
  if(f.pending){f.pending.time-=dt;if(f.pending.time<=0){f.pending=null;melee(s,f,24,150,{push:350,pose:'hammer',duration:.35});}}
  const disabled=f.stun>0||f.root>0||f.shield>0||f.hp<=0;
  f.guard=input.block&&!disabled&&f.guardMeter>0&&f.y>=FLOOR;
  f.guardMeter=clamp(f.guardMeter+(f.guard?-13:22)*dt,0,100);
  if(!disabled) {
    const dir=(input.right?1:0)-(input.left?1:0);
    if(dir)f.facing=dir;else f.facing=f.x<target(s,f).x?1:-1;
    const speed=(f.small>0?245:220)*(f.slow>0?.46:1)*(f.guard?.3:1);
    f.vx=dir*speed;
    if(input.jump&&!f.prev.jump&&f.y>=FLOOR&&!f.guard){f.vy=-590;animate(f,'jump',.35);}
    if(input.attack&&!f.guard&&f.attackCd<=0){f.attackCd=f.hero===5?.34:.42;f.invisible=0;melee(s,f,f.small>0?5:8,94);}
    if(!f.guard)input.powers.forEach((pressed,i)=>{if(pressed&&!f.prev.powers[i])power(s,f,i);});
  }else f.vx*=Math.exp(-12*dt);
  f.x=clamp(f.x+f.vx*dt,45,915);f.vy+=1550*dt;f.y=Math.min(FLOOR,f.y+f.vy*dt);if(f.y>=FLOOR)f.vy=0;
  f.prev=cleanInput(input);
}
function updateProjectiles(s,dt) {
  for(const p of s.projectiles) {
    p.life-=dt;p.vy+=(p.gravity??0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    const from=s.fighters[p.side],to=s.fighters[1-p.side];
    if(p.kind==='potato'&&(p.life<=0||p.y>=FLOOR-5)) {
      if(Math.hypot(to.x-p.x,to.y-40-p.y)<105)hit(s,from,to,p.damage,{push:300});
      for(const c of s.clones)if(c.side!==p.side&&Math.abs(c.x-p.x)<105)c.life=0;
      effect(s,'explosion',p.x,p.y,'#dc9b38','¡PAPAPUMBA!');p.life=0;continue;
    }
    const center=to.y-(to.small>0?25:55),height=to.small>0?24:45;
    if(Math.abs(p.x-to.x)<p.r+27 && Math.abs(p.y-center)<p.r+height) {
      if((to.reflect>0||to.wind>0)&&p.kind!=='potato') {
        p.side=to.side;p.hero=to.hero;p.vx=-p.vx;p.x=to.x+Math.sign(p.vx)*60;
        effect(s,'block',to.x,to.y-65,HEROES[to.hero].color,'¡REBOTA!');
      }else {hit(s,from,to,p.damage,p);p.life=0;}
    }
    for(const c of s.clones)if(c.side!==p.side&&Math.abs(c.x-p.x)<35&&Math.abs(c.y-55-p.y)<65){c.life=0;p.life=0;}
  }
  s.projectiles=s.projectiles.filter(p=>p.life>0&&p.x>-80&&p.x<1040);
}
function updateClones(s,dt) {
  for(const c of s.clones) {
    c.life-=dt;c.attackCd-=dt;
    const owner=s.fighters[c.side],other=s.fighters[1-c.side],distance=other.x-c.x;
    c.x=clamp(c.x+Math.sign(distance)*Math.min(Math.abs(distance),145*dt),45,915);
    if(Math.abs(distance)<80&&Math.abs(other.y-FLOOR)<90&&c.attackCd<=0) {hit(s,{...owner,x:c.x},other,5,{push:80});c.attackCd=1.2;}
  }
  s.clones=s.clones.filter(c=>c.life>0);
}
function endRound(s) {
  const [a,b]=s.fighters;s.roundWinner=a.hp===b.hp?null:a.hp>b.hp?0:1;
  if(s.roundWinner!==null)s.wins[s.roundWinner]++;
  s.winner=s.wins.findIndex(w=>w>=RULES.wins);if(s.winner<0)s.winner=null;
  s.phase=s.winner!==null?'matchOver':'roundOver';s.phaseTime=2.6;
  s.projectiles=[];s.clones=[];s.hazards=[];
}
export function step(s,inputs=[EMPTY_INPUT,EMPTY_INPUT],dt=1/60) {
  if(s.paused||s.phase==='matchOver')return s;
  dt=clamp(dt,0,1/30);s.clock+=dt;
  s.effects.forEach(e=>e.life-=dt);s.effects=s.effects.filter(e=>e.life>0);
  if(s.phase!=='fight') {
    s.phaseTime-=dt;
    if(s.phaseTime<=0) {
      if(s.phase==='roundOver'){s.round++;s.fighters=s.fighters.map(f=>fighter(f.hero,f.side));s.time=RULES.roundSeconds;s.effects=[];s.phase='countdown';s.phaseTime=3.1;}
      else {s.phase='fight';s.phaseTime=0;}
    }
    return s;
  }
  s.time=Math.max(0,s.time-dt);
  const clean=inputs.map(cleanInput);
  s.fighters.forEach((f,i)=>advanceFighter(s,f,clean[i]??EMPTY_INPUT,dt));
  const [a,b]=s.fighters;
  if(Math.abs(a.x-b.x)<55&&Math.abs(a.y-b.y)<70) {
    const sign=a.x<=b.x?1:-1,overlap=(55-Math.abs(a.x-b.x))/2;
    a.x=clamp(a.x-overlap*sign,45,915);b.x=clamp(b.x+overlap*sign,45,915);
  }
  updateProjectiles(s,dt);updateClones(s,dt);
  for(const h of s.hazards){h.timer-=dt;if(h.timer<=0){const to=s.fighters[1-h.side];if(Math.abs(to.x-h.x)<h.r)hit(s,s.fighters[h.side],to,h.damage,{push:200});effect(s,'lightning',h.x,FLOOR-70,HEROES[h.hero].color,'¡CRASH!');}}
  s.hazards=s.hazards.filter(h=>h.timer>0);
  if(s.time<=0||s.fighters.some(f=>f.hp<=0))endRound(s);
  return s;
}
// Reactions have a delay. The AI never reads future input.
export function createAI(level='normal',random=Math.random) {
  let think=0,held=cleanInput(),jumpCooldown=0;
  const interval={easy:.42,normal:.24,hard:.15}[level]??.24;
  return (s,side,dt)=>{
    think-=dt;jumpCooldown-=dt;
    if(think>0)return held;
    think=interval*(.8+random()*.5);held=cleanInput();
    if(s.phase!=='fight')return held;
    const f=s.fighters[side],other=s.fighters[1-side],dx=other.x-f.x,dist=Math.abs(dx);
    const uncertain=other.invisible>0||f.blind>0;
    if(uncertain&&random()<.55)return held;
    if(dist>78){held.left=dx<0;held.right=dx>0;}
    const threat=s.projectiles.some(p=>p.side!==side&&Math.abs(p.x-f.x)<210)||s.hazards.some(h=>h.side!==side&&Math.abs(h.x-f.x)<85);
    held.block=(threat||dist<105&&other.poseTime>0)&&random()<(level==='easy'?.25:.65);
    if((threat||random()<.16)&&jumpCooldown<=0){held.jump=true;jumpCooldown=1.3;held.block=false;}
    held.attack=dist<103&&!held.block&&random()<(level==='easy'?.5:.9);
    if(!held.block&&!uncertain){
      const candidates=HEROES[f.hero].powers.map((p,i)=>({p,i})).filter(({p,i})=>f.cds[i]<=0&&(!['punch','sword','hammer'].includes(p.kind)||dist<140)&&(!(p.kind==='stretch')||dist<270));
      if(candidates.length&&random()<(level==='easy'?.3:.65)){const chosen=candidates[Math.floor(random()*candidates.length)];held.powers[chosen.i]=true;}
    }
    return held;
  };
}
