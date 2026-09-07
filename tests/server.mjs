import { Client } from '@colyseus/sdk';
import assert from 'node:assert/strict';
const sdk = new Client(process.env.ARENA_TEST_SERVER_URL || 'http://127.0.0.1:2567');
const rooms = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label) { for(let i=0;i<100;i++){if(predicate())return;await delay(50);}throw new Error(`Timed out: ${label}`); }
function observe(room) {
  rooms.push(room); room.reconnection.enabled=false;
  const state = {lobby:null,world:null,notice:''};
  room.onMessage('lobby', value=>state.lobby=value); room.onMessage('world',value=>state.world=value);room.onMessage('notice',value=>state.notice=value);room.send('sync');return state;
}
try {
  const host=await sdk.create('arena',{name:'Host',character:'warrior'}), a=observe(host);
  await until(()=>a.lobby,'host lobby');
  const guest=await sdk.joinById(host.roomId,{name:'Guest',character:'guardian'}), b=observe(guest);
  await until(()=>a.lobby.members.length===2 && b.lobby,'guest lobby');
  guest.send('launch');await delay(100);assert.equal(a.lobby.stage,'lobby');
  host.send('launch');await until(()=>a.notice,'ready gate');assert.equal(a.lobby.stage,'lobby');
  guest.send('ready',true);await until(()=>a.lobby.members[1].ready,'ready');
  guest.send('profile',{name:'  New name  ',character:'__proto__'});
  await until(()=>a.lobby.members[1].name==='New name','profile');
  assert.equal(a.lobby.members[1].ready,false);assert.equal(a.lobby.members[1].character,'guardian');
  host.send('ready',true);guest.send('ready',true);await until(()=>a.lobby.members.every(m=>m.ready),'all ready');
  host.send('launch');await until(()=>a.world?.players.length===2 && b.world?.players.length===2,'world');
  await assert.rejects(()=>sdk.joinById(host.roomId,{name:'Late'}));
  const hostId=a.lobby.members[0].actorId, guestId=a.lobby.members[1].actorId;
  const beforeHost=a.world.players.find(p=>p.id===hostId).x;
  const beforeGuest=a.world.players.find(p=>p.id===guestId).x;
  guest.send('input',{x:999,z:0,actorId:hostId});await delay(500);
  assert.equal(a.world.players.find(p=>p.id===hostId).x,beforeHost);
  const afterGuest=a.world.players.find(p=>p.id===guestId).x;
  assert.ok(afterGuest > beforeGuest && afterGuest-beforeGuest < 2.2);
  await delay(250);assert.equal(a.world.players.find(p=>p.id===guestId).x,afterGuest);
  guest.send('input',{x:'bad',z:null}); guest.send('profile',{name:'Changed in game',character:'warrior'}); guest.send('return');
  await delay(100); assert.equal(a.lobby.stage,'game'); assert.equal(a.lobby.members[1].name,'New name');
  await host.leave();rooms.splice(rooms.indexOf(host),1);await until(()=>b.lobby.hostId===guest.sessionId && b.world.players.length===1,'host transfer');
  await assert.rejects(()=>sdk.joinById(guest.roomId,{name:'Still late'}));
  console.log('Server checks passed: host authority, ready gating, validated profiles, locked running rooms, input ownership/clamping/staleness, host transfer.');
} finally { await Promise.allSettled(rooms.map(room=>room.leave())); }
