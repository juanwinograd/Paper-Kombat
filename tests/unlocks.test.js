import test from 'node:test';
import assert from 'node:assert/strict';
import { availableHeroes,heroAvailable,matchesSecretCode,readUnlock,saveUnlock,UNLOCK_KEY } from '../src/unlocks.js';
test('el código correcto abre exactamente los tres personajes secretos',()=>{
 assert.equal(availableHeroes(false).length,8);assert.equal(availableHeroes(true).length,11);
 assert.ok(matchesSecretCode('Escuela Bavio 16 12'));assert.ok(matchesSecretCode('  ESCUELA   BAVIO 16 12  '));
 assert.ok(!matchesSecretCode('Escuela Bavio 16 13'));assert.ok(!matchesSecretCode(''));assert.ok(!matchesSecretCode(null));
 assert.ok(!heroAvailable(8));assert.ok(heroAvailable(8,true));assert.ok(!heroAvailable(11,true));
});
test('desbloqueo persiste; un almacenamiento bloqueado no rompe el juego',()=>{
 const items=new Map(),storage={setItem:(k,v)=>items.set(k,v),getItem:k=>items.get(k)};
 assert.equal(readUnlock(storage),false);assert.ok(saveUnlock(storage));assert.ok(readUnlock(storage));assert.equal(items.get(UNLOCK_KEY),'unlocked');
 const blocked={setItem(){throw Error();},getItem(){throw Error();}};assert.equal(readUnlock(blocked),false);assert.equal(saveUnlock(blocked),false);
});
