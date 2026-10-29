import { HEROES,STAGES,VERSION } from './content.js';
import { createMatch,step,createAI,cleanInput } from './engine.js';
import { Renderer,portrait,artReady } from './render.js';
import { Controls } from './input.js';
import { OnlineRoom,validCode,RESUME_WINDOW,makeSession } from './network.js';
import { saveSession,readSession,clearSession } from './session.js';
import { Sound } from './audio.js';
import { matchesSecretCode,readUnlock,saveUnlock,heroAvailable,availableHeroes } from './unlocks.js';
const $=id=>document.getElementById(id);
let screen='home',mode='cpu',heroes=[0,3],stage=0,selectedSide=0,localSide=0;
let match=null,ai=createAI(),room=null,ready=[false,false],remoteInput=cleanInput(),remoteInputAt=0;
let accumulator=0,previousTime=performance.now(),lastStateSent=0,lastInputSent=0,lastSnapshot=0,seenEvent=0;
let networkFailed=false,startingRoom=false,toastTimer,announcedPhase='',winSound=false,lastPersist=0;
let sessionStore=null;try{sessionStore=window.sessionStorage;}catch{}
let unlockStore=null;try{unlockStore=window.localStorage;}catch{}
let secretsUnlocked=readUnlock(unlockStore);
const sound=new Sound(),renderer=new Renderer($('fight-canvas')),poster=new Renderer($('poster'));
const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
document.body.classList.toggle('touch',coarse);
const controls=new Controls(()=>({screen,mode,side:localSide,blocked:!$('help-dialog').open&&!!match?.paused||$('help-dialog').open||networkFailed||match?.phase==='matchOver'}),()=>togglePause());
document.querySelectorAll('[data-action]').forEach(b=>controls.bind(b,b.dataset.action));
controls.bindJoystick($('touch-stick'));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3800);}
function show(next){
  screen=next;for(const name of ['home','setup','arena'])$(name).hidden=name!==next;
  document.body.classList.toggle('playing',next==='arena');controls.clear();window.scrollTo(0,0);accumulator=0;previousTime=performance.now();
}
function makePortrait(hero){const c=document.createElement('canvas');c.setAttribute('aria-hidden','true');portrait(c,hero);return c;}
function renderHomeRoster(){
  $('home-roster').replaceChildren();
  for(const i of availableHeroes(secretsUnlocked)){
    const item=document.createElement('div');item.className='mini-hero';item.append(makePortrait(i));
    const span=document.createElement('span');span.textContent=HEROES[i].name;item.append(span);$('home-roster').append(item);
  }
  $('hero-count').textContent=availableHeroes(secretsUnlocked).length+' personajes.';
}
renderHomeRoster();
document.querySelectorAll('[data-secret-form]').forEach(form=>form.addEventListener('submit',event=>{
  event.preventDefault();const input=form.querySelector('[data-secret-code]'),status=form.querySelector('[data-secret-status]');
  if(!matchesSecretCode(input.value)){status.textContent='Ese código no abrió el secreto. Revisalo e intentá de nuevo.';return;}
  secretsUnlocked=true;const saved=saveUnlock(unlockStore);input.value='';
  document.querySelectorAll('[data-secret-status]').forEach(p=>p.textContent='¡Desbloqueaste a Wis negro, la Máquina de bobadas y Baltazar!'+(saved?'':' Quedan disponibles mientras esta página siga abierta.'));
  renderHomeRoster();renderSelection();toast('¡Tres personajes secretos desbloqueados!');
}));
function setupMode(value){
  leaveRoom();mode=value;heroes=heroes.map((h,i)=>heroAvailable(h,secretsUnlocked)?h:(i===0?0:3));match=null;ready=[false,false];if(value==='online')heroes[1]=3;localSide=0;selectedSide=0;networkFailed=false;
  $('mode-label').textContent=({cpu:'CONTRA LA PC',local:'EN LA MISMA PANTALLA',online:'CON UN AMIGO ONLINE'})[mode];
  $('online-panel').hidden=mode!=='online';$('difficulty-wrap').hidden=mode!=='cpu';$('online-options').hidden=false;$('room-info').hidden=true;
  $('network-status').textContent='Invitá a un amigo. Cada uno juega desde su dispositivo.';$('online-panel').classList.remove('error');
  $('create-room').disabled=false;$('join-form').querySelector('button').disabled=false;
  renderSelection();show('setup');
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setupMode(b.dataset.mode)));
function leaveRoom(){
  clearSession(sessionStore);
  if(location.hash.startsWith('#sala='))history.replaceState(null,'',location.pathname+location.search);
  if(room){room.leave();room=null;}
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
    if(!heroAvailable(i,secretsUnlocked))return;
    const button=document.createElement('button');button.className='character-card'+(h.secret?' secret-card':'')+(heroes[selectedSide]===i?' selected':'');
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
  clearSession(sessionStore);networkFailed=true;remoteInput=cleanInput();controls.clear();
  $('network-status').textContent=message;$('online-panel').classList.add('error');
  $('online-options').hidden=false;$('create-room').disabled=false;$('join-form').querySelector('button').disabled=false;
  if(screen==='arena'&&match){match.paused=true;match.pauseReason='connection';setOverlay('connection',message);}
  else renderSelection();
}
async function connectRoom(code=null,saved=null){
  if(startingRoom)return;startingRoom=true;
  leaveRoom();mode='online';networkFailed=false;ready=[false,false];
  $('create-room').disabled=true;$('join-form').querySelector('button').disabled=true;$('online-panel').classList.remove('error');
  $('network-status').textContent=saved?'Volviendo a tu sala…':code?'Buscando a tu amigo…':'Dibujando una sala…';
  const activeRoom=new OnlineRoom();room=activeRoom;
  if(saved){heroes=saved.heroes;stage=saved.stage;localSide=saved.isHost?0:1;selectedSide=localSide;activeRoom.code=code;if(saved.state)startMatch(saved.state);}
  activeRoom.addEventListener('problem',e=>{if(room===activeRoom)networkProblem(e.detail);});
  activeRoom.addEventListener('reconnecting',e=>{
    if(room!==activeRoom)return;
    networkFailed=true;remoteInput=cleanInput();controls.clear();
    $('network-status').textContent='Esperando a tu amigo. Conservamos esta sala durante dos minutos.';
    $('online-panel').classList.remove('error');$('online-options').hidden=true;
    if(match){match.paused=true;match.pauseReason='reconnect';updateOverlay();}
    persistRoom();renderSelection();
  });
  activeRoom.addEventListener('room',e=>{
    if(room!==activeRoom)return;
    localSide=e.detail.isHost?0:1;selectedSide=localSide;
    history.replaceState(null,'','#sala='+e.detail.code);
    $('room-display').textContent=e.detail.code;$('room-info').hidden=false;$('online-options').hidden=true;
    $('network-status').textContent=activeRoom.reconnecting?'Reconectando con tu amigo…':e.detail.isHost?'Compartí la invitación y esperá a tu amigo.':'Conectando los dos dispositivos…';
    persistRoom();renderSelection();
  });
  activeRoom.addEventListener('connected',e=>{
    if(room!==activeRoom)return;
    networkFailed=false;remoteInput=cleanInput();remoteInputAt=performance.now();lastSnapshot=performance.now();controls.clear();
    $('network-status').textContent=e.detail.rejoined?'¡Volvieron los dos! La misma sala está lista.':'¡Ya están los dos! Elijan personajes y pulsen «Estoy listo».';
    $('online-panel').classList.remove('error');$('online-options').hidden=true;
    if(e.detail.rejoined){ready=[false,false];if(match){match.paused=true;match.pauseReason='reconnected';match.fighters.forEach(f=>f.prev=cleanInput());}}
    if(activeRoom.isHost){if(match)sendRestore();else sendSetup();}
    else if(match)activeRoom.send({type:'checkpoint',state:match});
    updateOverlay();persistRoom();renderSelection();
  });
  activeRoom.addEventListener('message',e=>{if(room===activeRoom)onMessage(e.detail);});
  activeRoom.addEventListener('latency',e=>{if(mode==='online'&&screen==='arena')$('fight-mode').textContent='SALA '+activeRoom.code+' · '+e.detail+' ms';});
  try{await activeRoom.open(code,saved?{isHost:saved.isHost,session:saved.session,opponentSession:saved.opponentSession,resume:true,expiresAt:saved.expiresAt}:{});}
  catch(error){if(room===activeRoom)networkProblem(error.message);}
  finally{startingRoom=false;if(networkFailed&&!activeRoom.reconnecting){$('create-room').disabled=false;$('join-form').querySelector('button').disabled=false;}}
}
function persistRoom(){
  if(mode!=='online'||!room||room.closed||!(room.connected||room.hasConnected||room.isHost))return;
  saveSession(sessionStore,{code:room.code,isHost:room.isHost,session:room.session,opponentSession:room.opponentSession,expiresAt:room.reconnecting?room.deadline:Date.now()+RESUME_WINDOW,heroes,stage,state:match});
}
function sendRestore(){
  if(room?.isHost&&room.connected)room.send({type:'restore',heroes,stage,state:match});
}
async function restoreSavedRoom(){
  const saved=readSession(sessionStore);if(!saved)return false;
  const invitation=location.hash.match(/^#sala=([A-HJ-NP-Z2-9]{8})$/i);
  if(invitation&&invitation[1].toUpperCase()!==saved.code)return false;
  setupMode('online');await connectRoom(saved.code,saved);return true;
}
$('create-room').addEventListener('click',()=>connectRoom());
$('join-form').addEventListener('submit',e=>{e.preventDefault();const code=$('room-code').value.trim().toUpperCase();if(!validCode(code)){toast('Usá el código de 8 letras o números de tu amigo.');return;}connectRoom(code);});
$('copy-room').addEventListener('click',async()=>{
  const url=new URL(location.href);url.search='';url.hash='sala='+room.code;
  try{await navigator.clipboard.writeText(url.href);toast('Invitación copiada. ¡Pasásela a tu amigo!');}catch{toast('El código de tu sala es '+room.code);}
});
function onMessage(m){
  if(m.type==='leave'){clearSession(sessionStore);networkProblem('Tu amigo salió de la sala. Podés volver a invitarlo.');room?.close();return;}
  if(room.isHost){
    if(m.type==='pick'&&screen==='setup'){heroes[1]=m.hero;ready=[false,false];sendSetup();persistRoom();renderSelection();}
    if(m.type==='ready'&&screen==='setup'){ready[1]=m.value;sendSetup();renderSelection();maybeStart();}
    if(m.type==='input'&&screen==='arena'){remoteInput=m.input;remoteInputAt=performance.now();}
    if(m.type==='pause'&&screen==='arena'&&match?.phase!=='matchOver'){
      match.paused=m.value;match.pauseReason=m.value?'friend':'';controls.clear();room.send({type:'state',state:match});persistRoom();updateOverlay();
    }
    if(m.type==='rematch'&&screen==='arena'&&match?.phase==='matchOver'){returnToSelection();sendSetup();}
    if(m.type==='checkpoint'&&match){
      const newer=m.state;
      if(newer.id===match.id&&newer.clock>match.clock&&newer.stage===stage&&newer.fighters.every((f,i)=>f.hero===heroes[i]))match=structuredClone(newer);
      match.paused=true;match.pauseReason='reconnected';match.fighters.forEach(f=>f.prev=cleanInput());
      sendRestore();persistRoom();updateHUD();updateOverlay();
    }
  }else{
    if(m.type==='setup'){heroes=m.heroes;stage=m.stage;ready=m.ready;if(screen==='arena')returnToSelection(false);persistRoom();renderSelection();}
    if(m.type==='start'&&screen==='setup'){heroes=m.heroes;stage=m.stage;startMatch();if(typeof m.id==='string')match.id=m.id;persistRoom();}
    if(m.type==='restore'){
      heroes=m.heroes;stage=m.stage;networkFailed=false;lastSnapshot=performance.now();
      if(m.state){
        if(screen!=='arena'||!match||match.id!==m.state.id)startMatch(m.state);else match=m.state;
        updateHUD();updateOverlay();
      }else{returnToSelection();renderSelection();}
      persistRoom();
    }
    if(m.type==='state'&&screen==='arena'&&match){match=m.state;lastSnapshot=performance.now();updateHUD();updateOverlay();}
  }
}
function maybeStart(){
  if(room?.isHost&&room.connected&&ready.every(Boolean)&&screen==='setup'){
    startMatch();room.send({type:'start',heroes,stage,id:match.id});
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
function startMatch(savedState=null){
  match=savedState?structuredClone(savedState):createMatch(heroes,stage);if(!savedState)match.id=crypto.randomUUID?.()??makeSession();ai=createAI($('difficulty').value);remoteInput=cleanInput();remoteInputAt=performance.now();lastSnapshot=performance.now();lastStateSent=0;lastInputSent=0;seenEvent=0;announcedPhase='';winSound=false;networkFailed=false;
  $('fight-overlay').hidden=true;buildPowerPanels();show('arena');sound.unlock();
  $('fight-mode').textContent=mode==='online'?'SALA '+room.code:mode==='cpu'?'CONTRA LA PC · '+$('difficulty').selectedOptions[0].text:'DOS AMIGOS · MISMA PANTALLA';
  $('keyboard-help').textContent=mode==='local'?'J1: A/D · W · F golpe · G defensa · 1/2/3/4 poderes    |    J2: ←/→ · ↑ · K golpe · L defensa · 7/8/9/0 poderes':'A/D mover · W saltar · F golpe · G defensa · 1/2/3/4 poderes · Esc pausa';
  updateHUD();renderer.render(match,localSide);if(!savedState)persistRoom();
}
function returnToSelection(reset=true){
  controls.clear();match=null;if(reset)ready=[false,false];show('setup');persistRoom();renderSelection();
}
function updateHUD(){
  if(!match)return;
  match.fighters.forEach((f,i)=>{
    const hud=$('hud-'+i),h=HEROES[f.hero];hud.style.setProperty('--hero',h.color);
    hud.setAttribute('aria-label',h.name+(f.laugh>0?', se ríe sin control: '+Math.ceil(f.laugh)+' segundos':f.dance>0?', baila sin control: '+Math.ceil(f.dance)+' segundos':''));
    hud.querySelector('strong').textContent=h.name;hud.querySelector('.health-fill').style.width=f.hp+'%';hud.querySelector('.health-value').textContent=Math.ceil(f.hp);hud.querySelector('.health-value').style.color=f.hero===8?'#fffdf7':'';
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
  $('change-characters').textContent=kind==='connection'?'Salir de la sala':'Elegir personajes';
  $('overlay-eyebrow').textContent=kind==='victory'?'FIN DE LA HISTORIETA':kind==='connection'?'PAUSA DE CONEXIÓN':'UN RESPIRO';
  $('overlay-title').textContent=kind==='victory'?'¡Ganó '+HEROES[match.fighters[match.winner].hero].name+'!':kind==='connection'?'Se cortó la conexión':'Pausa';
  $('overlay-description').textContent=description||(kind==='victory'?'Dos rounds y un montón de ¡PAF! ¿Jugamos otra?':match.pauseReason==='reconnected'?'¡Volvieron los dos! Conservamos la vida y los rounds. Toquen «Seguir peleando».':match.pauseReason==='friend'?'Tu amigo puso pausa. Pueden seguir cuando estén listos.':'Los poderes también se toman un descanso.');
  if(kind==='victory'&&!winSound){sound.play('win');winSound=true;$('match-status').textContent=$('overlay-title').textContent;}
}
function updateOverlay(){
  if(!match)return;
  if(networkFailed){
    const remaining=Math.max(0,Math.ceil(((room?.deadline??0)-Date.now())/1000));
    setOverlay('connection',room?.reconnecting?'Guardamos la partida y la sala '+room.code+'. Tu amigo puede volver a esta pestaña. Esperamos '+remaining+' segundos.':$('network-status').textContent);return;
  }
  setOverlay(match.phase==='matchOver'?'victory':match.paused?'pause':'');
}
function togglePause(force){
  if(!match||networkFailed||match.phase==='matchOver')return;
  const value=typeof force==='boolean'?force:!match.paused;
  controls.clear();
  if(mode==='online'&&!room?.isHost){room.send({type:'pause',value});return;}
  match.paused=value;match.pauseReason=value?'local':'';if(mode==='online'&&room?.isHost)room.send({type:'state',state:match});persistRoom();updateOverlay();
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
window.addEventListener('pagehide',()=>{
  if(mode!=='online'||!room||room.closed)return;
  controls.clear();
  if(match&&match.phase!=='matchOver'){match.paused=true;match.pauseReason='reconnect';if(room.isHost)room.send({type:'state',state:match});else room.send({type:'pause',value:true});}
  persistRoom();room.close();
});
window.addEventListener('pageshow',e=>{if(e.persisted&&mode==='online'&&room?.closed){room=null;restoreSavedRoom();}});
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
      if(now-lastSnapshot>4000&&!match.paused&&!networkFailed)room.reconnect();
    }
    renderer.render(match,localSide);updateHUD();updateOverlay();
    for(const e of match.effects)if(e.id>seenEvent){sound.play(e.kind);seenEvent=e.id;}
  }
  if(now-lastPersist>1000){persistRoom();lastPersist=now;}
  requestAnimationFrame(frame);
}
await Promise.all([artReady,document.fonts.ready]);poster.poster(0);
requestAnimationFrame(frame);
const invitation=location.hash.match(/^#sala=([A-HJ-NP-Z2-9]{8})$/i);
if(!(await restoreSavedRoom())&&invitation){setupMode('online');$('room-code').value=invitation[1].toUpperCase();$('network-status').textContent='Te invitaron a una sala. Tocá «Entrar» para conectarte.';}
