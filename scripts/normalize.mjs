import fs from 'node:fs';
import path from 'node:path';
import {validateSnapshot} from '../tgcloud/lib/validation.js';
const root = new URL('../',import.meta.url).pathname;
const raw=path.join(root,'content/raw');
const read=name=>{try{return JSON.parse(fs.readFileSync(path.join(raw,`${name}.json`),'utf8'));}catch{return null;}};
const records=name=>read(name)?.data?.records||[];
const lanes={'1':'exp','2':'mid','3':'roam','4':'jungle','5':'gold'};
const clean=x=>String(x||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
function safeImage(x){try{const u=new URL(x);if(u.hostname==='wsrv.nl'){const source=new URL(u.searchParams.get('url'));if(source.protocol==='https:'&&source.hostname==='akmweb.youngjoygame.com')return source.href;}if(u.protocol==='https:'&&u.hostname==='akmweb.youngjoygame.com')return u.href;}catch{}return '';}
const base = new Map(records('heroes').map(r=>[r.data.hero_id,r.data]));
const items=[...new Map(records('equipment').map(r=>({id:r.data.equipid,name:clean(r.data.equipname),image:safeImage(r.data.equipicon)})).map(i=>[i.id,i])).values()];
const itemIds=new Set(items.map(i=>i.id));
const spells=records('spells').map(r=>({id:r.data.battleskillid,name:clean(r.data.__data?.skillname),image:safeImage(r.data.__data?.skillicon)}));
const talents=records('emblems').map(r=>({id:r.data.giftid,name:clean(r.data.emblemskill?.skillname),image:safeImage(r.data.emblemskill?.skillicon)}));
const stats={};
for(const rank of ['all','epic','legend','mythic','honor','glory']) for(const {data:d} of records('rank-'+rank)) {
  stats[d.main_heroid]??={};stats[d.main_heroid][rank]={winRate:d.main_hero_win_rate??null,pickRate:d.main_hero_appearance_rate??null,banRate:d.main_hero_ban_rate??null,sampleSize:null,windowDays:7,observedAt:null};
}
const heroes=records('catalog').map(({data:c})=>{
  const b=base.get(c.hero_id)||{}, detail=records('hero-'+c.hero_id)[0]?.data, h=detail?.hero?.data||c.hero.data;
  const name=b.hero?.data?.name||h.name;
  const laneList=[...new Set((h.roadsort||[]).filter(Boolean).map(r=>lanes[r.data?.road_sort_id]).filter(Boolean))];
  const builds=[];
  for(const lane of laneList) for(const rec of records(`core-${c.hero_id}-${lane}`)) for(const [idx,core] of (rec.data.build||[]).slice(0,2).entries()) {
    if(!core.equipid?.length||!core.equipid.every(id=>itemIds.has(id)))continue;
    builds.push({id:`core-${c.hero_id}-${lane}-${idx}`,kind:'core',title:'Common item core',lane,rank:'mythic',items:core.equipid,spell:core.battleskill?.data?.__data?.skillname||null,spellId:core.skillid,emblem:core.emblem?.data?.emblemname||null,talents:(core.new_rune_skill||[]).map(id=>talents.find(t=>t.id===id)?.name||`Talent ${id}`),reviewed:false,patch:null,source:`https://arena.rone.dev/api/academy/heroes/${c.hero_id}/builds?lane=${lane}&rank=mythic`,updatedAt:rec._updatedAt?new Date(rec._updatedAt).toISOString():null,winRate:core.build_win_rate??null,pickRate:core.build_pick_rate??null,reason:'Source-reported item core. Purchase order, final slots and patch compatibility need review.',swaps:[]});
  }
  for(const rec of records('guide-'+c.hero_id)) {
    const g=rec.data?.data;if(!g)continue;
    for(const [idx,build] of (g.equips||[]).slice(0,2).entries()) {
      if(build.equip_ids?.length!==6||!build.equip_ids.every(id=>itemIds.has(id)))continue;
      builds.push({id:`community-${c.hero_id}-${idx}`,kind:'community',title:'Community six-item build',lane:lanes[g.hero?.hero_lane]||laneList[0]||'exp',rank:'all',items:build.equip_ids,spell:spells.find(s=>s.id===g.spell?.spell_id)?.name||null,spellId:g.spell?.spell_id??null,emblem:g.emblems?.[0]?.emblem_title?'See source guide':null,talents:(g.emblems?.[0]?.emblem_gifts||[]).map(id=>talents.find(t=>t.id===id)?.name||`Talent ${id}`),reviewed:false,patch:g.game_version||null,source:`https://arena.rone.dev/api/academy/recommended/${rec.id}`,updatedAt:rec.updatedAt?new Date(rec.updatedAt).toISOString():null,reason:'Imported community build. Its listed patch may be older than the current game; not an editorial recommendation.',swaps:[]});
    }
  }
  const relations=detail?.relation||b.relation||{};
  return {id:c.hero_id,name,aliases:[...(name!==c.hero.data.name?[c.hero.data.name]:[])],lanes:laneList,roles:(h.sortlabel||[]).filter(Boolean),image:safeImage(c.head),portrait:safeImage(c.head_big),splash:safeImage(c.painting||h.painting),difficulty:Number(h.difficulty)||null,releaseVerified:false,
    strongAgainst:(relations.strong?.target_hero_id||[]).filter(x=>Number.isInteger(x)&&x>0&&x!==c.hero_id),weakAgainst:(relations.weak?.target_hero_id||[]).filter(x=>Number.isInteger(x)&&x>0&&x!==c.hero_id),synergies:(relations.assist?.target_hero_id||[]).filter(x=>Number.isInteger(x)&&x>0&&x!==c.hero_id),skills:(h.heroskilllist?.[0]?.skilllist||[]).map(s=>({id:s.skillid,name:clean(s.skillname),tags:(s.skilltag||[]).map(t=>t.tagname),image:safeImage(s.skillicon)})),stats:stats[c.hero_id]||{},ratings:[],builds,source:`https://arena.rone.dev/api/heroes/${c.hero_id}`};
}).sort((a,b)=>a.name.localeCompare(b.name));
const ids=new Set(heroes.map(h=>h.id));for(const h of heroes)for(const key of ['strongAgainst','weakAgainst','synergies'])h[key]=[...new Set(h[key].filter(id=>ids.has(id)))];
// Normalization is not a refresh. Use the oldest input mtime until the importer
// supplies a complete retrieval manifest; never reset freshness on a rebuild.
const sourceFiles=['catalog','heroes',...['all','epic','legend','mythic','honor','glory'].map(r=>'rank-'+r)].map(n=>path.join(raw,n+'.json')).filter(f=>fs.existsSync(f));
const retrievedAt=new Date(Math.min(...sourceFiles.map(f=>fs.statSync(f).mtimeMs))).toISOString();
const snapshot={schemaVersion:1,id:'import-'+retrievedAt.slice(0,10),patch:null,patchVerified:false,patchSource:null,reviewedBy:null,observedAt:null,retrievedAt,source:'https://arena.rone.dev',sourceVersionRecord:records('version')[0]?.data?.game_version||null,status:'imported-unreviewed',region:'Not specified by provider',queue:'Not specified by provider',heroes,items,talents,spells};
validateSnapshot(snapshot);
fs.mkdirSync(path.join(root,'public'),{recursive:true});
fs.writeFileSync(path.join(root,'content/snapshot.json'),JSON.stringify(snapshot,null,2));
fs.writeFileSync(path.join(root,'public/snapshot.json'),JSON.stringify(snapshot));
fs.writeFileSync(path.join(root,'tgcloud/lib/snapshot.js'),'// Generated by scripts/normalize.mjs. Imported data is unreviewed.\nexport default '+JSON.stringify(snapshot)+';\n');
console.log(JSON.stringify({heroes:heroes.length,details:heroes.filter(h=>h.roles.length).length,builds:heroes.filter(h=>h.builds.length).length,completeBuilds:heroes.filter(h=>h.builds.some(b=>b.items.length===6)).length,bytes:JSON.stringify(snapshot).length}));
