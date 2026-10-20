import test from 'node:test';
import assert from 'node:assert/strict';
import {database,calls} from './sdk-mock.mjs';
import {ADMIN_IDS} from '../tgcloud/lib/config.js';
import * as repo from '../tgcloud/lib/repository.js';
import {handle} from '../tgcloud/lib/service.js';
import {handleMessage} from '../tgcloud/lib/bot.js';
import callback from '../tgcloud/handlers/callback_query.js';
import source from '../tgcloud/lib/snapshot.js';
ADMIN_IDS.push(42);
test('users cannot read, save or delete someone else’s preferences through submitted IDs',async()=>{
 const ctx={initData:{user:{id:101}}};const p=await handle('getPreferences',{},ctx);
 await handle('savePreferences',{...p,favorites:[1],userId:202},ctx);
 assert.deepEqual((await repo.getPreferences(101)).favorites,[1]);assert.deepEqual((await repo.getPreferences(202)).favorites,[]);
 await handle('deleteUser',{confirm:true,userId:202},ctx);assert.deepEqual((await repo.getPreferences(101)).favorites,[]);
 await assert.rejects(()=>handle('getCatalog',{},{}));
});
test('optimistic preferences prevent lost updates',async()=>{
 const p=await repo.getPreferences(303);const results=await Promise.allSettled([repo.savePreferences(303,{...p,favorites:[1]}),repo.savePreferences(303,{...p,favorites:[2]})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const next=await repo.getPreferences(303);assert.equal(next.version,1);await repo.savePreferences(303,{...next,rank:'glory'});assert.equal((await repo.getPreferences(303)).version,2);
});
test('unauthorized callers cannot stage or publish',async()=>{
 await assert.rejects(()=>repo.stageRevision(999,source),/Publisher/);await assert.rejects(()=>repo.publishRevision(999,{id:'anything',expectedRevision:source.id}),/Publisher/);
});
test('staging does not publish; publication is atomic, conflict checked and reversible',async()=>{
 const a={...structuredClone(source),id:'test-reviewed-a',patch:'TEST-PATCH',patchVerified:true,reviewedBy:'Fixture reviewer',patchSource:'https://example.com/patch'};
 await repo.stageRevision(42,a);assert.equal((await repo.getSnapshot()).id,source.id);
 await assert.rejects(()=>repo.stageRevision(42,a),/exists/);
 await repo.publishRevision(42,{id:a.id,expectedRevision:source.id});assert.equal((await repo.getSnapshot()).id,a.id);
 const b={...a,id:'test-reviewed-b'};await repo.stageRevision(42,b);
 await assert.rejects(()=>repo.publishRevision(42,{id:b.id,expectedRevision:source.id}),/changed/);
 await repo.publishRevision(42,{id:b.id,expectedRevision:a.id});assert.equal((await repo.getSnapshot()).id,b.id);
 await repo.publishRevision(42,{id:a.id,expectedRevision:b.id});assert.equal((await repo.getSnapshot()).id,a.id);
 database.prepare("DELETE FROM app_state WHERE key='active_revision'").run();
});
test('unverified staged revision cannot be published',async()=>{
 await repo.stageRevision(42,{...source,id:'unverified'});await assert.rejects(()=>repo.publishRevision(42,{id:'unverified',expectedRevision:source.id}),/Confirm patch/);
});
test('bot hero, build, draft and invalid commands return bounded Telegram replies',async()=>{
 for(const text of ['/start','/hero Miya','/build Miya','/counter Miya','/tier gold','/draft gold | Miya | Tigreal | Fanny','/settings wrong gold'])await handleMessage({from:{id:404},chat:{id:404,type:'private'},text});
 const replies=calls.filter(c=>c.method==='sendMessage');assert.equal(replies.length,7);assert.ok(replies.every(c=>c.parameters.text.length<=4096));
});
test('group callbacks cannot edit another user’s menu',async()=>{
 const before=calls.filter(c=>c.method==='editMessageText').length;
 await callback({id:'q1',from:{id:505},message:{chat:{id:-1,type:'group'},message_id:1},data:'favorite:1'});
 assert.equal(calls.filter(c=>c.method==='editMessageText').length,before);assert.deepEqual((await repo.getPreferences(505)).favorites,[]);
});
test('repeated save callbacks do not toggle a favorite off',async()=>{
 const q={id:'repeat',from:{id:606},message:{chat:{id:606,type:'private'},message_id:2},data:'favorite:1:1'};
 await callback(q);await callback(q);assert.deepEqual((await repo.getPreferences(606)).favorites,[1]);
});
