// Stable marks: the irregularity belongs to the drawing, never to the frame.
// Small cached transparent stamps keep the marker texture cheap to animate.
const stamps=new Map();
const MAX_STAMPS=700;
function random(seed) {
  let n=seed>>>0;
  return ()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
function hash(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0;}
function trace(c,points,close){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);if(close)c.closePath();}
function paperColor(color) {
  if(!/^#[a-f0-9]{6}$/i.test(color))return false;
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  return Math.min(...rgb)>238;
}

export class Pencil {
  constructor(context){this.c=context;}
  path(points,color,width,fill=null,close=false) {
    if(points.length<2)return;
    const origin=points[0];
    const local=points.map(p=>[Math.round((p[0]-origin[0])*4)/4,Math.round((p[1]-origin[1])*4)/4]);
    const key=JSON.stringify([local,color,width,fill,close]);
    let stamp=stamps.get(key);
    if(!stamp){stamp=this.make(local,color,width,fill,close,hash(key));if(stamps.size>=MAX_STAMPS)stamps.delete(stamps.keys().next().value);stamps.set(key,stamp);}
    this.c.drawImage(stamp.image,origin[0]+stamp.x,origin[1]+stamp.y);
  }
  make(points,color,width,fill,close,seed) {
    const rng=random(seed),pad=width*2+3;
    const x=Math.floor(Math.min(...points.map(p=>p[0]))-pad),y=Math.floor(Math.min(...points.map(p=>p[1]))-pad);
    const w=Math.ceil(Math.max(...points.map(p=>p[0]))-x+pad),h=Math.ceil(Math.max(...points.map(p=>p[1]))-y+pad);
    const image=document.createElement('canvas');image.width=w;image.height=h;
    const c=image.getContext('2d');c.translate(-x,-y);c.lineCap='round';c.lineJoin='round';
    if(fill){
      c.save();trace(c,points,true);c.clip();
      c.globalAlpha=paperColor(fill)?1:.18;c.fillStyle=fill;c.fillRect(x,y,w,h);
      if(!paperColor(fill)){
        // Colored pencil laid down in separate slanting strokes; white paper
        // stays visible between them instead of a flat digital color block.
        c.strokeStyle=fill;c.globalAlpha=.72;c.lineWidth=2.1;
        for(let row=x-h;row<x+w;row+=4+rng()*2.5){
          c.beginPath();c.moveTo(row+(rng()-.5)*3,y+h);c.lineTo(row+h+(rng()-.5)*6,y);c.stroke();
        }
        c.lineWidth=.6;c.globalAlpha=.26;
        for(let row=y;row<y+h;row+=9+rng()*8){c.beginPath();c.moveTo(x,row);c.lineTo(x+w,row+6-rng()*12);c.stroke();}
      }
      c.restore();
    }
    const contour=close?[...points,points[0]]:points;
    for(let pass=0;pass<2;pass++){
      const rough=[];
      for(let i=0;i<contour.length-1;i++){
        const a=contour[i],b=contour[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        const steps=Math.max(1,Math.ceil(length/7));
        for(let j=0;j<steps;j++){
          const t=j/steps,amount=Math.min(.78,width*.17);
          rough.push([a[0]+(b[0]-a[0])*t+(rng()-.5)*amount*2,a[1]+(b[1]-a[1])*t+(rng()-.5)*amount*2]);
        }
      }
      rough.push(contour.at(-1));
      c.strokeStyle=color;c.lineWidth=pass?Math.max(.55,width*.26):width*(.8+rng()*.17);c.globalAlpha=pass?.38:.88;
      trace(c,rough,close);c.stroke();
    }
    // Fine gaps in dry graphite/marker live in the stamp, so they move with it.
    c.save();c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='destination-out';c.globalAlpha=.27;
    const flecks=Math.min(1300,Math.round(w*h*.08));
    for(let i=0;i<flecks;i++){const fx=rng()*w,fy=rng()*h;c.fillRect(fx,fy,.35+rng()*.6,.3+rng()*.8);}
    c.restore();
    return {image,x,y};
  }
}

let grain;
export function paperGrain(context,width,height) {
  if(!grain){
    const tile=document.createElement('canvas');tile.width=192;tile.height=192;
    const c=tile.getContext('2d'),data=c.createImageData(192,192),rng=random(7041);
    for(let i=0;i<data.data.length;i+=4){const gray=100+Math.floor(rng()*100);data.data[i]=gray;data.data[i+1]=gray;data.data[i+2]=gray;data.data[i+3]=Math.floor(rng()*19);}
    c.putImageData(data,0,0);grain=tile;
  }
  context.save();context.fillStyle=context.createPattern(grain,'repeat');context.globalCompositeOperation='multiply';context.fillRect(0,0,width,height);context.restore();
}
