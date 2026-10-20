import {EndpointError} from 'sdk';
import * as repo from './repository.js';
import {heroById,searchHeroes,tierList,getCounters,recommendDraft,coverage,freshness,InputError,requireValue} from './domain.js';
import {ADMIN_IDS} from './config.js';
export async function handle(action,input={},ctx={}){
  try{
    const userId=ctx.initData?.user?.id;repo.assertUser(userId);
    if(action==='getPreferences')return await repo.getPreferences(userId);
    if(action==='savePreferences')return await repo.savePreferences(userId,input);
    if(action==='deleteUser'){requireValue(input.confirm===true,'Confirm deletion.');return await repo.deleteUser(userId);}
    if(action==='listRevisions')return await repo.listRevisions(userId);
    if(action==='stageRevision')return await repo.stageRevision(userId,input.snapshot);
    if(action==='publishRevision')return await repo.publishRevision(userId,input);
    const data=await repo.getSnapshot();
    if(action==='getCatalog')return {snapshot:data,preferences:await repo.getPreferences(userId),isAdmin:ADMIN_IDS.includes(userId),coverage:coverage(data),freshness:freshness(data)};
    if(action==='listHeroes')return searchHeroes(data,input.query,input.lane);
    if(action==='getHero'){const hero=heroById(data,input.id);requireValue(hero,'Hero not found.');return {hero,revision:data.id,patch:data.patch};}
    if(action==='getTierList')return tierList(data,input);
    if(action==='getCounters')return getCounters(data,input.id,input.lane,input.pool);
    if(action==='recommendDraft')return recommendDraft(data,input);
    throw new InputError('Unknown action.');
  }catch(e){if(e instanceof InputError)throw new EndpointError(e.message,{code:e.code});throw e;}
}
