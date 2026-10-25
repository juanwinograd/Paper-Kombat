import { VERSION,heroIndex,stageIndex } from './content.js';
import { validCode,validSession,validSnapshot,RESUME_WINDOW } from './network.js';
export const SESSION_KEY='paper-kombat-online-v2';
export function saveSession(storage,session,now=Date.now()){
  try{
    const record={...session,version:VERSION,expiresAt:session.expiresAt??now+RESUME_WINDOW};
    storage.setItem(SESSION_KEY,JSON.stringify(record));return true;
  }catch{return false;}
}
export function readSession(storage,now=Date.now()){
  try{
    const s=JSON.parse(storage.getItem(SESSION_KEY));
    if(!s)return null;
    if(s.version!==VERSION||!validCode(s.code)||typeof s.isHost!=='boolean'||!validSession(s.session)||(s.opponentSession!==null&&!validSession(s.opponentSession))||!Number.isFinite(s.expiresAt)||s.expiresAt<=now||s.expiresAt>now+RESUME_WINDOW+5000||!Array.isArray(s.heroes)||s.heroes.length!==2||!s.heroes.every(heroIndex)||!stageIndex(s.stage)||(s.state!==null&&!validSnapshot(s.state))){
      clearSession(storage);return null;
    }
    if(s.state&&(s.state.stage!==s.stage||!s.state.fighters.every((f,i)=>f.hero===s.heroes[i]))){clearSession(storage);return null;}
    return s;
  }catch{clearSession(storage);return null;}
}
export function clearSession(storage){try{storage.removeItem(SESSION_KEY);}catch{}}
