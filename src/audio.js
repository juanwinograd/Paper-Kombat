export class Sound {
  constructor(){this.enabled=false;this.context=null;this.last=0;}
  toggle(){this.enabled=!this.enabled;if(this.enabled)this.unlock();return this.enabled;}
  unlock(){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();this.context.resume();}catch{}}
  play(kind){
    if(!this.enabled||!this.context)return;
    const now=this.context.currentTime;if(now-this.last<.035)return;this.last=now;
    const osc=this.context.createOscillator(),gain=this.context.createGain();osc.connect(gain);gain.connect(this.context.destination);
    osc.type=kind==='hit'?'triangle':'sine';
    const frequency=({hit:190,block:340,cast:560,teleport:730,explosion:85,lightning:120,win:660})[kind]??450;
    osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*.4),now+.14);
    gain.gain.setValueAtTime(.09,now);gain.gain.exponentialRampToValueAtTime(.001,now+.19);osc.start(now);osc.stop(now+.2);
  }
}
