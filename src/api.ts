import {DEFAULT_PREFS,validatePreferences} from '../tgcloud/lib/domain.js';
declare global {interface Window {Telegram?:any}}
export const tg=window.Telegram?.WebApp;
export const isTelegram=Boolean(tg?.initData);
export function rpc<T=any>(name:string,input:object={}):Promise<T>{
 return new Promise((resolve,reject)=>{
  if(!tg?.Serverless?.call)return reject(new Error('Update Telegram to use Serverless, or open this Mini App from its bot.'));
  const timer=setTimeout(()=>reject(new Error('Request timed out. Please try again.')),15000);
  tg.Serverless.call(name,input,(err:any,result:T)=>{clearTimeout(timer);err?reject(new Error(err.message||'Request failed.')):resolve(result);});
 });
}
const key='mlbb-meta-preferences-v1';
export async function bootstrap(){
 if(isTelegram)return rpc('getCatalog');
 const response=await fetch('/snapshot.json');if(!response.ok)throw new Error('Could not load the bundled catalog.');
 const snapshot=await response.json();let preferences={...DEFAULT_PREFS};
 try{const p=JSON.parse(localStorage.getItem(key)||'null');if(p)preferences=validatePreferences(snapshot,{...preferences,...p});}catch{}
 return {snapshot,preferences,isAdmin:false};
}
export async function persist(preferences:any){
 if(isTelegram)return rpc('savePreferences',preferences);
 const next={...preferences,version:preferences.version+1};localStorage.setItem(key,JSON.stringify(next));return next;
}
export async function erase(){if(isTelegram)await rpc('deleteUser',{confirm:true});else localStorage.removeItem(key);}
