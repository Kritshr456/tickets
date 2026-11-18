import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.js';
import { handleTicketList } from '../src/ticket-list.js';
function fixture(){const s=openStore();s.config('g','help','parent','staff');s.config('g','private','parent','private-role');return s;}

test('ticket listing isolates guilds and staff roles and never returns transcripts',()=>{
 const s=fixture();try{
  const id=s.reserve('g','u','help');s.activate(id,'channel');s.snapshot('g',id,'Sensitive support transcript');s.finish('g',id);
  s.reserve('g','v','private');const query={guild:'g',roles:['staff']};
  assert.equal(s.list(query).total,0);assert.equal(s.list({...query,status:'closed'}).total,1);
  assert.ok(!('transcript' in s.list({...query,status:'closed'}).rows[0]));
  assert.equal(s.list({...query,roles:[]}).total,0);assert.equal(s.list({...query,guild:'other'}).total,0);
  assert.equal(s.list({...query,manager:true}).total,1);
 }finally{s.close();}
});
test('ticket list paginates and filters current claims',()=>{
 const s=fixture();try{
  for(let n=0;n<7;n++){const id=s.reserve('g',`u${n}`,'help');s.activate(id,`c${n}`);if(n<2)s.claim('g',id,'reviewer');}
  const query={guild:'g',roles:['staff']};assert.equal(s.list(query).rows.length,5);assert.equal(s.list({...query,page:2}).rows.length,2);
  assert.equal(s.list({...query,mine:'reviewer'}).total,2);assert.equal(s.list({...query,mine:'other'}).total,0);
  assert.throws(()=>s.list({...query,status:"open' OR 1=1"}));assert.throws(()=>s.list({...query,page:0}));
 }finally{s.close();}
});
test('staff queue command uses fresh member roles and safe mention settings',async()=>{
 const s=fixture();try{
  s.reserve('g','owner','help');let output;
  const i={commandName:'ticket-list',guildId:'g',user:{id:'staff-user'},options:{getString:()=>null,getBoolean:()=>false,getInteger:()=>1},editReply:async payload=>{output=payload;}};
  const roles=new Map([['staff',{}]]),member={roles:{cache:roles},permissions:{has:()=>false}};
  await handleTicketList(i,member,s);assert.equal(output.embeds[0].toJSON().fields.length,1);assert.deepEqual(output.allowedMentions,{parse:[]});
  roles.clear();await handleTicketList(i,member,s);assert.equal(output.embeds[0].toJSON().fields,undefined);
 }finally{s.close();}
});
