const move = (name, icon, description, cooldown, kind) => ({name, icon, description, cooldown, kind});
export const HEROES = [
  {id:'vicente',name:'Vicente',color:'#ef5897',dark:'#a72960',tag:'El espacio es suyo',style:'Trampas y escapadas',powers:[
    move('Prisma','△','Atrapa brevemente al rival. Después puede escapar.',7,'prism'),
    move('Rayo regalo','◇','Un regalo sorpresa que frena y lastima un poquito.',6,'gift'),
    move('Espacio-tiempo','↝','Aparecé al otro lado de tu rival.',8,'teleport')]},
  {id:'fabrizio',name:'Fabrizio',color:'#9ecb52',dark:'#496d1e',tag:'Un resorte de sorpresas',style:'Engaño y contraataque',powers:[
    move('Cubo reflector','▧','Devolvé los proyectiles durante dos segundos.',7,'reflect'),
    move('Invisibilidad','◌','Volvete una silueta tenue. Atacar te revela.',9,'invisible'),
    move('Picos','⋀','Lanzá picos hacia adelante.',4,'spikes'),
    move('¡Fiesta!','♫','El rival baila sin control durante dos segundos y medio. Se puede esquivar o cubrir.',14,'party')]},
  {id:'luca',name:'Luca',color:'#20b5d5',dark:'#08788f',tag:'¡Alta tensión!',style:'Distancia y protección',powers:[
    move('Rayo eléctrico','ϟ','Un rayo rápido que interrumpe al oponente.',4,'lightning'),
    move('Tormenta','☂','Una nube avisa antes de que caiga el rayo.',9,'storm'),
    move('Campo de fuerza','◎','Dos segundos de protección. No podés moverte.',10,'shield'),
    move('Hacerse chiquito','↧','Un blanco más pequeño durante tres segundos.',8,'mini')]},
  {id:'gaspar',name:'Gaspar',color:'#08afce',dark:'#08778d',tag:'¡Hasta ahí llego!',style:'Alcance y potencia',powers:[
    move('Brazo elástico','↔','Un puñetazo que alcanza mucho más lejos.',5,'stretch'),
    move('Superpuño','✊','Un golpe fuerte. ¡Tenés que estar cerca!',6,'punch'),
    move('Teletransporte','↝','Saltá al otro lado del oponente.',9,'teleport'),
    move('Papapumba','●','Lanzá una papa que explota al caer.',7,'potato')]},
  {id:'amaral',name:'Amaral',color:'#ef3b50',dark:'#ac2436',tag:'Pronóstico: ¡pelea!',style:'Clima y control',powers:[
    move('Neblina','≋','Una neblina te vuelve difícil de ver.',9,'fog'),
    move('Sol cegador','☀','Deslumbrá al rival por un instante.',8,'sun'),
    move('Viento','↠','Una ráfaga empuja y desvía proyectiles.',5,'wind')]},
  {id:'aaron',name:'Aarón Mamani',color:'#13ad9d',dark:'#08786e',tag:'Todo a su tiempo',style:'Ritmo y precisión',powers:[
    move('Burbuja temporal','◴','El rival se mueve más lento durante dos segundos.',6,'time')]},
  {id:'sebastian',name:'Sebástian',color:'#625144',dark:'#44382e',tag:'Firme como una roca',style:'Armas de piedra',powers:[
    move('Espada de piedra','†','Un tajo rápido con más alcance que un golpe.',4,'sword'),
    move('Martillo de roca','◆','Avisá con el martillo y golpeá fuerte.',7,'hammer'),
    move('Piedra arrojadiza','⬟','Una roca que vuela hacia el rival.',5,'stone')]},
  {id:'benicio',name:'Benicio',color:'#235acb',dark:'#173d92',tag:'¡Ahora somos dos!',style:'Compañía y presión',powers:[
    move('Clonarse','②','Un clon ayuda seis segundos. Cae de un golpe.',10,'clone')]},
  {id:'wis-negro',name:'Wis negro',color:'#292827',dark:'#171716',tag:'Ideas hechas de tinta',style:'Tinta y monstruos',secret:true,powers:[
    move('Lanzar tinta','●','Dispará una gota de tinta hacia el rival.',4,'ink'),
    move('Monstruos de tinta','♟','Creá dos monstruos pequeños. Cada uno cae de un golpe.',11,'ink-monsters')]},
  {id:'maquina-bobadas',name:'Máquina de bobadas',color:'#e8759d',dark:'#a52e58',tag:'¡Es imposible no reírse!',style:'Risa incontrolable',secret:true,powers:[
    move('Ataque de risa','☺','El rival se ríe sin poder controlarse durante cinco segundos. Puede esquivarlo o cubrirse.',18,'laugh')]},
  {id:'baltazar',name:'Baltazar',color:'#9964d2',dark:'#643899',tag:'¡Cuadrados por todos lados!',style:'Cuadrados y camuflaje',secret:true,powers:[
    move('Lanzar cuadrados','□','Lanzá un cuadrado violeta hacia adelante.',4,'square'),
    move('Camuflarse','◌','Mezclate con la viñeta durante unos segundos. Atacar te revela.',9,'camouflage')]}
];
export const STAGES = [
  {id:'cuartel',name:'El cuartel',subtitle:'Una práctica entre amigos',image:'assets/illustrations/cuartel-tranquilo.webp',color:'#e9bb55'},
  {id:'cantera',name:'La cantera',subtitle:'¡Que vuelen las piedras!',image:'assets/illustrations/cantera.webp',color:'#e39478'},
  {id:'laboratorio',name:'El laboratorio',subtitle:'Experimento: superpoderes',image:'assets/illustrations/laboratorio.webp',color:'#6abcb9'}
];
export const WIDTH=960, HEIGHT=540, FLOOR=450;
export const RULES={health:100,roundSeconds:60,wins:2};
export const VERSION='paper-kombat-3';
export const heroIndex = value => Number.isInteger(value) && value>=0 && value<HEROES.length;
export const stageIndex = value => Number.isInteger(value) && value>=0 && value<STAGES.length;
