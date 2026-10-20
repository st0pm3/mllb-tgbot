import React, {useState} from 'react';
import {LANES,RANKS,TIERS} from '../tgcloud/lib/domain.js';
import {validateSnapshot} from '../tgcloud/lib/validation.js';

const KEY='mlbb-editor-draft-v1';
export function ReviewEditor({snapshot,onReady}:any){
 const [draft,setDraft]=useState<any>(()=>structuredClone(snapshot));
 const [heroId,setHeroId]=useState(snapshot.heroes[0].id);
 const [message,setMessage]=useState('');
 const [rating,setRating]=useState<any>({lane:'all',rank:'mythic',tier:'A',reason:'',reviewed:false});
 const [build,setBuild]=useState<any>({title:'',lane:'gold',items:[],spell:'',emblem:'',talents:'',reason:'',source:'',reviewed:false});
 const hero=draft.heroes.find(h=>h.id===heroId);
 function metadata(key:string,value:any){setDraft(d=>({...d,[key]:value}));}
 function attempt(fn:()=>void){try{fn();}catch(e){setMessage(e.message);}}
 function updateHero(next:any){const candidate={...draft,heroes:draft.heroes.map(h=>h.id===heroId?next:h)};validateSnapshot(candidate);setDraft(candidate);setMessage('Hero changes added to draft. Save or export to keep them.');}
 function context(){if(!draft.patch?.trim()||!draft.reviewedBy?.trim())throw new Error('Enter a patch and reviewer first.');return {patch:draft.patch.trim(),reviewer:draft.reviewedBy.trim()};}
 function exportDraft(){validateSnapshot(draft);const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${draft.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="editor"><hr/><h3>Hero review editor</h3><p>Changes stay in this workspace until exported or explicitly staged by an administrator. Review each entry against its patch before marking it reviewed.</p>
 <div className="editor-grid">
  <label>New revision ID<input value={draft.id} onChange={e=>metadata('id',e.target.value)}/></label>
  <label>Patch<input value={draft.patch||''} onChange={e=>metadata('patch',e.target.value)}/></label>
  <label>Reviewer<input value={draft.reviewedBy||''} onChange={e=>metadata('reviewedBy',e.target.value)}/></label>
  <label>Patch source URL<input type="url" value={draft.patchSource||''} onChange={e=>metadata('patchSource',e.target.value)}/></label>
 </div>
 <label className="checkbox"><input type="checkbox" checked={draft.patchVerified} onChange={e=>metadata('patchVerified',e.target.checked)}/> I verified this patch against the linked source</label>
 <label>Hero<select value={heroId} onChange={e=>{setHeroId(Number(e.target.value));setBuild({title:'',lane:'gold',items:[],spell:'',emblem:'',talents:'',reason:'',source:'',reviewed:false});setRating({lane:'all',rank:'mythic',tier:'A',reason:'',reviewed:false});setMessage('');}}>{draft.heroes.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
 <h4>{hero.name}: tier assessment</h4><div className="editor-grid">
 {Object.entries({lane:['all',...LANES],rank:RANKS,tier:TIERS.filter(t=>t!=='Unranked')}).map(([key,values])=><label key={key}>{key}<select value={rating[key]} onChange={e=>setRating({...rating,[key]:e.target.value})}>{values.map(v=><option key={v}>{v}</option>)}</select></label>)}
 </div><label>Why this tier?<textarea value={rating.reason} onChange={e=>setRating({...rating,reason:e.target.value})}/></label>
 <label className="checkbox"><input type="checkbox" checked={rating.reviewed} onChange={e=>setRating({...rating,reviewed:e.target.checked})}/> Assessment reviewed for this patch</label>
 <button className="secondary" onClick={()=>attempt(()=>{const r={...rating,...context()};updateHero({...hero,ratings:[...hero.ratings.filter(x=>!(x.patch===r.patch&&x.rank===r.rank&&x.lane===r.lane)),r]});})}>Save tier assessment</button>
 {hero.ratings.map((r,i)=><div className="revision" key={i}><span>{r.patch} · {r.lane} · {r.rank} · {r.tier} · {r.reviewed?'Reviewed':'Draft'}</span><button onClick={()=>{setRating({...r});metadata('patch',r.patch);}}>Edit</button><button onClick={()=>attempt(()=>updateHero({...hero,ratings:hero.ratings.filter((_,j)=>i!==j)}))}>Remove</button></div>)}
 <h4>{hero.name}: build</h4><div className="editor-grid"><label>Title<input value={build.title} onChange={e=>setBuild({...build,title:e.target.value})}/></label><label>Lane<select value={build.lane} onChange={e=>setBuild({...build,lane:e.target.value})}>{LANES.map(l=><option key={l}>{l}</option>)}</select></label>
 {Array.from({length:6},(_,i)=><label key={i}>Item {i+1}<select value={build.items[i]||''} onChange={e=>{const items=[...build.items];items[i]=Number(e.target.value);setBuild({...build,items});}}><option value="">Choose item</option>{draft.items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>)}
 <label>Battle spell<input value={build.spell} onChange={e=>setBuild({...build,spell:e.target.value})}/></label><label>Emblem<input value={build.emblem} onChange={e=>setBuild({...build,emblem:e.target.value})}/></label></div>
 <label>Three talents, separated by commas<input value={build.talents} onChange={e=>setBuild({...build,talents:e.target.value})}/></label><label>Reason and use conditions<textarea value={build.reason} onChange={e=>setBuild({...build,reason:e.target.value})}/></label><label>Build source URL<input type="url" value={build.source} onChange={e=>setBuild({...build,source:e.target.value})}/></label><label className="checkbox"><input type="checkbox" checked={build.reviewed} onChange={e=>setBuild({...build,reviewed:e.target.checked})}/> Build reviewed for this patch</label>
 <button className="secondary" onClick={()=>attempt(()=>{if(!build.title.trim())throw new Error('Give the build a title.');const b={...build,...context(),id:build.id||`editor-${heroId}-${Date.now()}`,kind:'editorial',items:build.items.filter(Boolean),talents:build.talents.split(',').map(t=>t.trim()).filter(Boolean),swaps:build.swaps||[]};updateHero({...hero,builds:[...hero.builds.filter(x=>x.id!==b.id),b]});})}>Save build</button>
 {hero.builds.map((b,i)=><div className="revision" key={b.id}><span>{b.title} · {b.items.length} items · {b.reviewed?'Reviewed':'Draft'}</span><button onClick={()=>setBuild({...b,talents:b.talents.join(', ')})}>Edit</button><button onClick={()=>attempt(()=>updateHero({...hero,builds:hero.builds.filter((_,j)=>j!==i)}))}>Remove</button></div>)}
 <div className="editor-actions"><button className="secondary" onClick={()=>attempt(()=>{validateSnapshot(draft);localStorage.setItem(KEY,JSON.stringify(draft));setMessage('Draft saved on this device.');})}>Save on device</button><button className="secondary" onClick={()=>attempt(()=>{const saved=localStorage.getItem(KEY);if(!saved)throw new Error('No saved draft on this device.');const value=validateSnapshot(JSON.parse(saved));setDraft(value);setHeroId(value.heroes[0].id);setMessage('Saved draft restored.');})}>Restore saved draft</button><button className="secondary" onClick={()=>attempt(exportDraft)}>Export JSON</button><button className="secondary" onClick={()=>attempt(()=>{validateSnapshot(draft);if(draft.id===snapshot.id)throw new Error('Choose a new revision ID before preparing a revision.');onReady(structuredClone(draft));setMessage('Draft prepared for staging. Nothing has been published.');})}>Prepare revision</button></div><p role="status">{message}</p>
 </section>;
}
