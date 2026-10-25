import { HEROES,STAGES,VERSION } from './content.js';
import { createMatch,step,createAI,cleanInput } from './engine.js';
import { Renderer,portrait,artReady } from './render.js';
import { Controls } from './input.js';
import { OnlineRoom,validCode } from './network.js';
import { Sound } from './audio.js';
const $=id=>document.getElementById(id);
let screen='home',mode='cpu',heroes=[0,3],stage=0,selectedSide=0,localSide=0;
let match=null,ai=createAI(),room=null,ready=[false,false],remoteInput=cleanInput(),remoteInputAt=0;
let accumulator=0,previousTime=performance.now(),lastStateSent=0,lastInputSent=0,lastSnapshot=0,seenEvent=0;
let networkFailed=false,startingRoom=false,toastTimer,announcedPhase='',winSound=false;
const sound=new Sound(),renderer=new Renderer($('fight-canvas')),poster=new Renderer($('poster'));
const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
document.body.classList.toggle('touch',coarse);
const controls=new Controls(()=>({screen,mode,side:localSide,blocked:!$('help-dialog').open&&!!match?.paused||$('help-dialog').open||networkFailed||match?.phase==='matchOver'}),()=>togglePause());
document.querySelectorAll('[data-action]').forEach(b=>controls.bind(b,b.dataset.action));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3800);}
function show(next){
  screen=next;for(const name of ['home','setup','arena'])$(name).hidden=name!==next;
  document.body.classList.toggle('playing',next==='arena');controls.clear();window.scrollTo(0,0);accumulator=0;previousTime=performance.now();
}
function makePortrait(hero){const c=document.createElement('canvas');c.setAttribute('aria-hidden','true');portrait(c,hero);return c;}
HEROES.forEach((h,i)=>{const item=document.createElement('div');item.className='mini-hero';item.append(makePortrait(i));const span=document.createElement('span');span.textContent=h.name;item.append(span);$('home-roster').append(item);});
function setupMode(value){
  leaveRoom();mode=value;match=null;ready=[false,false];localSide=0;selectedSide=0;networkFailed=false;
  $('mode-label').textContent=({cpu:'CONTRA LA PC',local:'EN LA MISMA PANTALLA',online:'CON UN AMIGO ONLINE'})[mode];
  $('online-panel').hidden=mode!=='online';$('difficulty-wrap').hidden=mode!=='cpu';$('online-options').hidden=false;$('room-info').hidden=true;
  $('network-status').textContent='Invitá a un amigo. Cada uno juega desde su dispositivo.';$('online-panel').classList.remove('error');
  $('create-room').disabled=false;$('join-form').querySelector('button').disabled=false;
  renderSelection();show('setup');
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setupMode(b.dataset.mode)));
function leaveRoom(){
  if(room){room.send({type:'leave'});room.close();room=null;}
  ready=[false,false];remoteInput=cleanInput();remoteInputAt=0;networkFailed=false;
}
function goHome(){leaveRoom();match=null;show('home');}
$('brand').addEventListener('click',goHome);$('back').addEventListener('click',goHome);
function renderSelection(){
  $('p1-name').textContent=HEROES[heroes[0]].name;$('p2-name').textContent=HEROES[heroes[1]].name;
  $('select-p1').setAttribute('aria-pressed',selectedSide===0);$('select-p2').setAttribute('aria-pressed',selectedSide===1);
  $('select-p1').classList.toggle('active',selectedSide===0);$('select-p2').classList.toggle('active',selectedSide===1);
  $('select-p1').disabled=mode==='online'&&localSide!==0;$('select-p2').disabled=mode==='online'&&localSide!==1;
  $('selection-hint').textContent=mode==='cpu'?'Elegí también el personaje de la PC con la pestaña «Jugador 2».':mode==='local'?'Cada amigo elige desde su pestaña. Pueden usar el mismo personaje.':room?.connected?'Cada uno elige su personaje. Cuando estén listos, ¡a pelear!':'Creá una sala o entrá con el código de tu amigo.';
  $('character-grid').replaceChildren();
  HEROES.forEach((h,i)=>{
    const button=document.createElement('button');button.className='character-card'+(heroes[selectedSide]===i?' selected':'');
    button.style.setProperty('--hero',h.dark);button.style.setProperty('--tint',h.color+'18');button.setAttribute('aria-label','Elegir a '+h.name);button.setAttribute('aria-pressed',heroes[selectedSide]===i);
    button.append(makePortrait(i));const name=document.createElement('span');name.textContent=h.name;button.append(name);
    const selected=heroes.map((hero,side)=>hero===i?'J'+(side+1):null).filter(Boolean);
    if(selected.length){const mark=document.createElement('span');mark.className='selection-marker';mark.textContent=selected.join(' + ');button.append(mark);}
    button.addEventListener('click',()=>{heroes[selectedSide]=i;ready=[false,false];if(mode==='online'&&room?.connected){if(room.isHost)sendSetup();else room.send({type:'pick',hero:i});}renderSelection();});
    $('character-grid').append(button);
  });
  const h=HEROES[heroes[selectedSide]];portrait($('detail-portrait'),heroes[selectedSide]);
  $('detail-name').textContent=h.name;$('detail-style').textContent=h.style.toUpperCase();$('detail-tag').textContent=h.tag;
  $('detail-powers').replaceChildren();$('detail-powers').style.setProperty('--hero',h.dark);
  h.powers.forEach(p=>{const row=document.createElement('div');row.className='detail-power';const icon=document.createElement('span');icon.textContent=p.icon;const text=document.createElement('div');const strong=document.createElement('strong');strong.textContent=p.name;const small=document.createElement('small');small.textContent=p.cooldown+' s de recarga';const desc=document.createElement('p');desc.textContent=p.description;text.append(strong,small,desc);row.append(icon,text);$('detail-powers').append(row);});
  $('stage-grid').replaceChildren();
  STAGES.forEach((s,i)=>{
    const button=document.createElement('button');button.className='stage-card'+(stage===i?' selected':'');button.setAttribute('aria-pressed',stage===i);button.disabled=mode==='online'&&localSide===1;
    const image=document.createElement('img');image.src=s.image;image.alt='';const name=document.createElement('span');name.textContent=s.name;const small=document.createElement('small');small.textContent=s.subtitle;name.append(small);button.append(image,name);
    button.addEventListener('click',()=>{stage=i;ready=[false,false];sendSetup();renderSelection();});$('stage-grid').append(button);
  });
  $('start').disabled=mode==='online'&&(!room?.connected||networkFailed);
  $('start').textContent=mode==='online'?(ready[localSide]?'Esperando a tu amigo…':'¡Estoy listo! →'):'¡A pelear! →';
  $('setup-tip').textContent=mode==='local'&&coarse?'Para dos en esta pantalla: teclado o dos mandos. Para dos teléfonos, elegí online.':mode==='online'&&localSide===1?'Tu amigo elige la viñeta. Vos elegís tu personaje.':'Ganá dos rounds de 60 segundos. Los poderes se recargan solos.';
}
$('select-p1').addEventListener('click',()=>{selectedSide=0;renderSelection();});
$('select-p2').addEventListener('click',()=>{selectedSide=1;renderSelection();});
function sendSetup(){if(mode==='online'&&room?.isHost&&room.connected)room.send({type:'setup',heroes,stage,ready});}
function networkProblem(message){
  networkFailed=true;remoteInput=cleanInput();controls.clear();
  $('network-status').textContent=message;$('online-panel').classList.add('error');
  $('online-options').hidden=false;$('create-room').disabled=false;$('join-form').querySelector('button').disabled=false;
  if(screen==='arena'&&match){match.paused=true;match.pauseReason='connection';setOverlay('connection',message);}
  else renderSelection();
}
async function connectRoom(code=null){
  if(startingRoom)return;startingRoom=true;
  leaveRoom();mode='online';networkFailed=false;ready=[false,false];
  $('create-room').disabled=true;$('join-form').querySelector('button').disabled=true;$('online-panel').classList.remove('error');
  $('network-status').textContent=code?'Buscando a tu amigo…':'Dibujando una sala…';
  const activeRoom=new OnlineRoom();room=activeRoom;
  activeRoom.addEventListener('problem',e=>{if(room===activeRoom)networkProblem(e.detail);});
  activeRoom.addEventListener('room',e=>{
    if(room!==activeRoom)return;
    localSide=e.detail.isHost?0:1;selectedSide=localSide;
    $('room-display').textContent=e.detail.code;$('room-info').hidden=false;$('online-options').hidden=true;
    $('network-status').textContent=e.detail.isHost?'Compartí la invitación y esperá a tu amigo.':'Conectando los dos dispositivos…';renderSelection();
  });
  activeRoom.addEventListener('connected',()=>{
    if(room!==activeRoom)return;
    $('network-status').textContent='¡Ya están los dos! Elijan personajes y pulsen «Estoy listo».';
    if(activeRoom.isHost)sendSetup();renderSelection();
  });
  activeRoom.addEventListener('message',e=>{if(room===activeRoom)onMessage(e.detail);});
  activeRoom.addEventListener('latency',e=>{if(mode==='online'&&screen==='arena')$('fight-mode').textContent='SALA '+activeRoom.code+' · '+e.detail+' ms';});
  try{await activeRoom.open(code);}catch(error){if(room===activeRoom)networkProblem(error.message);}
  finally{startingRoom=false;if(networkFailed){$('create-room').disabled=false;$('join-form').querySelector('button').disabled=false;}}
}
$('create-room').addEventListener('click',()=>connectRoom());
$('join-form').addEventListener('submit',e=>{e.preventDefault();const code=$('room-code').value.trim().toUpperCase();if(!validCode(code)){toast('Usá el código de 8 letras o números de tu amigo.');return;}connectRoom(code);});
$('copy-room').addEventListener('click',async()=>{
  const url=new URL(location.href);url.search='';url.hash='sala='+room.code;
  try{await navigator.clipboard.writeText(url.href);toast('Invitación copiada. ¡Pasásela a tu amigo!');}catch{toast('El código de tu sala es '+room.code);}
});
function onMessage(m){
  if(m.type==='leave'){networkProblem('Tu amigo salió de la sala. Podés volver a invitarlo.');room?.close();return;}
  if(room.isHost){
    if(m.type==='pick'&&screen==='setup'){heroes[1]=m.hero;ready=[false,false];sendSetup();renderSelection();}
    if(m.type==='ready'&&screen==='setup'){ready[1]=m.value;sendSetup();renderSelection();maybeStart();}
    if(m.type==='input'&&screen==='arena'){remoteInput=m.input;remoteInputAt=performance.now();}
    if(m.type==='pause'&&screen==='arena'&&match?.phase!=='matchOver'){match.paused=m.value;match.pauseReason=m.value?'friend':'';controls.clear();room.send({type:'state',state:match});updateOverlay();}
    if(m.type==='rematch'&&screen==='arena'&&match?.phase==='matchOver'){returnToSelection();sendSetup();}
  }else{
    if(m.type==='setup'){heroes=m.heroes;stage=m.stage;ready=m.ready;if(screen==='arena')returnToSelection(false);renderSelection();}
    if(m.type==='start'&&screen==='setup'){heroes=m.heroes;stage=m.stage;startMatch();}
    if(m.type==='state'&&screen==='arena'&&match){match=m.state;lastSnapshot=performance.now();updateHUD();updateOverlay();}
  }
}
function maybeStart(){
  if(room?.isHost&&room.connected&&ready.every(Boolean)&&screen==='setup'){
    room.send({type:'start',heroes,stage});startMatch();
  }
}
$('start').addEventListener('click',()=>{
  if(mode==='online'){if(!room?.connected||networkFailed)return;ready[localSide]=!ready[localSide];if(room.isHost){sendSetup();maybeStart();}else room.send({type:'ready',value:ready[localSide]});renderSelection();}
  else startMatch();
});
function buildPowerPanels(){
  [0,1].forEach(side=>{
    const panel=$('powers-'+side),h=HEROES[heroes[side]];
    panel.replaceChildren();panel.classList.toggle('remote',(mode==='online'&&side!==localSide)||(mode==='cpu'&&side!==0));panel.style.setProperty('--hero',h.dark);
    h.powers.forEach((p,i)=>{
      const button=document.createElement('button');button.className='power-button';button.setAttribute('aria-label',h.name+': '+p.name);button.title=p.description;
      const icon=document.createElement('span');icon.className='power-icon';icon.textContent=p.icon;
      const name=document.createElement('span');name.className='power-name';name.textContent=p.name;
      const key=document.createElement('kbd');key.textContent=side===1&&mode==='local'?['7','8','9','0'][i]:String(i+1);
      const mask=document.createElement('span');mask.className='cooldown-mask';const label=document.createElement('span');label.className='cooldown-label';label.hidden=true;
      button.append(icon,name,key,mask,label);button.disabled=(mode==='cpu'&&side!==0)||(mode==='online'&&side!==localSide);
      controls.bind(button,'power'+i,side);panel.append(button);
    });
  });
  // Keep the local player's powers first on narrow screens.
  $('powers-'+localSide).style.order='0';$('powers-'+(1-localSide)).style.order='1';
}
function startMatch(){
  match=createMatch(heroes,stage);ai=createAI($('difficulty').value);remoteInput=cleanInput();remoteInputAt=performance.now();lastSnapshot=performance.now();lastStateSent=0;lastInputSent=0;seenEvent=0;announcedPhase='';winSound=false;networkFailed=false;
  $('fight-overlay').hidden=true;buildPowerPanels();show('arena');sound.unlock();
  $('fight-mode').textContent=mode==='online'?'SALA '+room.code:mode==='cpu'?'CONTRA LA PC · '+$('difficulty').selectedOptions[0].text:'DOS AMIGOS · MISMA PANTALLA';
  $('keyboard-help').textContent=mode==='local'?'J1: A/D · W · F golpe · G defensa · 1/2/3/4 poderes    |    J2: ←/→ · ↑ · K golpe · L defensa · 7/8/9/0 poderes':'A/D mover · W saltar · F golpe · G defensa · 1/2/3/4 poderes · Esc pausa';
  updateHUD();renderer.render(match,localSide);
}
function returnToSelection(reset=true){
  controls.clear();match=null;if(reset)ready=[false,false];show('setup');renderSelection();
}
function updateHUD(){
  if(!match)return;
  match.fighters.forEach((f,i)=>{
    const hud=$('hud-'+i),h=HEROES[f.hero];hud.style.setProperty('--hero',h.color);
    hud.querySelector('strong').textContent=h.name;hud.querySelector('.health-fill').style.width=f.hp+'%';hud.querySelector('.health-value').textContent=Math.ceil(f.hp);
    hud.querySelector('.wins').textContent=[0,1].map(n=>n<match.wins[i]?'●':'○').join('');
    hud.querySelector('.guard-track>div').style.width=f.guardMeter+'%';
    $('powers-'+i).querySelectorAll('.power-button').forEach((b,k)=>{const cd=f.cds[k];b.querySelector('.cooldown-mask').style.height=(cd/h.powers[k].cooldown*100)+'%';const label=b.querySelector('.cooldown-label');label.hidden=cd<=0;label.textContent=Math.ceil(cd)+' s';b.setAttribute('aria-label',h.name+': '+h.powers[k].name+(cd>0?', recarga '+Math.ceil(cd)+' segundos':', listo'));});
  });
  $('timer').textContent=Math.ceil(match.time);$('round').textContent='ROUND '+match.round;
  const phase=match.phase+'-'+match.round;
  if(phase!==announcedPhase){announcedPhase=phase;$('match-status').textContent=match.phase==='fight'?'Round '+match.round+'. ¡A pelear!':match.phase==='roundOver'?(match.roundWinner===null?'Empate de round.':'Round para '+HEROES[match.fighters[match.roundWinner].hero].name):'';}
}
let overlayKind='';
function setOverlay(kind,description=''){
  if(kind===overlayKind&&kind!=='connection')return;overlayKind=kind;
  $('fight-overlay').hidden=!kind;
  if(!kind)return;
  $('resume').hidden=kind!=='pause';$('rematch').hidden=kind!=='victory';
  $('change-characters').textContent=kind==='connection'?'Volver a crear una sala':'Elegir personajes';
  $('overlay-eyebrow').textContent=kind==='victory'?'FIN DE LA HISTORIETA':kind==='connection'?'PAUSA DE CONEXIÓN':'UN RESPIRO';
  $('overlay-title').textContent=kind==='victory'?'¡Ganó '+HEROES[match.fighters[match.winner].hero].name+'!':kind==='connection'?'Se cortó la conexión':'Pausa';
  $('overlay-description').textContent=description||(kind==='victory'?'Dos rounds y un montón de ¡PAF! ¿Jugamos otra?':match.pauseReason==='friend'?'Tu amigo puso pausa. Pueden seguir cuando estén listos.':'Los poderes también se toman un descanso.');
  if(kind==='victory'&&!winSound){sound.play('win');winSound=true;$('match-status').textContent=$('overlay-title').textContent;}
}
function updateOverlay(){
  if(!match)return;
  if(networkFailed){setOverlay('connection','La partida se detuvo. Volvé a invitar a tu amigo para jugar otra.');return;}
  setOverlay(match.phase==='matchOver'?'victory':match.paused?'pause':'');
}
function togglePause(force){
  if(!match||networkFailed||match.phase==='matchOver')return;
  const value=typeof force==='boolean'?force:!match.paused;
  controls.clear();
  if(mode==='online'&&!room?.isHost){room.send({type:'pause',value});return;}
  match.paused=value;match.pauseReason=value?'local':'';if(mode==='online'&&room?.isHost)room.send({type:'state',state:match});updateOverlay();
}
$('pause').addEventListener('click',()=>togglePause());$('resume').addEventListener('click',()=>togglePause(false));
$('exit-fight').addEventListener('click',()=>{if(mode==='online')setupMode('online');else returnToSelection();});
$('change-characters').addEventListener('click',()=>{overlayKind='';if(mode==='online'){if(networkFailed)setupMode('online');else if(room.isHost){returnToSelection();sendSetup();}else{room.send({type:'rematch'});toast('Le pedimos a tu amigo que elijan de nuevo.');}}else returnToSelection();});
$('rematch').addEventListener('click',()=>{
  overlayKind='';if(mode==='online'){if(room.isHost){returnToSelection();sendSetup();}else{room.send({type:'rematch'});toast('¡Revancha pedida!');}}else startMatch();
});
let helpPaused=false;
function help(){helpPaused=screen==='arena'&&match&&!match.paused;if(helpPaused)togglePause(true);controls.clear();$('help-dialog').showModal();}
$('help').addEventListener('click',help);
function closeHelp(){$('help-dialog').close();}
$('close-help').addEventListener('click',closeHelp);$('help-done').addEventListener('click',closeHelp);
$('help-dialog').addEventListener('close',()=>{if(helpPaused)togglePause(false);helpPaused=false;});
$('sound').addEventListener('click',()=>{const enabled=sound.toggle();$('sound').setAttribute('aria-pressed',enabled);$('sound').setAttribute('aria-label',enabled?'Desactivar sonido':'Activar sonido');$('sound').innerHTML=(enabled?'♫':'♪')+' <span>Sonido</span>';toast(enabled?'Sonido activado':'Sonido desactivado');});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Podés girar el dispositivo para jugar en horizontal.');}catch{toast('Podés girar el dispositivo para jugar en horizontal.');}
});
document.addEventListener('visibilitychange',()=>{
  controls.clear();
  if(document.hidden&&screen==='arena'&&match&&match.phase!=='matchOver'){togglePause(true);}
});
window.addEventListener('gamepadconnected',()=>toast('Mando conectado. ¡Listo para jugar!'));
window.addEventListener('gamepaddisconnected',()=>{controls.clear();if(screen==='arena')togglePause(true);toast('Se desconectó un mando.');});
window.addEventListener('pagehide',()=>leaveRoom());
function frame(now){
  const elapsed=Math.min(.1,(now-previousTime)/1000);previousTime=now;
  if(screen==='arena'&&match){
    const input=controls.read();
    if(mode!=='online'||room?.isHost){
      accumulator=Math.min(accumulator+elapsed,.12);
      while(accumulator>=1/60){
        const second=mode==='cpu'?ai(match,1,1/60):mode==='online'?(now-remoteInputAt<350?remoteInput:cleanInput()):input[1];
        step(match,[input[0],second],1/60);accumulator-=1/60;
      }
      if(mode==='online'&&room?.connected&&now-lastStateSent>50){room.send({type:'state',state:match});lastStateSent=now;}
    }else if(room?.connected){
      if(now-lastInputSent>33){room.send({type:'input',input:input[localSide]});lastInputSent=now;}
      if(now-lastSnapshot>4000&&!match.paused&&!networkFailed)networkProblem('La partida dejó de responder. Probá volver a entrar a la sala.');
    }
    renderer.render(match,localSide);updateHUD();updateOverlay();
    for(const e of match.effects)if(e.id>seenEvent){sound.play(e.kind);seenEvent=e.id;}
  }
  requestAnimationFrame(frame);
}
await Promise.all([artReady,document.fonts.ready]);poster.poster(0);
requestAnimationFrame(frame);
const invitation=location.hash.match(/^#sala=([A-HJ-NP-Z2-9]{8})$/i);
if(invitation){setupMode('online');$('room-code').value=invitation[1].toUpperCase();$('network-status').textContent='Te invitaron a una sala. Tocá «Entrar» para conectarte.';}
