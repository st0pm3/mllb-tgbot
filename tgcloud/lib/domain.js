export const LANES = ['exp', 'gold', 'mid', 'jungle', 'roam'];
export const RANKS = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];
export const TIERS = ['S+', 'S', 'A', 'B', 'C', 'Unranked'];
export const DEFAULT_PREFS = { rank: 'mythic', lane: 'all', favorites: [], pool: [], version: 0 };
export const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
export class InputError extends Error { constructor(message, code = 'INVALID_INPUT') { super(message); this.code = code; } }
export function requireValue(condition, message) { if (!condition) throw new InputError(message); }
export function heroById(data, id) { return data.heroes.find(h => h.id === Number(id)); }
export function findHero(data, query) {
  const key = normalize(query);
  return data.heroes.find(h => String(h.id) === String(query) || [h.name, ...(h.aliases || [])].some(n => normalize(n) === key));
}
export function searchHeroes(data, query = '', lane = 'all') {
  requireValue(typeof query === 'string' && query.length <= 80, 'Search is too long.');
  requireValue(lane === 'all' || LANES.includes(lane), 'Choose a supported lane.');
  const key = normalize(query);
  return data.heroes.filter(h => (lane === 'all' || h.lanes.includes(lane)) && (!key || [h.name, ...(h.aliases || [])].some(n => normalize(n).includes(key)))).sort((a,b) => a.name.localeCompare(b.name));
}
export function getTier(hero, lane, rank, patch) {
  const rating = (hero.ratings || []).find(r => r.lane === lane && r.rank === rank && r.patch === patch && r.reviewed);
  return rating || { tier: 'Unranked', reason: 'Current patch review pending.', reviewed: false };
}
export function tierList(data, { lane = 'all', rank = 'mythic', query = '' } = {}) {
  requireValue(RANKS.includes(rank), 'Choose a supported rank.');
  const heroes = searchHeroes(data, query, lane);
  return TIERS.map(tier => ({tier, heroes: heroes.filter(h => getTier(h,lane,rank,data.patch).tier === tier)}));
}
export function statistics(data, {lane = 'all', rank = 'mythic', sort = 'winRate', query = ''} = {}) {
  requireValue(RANKS.includes(rank), 'Choose a supported rank.');
  requireValue(['winRate','pickRate','banRate'].includes(sort), 'Invalid statistic.');
  return searchHeroes(data,query,lane).map(h => ({...h, stats:h.stats?.[rank] || null})).sort((a,b) => (b.stats?.[sort] ?? -1) - (a.stats?.[sort] ?? -1));
}
export function freshness(data, now = Date.now()) {
  const sourceDate = Date.parse(data.observedAt || '');
  const fetched = Date.parse(data.retrievedAt || '');
  return { stale: !Number.isFinite(fetched) || now - fetched > 48*3600000, sourceAgeKnown: Number.isFinite(sourceDate), patchVerified: Boolean(data.patchVerified), label: !data.patchVerified ? 'Patch unverified' : !Number.isFinite(fetched) || now - fetched > 48*3600000 ? 'Refresh needed' : 'Snapshot available' };
}
export function validateDraft(data, input = {}) {
  requireValue(input && typeof input === 'object', 'Invalid draft.');
  const {lane = 'all', rank = 'mythic', enemies = [], allies = [], bans = [], pool = [], restrictPool = false} = input;
  requireValue(LANES.includes(lane), 'Choose your lane first.');
  requireValue(RANKS.includes(rank), 'Choose a supported rank.');
  for (const [name,ids,limit] of [['enemies',enemies,5],['allies',allies,4],['bans',bans,20],['pool',pool,200]]) {
    requireValue(Array.isArray(ids) && ids.length <= limit && ids.every(id => Number.isInteger(id) && heroById(data,id)), `Invalid ${name}.`);
    requireValue(new Set(ids).size === ids.length, `Duplicate hero in ${name}.`);
  }
  const occupied = [...enemies,...allies,...bans];
  requireValue(new Set(occupied).size === occupied.length, 'A hero cannot occupy more than one draft slot.');
  requireValue(typeof restrictPool === 'boolean', 'Invalid pool setting.');
  return {lane,rank,enemies,allies,bans,pool,restrictPool};
}
export function recommendDraft(data, input) {
  const draft = validateDraft(data,input);
  const excluded = new Set([...draft.enemies,...draft.allies,...draft.bans]);
  const allies = draft.allies.map(id => heroById(data,id));
  const hasFrontline = allies.some(h => h.roles.some(r => ['Tank','Fighter'].includes(r)));
  const rolesKnown = allies.every(h => h.roles.length > 0);
  const hasMagic = allies.some(h => h.roles.includes('Mage'));
  const candidates = data.heroes.filter(h => h.lanes.includes(draft.lane) && !excluded.has(h.id) && (!draft.restrictPool || draft.pool.includes(h.id)));
  const ranked = candidates.map(hero => {
    let score = 0; const reasons = [], risks = []; let evidence = 0;
    const rating = getTier(hero,draft.lane,draft.rank,data.patch);
    if (rating.reviewed) {score += ({'S+':30,S:25,A:20,B:12,C:5}[rating.tier] || 0); reasons.push(`${rating.tier} reviewed ${draft.lane} tier`); evidence++;}
    else risks.push('Current patch tier has not been reviewed.');
    for (const id of draft.enemies) {
      const enemy = heroById(data,id);
      // Directed source relationships, never derived from hero-wide win rates.
      const advantage = hero.strongAgainst.includes(id) || enemy.weakAgainst.includes(hero.id);
      const disadvantage = hero.weakAgainst.includes(id) || enemy.strongAgainst.includes(hero.id);
      if (advantage && disadvantage) {risks.push(`Conflicting source relationships for ${enemy.name}; no matchup bonus applied.`);}
      if (advantage && !disadvantage) {score += 12; evidence++; reasons.push(`Source lists a favorable interaction with ${enemy.name}.`);}
      if (disadvantage && !advantage) {score -= 15; risks.push(`Source lists ${enemy.name} as a threat.`);}
    }
    const assists = allies.filter(a => hero.synergies.includes(a.id) || a.synergies.includes(hero.id));
    if (assists.length) {score += assists.length*5; evidence++; reasons.push(`Listed synergy with ${assists.map(a=>a.name).join(', ')}.`);}
    if (draft.allies.length && rolesKnown && !hasFrontline && hero.roles.some(r => ['Tank','Fighter'].includes(r))) {score += 5; reasons.push('Adds a potential frontline option.');}
    if (draft.allies.length && rolesKnown && !hasMagic && hero.roles.includes('Mage')) {score += 4; reasons.push('Adds a mage to your composition.');}
    if (draft.pool.includes(hero.id)) {score += 4; reasons.push('In your comfortable hero pool.');}
    if (!reasons.length) reasons.push(`Catalog lists ${hero.name} in ${draft.lane}.`);
    if (!evidence) risks.push('Insufficient matchup evidence; this is only a role-fit option.');
    return {hero,score,reasons,risks,evidence,status:rating.reviewed ? 'Reviewed tier + source interactions' : 'Provisional source-based suggestion'};
  });
  ranked.sort((a,b)=>b.score-a.score || a.hero.name.localeCompare(b.hero.name));
  return { recommendations:ranked.slice(0,3), warnings:['These are heuristic draft suggestions, not win probabilities. Source matchup relationships need current-patch review.', ...(!data.patchVerified ? ['The source patch could not be verified.'] : []), ...(!candidates.length ? ['No eligible heroes. Broaden your pool or choose another lane.'] : [])] };
}
export function getCounters(data, enemyId, lane = 'all', pool = null) {
  const enemy = heroById(data,enemyId); requireValue(enemy,'Hero not found.');
  requireValue(lane === 'all' || LANES.includes(lane),'Invalid lane.');
  return data.heroes.filter(h => h.id !== enemy.id && (lane === 'all' || h.lanes.includes(lane)) && (!pool || pool.includes(h.id)) && (enemy.weakAgainst.includes(h.id) || h.strongAgainst.includes(enemy.id))).map(hero => ({hero, conflict: hero.weakAgainst.includes(enemy.id) || enemy.strongAgainst.includes(hero.id), reason:`The source catalog lists ${hero.name} as a counter interaction for ${enemy.name}.`, caveat:'Mechanism and current-patch strength still need editorial review.'}));
}
export function validatePreferences(data, input) {
  requireValue(input && typeof input === 'object','Invalid preferences.');
  const {rank,lane,favorites,pool,version} = input;
  requireValue(RANKS.includes(rank) && (lane==='all'||LANES.includes(lane)),'Invalid rank or lane.');
  requireValue(Number.isInteger(version)&&version>=0,'Invalid preference version.');
  for (const ids of [favorites,pool]) requireValue(Array.isArray(ids)&&ids.length<=200&&new Set(ids).size===ids.length&&ids.every(id=>Number.isInteger(id)&&heroById(data,id)),'Invalid hero selection.');
  return {rank,lane,favorites,pool,version};
}
export function coverage(data) {
  const h=data.heroes;
  return { heroes:h.length, details:h.filter(x=>x.roles.length).length, withBuilds:h.filter(x=>x.builds.length).length, fullBuilds:h.filter(x=>x.builds.some(b=>b.items.length===6)).length, reviewed:h.filter(x=>x.ratings.some(r=>r.reviewed&&r.patch===data.patch)).length, counters:h.filter(x=>x.weakAgainst.length).length };
}
