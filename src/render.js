import { Illustrator } from './original-art.js';
import { HEROES, STAGES, WIDTH, HEIGHT, FLOOR } from './content.js';
const INK='#302e2b',PAPER='#fffdf7';
const images=new Map();
export const artReady=Promise.all(STAGES.map(async s=>{const image=new Image();image.src=s.image;try{await image.decode();images.set(s.id,image);}catch{}}));
export class Renderer extends Illustrator {
  constructor(canvas){super(canvas);this.canvas.width=WIDTH;this.canvas.height=HEIGHT;}
  background(stage,time=0){
    const c=this.c;c.clearRect(0,0,WIDTH,HEIGHT);c.fillStyle=PAPER;c.fillRect(0,0,WIDTH,HEIGHT);
    const image=images.get(STAGES[stage].id);
    if(image){c.save();c.globalAlpha=.72;c.drawImage(image,0,0,WIDTH,HEIGHT);c.restore();}
    const wash=c.createLinearGradient(0,200,0,490);wash.addColorStop(0,'#fffdf700');wash.addColorStop(.8,'#fffdf7ca');wash.addColorStop(1,'#fffdf7ee');c.fillStyle=wash;c.fillRect(0,0,WIDTH,HEIGHT);
    this.path([[22,FLOOR+7],[235,FLOOR+4],[484,FLOOR+8],[723,FLOOR+5],[938,FLOOR+8]],'#797266',2.4);
    for(let i=0;i<12;i++)this.line(45+i*78,480+(i%3)*12,72+i*78,476+(i%3)*12,'#c8beaa',1);
    this.text(STAGES[stage].name.toUpperCase(),32,36,19,'#766f61');
    this.box(824,15,110,28,'#fffdf7da','#b8ae98',1);this.text('PAPER KOMBAT',879,35,17,INK,'center');
  }
  drawFighter(f,time,{clone=false,portrait=false}={}){
    const c=this.c,h=HEROES[f.hero];
    c.save();c.globalAlpha=clone?.52:1;
    c.fillStyle='#776f5520';c.beginPath();c.ellipse(f.x,FLOOR+5,(f.small>0?21:37),7,0,0,Math.PI*2);c.fill();
    c.translate(f.x,f.y);c.scale(f.facing,1);
    if(f.invisible>0)c.globalAlpha*=.22;
    if(f.invulnerable>0&&!this.reduced)c.globalAlpha*=.65+.25*Math.sin(time*35);
    const size=f.small>0?.68:1.4;
    c.scale(size,size);
    if(f.pose==='hurt')c.rotate(-.14);
    else if(['attack','punch','sword','hammer'].includes(f.pose))c.rotate(.08);
    else if(f.vy<0)c.rotate(-.06);
    this.hero(f.hero,0,0,1,time+(f.side??0),{});
    if(['attack','punch','stretch','sword','hammer'].includes(f.pose)){
      const reach=f.pose==='stretch'?175:f.pose==='sword'?90:48;
      this.line(5,-29,reach,-40,h.color,f.pose==='punch'?10:5);
      if(f.pose==='sword')this.path([[42,-44],[88,-70],[104,-69],[52,-33]],'#625144',3,'#cbc0a5',true);
      else if(f.pose==='hammer'){this.line(38,-34,65,-66,'#625144',6);this.box(45,-90,48,32,'#b6a68d','#625144',3);}
      else this.circle(reach,-40,f.pose==='punch'?15:7,h.color,3,'#fffdf7');
    }
    if(f.pending?.kind==='hammer'){this.line(15,-35,35,-94,'#625144',6);this.box(13,-119,49,30,'#b6a68d','#625144',3);}
    if(f.guard){this.path([[29,-88],[51,-74],[48,-35],[29,-12],[11,-35],[8,-74]],'#3b686d',2,'#d5eeed',true);}
    if(f.shield>0)this.circle(0,-45,63,'#20b5d5',4,'#daf5fa');
    if(f.reflect>0)this.box(32,-99,28,92,'#d7edb5','#73993d',3);
    if(f.root>0){this.path([[-34,7],[0,-112],[35,7],[-34,7]],h.color,2,'#f7d9ed');this.gift(0,-6,.7);}
    if(f.slow>0){this.circle(0,-46,59,'#13ad9d',2,'#d9faf322');this.text('◴',-42,-85,26,'#08786e');}
    if(f.blind>0){this.text('✧',-17,-86,24,'#c18a14');this.text('✧',18,-77,20,'#c18a14');}
    if(f.wind>0)for(let i=0;i<3;i++)this.path([[-38,-90+i*25],[0,-104+i*25],[38,-90+i*25]],'#9baabd',2);
    c.restore();
    if(!portrait){this.box(f.x-23,f.y+18,46,22,h.color,INK,1);this.text('J'+(f.side+1),f.x,f.y+35,17,INK,'center');}
  }
  projectile(p){
    const c=this.c,color=HEROES[p.hero].color;c.save();c.translate(p.x,p.y);
    switch(p.kind){
      case 'prism':this.path([[-17,17],[0,-23],[18,17],[-17,17]],color,3,'#f9d2e6');break;
      case 'gift':this.gift(0,15,.9);break;
      case 'lightning':this.path([[-25,-18],[4,-5],[-2,-17],[24,9],[-7,1],[1,16]],'#d4a62c',4,'#ffe777',true);break;
      case 'time':this.circle(0,0,23,color,3,'#d4f4ec');this.line(0,0,0,-14,color,2);this.line(0,0,10,4,color,2);break;
      case 'stone':this.rock(0,8,20);break;
      case 'potato':this.circle(0,0,17,'#af773b',3,'#e4bd72');this.circle(-5,-5,2,'#9e713b',1);this.circle(6,4,2,'#9e713b',1);this.path([[9,-15],[14,-23],[22,-21]],INK,2);this.star(21,-23,7,'#d89b2d','#ffdf5f');break;
      case 'wind':for(let i=0;i<3;i++)this.path([[-28,-20+i*18],[5,-25+i*18],[26,-12+i*18],[12,-3+i*18]],'#91a5b8',3);break;
      default:this.path([[-20,12],[-8,-17],[0,9],[12,-19],[23,12]],color,4);
    }c.restore();
  }
  render(s,viewer=0){
    this.background(s.stage,s.clock);
    for(const hazard of s.hazards){
      this.circle(hazard.x,190,43,'#73888c',2,'#d2e2e3');this.text('☁',hazard.x,204,60,'#637f89','center');
      this.path([[hazard.x-65,FLOOR+2],[hazard.x+65,FLOOR+2]],'#bf5b42',3);this.text('!',hazard.x,355,38,'#bf5b42','center');
    }
    for(const clone of s.clones)this.drawFighter({...s.fighters[clone.side],...clone,hero:7,small:0,invisible:0,root:0,shield:0,reflect:0,slow:0,blind:0,guard:false,pose:'idle',pending:null,invulnerable:0,wind:0,facing:clone.x<s.fighters[1-clone.side].x?1:-1},s.clock,{clone:true});
    for(const f of s.fighters)this.drawFighter(f,s.clock);
    for(const p of s.projectiles)this.projectile(p);
    for(const e of s.effects){
      const age=1-e.life/e.maxLife;this.c.save();this.c.globalAlpha=Math.min(1,e.life*4);
      if(e.kind==='teleport'){this.circle(e.x,e.y,20+age*70,e.color,3);this.circle(e.x,e.y,10+age*45,e.color,1);}
      else if(e.kind==='lightning'){this.path([[e.x+20,193],[e.x-19,299],[e.x+23,292],[e.x-5,430]],'#d3a323',7);this.star(e.x,e.y,45,'#dcaa27','#ffe587');}
      else if(e.kind==='explosion')this.star(e.x,e.y,40+age*45,'#be8434','#fce07b');
      else if(e.kind==='hit')this.star(e.x,e.y,18+age*24,e.color,'#fff1b2');
      else if(e.kind==='block')this.circle(e.x,e.y,25+age*20,e.color,3);
      else this.circle(e.x,e.y,10+age*28,e.color,2);
      if(e.text)this.text(e.text,e.x,e.y-40-age*35,e.text.length>8?26:36,INK,'center');
      this.c.restore();
    }
    const f=s.fighters[viewer];
    if(f.blind>0){this.c.save();this.c.globalAlpha=.2;this.c.fillStyle='#ffe9a0';this.c.fillRect(0,0,WIDTH,HEIGHT);this.c.restore();this.text('¡El sol de Amaral te encandiló!',WIDTH/2,52,23,'#8c6518','center');}
    if(s.phase==='countdown'){
      const n=Math.ceil(s.phaseTime-.1);this.banner(n>0?String(n):'¡A PELEAR!',n>0?'Prepará tus poderes':'',n>0?'#ffe282':'#a4d9d2');
    }else if(s.phase==='roundOver')this.banner(s.roundWinner===null?'¡EMPATE!':'¡ROUND PARA '+HEROES[s.fighters[s.roundWinner].hero].name.toUpperCase()+'!',s.wins.join(' — '),'#ffe282');
  }
  banner(title,subtitle,color){
    this.box(180,185,600,130,color,INK,3);this.text(title,480,248,title.length>20?32:64,INK,'center');if(subtitle)this.text(subtitle,480,289,25,INK,'center');
  }
  poster(time=0){
    this.background(0,time);
    this.drawFighter({hero:0,x:255,y:FLOOR,facing:1,side:0,pose:'prism',poseTime:1},time);
    this.drawFighter({hero:3,x:710,y:FLOOR,facing:-1,side:1,pose:'stretch',poseTime:1},time);
    this.circle(322,295,30,'#ef5897',3,'#f9d7e8');this.path([[304,308],[322,276],[340,308],[304,308]],'#bf3e78',3);
    this.star(540,300,62,INK,'#ffe17b');this.text('VS',540,317,43,INK,'center');
    this.text('¡SALÍ DEL MARGEN!',480,88,35,INK,'center');
  }
}
export function portrait(canvas,hero,scale=1){
  canvas.width=140;canvas.height=150;const artist=new Illustrator(canvas);artist.hero(hero,70,137,scale,0);
}
