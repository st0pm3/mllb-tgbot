import {api} from 'sdk';
import {renderAction,escapeHtml} from '../lib/bot.js';
import {InputError} from '../lib/domain.js';
export default async function(q){
 await api.answerCallbackQuery({callback_query_id:q.id});
 if(!q.from?.id||!q.message?.chat||typeof q.data!=='string'||q.data.length>64)return;
 if(q.message.chat.type!=='private'){await api.sendMessage({chat_id:q.message.chat.id,text:'Open a private chat with the bot to use interactive menus.'});return;}
 try{await api.editMessageText({chat_id:q.message.chat.id,message_id:q.message.message_id,...await renderAction(q.data,q.from.id)});}
 catch(e){if(e.code===400&&String(e.description).includes('message is not modified'))return;if(e instanceof InputError){await api.sendMessage({chat_id:q.message.chat.id,text:escapeHtml(e.message),parse_mode:'HTML'});return;}throw e;}
}
