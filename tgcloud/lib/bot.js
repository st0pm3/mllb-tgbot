import {api} from 'sdk';
import {getSnapshot,getPreferences,savePreferences,deleteUser} from './repository.js';
import {findHero,heroById,searchHeroes,tierList,statistics,getCounters,percent,recommendDraft,InputError,LANES,RANKS} from './domain.js';
import {MINI_APP_URL} from './config.js';
export const escapeHtml=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const btn=(text,data)=>({text,callback_data:data});
const home=()=>[[btn('Meta','meta'),btn('Tier lists','tier:all')],[btn('Heroes','heroes:0'),btn('Draft help','draft')],[btn('Saved','favorites'),btn('Settings','settings')]];
const app=()=>/^https:\/\/app\d+\.tgcloud\.ai\/?$/.test(MINI_APP_URL)?[[{text:'Open companion',web_app:{url:MINI_APP_URL}}]]:[];
const reply=(text,rows=home())=>({text,parse_mode:'HTML',reply_markup:{inline_keyboard:rows},link_preview_options:{is_disabled:true}});
const footer=d=>`\n\n<i>${escapeHtml(d.patchVerified?`Patch ${d.patch}`:'Patch unverified')} · Retrieved ${d.retrievedAt.slice(0,10)}</i>`;
export async function renderAction(action,userId){
 const d=await getSnapshot(),p=await getPreferences(userId),e=escapeHtml;
 const [kind,id,tab]=action.split(':');
 if(kind==='hero'){
  const h=heroById(d,id);if(!h)throw new InputError('Hero not found. Search again.');
  let text=`<b>${e(h.name)}</b> · ${h.lanes.join(' / ').toUpperCase()}\n`;
  if(tab==='build') text+='\n<b>Build library</b>\n'+(h.builds.length?h.builds.map(b=>`${e(b.title)} · ${e(b.lane)}\n${b.items.map(x=>e(d.items.find(i=>i.id===x)?.name||'Unknown item')).join(' → ')}\n${e(b.spell||'Spell pending')} · ${e(b.emblem||'Emblem pending')}\n${e(b.talents.join(' / '))}\n${b.reviewed?'Reviewed':`Unreviewed · patch ${e(b.patch||'unknown')}`}\n${e(b.reason)}`).join('\n\n'):'Build import/review pending for this hero.');
  else if(tab==='counter')text+='\n<b>Source-listed counters</b>\n'+(getCounters(d,h.id).map(c=>e(c.hero.name)).join(', ')||'No supported counter entries.')+'\nMechanisms and patch strength need review.';
  else {const s=h.stats[p.rank];text+=`\n${p.rank.toUpperCase()} · source 7-day window\nWin ${percent(s?.winRate)} · Pick ${percent(s?.pickRate)} · Ban ${percent(s?.banRate)}\n\nSample size and observation date unavailable. Current meta tier: pending review.`;if(h.skills.length)text+='\n\nSkills: '+h.skills.map(s=>e(s.name)).join(' · ');}
  return reply(text.slice(0,3400)+footer(d),[[btn('Overview',`hero:${h.id}`),btn('Builds',`hero:${h.id}:build`),btn('Counters',`hero:${h.id}:counter`)],[btn(p.favorites.includes(h.id)?'Remove saved':'Save hero',`favorite:${h.id}:${p.favorites.includes(h.id)?0:1}`),btn('Home','home')],...app()]);
 }
 if(kind==='favorite'){const h=heroById(d,id);if(!h)throw new InputError('Hero not found.');const add=tab==='1';if(add!==p.favorites.includes(h.id))await savePreferences(userId,{...p,favorites:add?[...p.favorites,h.id]:p.favorites.filter(x=>x!==h.id)});return renderAction(`hero:${h.id}`,userId);}
 if(kind==='meta'){const list=statistics(d,{rank:p.rank}).filter(h=>h.stats).slice(0,5);return reply(`<b>Meta desk</b>\nReviewed tiers are pending. Source statistics—not an editorial tier list:\n\n${list.map(h=>`${e(h.name)} · ${percent(h.stats.winRate)} WR`).join('\n')}\n\n${p.rank.toUpperCase()} · 7-day source window · sample sizes unavailable.${footer(d)}`,[...home(),...app()]);}
 if(kind==='tier'){const lane=id||'all',reviewed=tierList(d,{lane,rank:p.rank}).filter(g=>g.tier!=='Unranked'&&g.heroes.length);return reply(`<b>${e(lane.toUpperCase())} tiers · ${p.rank.toUpperCase()}</b>\n\n${reviewed.length?reviewed.map(g=>`<b>${g.tier}</b>: ${g.heroes.map(h=>e(h.name)).join(', ')}`).join('\n'):'No current reviewed tiers published. Use /meta for source statistics.'}${footer(d)}`,[[btn('Overall','tier:all'),...LANES.slice(0,2).map(l=>btn(l,`tier:${l}`))],[...LANES.slice(2).map(l=>btn(l,`tier:${l}`))],[btn('Home','home')]]);}
 if(kind==='heroes'||kind==='favorites'){
  const list=kind==='favorites'?d.heroes.filter(h=>p.favorites.includes(h.id)):searchHeroes(d);const page=Math.max(0,Math.min(Math.floor(Number(id)||0),Math.max(0,Math.ceil(list.length/10)-1)));
  const rows=list.slice(page*10,page*10+10).map(h=>[btn(h.name,`hero:${h.id}`)]);
  if(list.length>10)rows.push([...(page>0?[btn('Previous',`${kind}:${page-1}`)]:[]),...(list.length>(page+1)*10?[btn('Next',`${kind}:${page+1}`)]:[])]);
  return reply(`<b>${kind==='favorites'?'Saved heroes':'Hero directory'}</b>\n${list.length?`Page ${page+1}. Send a hero name to search.`:'No saved heroes yet.'}`,[...rows,[btn('Home','home')]]);
 }
 if(kind==='settings')return reply(`<b>Your settings</b>\nRank: ${p.rank}\nLane: ${p.lane}\n\nUse /settings mythic gold to change them.\nUse /privacy or /delete_me for your data.`,[[...RANKS.slice(0,3).map(r=>btn(r,`rank:${r}`))],[...RANKS.slice(3).map(r=>btn(r,`rank:${r}`))],[btn('Home','home')]]);
 if(kind==='rank'){if(!RANKS.includes(id))throw new InputError('Unknown rank.');await savePreferences(userId,{...p,rank:id});return renderAction('settings',userId);}
 if(kind==='draft')return reply('<b>Draft assistant</b>\nUse the Mini App, or:\n\n<code>/draft gold | Miya, Saber | Tigreal | Fanny</code>\n\nSections: your lane | enemies | allies | bans. Empty sections are allowed. Suggestions use unreviewed source interactions.',[...app(),[btn('Home','home')]]);
 if(kind==='delete')return reply('Delete your saved heroes, hero pool and settings?',[[btn('Delete my data','confirm_delete'),btn('Cancel','home')]]);
 if(kind==='confirm_delete'){await deleteUser(userId);return reply('Your saved settings and hero selections have been deleted.');}
 return reply('<b>MLBB Meta</b>\nYour next pick starts here.\n\nExplore heroes, source statistics, builds and draft interactions. Imported data and pending reviews are labeled.',[...home(),...app()]);
}
export async function handleMessage(message){
 if(!message.from?.id||typeof message.text!=='string')return;
 const uid=message.from.id,raw=message.text.trim().slice(0,500),[first,...rest]=raw.split(/\s+/),cmd=first.toLowerCase().split('@')[0],arg=rest.join(' ');let result;
 try{
  if(cmd==='/whoami')result=reply(`Your Telegram user ID: <code>${uid}</code>`);
  else if(cmd==='/privacy')result=reply('We store your Telegram user ID, rank/lane preferences and saved hero selections. No game login is required. /delete_me deletes these records. External images come from the game publisher.');
  else if(cmd==='/delete_me')result=await renderAction('delete',uid);
  else if(cmd==='/help')result=reply('Commands: /meta /tier /hero /build /counter /draft /favorites /settings /patch /privacy /delete_me\n\nSend a hero name to search. Example: /build Miya');
  else if(cmd==='/settings'&&arg){const [rank,lane='all']=arg.toLowerCase().split(' '),p=await getPreferences(uid);await savePreferences(uid,{...p,rank,lane});result=await renderAction('settings',uid);}
  else if(cmd==='/patch'){const d=await getSnapshot();result=reply(`Patch verification: ${d.patchVerified?escapeHtml(d.patch):'pending'}. The imported version endpoint reported ${escapeHtml(d.sourceVersionRecord||'no version')}; it is not treated as the current patch.`);}
  else if(cmd==='/draft'&&arg){
   const d=await getSnapshot(),p=await getPreferences(uid),[lane,enemies='',allies='',bans='']=arg.split('|').map(x=>x.trim());
   const parse=x=>x?x.split(',').map(n=>{const h=findHero(d,n.trim());if(!h)throw new InputError(`Unknown hero: ${n.trim()}`);return h.id;}):[];
   const r=recommendDraft(d,{lane:lane.toLowerCase(),rank:p.rank,enemies:parse(enemies),allies:parse(allies),bans:parse(bans),pool:p.pool});result=reply('<b>Draft suggestions</b>\n\n'+r.recommendations.map(x=>`<b>${escapeHtml(x.hero.name)}</b>\n${x.reasons.map(escapeHtml).join('\n')}\nRisk: ${escapeHtml(x.risks[0]||'Review team context.')}`).join('\n\n')+'\n\n'+escapeHtml(r.warnings.join(' ')));
  }else if(['/hero','/build','/counter'].includes(cmd)||!cmd.startsWith('/')){
   const d=await getSnapshot(),q=cmd.startsWith('/')?arg:raw,h=findHero(d,q);
   result=h?await renderAction(`hero:${h.id}:${cmd==='/build'?'build':cmd==='/counter'?'counter':''}`,uid):reply('Choose a hero, or send its full English name:',searchHeroes(d,q).slice(0,10).map(h=>[btn(h.name,`hero:${h.id}`)]));
  }else result=await renderAction(({'/start':'home','/meta':'meta','/tier':`tier:${arg.toLowerCase()||'all'}`,'/draft':'draft','/favorites':'favorites','/settings':'settings'})[cmd]||'home',uid);
 }catch(e){if(e instanceof InputError)result=reply(escapeHtml(e.message));else throw e;}
 if(message.chat.type!=='private')result.reply_markup.inline_keyboard=result.reply_markup.inline_keyboard.filter(row=>row.every(b=>!b.web_app));
 await api.sendMessage({chat_id:message.chat.id,...result});
}
