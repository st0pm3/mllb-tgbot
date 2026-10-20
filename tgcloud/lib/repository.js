import {db} from 'sdk';
import bundled from './snapshot.js';
import {DEFAULT_PREFS,InputError,validatePreferences,requireValue} from './domain.js';
import {validateSnapshot} from './validation.js';
import {ADMIN_IDS} from './config.js';

export function assertUser(id){requireValue(Number.isSafeInteger(id)&&id>0,'A verified Telegram user is required.');}
export function assertAdmin(id){assertUser(id);if(!ADMIN_IDS.includes(id))throw new InputError('Publisher access required.','FORBIDDEN');}
export async function getSnapshot(){const row=await db.get("SELECT r.payload FROM app_state s JOIN content_revisions r ON r.id=s.value WHERE s.key='active_revision'");return row?JSON.parse(row.payload):bundled;}
export async function getPreferences(id){
  assertUser(id);const row=await db.get('SELECT payload,version FROM preferences WHERE user_id=:id',{':id':id});
  return row?{...JSON.parse(row.payload),version:row.version}:{...DEFAULT_PREFS,favorites:[],pool:[]};
}
export async function savePreferences(id,input){
  assertUser(id);const p=validatePreferences(await getSnapshot(),input);const next={...p,version:p.version+1};
  const params={':id':id,':payload':JSON.stringify(next),':now':Date.now(),':expected':p.version};
  const result=p.version===0
    ? await db.run('INSERT INTO preferences(user_id,payload,version,updated_at) VALUES(:id,:payload,1,:now) ON CONFLICT(user_id) DO NOTHING',{':id':id,':payload':params[':payload'],':now':params[':now']})
    : await db.run('UPDATE preferences SET payload=:payload,version=version+1,updated_at=:now WHERE user_id=:id AND version=:expected',params);
  if(!result.rowsAffected)throw new InputError('Settings changed elsewhere. Reload and try again.','CONFLICT');return next;
}
export async function deleteUser(id){assertUser(id);await db.run('DELETE FROM preferences WHERE user_id=:id',{':id':id});return {deleted:true};}
export async function listRevisions(id){assertAdmin(id);return {active:(await getSnapshot()).id,revisions:await db.all('SELECT id,created_by,created_at FROM content_revisions ORDER BY created_at DESC LIMIT 30')};}
export async function stageRevision(id,input){
  assertAdmin(id);const data=validateSnapshot(input);
  requireValue(data.id!==bundled.id,'Use a new revision ID; the bundled snapshot ID is reserved.');
  const existing=await db.get('SELECT id FROM content_revisions WHERE id=:id',{':id':data.id});if(existing)throw new InputError('Revision ID already exists. Use a new ID.','CONFLICT');
  await db.run('INSERT INTO content_revisions(id,payload,created_by,created_at) VALUES(:id,:payload,:user,:time)',{':id':data.id,':payload':JSON.stringify(data),':user':id,':time':Date.now()});return {id:data.id,staged:true};
}
export async function publishRevision(userId,{id,expectedRevision}){
  assertAdmin(userId);requireValue(typeof id==='string'&&typeof expectedRevision==='string','Revision IDs required.');
  const row=await db.get('SELECT payload FROM content_revisions WHERE id=:id',{':id':id});requireValue(row,'Revision not found.');validateSnapshot(JSON.parse(row.payload),{publish:true});
  await db.run("INSERT INTO app_state(key,value) VALUES('active_revision',:bundled) ON CONFLICT(key) DO NOTHING",{':bundled':bundled.id});
  const r=await db.run("UPDATE app_state SET value=:next WHERE key='active_revision' AND value=:expected",{':next':id,':expected':expectedRevision});
  if(!r.rowsAffected)throw new InputError('Active revision changed. Reload before publishing.','CONFLICT');return {published:id};
}
