import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.js';
import { handleCategoryToggle } from '../src/ticket-list.js';

test('pausing blocks new tickets while allowing existing tickets to finish',()=>{
 const s=openStore();try{
  s.config('g','help','parent','staff');const id=s.reserve('g','owner','help');s.activate(id,'channel');
  s.toggleCategory('g','help',false);assert.throws(()=>s.reserve('g','another','help'),/paused/);
  s.config('g','help','new-parent','staff');assert.equal(s.category('g','help').enabled,0);
  s.claim('g',id,'staff-user');s.snapshot('g',id,'Saved transcript');s.finish('g',id);
  assert.equal(s.get('g',id).transcript,'Saved transcript');
  s.toggleCategory('g','help',true);assert.ok(s.reserve('g','another','help'));
  assert.throws(()=>s.toggleCategory('other','help',false));assert.throws(()=>s.toggleCategory('g','help','false'));
 }finally{s.close();}
});
test('category pausing requires Manage Server at runtime',async()=>{
 const s=openStore();try{
  s.config('g','help','p','staff');let response;
  const i={commandName:'ticket-toggle',guildId:'g',options:{getBoolean:()=>false,getString:()=> 'help'},editReply:async text=>{response=text;}};
  await assert.rejects(handleCategoryToggle(i,{permissions:{has:()=>false}},s));assert.equal(s.category('g','help').enabled,1);
  await handleCategoryToggle(i,{permissions:{has:()=>true}},s);assert.match(response,/paused/);assert.equal(s.category('g','help').enabled,0);
 }finally{s.close();}
});
test('old category configuration migrates enabled and pausing persists across restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ticket-category-')),path=join(dir,'app.sqlite');
 try{
  const db=new DatabaseSync(path);db.exec("CREATE TABLE categories(guild TEXT,key TEXT,parent TEXT,staff TEXT,PRIMARY KEY(guild,key)); INSERT INTO categories VALUES('g','help','parent','staff');");db.close();
  let s=openStore(path);assert.equal(s.category('g','help').enabled,1);s.toggleCategory('g','help',false);s.close();
  s=openStore(path);assert.equal(s.category('g','help').enabled,0);assert.equal(s.category('g','help').parent,'parent');s.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
