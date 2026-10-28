// Diseños originales de Aventura-Papel, revisión 7248fde.
import { HEROES } from './content.js';
import { Pencil, paperGrain } from './sketch.js';
const illustrations = new Map();
const INK='#393832', PAPER='#fffdf7';
const tau=Math.PI*2;
export class Illustrator {
  constructor(canvas) {this.canvas=canvas;this.c=canvas.getContext('2d');this.pencil=new Pencil(this.c);this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  path(points,color=INK,width=2,fill=null,close=false) {
    this.pencil.path(points,color,width,fill,close);
  }
  line(x,y,x2,y2,color=INK,width=2){this.path([[x,y],[(x+x2)/2+.6,(y+y2)/2-.6],[x2,y2]],color,width);}
  box(x,y,w,h,fill=PAPER,color=INK,width=2) {this.path([[x,y+1],[x+w-2,y],[x+w,y+h-1],[x+1,y+h]],color,width,fill,true);}
  circle(x,y,r,color=INK,width=2,fill=null) {
    const points=[];
    for(let i=0;i<40;i++){const a=i/40*tau;points.push([x+Math.cos(a)*r*(1+.022*Math.sin(a*3)),y+Math.sin(a)*r*.97*(1+.018*Math.cos(a*5))]);}
    this.path(points,color,width,fill,true);
  }
  text(text,x,y,size=22,color=INK,align='left') {const c=this.c;c.save();c.translate(x,y);c.rotate(Math.sin(x*.19+y*.31)*.005);c.font=`${size}px 'Patrick', cursive`;c.fillStyle=color;c.textAlign=align;c.fillText(text,0,0);c.restore();}
  spring(ax,ay,bx,by,color,width=5,amp=6,turns=3) {
    const len=Math.hypot(bx-ax,by-ay),ux=(bx-ax)/len,uy=(by-ay)/len;
    const points=[];
    for(let i=0;i<=72;i++){const t=i/72,angle=t*turns*tau,edge=Math.sin(Math.PI*t)**.35;const across=Math.sin(angle)*amp*edge,along=t*len+Math.sin(angle+Math.PI/2)*amp*.42*edge;points.push([ax+ux*along-uy*across,ay+uy*along+ux*across]);}
    this.path(points,color,width);
  }
  hero(id,x,y,scale=1,time=0,opts={}) {
    const c=this.c,color=HEROES[id]?.color||id;
    c.save();c.translate(x,y);c.scale(scale,scale);
    const bob=this.reduced?0:Math.sin(time*3)*3;
    c.globalAlpha*=opts.invisible?.28:1;
    this.path([[-20,3],[-11,5],[5,6],[21,3],[8,1],[-9,1],[-20,3]],'#b9b3a9',.6);
    c.translate(0,bob-(id===1?0:8));
    if(this.dancing&&!this.reduced)c.rotate(Math.sin(time*7+x*.02)*.12);
    if(id===8){
      this.aaron(0,0,color);
      this.circle(-5,-51,1.5,PAPER,1,PAPER);this.circle(5,-51,1.5,PAPER,1,PAPER);
      this.path([[-5,-43],[0,-40],[5,-43]],PAPER,1.4);
    } else if(id===9){
      this.circle(0,-46,23,color,4,PAPER);
      this.path([[-21,-43],[-38,-31],[-56,-12]],color,5);
      this.path([[21,-43],[38,-31],[56,-12]],color,5);
      this.path([[-56,-12],[-62,-16],[-60,-7]],color,3);
      this.path([[56,-12],[62,-16],[60,-7]],color,3);
      this.circle(-8,-51,2.2,color,2,color);this.circle(8,-51,2.2,color,2,color);
      this.path([[-11,-41],[-7,-34],[0,-32],[7,-34],[11,-41]],color,3);
    } else if(id===10){
      const oval=[];for(let i=0;i<48;i++){const a=i/48*tau;oval.push([Math.cos(a)*25,-44+Math.sin(a)*34]);}
      this.path(oval,color,4,color,true);
      this.path([[-23,-42],[-36,-29],[-46,-16]],color,5);
      this.path([[23,-42],[36,-29],[46,-16]],color,5);
      this.circle(-9,-52,2.3,INK,1,INK);this.circle(6,-52,2.3,INK,1,INK);
      this.box(9,-46,14,13,'#c6a2e9',INK,2);
      this.path([[-8,-34],[-2,-30],[6,-32]],INK,2.2);
    } else if(id===7){
      this.benicio(0,0);
    } else if(id===6){
      this.npc('sebastian',0,0,time);
    } else if(id===5){
      this.aaron(0,0);
    } else if(id===4){
      this.girl('amaral',0,0);
    } else if(id===3){
      this.circle(0,-44,23,color,5,PAPER);
      for(let i=0;i<13;i++){const a=-Math.PI/2+i/13*tau,len=Math.sin(a)>.7?24:11+(i%3)*3;this.line(Math.cos(a)*23,-44+Math.sin(a)*23,Math.cos(a)*(23+len),-44+Math.sin(a)*(23+len),color,5);}
      this.circle(-7,-49,2.6,color,2,color);this.circle(7,-49,2.6,color,2,color);
      this.path([[-11,-40],[-7,-34],[0,-31],[8,-34],[12,-41]],color,4);
    } else if(id===1) {
      const compression=this.reduced?0:Math.sin(time*5)*4;
      c.translate(0,compression);
      this.circle(0,-48,18,color,5,PAPER);
      this.spring(0,-68,0,-98,color,5,6);
      this.spring(-17,-47,-40,-35,color,5,6);
      this.spring(17,-47,40,-35,color,5,6);
      this.spring(0,-28,0,-4-compression,color,5,6);
      this.circle(-6,-51,1.8,color,2,color);this.circle(6,-51,1.8,color,2,color);
      const smile=[];for(let i=0;i<=12;i++){const a=.3+i/12*(Math.PI-.6);smile.push([Math.cos(a)*9,-47+Math.sin(a)*9]);}this.path(smile,color,3);
    } else {
      this.circle(0,-48,16,color,5);
      this.line(0,-31,0,-5,color,5);this.line(0,-29,-17,-15,color,5);this.line(0,-29,17,-17,color,5);
      if(id===0) this.spring(0,-66,0,-101,color,4,4,2.4);
      else this.path([[0,-65],[6,-87],[13,-83]],color,5);
    }
    if(opts.selected){this.circle(0,12,5,color,1,color);}
    c.restore();
  }
  npc(id,x,y,t=0) {
    const c=this.c;c.save();
    if(this.dancing&&!this.reduced){c.translate(x,y+Math.sin(t*8+x*.03)*5);c.rotate(Math.sin(t*6+x*.02)*.12);x=0;y=0;}
    if(['alma-face','fusi','cata','aaron'].includes(id)&&!this.reduced)y+=Math.sin(t*3)*3;
    const colors={anciano:'#22b8d4',reportero:'#efbc4c',fusi:'#7c5cb5',assistant:'#7c5cb5',sebastian:'#625144',fusion:'#13b3ae'};
    const color=colors[id]||'#df7e4f';
    if(id==='aaron'){this.aaron(x,y);c.restore();return;}
    if(id==='benicio'){this.benicio(x,y);c.restore();return;}
    if(['alma-face','alma-purple','cata','sofia','seshia'].includes(id)){this.girl(id,x,y);c.restore();return;}
    if(id==='fusi'){
      this.circle(x,y-53,15,color,5,PAPER);
      this.path([[x-6,y-68],[x-12,y-82],[x,y-71],[x+10,y-83]],color,5);
      for(const side of [-1,1]){
        this.path([[x+side*13,y-53],[x+side*23,y-41],[x+side*29,y-46]],color,5);
        this.path([[x+side*12,y-45],[x+side*21,y-33],[x+side*29,y-37]],color,5);
      }
      this.line(x,y-37,x,y-7,color,5);this.line(x-15,y-23,x+15,y-23,color,5);
      c.restore();return;
    }
    if(id==='anciano') {
      this.circle(x-4,y-48,12,color,4,PAPER);
      this.path([[x-4,y-61],[x-2,y-70],[x+5,y-73],[x+9,y-70]],color,3);
      this.path([[x-14,y-38],[x+4,y-37],[x-5,y-25]],color,2,PAPER,true);
      this.line(x-1,y-28,x+1,y-3,color,4);
      this.path([[x-1,y-26],[x-16,y-24],[x-17,y-38]],color,4);
      this.path([[x+1,y-26],[x+13,y-18],[x+24,y-26]],color,4);
      this.path([[x+13,y-25],[x+14,y-33],[x+22,y-35],[x+27,y-30],[x+27,y+5]],'#252522',5);
      this.circle(x+24,y-26,2.4,color,2,color);
      c.restore();return;
    }
    this.circle(x,y-42,13,color,5,id==='reportero'?PAPER:color);
    this.line(x,y-28,x,y-7,color,5);this.line(x,y-24,x-14,y-13,color,5);this.line(x,y-24,x+15,y-18,color,5);
    this.line(x,y-7,x-10,y+6,color,5);this.line(x,y-7,x+11,y+4,color,5);
    if(id==='reportero'){this.line(x+16,y-18,x+20,y-32,INK,4);this.circle(x+20,y-35,4,INK,3,INK);}
    if(id==='assistant') for(let a=0;a<5;a++){const v=a/5*tau;this.line(x+Math.cos(v)*11,y-42+Math.sin(v)*11,x+Math.cos(v)*22,y-42+Math.sin(v)*22,color,4);}
    if(id==='sebastian')this.spring(x,y-56,x+10,y-76,color,4,4,2);
    c.restore();
  }
  benicio(x,y){
    const color=HEROES[7].color;
    this.circle(x,y-49,19,color,5);
    this.path([[x,y-68],[x-5,y-80],[x-10,y-88],[x-15,y-88]],color,5);
    this.path([[x,y-68],[x+7,y-79],[x+13,y-82],[x+18,y-79]],color,5);
    this.line(x,y-30,x,y+3,color,5);
    this.path([[x-13,y-13],[x,y-18],[x+13,y-13]],color,5);
  }
  rock(x,y,size=20){
    this.path([[x-size,y],[x-size*.75,y-size*.7],[x-size*.1,y-size],[x+size*.8,y-size*.65],[x+size,y],[x,y+size*.15]],'#81715d',2.5,'#cbbda3',true);
    this.path([[x-size*.75,y-size*.7],[x-size*.1,y-size*.35],[x+size*.8,y-size*.65]],'#a18f76',1);
  }
  aaron(x,y,color=HEROES[5].color){
    this.circle(x,y-48,14,color,5,color);
    this.line(x,y-32,x,y-4,color,6);this.line(x,y-25,x-13,y-13,color,5);this.line(x,y-25,x+13,y-13,color,5);
    this.path([[x+5,y-62],[x+8,y-67],[x+11,y-66]],INK,2.5);
  }
  girl(id,x,y){
    const c=this.c,small=id==='cata'||id==='seshia',color=({amaral:'#ef3b50','alma-face':'#b9bacb','alma-purple':'#6841b4',cata:'#7045b7',sofia:'#08b1d0',seshia:'#f29b43'})[id];
    c.save();c.translate(x,y);if(small)c.scale(.77,.77);
    if(id==='alma-face'){
      this.circle(0,-39,25,color,3.5);
      this.circle(-8,-45,4,color,2.5,color);this.circle(8,-45,4,color,2.5,color);
      this.path([[-12,-29],[-6,-24],[2,-23],[10,-27],[13,-32]],color,3);
      for(const side of [-1,1]){
        this.path([[side*11,-62],[side*25,-71],[side*33,-65],[side*38,-48],[side*51,-45]],color,3);
        this.path([[side*22,-48],[side*33,-30],[side*48,-29]],color,3);
      }
      c.restore();return;
    }
    this.circle(0,-52,14,color,6,id==='sofia'?color:PAPER);
    this.line(0,-36,0,-7,color,6);this.line(0,-26,-17,-21,color,6);this.line(0,-26,17,-21,color,6);
    if(!['seshia','cata'].includes(id)){this.line(0,-7,-12,13,color,6);this.line(0,-7,12,13,color,6);}
    if(['alma-purple','cata','seshia'].includes(id))for(const side of [-1,1]){
      this.path([[side*12,-61],[side*22,-45],[side*33,-47],[side*36,-53]],color,6);
      if(id==='alma-purple')this.path([[side*14,-48],[side*24,-36],[side*35,-39]],color,5);
    }
    if(id==='amaral'){this.line(-27,-19,-27,-76,color,5);this.path([[-40,-48],[-27,-81],[-15,-48],[-40,-48]],color,5);}
    if(id==='cata')this.circle(0,-8,8,color,4,color);
    if(id==='sofia'){this.circle(4,-57,3,'#82d8e2',2,'#82d8e2');}
    c.restore();
  }
  gift(x,y,s=1) {const c=this.c;c.save();c.translate(x,y);c.scale(s,s);this.box(-16,-30,32,28,'#ffe4a3','#ca9549',2);this.line(0,-30,0,-2,'#ec6896',5);this.line(-16,-16,16,-16,'#ec6896',4);this.path([[0,-30],[-10,-41],[-17,-34],[0,-30],[12,-41],[17,-34],[0,-30]],'#ec6896',3);c.restore();}
  star(x,y,r=12,color='#e8b74f',fill='#fce4a0') {
    const pts=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}this.path(pts,color,2,fill,true);
  }
  cat(x,y) {this.circle(x,y-13,9,INK,3,INK);this.path([[x-8,y-17],[x-8,y-29],[x-1,y-21],[x+6,y-28],[x+7,y-17]],INK,2,INK);this.line(x+8,y-8,x+35,y-5,INK,9);this.line(x+17,y-3,x+17,y+8,INK,4);this.line(x+30,y-3,x+30,y+8,INK,4);this.path([[x+34,y-6],[x+44,y-10],[x+43,y-25]],INK,4);this.circle(x-3,y-15,1,'#c9d487',1,'#c9d487');}
  plant(x,y) {this.path([[x-12,y-25],[x+12,y-25],[x+9,y],[x-8,y]],'#b28259',2,'#cda576',true);this.line(x,y-27,x,y-65,'#96b863',4);this.path([[x,y-40],[x-13,y-53],[x-19,y-53]],'#96b863',4);this.path([[x,y-50],[x+13,y-63],[x+18,y-63]],'#96b863',4);}
  pinkMass(x,y,r,time,ry=r*.8) {
    const c=this.c;c.save();c.translate(x,y);
    if(!this.reduced)c.scale(1+Math.sin(time*.6)*.008,1+Math.cos(time*.7)*.008);
    const drawing=illustrations.get('mass');
    if(drawing){c.drawImage(drawing,-r,-ry,r*2,ry*2);c.restore();return;}
    const pts=[];for(let i=0;i<80;i++){const a=i/80*tau,rr=r*(1+.08*Math.sin(a*7));pts.push([Math.cos(a)*rr,Math.sin(a)*rr*.8]);}
    this.path(pts,'#f75baf',4,'#ffb2d9',true);
    for(let i=0;i<15;i++){
      const scribble=[];for(let j=0;j<=48;j++){const a=j/48*tau,rx=r*(.28+i*.037)*(1+.12*Math.sin(a*5+i)),ry=r*.32;const angle=i*.4;const xx=Math.cos(a)*rx,yy=Math.sin(a)*ry;scribble.push([Math.cos(angle)*xx-Math.sin(angle)*yy+Math.sin(i*11)*r*.11,Math.sin(angle)*xx+Math.cos(angle)*yy+Math.cos(i*3)*r*.11]);}
      this.path(scribble,i%5===0?'#775f75':'#f355a5',i%3===0?2.6:1.5);
    }
    c.restore();
  }
}
