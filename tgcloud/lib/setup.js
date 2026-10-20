// CLI-only operational module; never expose as a public endpoint.
import {api, db} from 'sdk';
import {MINI_APP_URL} from './config.js';
export default async function () {
  const me = await api.getMe({});
  if (MINI_APP_URL !== `https://app${me.id}.tgcloud.ai/`) throw new Error('Bot identity does not match configured Mini App URL.');
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('app_state','content_revisions','preferences')");
  if (tables.length !== 3) throw new Error('Database migrations are incomplete.');
  await api.setMyCommands({commands:[
    {command:'start',description:'Open your MLBB companion'},
    {command:'meta',description:'Explore hero statistics'},
    {command:'tier',description:'Overall and lane tier reviews'},
    {command:'hero',description:'Find a hero: /hero Miya'},
    {command:'build',description:'View builds: /build Miya'},
    {command:'counter',description:'Counter interactions: /counter Miya'},
    {command:'draft',description:'Draft suggestions: /draft gold'},
    {command:'favorites',description:'Your saved heroes'},
    {command:'settings',description:'Rank and lane preferences'},
    {command:'patch',description:'Content patch and review status'},
    {command:'privacy',description:'How preferences are stored'},
    {command:'delete_me',description:'Delete your saved preferences'},
    {command:'whoami',description:'Show your Telegram user ID'},
    {command:'help',description:'Commands and examples'}
  ]});
  await api.setChatMenuButton({menu_button:{type:'web_app',text:'MLBB Meta',web_app:{url:MINI_APP_URL}}});
  const commands = await api.getMyCommands({});
  const menu = await api.getChatMenuButton({});
  return {bot:me.username,url:MINI_APP_URL,databaseTables:tables.length,commands:commands.length,menuConfigured:menu.web_app?.url===MINI_APP_URL};
}
