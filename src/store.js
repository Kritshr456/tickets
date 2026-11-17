import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class TicketError extends Error {}
export function openStore(path=':memory:') {
  if(path!==':memory:') mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS categories(guild TEXT,key TEXT,parent TEXT,staff TEXT,PRIMARY KEY(guild,key));
    CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY,guild TEXT NOT NULL,owner TEXT NOT NULL,
      category TEXT NOT NULL,staff TEXT NOT NULL,channel TEXT UNIQUE,claimed TEXT,
      status TEXT NOT NULL DEFAULT 'creating',transcript TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE UNIQUE INDEX IF NOT EXISTS active_owner ON tickets(guild,owner) WHERE status!='closed';`);
  const get=(guild,id)=>db.prepare('SELECT * FROM tickets WHERE guild=? AND id=?').get(guild,id);
  return {
    close:()=>db.close(),
    config(guild,key,parent,staff){
      if(!/^[a-z0-9-]{1,24}$/.test(key)) throw new TicketError('Category key must use 1–24 lowercase letters, digits or hyphens.');
      db.prepare('INSERT INTO categories VALUES(?,?,?,?) ON CONFLICT(guild,key) DO UPDATE SET parent=excluded.parent,staff=excluded.staff').run(guild,key,parent,staff);
    },
    category:(guild,key)=>db.prepare('SELECT * FROM categories WHERE guild=? AND key=?').get(guild,key),
    reserve(guild,owner,key){
      const config=this.category(guild,key);
      if(!config) throw new TicketError('This ticket category is not configured.');
      if(db.prepare("SELECT 1 FROM tickets WHERE guild=? AND owner=? AND status!='closed'").get(guild,owner)) throw new TicketError('You already have an active ticket.');
      return Number(db.prepare('INSERT INTO tickets(guild,owner,category,staff) VALUES(?,?,?,?)').run(guild,owner,key,config.staff).lastInsertRowid);
    },
    activate:(id,channel)=>db.prepare("UPDATE tickets SET channel=?,status='open' WHERE id=? AND status='creating'").run(channel,id),
    abandon:id=>db.prepare("DELETE FROM tickets WHERE id=? AND status='creating' AND channel IS NULL").run(id),
    get,
    byChannel:(guild,channel)=>db.prepare('SELECT * FROM tickets WHERE guild=? AND channel=?').get(guild,channel),
    claim(guild,id,staff){
      const changed=db.prepare("UPDATE tickets SET claimed=? WHERE guild=? AND id=? AND status='open' AND claimed IS NULL").run(staff,guild,id).changes;
      if(!changed) throw new TicketError('Ticket is already claimed or is no longer open.');
    },
    unclaim(guild,id,actor,isManager=false){
      const ticket=get(guild,id);
      if(!ticket || ticket.status!=='open' || !ticket.claimed) throw new TicketError('Only an open, claimed ticket can be released.');
      if(ticket.claimed!==actor && !isManager) throw new TicketError('Only the current claimant or a server manager can release this claim.');
      const changed=db.prepare("UPDATE tickets SET claimed=NULL WHERE guild=? AND id=? AND status='open' AND claimed=?").run(guild,id,ticket.claimed).changes;
      if(!changed) throw new TicketError('The claim changed. Refresh and try again.');
    },
    snapshot(guild,id,transcript){
      const t=get(guild,id);
      if(!t || !['open','closing'].includes(t.status)) throw new TicketError('Ticket is not open.');
      db.prepare("UPDATE tickets SET transcript=?,status='closing' WHERE guild=? AND id=?").run(transcript,guild,id);
    },
    finish:(guild,id)=>db.prepare("UPDATE tickets SET status='closed' WHERE guild=? AND id=? AND status='closing'").run(guild,id),
    history:(guild,owner)=>db.prepare('SELECT id,category,status,claimed,created FROM tickets WHERE guild=? AND owner=? ORDER BY id DESC LIMIT 10').all(guild,owner),
  };
}
