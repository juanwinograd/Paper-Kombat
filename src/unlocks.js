import { HEROES,heroIndex } from './content.js';
export const UNLOCK_KEY='paper-kombat-secret-team';
const SECRET_CODE='escuela bavio 16 12';
export function matchesSecretCode(value){return typeof value==='string'&&value.trim().replace(/\s+/g,' ').toLocaleLowerCase('es')===SECRET_CODE;}
export function readUnlock(storage){try{return storage.getItem(UNLOCK_KEY)==='unlocked';}catch{return false;}}
export function saveUnlock(storage){try{storage.setItem(UNLOCK_KEY,'unlocked');return true;}catch{return false;}}
export function heroAvailable(index,unlocked=false){return heroIndex(index)&&(!HEROES[index].secret||unlocked);}
export function availableHeroes(unlocked=false){return HEROES.map((_,i)=>i).filter(i=>heroAvailable(i,unlocked));}
