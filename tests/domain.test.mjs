import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../tgcloud/lib/snapshot.js';
import {searchHeroes,findHero,tierList,getCounters,recommendDraft,validateDraft,validatePreferences,freshness,DEFAULT_PREFS} from '../tgcloud/lib/domain.js';
import {validateSnapshot} from '../tgcloud/lib/validation.js';

test('imported catalog passes validation, has unique heroes and no invented tiers',()=>{
 assert.equal(validateSnapshot(data),data);assert.equal(new Set(data.heroes.map(h=>h.id)).size,data.heroes.length);
 assert.equal(tierList(data).find(g=>g.tier==='Unranked').heroes.length,data.heroes.length);
 assert.equal(data.patchVerified,false);
});
test('search supports punctuation and case without injecting markup',()=>{
 assert.equal(findHero(data,'mIyA').id,1);assert.equal(findHero(data,'Yi Sun-shin')?.name,'Yi Sun-shin');
 assert.equal(searchHeroes(data,'<script>').length,0);assert.throws(()=>searchHeroes(data,'x'.repeat(81)));
});
test('a draft rejects duplicate, overlapping and unknown selections',()=>{
 for(const input of [{lane:'gold',enemies:[1,1]},{lane:'gold',enemies:[1],bans:[1]},{lane:'gold',allies:[99999]},{lane:'nonsense'}])assert.throws(()=>validateDraft(data,input));
});
test('draft excludes every picked and banned hero and honors an empty restricted pool',()=>{
 const unavailable=[1,2,3,4,5,6];const r=recommendDraft(data,{lane:'gold',enemies:[1,2],allies:[3,4],bans:[5,6]});
 assert.ok(r.recommendations.every(r=>!unavailable.includes(r.hero.id)&&r.hero.lanes.includes('gold')));
 assert.equal(recommendDraft(data,{lane:'gold',restrictPool:true,pool:[]}).recommendations.length,0);
});
test('counters are directed and not inferred from statistical win rates',()=>{
 const clone=structuredClone(data);for(const h of clone.heroes){h.strongAgainst=[];h.weakAgainst=[];}
 clone.heroes.find(h=>h.id===1).weakAgainst=[2];assert.deepEqual(getCounters(clone,1).map(c=>c.hero.id),[2]);assert.equal(getCounters(clone,2).length,0);
});
test('draft without reviewed matchup evidence identifies role-fit advice',()=>{
 const r=recommendDraft(data,{lane:'gold'});assert.ok(r.recommendations.every(x=>x.risks.some(s=>s.includes('role-fit'))));
});
test('preferences validate ownership-independent data and IDs',()=>{
 assert.throws(()=>validatePreferences(data,{...DEFAULT_PREFS,favorites:[999999]}));assert.throws(()=>validatePreferences(data,{...DEFAULT_PREFS,favorites:[1,1]}));assert.throws(()=>validatePreferences(data,{...DEFAULT_PREFS,rank:'made up'}));
});
test('snapshot validation rejects broken references and false full builds',()=>{
 const broken=structuredClone(data);broken.heroes[0].strongAgainst=[99999];assert.throws(()=>validateSnapshot(broken));
 const bad=structuredClone(data);const h=bad.heroes.find(h=>h.builds.length);h.builds[0].reviewed=true;assert.throws(()=>validateSnapshot(bad));
 assert.throws(()=>validateSnapshot(data,{publish:true}));
});
test('freshness retains unknown source age and marks old snapshots stale',()=>{
 const f=freshness({...data,retrievedAt:'2020-01-01T00:00:00Z'});assert.equal(f.stale,true);assert.equal(f.sourceAgeKnown,false);assert.equal(f.patchVerified,false);
});
test('review import rejects executable source links',()=>{
 const bad=structuredClone(data);bad.heroes[0].source='javascript:alert(1)';assert.throws(()=>validateSnapshot(bad),/Invalid hero content/);
});

test('conflicting source interactions give no matchup bonus and remain visible',()=>{
 const clone=structuredClone(data),hero=clone.heroes.find(h=>h.id===1),enemy=clone.heroes.find(h=>h.id===2);
 hero.strongAgainst=[2];hero.weakAgainst=[2];enemy.strongAgainst=[];enemy.weakAgainst=[];
 const result=recommendDraft(clone,{lane:hero.lanes[0],enemies:[2],pool:[1],restrictPool:true}).recommendations[0];
 assert.equal(result.score,4);assert.equal(result.evidence,0);assert.ok(result.risks.some(s=>s.includes('Conflicting')));
 assert.equal(getCounters(clone,2).find(c=>c.hero.id===1).conflict,true);
});
test('duplicate tier contexts and nonboolean review flags cannot enter revisions',()=>{
 const clone=structuredClone(data);const r={tier:'A',lane:'all',rank:'mythic',patch:'test',reason:'Test assessment',reviewed:false};
 clone.heroes[0].ratings=[r,{...r}];assert.throws(()=>validateSnapshot(clone),/Duplicate rating/);
 clone.heroes[0].ratings=[{...r,reviewed:'false'}];assert.throws(()=>validateSnapshot(clone),/Invalid rating/);
});
