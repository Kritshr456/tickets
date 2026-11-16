import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.js';
import { collectMessages, renderTranscript } from '../src/transcript.js';
import { commands } from '../src/commands.js';
function fixture(){const s=openStore();s.config('g','support','parent','staff');return s;}
test('one active ticket per owner; failed creation releases reservation',()=>{
 const s=fixture();try{const id=s.reserve('g','u','support');assert.throws(()=>s.reserve('g','u','support'));s.abandon(id);assert.ok(s.reserve('g','u','support')>0);assert.throws(()=>s.reserve('other','u','support'));}finally{s.close();}
});
test('claim is exclusive, close retains transcript and permits next ticket',()=>{
 const s=fixture();try{const id=s.reserve('g','u','support');s.activate(id,'ch');s.claim('g',id,'staff1');assert.throws(()=>s.claim('g',id,'staff2'));assert.throws(()=>s.claim('other',id,'staff2'));s.snapshot('g',id,'private text');assert.throws(()=>s.claim('g',id,'staff2'));s.finish('g',id);assert.equal(s.get('g',id).transcript,'private text');assert.equal(s.get('other',id),undefined);assert.ok(s.reserve('g','u','support'));}finally{s.close();}
});
test('existing staff configuration is snapshotted',()=>{const s=fixture();try{const id=s.reserve('g','u','support');s.config('g','support','new-parent','new-staff');assert.equal(s.get('g',id).staff,'staff');assert.throws(()=>s.config('g','BAD KEY','p','s'));}finally{s.close();}});
test('transcript orders messages and uses plain text, including attachment URLs',()=>{
 const ticket={id:1,guild:'g',owner:'u',category:'help'};
 const message=(id,time,content)=>({id,createdTimestamp:time,content,author:{id:'u'},attachments:new Map([['a',{url:'https://example.com/file'}]]),embeds:[]});
 const text=renderTranscript(ticket,[message('2',2000,'later'),message('1',1000,'<script>text</script>')]);
 assert.ok(text.indexOf('<script>')<text.indexOf('later'));assert.match(text,/https:\/\/example.com\/file/);
});
test('pagination fetches all pages and refuses silent truncation',async()=>{
 let n=0;const page=new Map(Array.from({length:100},(_,i)=>[String(i),{id:String(i)}]));page.last=()=>({id:'0'});
 const channel={messages:{fetch:async()=>n++===0?page:new Map()}};
 assert.equal((await collectMessages(channel)).length,100);
 n=0;await assert.rejects(collectMessages(channel,50),/exceeds/);
});
test('all command definitions serialize',()=>{for(const c of commands)assert.ok(c.toJSON().name);});
