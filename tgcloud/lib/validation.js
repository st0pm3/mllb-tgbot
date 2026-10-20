import {LANES,RANKS,TIERS,requireValue} from './domain.js';

export function validateSnapshot(data, {publish = false} = {}) {
  requireValue(data && typeof data==='object' && data.schemaVersion===1,'Unsupported snapshot schema.');
  requireValue(typeof data.id==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(data.id),'Invalid revision ID.');
  requireValue(typeof data.retrievedAt==='string' && Number.isFinite(Date.parse(data.retrievedAt)),'Missing retrieval date.');
  requireValue(Array.isArray(data.heroes)&&data.heroes.length>0&&data.heroes.length<500,'Invalid roster.');
  requireValue(JSON.stringify(data).length<=1500000,'Snapshot exceeds the application import limit.');
  const ids = new Set(data.heroes.map(h=>h.id));
  requireValue(ids.size===data.heroes.length,'Duplicate hero IDs.');
  const itemIds = new Set((data.items||[]).map(i=>i.id));
  requireValue(Array.isArray(data.items)&&Array.isArray(data.talents)&&Array.isArray(data.spells),'Missing item, spell or talent catalogs.');
  const safeUrl=value=>typeof value==='string'&&/^https:\/\/[^\s<>"']+$/.test(value);
  const optionalUrl=value=>value===''||value==null||safeUrl(value);
  requireValue(safeUrl(data.source)&&typeof data.patchVerified==='boolean','Invalid source metadata.');
  for(const item of [...data.items,...data.talents,...data.spells])requireValue(Number.isInteger(item.id)&&typeof item.name==='string'&&optionalUrl(item.image),'Invalid catalog entry.');
  for(const h of data.heroes) {
    requireValue(Number.isInteger(h.id)&&h.id>0&&typeof h.name==='string'&&h.name.length>0&&h.name.length<80,'Invalid hero.');
    for(const key of ['roles','lanes','aliases','builds','ratings','strongAgainst','weakAgainst','synergies']) requireValue(Array.isArray(h[key]),`Missing ${key} for ${h.name}.`);
    requireValue(Array.isArray(h.skills)&&h.roles.every(r=>typeof r==='string')&&h.aliases.every(a=>typeof a==='string')&&safeUrl(h.source)&&[h.image,h.portrait,h.splash].every(optionalUrl),`Invalid hero content for ${h.name}.`);
    requireValue(h.lanes.every(l=>LANES.includes(l)),`Invalid lane for ${h.name}.`);
    for(const key of ['strongAgainst','weakAgainst','synergies']) requireValue(h[key].every(id=>ids.has(id)&&id!==h.id),`Invalid ${key} reference for ${h.name}.`);
    for(const b of h.builds) {
      requireValue(Array.isArray(b.items)&&b.items.length>0&&b.items.length<=6&&b.items.every(id=>itemIds.has(id)),`Invalid build item for ${h.name}.`);
      requireValue(LANES.includes(b.lane)&&typeof b.reviewed==='boolean',`Invalid build context for ${h.name}.`);
      requireValue(safeUrl(b.source)&&Array.isArray(b.talents)&&b.talents.every(t=>typeof t==='string')&&typeof b.reason==='string',`Invalid build content for ${h.name}.`);
      if(b.reviewed) requireValue(b.items.length===6&&new Set(b.items).size===6&&b.patch===data.patch&&b.reason&&b.reviewer&&b.spell&&b.emblem&&b.talents?.length===3,`Reviewed build incomplete for ${h.name}.`);
      for(const swap of b.swaps||[]) requireValue(itemIds.has(swap.remove)&&itemIds.has(swap.add)&&b.items.includes(swap.remove)&&typeof swap.when==='string'&&swap.when.length>0,`Invalid swap for ${h.name}.`);
    }
    const ratingKeys = new Set();
    for(const r of h.ratings) {
      const key = JSON.stringify([r.patch,r.lane,r.rank]);
      requireValue(!ratingKeys.has(key),`Duplicate rating for ${h.name}.`);ratingKeys.add(key);
      requireValue(typeof r.reviewed==='boolean'&&TIERS.includes(r.tier)&&(r.lane==='all'||LANES.includes(r.lane))&&RANKS.includes(r.rank)&&typeof r.reason==='string'&&r.reason.trim()&&typeof r.patch==='string'&&r.patch.trim()&&(!r.reviewed||(typeof r.reviewer==='string'&&r.reviewer.trim())),`Invalid rating for ${h.name}.`);
    }
    for(const [rank,s] of Object.entries(h.stats||{})) {
      requireValue(RANKS.includes(rank),'Invalid statistics rank.');
      for(const key of ['winRate','pickRate','banRate']) requireValue(s[key]===null || (Number.isFinite(s[key])&&s[key]>=0&&s[key]<=1),`Invalid ${key} for ${h.name}.`);
    }
  }
  if(publish) requireValue(data.patchVerified===true&&typeof data.patch==='string'&&data.patch&&typeof data.reviewedBy==='string'&&data.reviewedBy.length>0&&safeUrl(data.patchSource),'Confirm patch and reviewer before publishing.');
  return data;
}
