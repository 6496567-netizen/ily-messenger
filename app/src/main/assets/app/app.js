'use strict';
var NL = String.fromCharCode(10), SQ = String.fromCharCode(39);
var NLRE = new RegExp('[' + String.fromCharCode(13) + NL + ']+', 'g');
function $(i){return document.getElementById(i);}
function esc(s){var t=String(s==null?'':s);t=t.split('&').join('&amp;');t=t.split('<').join('&lt;');t=t.split('>').join('&gt;');t=t.split('"').join('&quot;');t=t.split(SQ).join('&#39;');return t;}
function br(s){return esc(s).replace(NLRE,'<br>');}
function cut(s,n){s=String(s==null?'':s);return s.length>n?s.slice(0,n)+'…':s;}
function num(n){return Number(n||0).toLocaleString('ru-RU');}
function pd(d){if(!d)return null;var t=new Date(String(d).replace(' ','T'));return isNaN(t)?null:t;}
function tm(d){var t=pd(d);if(!t)return '';var s=(Date.now()-t.getTime())/1000;if(s<60)return 'сейчас';if(s<3600)return Math.floor(s/60)+' мин';if(s<86400)return t.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});return t.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'});}
function toast(m,k){var n=document.createElement('div');n.className='toast '+(k||'');n.textContent=m;$('toasts').appendChild(n);setTimeout(function(){n.remove();},4200);}
function grow(e){e.style.height='auto';e.style.height=Math.min(100,e.scrollHeight)+'px';}

/* ---------- МОСТ ---------- */
var CB={},CN=0,HAS=false;
window.__ilyResolve=function(id,d){var f=CB[id];delete CB[id];if(f)f(d);};
function api(a,p){
return new Promise(function(res){
if(!HAS){res({success:false,message:'Мост приложения недоступен'});return;}
var id='c'+(++CN),done=false;
CB[id]=function(d){if(done)return;done=true;res(d||{success:false,message:'Пустой ответ'});};
setTimeout(function(){if(done)return;done=true;delete CB[id];res({success:false,message:'Сервер не ответил вовремя'});},32000);
try{ILY.call(id,a,JSON.stringify(p||{}));}catch(e){done=true;res({success:false,message:'Ошибка моста'});}
});
}
function nat(){return window.ILY||null;}
function nstate(){try{return JSON.parse(ILY.state());}catch(e){return {};}}

/* ---------- СОСТОЯНИЕ ---------- */
var me=null,uid='',token='',tabCur='chats',cur=null,last=0,pollT=null,listT=null;
var dialogs=[],feed=[],contacts={members:[],guests:[]},spaces=[],invites=[];
var cmt={},reply={},rx={},queue=[];
var RX=[['like','👍','Нравится'],['love','❤️','Супер'],['haha','😆','Ха-ха'],['wow','😮','Ух ты'],['sad','😢','Сочувствую'],['fire','🔥','Огонь'],['clap','👏','Браво'],['pray','🙏','Благодарю']];
var EMO='😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😜 🤗 🤔 😐 😏 🙄 😌 😔 😴 😷 🥳 😎 🤓 😮 😲 😳 🥺 😢 😭 😱 😞 😩 😤 😡 🤬 💀 🤡 👻 🤖 👍 👎 👌 ✌️ 🤞 🤘 🤙 👈 👉 👆 👇 ✋ 👋 🤝 🙏 💪 👏 🙌 👐 👊 ✊ ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💕 💞 💓 💗 💖 💘 💝 💋 🌹 🌺 🌸 💐 💌 💍 💯 💥 💫 🌿 🌱 🌳 🌴 🍀 🍁 🌼 🌻 🌙 🌕 ⭐ 🌟 ✨ 🔥 ☀️ 🌊 🕊️ 🦋 🐍 🦁 🐘 🦅 🐢 🌋 🏝 🌅 🌌 🔮 🕯️ 🗝️ ⚖️ ♟️ 👑 🛡️ 🏺 📿 🧿 🪶 🥁 🪘 🎭 🎨 🎵 🎶 🎉 🎊 🎁 🏆 🥇 ✅ ❌ ❓ ❗ 💎 🪙 💰 📜 🧭 🚪 🏠 ☕ 🍷 🥂 🍯 🍚 🌶️ 🥥 🍇 🍎 🐚 🪄 🧘 💃 🕺'.split(' ');
try{queue=JSON.parse(localStorage.getItem('ily_q')||'[]');}catch(e){queue=[];}

/* ---------- СТАРТ ---------- */
window.ilyNativeReady=function(){
HAS=!!nat();
var st=nstate();
if(st.theme==='light')document.body.classList.add('light');
buildPal();buildEp();
var inv=new URLSearchParams(location.search).get('i')||localStorage.getItem('ily_inv')||'';
if(inv)localStorage.setItem('ily_inv',inv);
token=st.token||localStorage.getItem('ily_token')||'';
uid=st.uid||'';
if(token){boot();}else{$('gate').classList.remove('hide');}
addEventListener('online',function(){$('off').classList.remove('on');flush();});
addEventListener('offline',function(){$('off').classList.add('on');});
};
window.ilyHome=function(){closeChat();tab('chats');};
window.ilyTab=function(t){closeChat();tab(t);};
window.ilyProfile=profile;
window.ilyTheme=function(){
var l=document.body.classList.toggle('light');
try{ILY.theme(l?'light':'night');}catch(e){}
toast(l?'☀️ Светлая тема':'🌌 Тёмная тема');
};
window.ilyLogout=function(){token='';uid='';me=null;localStorage.removeItem('ily_token');$('app').classList.add('hide');$('gate').classList.remove('hide');};
window.ilyInvite=function(){tab('contacts');importContacts();};
window.ilyNotifyState=function(){toast('🔔 Состояние уведомлений обновлено');};
window.ilyRoute=function(h){
h=String(h||'');
if(h.indexOf('chat=')===0){var id=Number(h.slice(5));tab('chats');setTimeout(function(){openById(id);},600);return;}
if(h.indexOf('call=')===0){callIncoming(h.slice(5));return;}
if(h==='feed'){tab('feed');return;}
if(h==='contacts'){tab('contacts');return;}
tab('chats');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){if(!HAS&&window.ilyNativeReady)window.ilyNativeReady();},1200);});
else setTimeout(function(){if(!HAS&&window.ilyNativeReady)window.ilyNativeReady();},1200);

async function doLogin(){
var l=$('lg').value.trim(),p=$('pw').value;
if(!l||!p){toast('Введите логин и пароль','warn');return;}
$('lgb').disabled=true;$('lgb').textContent='⏳ Входим…';
var inv=localStorage.getItem('ily_inv')||'';
var r=await api('messenger_login',{email:l,password:p,invite:inv});
$('lgb').disabled=false;$('lgb').textContent='🔓 Войти';
if(!r.success){toast('❌ '+r.message,'err');return;}
token=r.data.token;uid=String(r.data.user_id||r.data.club_user.id);me=r.data.me;
localStorage.setItem('ily_token',token);localStorage.removeItem('ily_inv');
try{ILY.session(token,uid,(r.data.club_user&&r.data.club_user.name)||'',(r.data.club_user&&r.data.club_user.avatar)||'');}catch(e){}
toast('🌿 Добро пожаловать!','ok');
boot();
}
async function boot(){
var c=await api('messenger_config',{});
if(c.success&&c.data&&c.data.me){me=c.data.me;uid=String(me.club_id||uid);}
$('gate').classList.add('hide');$('app').classList.remove('hide');
try{ILY.session(token,uid,(me&&me.name)||'',(me&&me.avatar)||'');}catch(e){}
tab('chats');
clearInterval(listT);
listT=setInterval(function(){if(document.hidden)return;badges();if(tabCur==='chats'&&!cur)loadDialogs(true);},15000);
badges();flush();
}
async function badges(){
var r=await api('messenger_badges',{});
if(!r.success)return;
var n=Number(r.data.unread)||0;
var b=$('nCh');b.textContent=n>99?'99+':n;b.classList.toggle('hide',n===0);
try{ILY.badge(n);}catch(e){}
}

/* ---------- ВКЛАДКИ ---------- */
function tab(t){
tabCur=t;
['chats','contacts','feed','spaces'].forEach(function(x){
var b=$('t'+x.charAt(0).toUpperCase()+x.slice(1));if(b)b.classList.toggle('on',x===t);
});
closeChat(true);
$('pane').classList.remove('hide');
if(t==='chats')loadDialogs();
else if(t==='contacts')loadContacts();
else if(t==='feed')loadFeed();
else loadSpaces();
}
function pane(h){$('pane').innerHTML=h;}
function loading(t){pane('<div class="load"><span class="spin"></span> '+esc(t||'Загрузка…')+'</div>');}

/* ---------- ЧАТЫ ---------- */
async function loadDialogs(silent){
if(!silent)loading('Открываем чаты…');
var r=await api('messenger_dialogs',{});
if(!r.success){pane('<div class="note bad"><span>⚠️</span><div>'+esc(r.message)+'</div></div>');return;}
dialogs=r.data||[];
if(!dialogs.length){pane('<div class="empty"><span class="i">💬</span><h3>Чатов пока нет</h3><p>Откройте телефонную книгу и напишите тому, кто уже в клубе.</p><button class="btn pri sm" onclick="tab('+SQ+'contacts'+SQ+')">📱 Книга контактов</button></div>');return;}
pane(dialogs.map(function(d){
var av=d.avatar?'<img src="'+esc(d.avatar)+'" alt="">':esc((d.title||'?').charAt(0));
return '<div class="row" onclick="openById('+Number(d.id)+')"><div class="av">'+av+'</div>'+
'<div class="rb"><div class="rn">'+esc(d.title)+'</div><div class="rm">'+esc(cut(d.last_text||'Нет сообщений',54))+'</div></div>'+
'<div style="text-align:right"><div class="rm">'+tm(d.last_time)+'</div>'+(Number(d.unread)>0?'<span class="un">'+Number(d.unread)+'</span>':'')+'</div></div>';
}).join(''));
badges();
}
function openById(id){var d=dialogs.find(function(x){return Number(x.id)===Number(id);});if(d)openChat(d);else toast('Чат не найден','warn');}
async function openChat(d){
cur=d;last=0;clearInterval(pollT);
$('pane').classList.add('hide');$('chat').classList.remove('hide');
$('cT').textContent=d.title||'Чат';
$('cAv').innerHTML=d.avatar?'<img src="'+esc(d.avatar)+'" alt="">':'💬';
var peer=d.peer?1:0;
$('cA').style.display=peer?'flex':'none';$('cV').style.display=peer?'flex':'none';
$('msgs').innerHTML='<div class="load"><span class="spin"></span></div>';
await loadMsgs(true);
pollT=setInterval(function(){if(!document.hidden&&cur)loadMsgs(false);},3000);
}
function closeChat(soft){
clearInterval(pollT);pollT=null;cur=null;
$('chat').classList.add('hide');$('pane').classList.remove('hide');
if(!soft&&tabCur==='chats')loadDialogs(true);
}
async function loadMsgs(full){
if(!cur)return;
if(full)last=0;
var r=await api('messenger_messages',{chat_id:Number(cur.id),after_id:last,limit:full?60:50});
if(!r.success){if(full)$('msgs').innerHTML='<div class="note bad"><span>⚠️</span><div>'+esc(r.message)+'</div></div>';return;}
var rows=r.data||[];
if(full)$('msgs').innerHTML='';
if(!rows.length&&full){$('msgs').innerHTML='<div class="empty"><span class="i">💬</span><h3>Сообщений нет</h3><p>Напишите первым.</p></div>';return;}
var box=$('msgs'),bottom=box.scrollHeight-box.scrollTop-box.clientHeight<110;
rows.forEach(function(m){last=Math.max(last,Number(m.id));box.appendChild(msgNode(m));});
if(full||bottom)box.scrollTop=box.scrollHeight;
if(last)api('messenger_read',{chat_id:Number(cur.id),last_id:last});
}
function msgNode(m){
var e=document.createElement('div');
e.className='msg'+(m.mine?' mine':'');
var md='';
(m.media||[]).forEach(function(a){
var u=esc(a.url||a.src||''),s=String(a.url||a.src||''),t=String(a.type||'');
if(t==='image'||/[.](jpg|jpeg|png|gif|webp)$/i.test(s))md+='<img src="'+u+'" loading="lazy">';
else if(t==='video'||/[.](mp4|webm|mov)$/i.test(s))md+='<video src="'+u+'" controls playsinline></video>';
else if(t==='audio'||/[.](mp3|wav|ogg|m4a)$/i.test(s))md+='<audio src="'+u+'" controls></audio>';
else md+='<a href="'+u+'" onclick="nat().open('+SQ+u+SQ+');return false">📎 '+esc(a.name||'Файл')+'</a>';
});
var rxh='';
if((m.reactions||[]).length)rxh='<div class="rx">'+m.reactions.map(function(x){return '<span onclick="msgReact('+Number(m.id)+','+SQ+x.emoji+SQ+')">'+x.emoji+' '+Number(x.n)+'</span>';}).join('')+'</div>';
e.innerHTML=(m.mine?'':'<div class="w">'+esc(m.sender_name||'Участник')+'</div>')+br(m.text||'')+md+rxh+
'<div class="t">'+tm(m.created_at)+'</div>'+
'<div class="acts" style="margin-top:.25rem"><button class="pact" onclick="msgReact('+Number(m.id)+','+SQ+'❤️'+SQ+')">❤️</button>'+
'<button class="pact" onclick="shareMsg('+Number(m.id)+')">📤 Поделиться</button></div>';
return e;
}
function keySend(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}
async function send(){
if(!cur)return;
var el=$('inp'),t=el.value.trim();if(!t)return;
el.value='';grow(el);
if(!navigator.onLine){queue.push({chat_id:Number(cur.id),text:t});localStorage.setItem('ily_q',JSON.stringify(queue));toast('📴 В очереди','warn');return;}
var r=await api('messenger_send',{chat_id:Number(cur.id),text:t});
if(!r.success){toast('❌ '+r.message,'err');el.value=t;return;}
loadMsgs(false);badges();
}
async function flush(){
if(!queue.length||!navigator.onLine||!token)return;
var left=[];
for(var i=0;i<queue.length;i++){var q=queue[i];var r=await api('messenger_send',{chat_id:q.chat_id,text:q.text});if(!r.success)left.push(q);}
var n=queue.length-left.length;queue=left;localStorage.setItem('ily_q',JSON.stringify(queue));
if(n>0)toast('📤 Отправлено из очереди: '+n,'ok');
}
async function upload(files){
if(!cur||!files||!files.length)return;
toast('📤 Загрузка файлов доступна в разделе сайта через кнопку «Поделиться»','warn');
$('file').value='';
}
async function msgReact(id,e){
var r=await api('messenger_react',{message_id:id,emoji:e});
if(r.success)loadMsgs(true);else toast('❌ '+r.message,'err');
}
function shareMsg(id){
var t='';var box=$('msgs');
var m=box.querySelectorAll('.msg');
t=(cur&&cur.title?cur.title:'Клуб ILY');
nat().share('Клуб ILY','Сообщение из клуба «'+t+'»','http://ily-magic.ru/messenger/');
}

/* ---------- ЛЕНТА + КОММЕНТАРИИ + РЕАКЦИИ ---------- */
async function loadFeed(){
loading('Загружаем ленту…');
var r=await api('mapp_feed',{limit:40});
if(!r.success)r=await api('messenger_feed',{});
if(!r.success){pane('<div class="note bad"><span>⚠️</span><div>'+esc(r.message)+'</div></div>');return;}
feed=r.data||[];
var ids=[];feed.forEach(function(p){var id=pid(p);if(id)ids.push({t:'post',id:id});});
if(ids.length){var s=await api('mapp_reactions',{targets:ids});if(s.success&&s.data&&s.data.map)Object.keys(s.data.map).forEach(function(k){rx[k]=s.data.map[k];});}
var h='<div class="card"><textarea class="in" id="fp" placeholder="Что происходит в вашем круге?" style="min-height:64px"></textarea>'+
'<div class="acts"><button class="btn pri sm" onclick="publish()">📤 Опубликовать</button>'+
'<button class="btn sec sm" onclick="emojiOpen('+SQ+'fp'+SQ+')">😊 Смайлики</button>'+
'<button class="btn gh sm" onclick="loadFeed()">↻ Обновить</button></div></div>';
h+=feed.length?feed.map(postHtml).join(''):'<div class="empty"><span class="i">📰</span><h3>Лента пуста</h3><p>Опубликуйте первый пост.</p></div>';
pane(h);
Object.keys(cmt).forEach(function(k){if(cmt[k]&&cmt[k].open)renderCmt(Number(k));});
}
function pid(p){var s=String(p&&p.id!=null?p.id:p);var d=s.replace(/[^0-9]/g,'');return Number(d)||0;}
function rxSum(t,id){return rx[t+':'+Number(id)]||{counts:{},total:0,my:null};}
function rxByKey(k){for(var i=0;i<RX.length;i++)if(RX[i][0]===k)return RX[i];return RX[0];}
function rxBar(t,id){
var s=rxSum(t,id),c=s.counts||{},ks=Object.keys(c).sort(function(a,b){return Number(c[b])-Number(c[a]);});
var h='<div class="rxbar" id="rb-'+t+'-'+Number(id)+'">';
ks.slice(0,5).forEach(function(k){if(!Number(c[k]))return;h+='<span class="chip'+(s.my===k?' on':'')+'" onclick="setRx('+SQ+t+SQ+','+Number(id)+','+SQ+k+SQ+')">'+rxByKey(k)[1]+' '+num(c[k])+'</span>';});
if(Number(s.total)>0)h+='<span class="chip" onclick="whoRx('+SQ+t+SQ+','+Number(id)+')">всего '+num(s.total)+'</span>';
return h+'</div>';
}
function rxBtn(t,id){
var s=rxSum(t,id),m=s.my?rxByKey(s.my):null;
return '<button class="pact'+(m?' mine':'')+'" id="rbn-'+t+'-'+Number(id)+'" onclick="setRx('+SQ+t+SQ+','+Number(id)+','+SQ+(m?m[0]:'like')+SQ+')">'+(m?m[1]+' '+m[2]:'👍 Нравится')+'</button>'+
'<button class="pact" onclick="palOpen(this,'+SQ+t+SQ+','+Number(id)+')">😊</button>';
}
function postHtml(p){
var id=pid(p),dec=p.type==='decree';
var md=(p.media||[]).map(function(a){
var u=esc(a.url||a.src||''),s=String(a.url||a.src||''),t=String(a.type||'');
if(t==='image'||/[.](jpg|jpeg|png|gif|webp)$/i.test(s))return '<img src="'+u+'" style="border-radius:10px;margin-top:.4rem" loading="lazy">';
if(t==='video'||/[.](mp4|webm|mov)$/i.test(s))return '<video src="'+u+'" controls playsinline style="border-radius:10px;margin-top:.4rem"></video>';
return '';
}).join('');
return '<div class="post"><div class="ph"><div class="av" style="width:34px;height:34px;font-size:.8rem">'+esc((p.author_name||'?').charAt(0))+'</div>'+
'<div><div class="pn">'+esc(p.author_name||'Клуб')+(dec?' 📜':'')+'</div><div class="pm">'+tm(p.created_at)+'</div></div></div>'+
(p.title?'<div class="pt">'+esc(p.title)+'</div>':'')+
'<div class="px">'+br(p.text||'')+'</div>'+md+rxBar('post',id)+
'<div class="pa">'+rxBtn('post',id)+
'<button class="pact" onclick="toggleCmt('+id+')">💬 '+num(p.comments)+' комм.</button>'+
'<button class="pact" onclick="sharePost('+id+')">📤 Поделиться</button></div>'+
'<div class="cmts hide" id="cm-'+id+'"></div></div>';
}
async function publish(){
var t=$('fp').value.trim();if(!t){toast('Напишите текст','warn');return;}
var r=await api('messenger_feed_post',{text:t,type:'post'});
toast(r.success?'📰 Опубликовано':'❌ '+r.message,r.success?'ok':'err');
if(r.success)loadFeed();
}
function sharePost(id){
var p=feed.find(function(x){return pid(x)===Number(id);});
var txt=p?cut(p.text||p.title||'',220):'Клуб ILY';
nat().share('Клуб ILY',txt,'http://ily-magic.ru/messenger/');
}
async function setRx(t,id,k){
id=Number(id);
var s=rxSum(t,id),c=Object.assign({},s.counts||{}),prev=s.my;
if(prev===k){c[prev]=Math.max(0,Number(c[prev]||0)-1);if(!c[prev])delete c[prev];s.my=null;}
else{if(prev){c[prev]=Math.max(0,Number(c[prev]||0)-1);if(!c[prev])delete c[prev];}c[k]=Number(c[k]||0)+1;s.my=k;}
s.counts=c;s.total=Object.keys(c).reduce(function(a,x){return a+Number(c[x]);},0);
rx[t+':'+id]=s;repaintRx(t,id);
var r=await api('mapp_react',{target_type:t,target_id:id,reaction:k});
if(r.success&&r.data&&r.data.summary){rx[t+':'+id]=r.data.summary;repaintRx(t,id);}
else if(!r.success){toast('❌ '+r.message,'err');}
}
function repaintRx(t,id){
var bar=$('rb-'+t+'-'+Number(id));
if(bar){var d=document.createElement('div');d.innerHTML=rxBar(t,id);bar.parentNode.replaceChild(d.firstChild,bar);}
var b=$('rbn-'+t+'-'+Number(id));
if(b){var s=rxSum(t,id),m=s.my?rxByKey(s.my):null;b.className='pact'+(m?' mine':'');b.innerHTML=m?m[1]+' '+m[2]:'👍 Нравится';}
}
function buildPal(){$('palG').innerHTML=RX.map(function(r){return '<button title="'+r[2]+'" onclick="palPick('+SQ+r[0]+SQ+')">'+r[1]+'</button>';}).join('');}
var palT=null;
function palOpen(btn,t,id){
palT={t:t,id:id};var p=$('pal');p.classList.add('on');
var r=btn.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
p.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left-30))+'px';
var y=r.top-h-6;if(y<6)y=r.bottom+6;p.style.top=y+'px';
}
function palPick(k){var t=palT;$('pal').classList.remove('on');if(t)setRx(t.t,t.id,k);}
async function whoRx(t,id){
var r=await api('mapp_reaction_list',{target_type:t,target_id:Number(id)});
var h='<h2>Кто отреагировал</h2>';
if(!r.success)h+='<div class="note bad"><span>⚠️</span><div>'+esc(r.message)+'</div></div>';
else{
var items=(r.data&&r.data.items)||[];
h+=items.length?items.map(function(u){var c=rxByKey(u.reaction);
return '<div class="row" style="cursor:default"><div class="av">'+esc((u.name||'?').charAt(0))+'</div><div class="rb"><div class="rn">'+esc(u.name)+'</div><div class="rm">'+c[1]+' '+c[2]+'</div></div></div>';}).join(''):'<div class="empty">Пока никто не отреагировал</div>';
}
ovOpen(h);
}
/* --- КОММЕНТАРИИ: список, ответы, удаление --- */
async function toggleCmt(id,focus){
id=Number(id);
var box=$('cm-'+id);if(!box)return;
var st=cmt[id]||{open:false,items:[],loaded:false};
if(st.open&&!focus){st.open=false;cmt[id]=st;box.classList.add('hide');return;}
st.open=true;cmt[id]=st;box.classList.remove('hide');
if(!st.loaded){
box.innerHTML='<div class="load"><span class="spin"></span> Комментарии…</div>';
var r=await api('mapp_comments',{post_id:id,limit:300});
if(!r.success){
box.innerHTML='<div class="note bad"><span>⚠️</span><div><b>Комментарии недоступны.</b> '+esc(r.message)+
'<br>Администратору: положите <b>api-messenger-app.php</b> в корень сайта.</div></div>';
return;
}
st.items=(r.data&&r.data.items)||[];st.loaded=true;
var ids=st.items.map(function(c){return {t:'comment',id:Number(c.id)};});
if(ids.length){var s=await api('mapp_reactions',{targets:ids});if(s.success&&s.data&&s.data.map)Object.keys(s.data.map).forEach(function(k){rx[k]=s.data.map[k];});}
}
renderCmt(id);
if(focus){var t=$('ci-'+id);if(t)t.focus();}
}
function renderCmt(id){
var box=$('cm-'+id),st=cmt[id];if(!box||!st||!st.open)return;
var byP={};
(st.items||[]).forEach(function(c){var p=Number(c.parent_id||0);(byP[p]=byP[p]||[]).push(c);});
function node(c,d){
var cid=Number(c.id),kids=byP[cid]||[];
return '<div class="cmt"><div class="av" style="width:28px;height:28px;font-size:.72rem">'+esc((c.name||'?').charAt(0))+'</div>'+
'<div class="cb"><div class="bub"><div class="cn">'+esc(c.name||'Участник')+' <span style="color:var(--dim2);font-weight:400;font-size:.66rem">'+tm(c.created_at)+'</span></div>'+
'<div class="ct">'+br(c.text||'')+'</div></div>'+rxBar('comment',cid)+
'<div class="cf">'+rxBtn('comment',cid)+
'<button onclick="replyTo('+id+','+cid+','+SQ+esc(c.name||'')+SQ+')">↩️ Ответить</button>'+
(c.can_delete?'<button onclick="delCmt('+id+','+cid+')">🗑 Удалить</button>':'')+
'<button onclick="shareCmt('+id+','+cid+')">📤</button></div>'+
(kids.length&&d<5?'<div class="kids">'+kids.map(function(k){return node(k,d+1);}).join('')+'</div>':'')+
'</div></div>';
}
var roots=byP[0]||[];
var h=roots.length?roots.map(function(c){return node(c,0);}).join(''):'<div style="font-size:.79rem;color:var(--dim2);margin-bottom:.3rem">Комментариев пока нет — напишите первый.</div>';
if(reply[id])h+='<div class="rep">↩️ Ответ для <b>'+esc(reply[id].name)+'</b> <button onclick="replyCancel('+id+')">✕ отменить</button></div>';
h+='<div class="cform"><textarea id="ci-'+id+'" rows="1" placeholder="Ваш комментарий…" oninput="grow(this)"></textarea>'+
'<button class="ib" onclick="emojiOpen('+SQ+'ci-'+id+SQ+')">😊</button>'+
'<button class="btn pri sm" onclick="addCmt('+id+')">➤</button></div>';
box.innerHTML=h;
}
function replyTo(id,cid,name){reply[id]={id:cid,name:name};renderCmt(id);var t=$('ci-'+id);if(t)t.focus();}
function replyCancel(id){delete reply[id];renderCmt(id);}
async function addCmt(id){
var t=$('ci-'+id);if(!t)return;
var v=t.value.trim();if(!v){toast('Напишите комментарий','warn');return;}
var parent=reply[id]?Number(reply[id].id):0;
var r=await api('mapp_comment_add',{post_id:id,parent_id:parent,text:v});
if(!r.success)r=await api('messenger_feed_comment',{post_id:id,text:v});
if(!r.success){toast('❌ '+r.message,'err');return;}
t.value='';delete reply[id];
var st=cmt[id];
if(st&&r.data&&r.data.comment){st.items.push(r.data.comment);renderCmt(id);}
else if(st){st.loaded=false;st.open=false;await toggleCmt(id,true);}
var p=feed.find(function(x){return pid(x)===Number(id);});
if(p)p.comments=Number(p.comments||0)+1;
toast('💬 Комментарий добавлен','ok');
}
async function delCmt(id,cid){
var r=await api('mapp_comment_delete',{comment_id:cid});
toast(r.success?'🗑 Удалено':'❌ '+r.message,r.success?'ok':'err');
if(r.success){var st=cmt[id];if(st){st.loaded=false;st.open=false;await toggleCmt(id,true);}}
}
function shareCmt(id,cid){
var st=cmt[id],c=st&&st.items.find(function(x){return Number(x.id)===Number(cid);});
nat().share('Клуб ILY · комментарий',c?cut(c.text||'',220):'Комментарий клуба','http://ily-magic.ru/messenger/');
}

/* ---------- КНИГА КОНТАКТОВ ---------- */
async function loadContacts(){
loading('Читаем книгу контактов…');
var r=await api('messenger_contacts',{});
if(r.success)contacts=r.data||{members:[],guests:[]};
var m=contacts.members||[],g=contacts.guests||[];
var h='<div class="card"><h3 style="font-size:1rem;margin-bottom:.4rem">📱 Телефонная книга</h3>'+
'<div class="note"><span>ℹ️</span><div><b>Зелёные</b> уже в клубе — пишите сразу. <b>Розовые</b> — приглашаем: откроется WhatsApp, Telegram, SMS, почта и другие ваши приложения.</div></div>'+
'<div class="acts"><button class="btn pri sm" onclick="importContacts()">📥 Импорт из телефона</button>'+
'<button class="btn sec sm" onclick="manual()">✍️ Ввести номер</button>'+
'<button class="btn gh sm" onclick="loadContacts()">↻ Обновить</button></div>'+
'<div style="font-size:.76rem;color:var(--dim);margin-top:.5rem">В клубе: '+m.length+' · можно пригласить: '+g.length+'</div></div>';
h+=m.map(function(c){
return '<div class="row"><div class="av">'+esc((c.name||'?').charAt(0))+'</div><div class="rb"><div class="rn">'+esc(c.contact_name||c.name)+'</div><div class="rm">✅ В клубе</div></div>'+
'<button class="btn sec sm" onclick="writeMember('+Number(c.id)+')">💬</button></div>';
}).join('');
h+=g.map(function(c){
return '<div class="row guest"><div class="av g">'+esc((c.contact_name||'?').charAt(0))+'</div><div class="rb"><div class="rn">'+esc(c.contact_name||c.phone)+'</div><div class="rm">'+esc(c.phone)+'</div></div>'+
'<button class="btn ht sm" onclick="invite('+SQ+esc(c.phone)+SQ+','+SQ+esc(c.contact_name||'')+SQ+')">🌿</button></div>';
}).join('');
if(!m.length&&!g.length)h+='<div class="empty"><span class="i">📱</span><h3>Книга пуста</h3><p>Нажмите «Импорт из телефона» — приложение прочитает контакты напрямую, без браузера.</p></div>';
pane(h);
}
async function importContacts(){
var raw;
try{raw=ILY.contacts();}catch(e){toast('Мост контактов недоступен','err');return;}
var d;try{d=JSON.parse(raw);}catch(e){toast('Ошибка чтения книги','err');return;}
if(!d.success){toast('⚠️ '+d.message,'warn');return;}
toast('📤 Импортируем '+d.items.length+' контактов…');
var r=await api('messenger_import_contacts',{contacts:d.items});
if(!r.success){toast('❌ '+r.message,'err');return;}
contacts=r.data;toast('✅ '+r.message,'ok');loadContacts();
}
function manual(){
ovOpen('<h2>✍️ Номер друга</h2><input class="in" id="mPh" placeholder="+79001234567"><input class="in" id="mNm" placeholder="Имя"><div class="acts"><button class="btn pri" onclick="manualGo()">🌿 Пригласить</button><button class="btn sec" onclick="ovClose()">Отмена</button></div>');
}
function manualGo(){
var p=$('mPh').value.trim(),n=$('mNm').value.trim();
if(!p){toast('Введите номер','warn');return;}
ovClose();invite(p,n);
}
async function writeMember(id){
var r=await api('messenger_open_chat',{peer_id:id});
if(!r.success){toast('❌ '+r.message,'err');return;}
await loadDialogs(true);tabCur='chats';openChat(r.data);
}
async function invite(phone,name){
var r=await api('messenger_invite',{phone:phone,name:name,channel:'link'});
if(!r.success){toast('❌ '+r.message,'err');return;}
var d=r.data;
try{ILY.invite(phone,d.text,d.url);}catch(e){}
toast('🌿 Приглашение готово — выберите приложение','ok');
loadContacts();
}

/* ---------- УРОКИ ---------- */
async function loadSpaces(){
loading('Открываем уроки…');
var r=await api('messenger_spaces',{});
if(!r.success){pane('<div class="note"><span>🎓</span><div><b>Раздел уроков</b> требует модуль api-messenger-spaces.php на сайте. Чаты, лента и книга контактов работают полностью.</div></div>');return;}
var d=r.data||{};
spaces=(d.groups||[]).concat(d.retreats||[]).concat(d.academy||[]).concat(d.language||[]);
pane(spaces.length?spaces.map(function(s){
return '<div class="row"><div class="av">'+esc(s.icon||'🎓')+'</div><div class="rb"><div class="rn">'+esc(s.title)+'</div><div class="rm">'+esc(cut(s.subtitle||'',50))+'</div></div>'+
(s.url?'<button class="btn sec sm" onclick="nat().open('+SQ+esc(s.url)+SQ+')">▶️</button>':'')+'</div>';
}).join(''):'<div class="empty"><span class="i">🎓</span><h3>Пространств пока нет</h3><p>Вступите в группу или курс — карточка появится здесь.</p></div>');
}

/* ---------- ПРОФИЛЬ ---------- */
function profile(){
var h='<h2>👤 Профиль</h2><div class="note ok"><span>✅</span><div><b>'+esc((me&&me.name)||'Участник')+'</b> · '+esc((me&&me.phone)||'')+'<br>Приложение 3.0 · автономный режим</div></div>'+
'<div class="note"><span>🔗</span><div>Имя, фото и город берутся из профиля клуба. Меняйте их на сайте — здесь обновятся сами.</div></div>'+
'<label style="font-size:.78rem;color:var(--gold)">О себе</label><textarea class="in" id="pfA" style="min-height:64px">'+esc((me&&me.about)||'')+'</textarea>'+
'<div class="acts"><button class="btn pri sm" onclick="saveAbout()">💾 Сохранить</button>'+
'<button class="btn sec sm" onclick="window.ilyTheme()">🌗 Тема</button>'+
'<button class="btn gh sm" onclick="nat().open('+SQ+'http://ily-magic.ru/lichnaya_stranitsa.htm'+SQ+')">🌿 Кабинет</button>'+
'<button class="btn dg sm" onclick="window.ilyLogout();ovClose()">🚪 Выйти</button></div>';
ovOpen(h);
}
async function saveAbout(){
var r=await api('messenger_update_profile',{about:$('pfA').value});
toast(r.success?'✅ Сохранено':'❌ '+r.message,r.success?'ok':'err');
if(r.success)me=r.data;
}
function ovOpen(h){$('ovB').innerHTML=h;$('ov').classList.add('on');}
function ovClose(){$('ov').classList.remove('on');}

/* ---------- ЭМОДЗИ ---------- */
var emoT='inp';
function buildEp(){$('epG').innerHTML=EMO.map(function(e){return '<button onclick="insEp('+SQ+e+SQ+')">'+e+'</button>';}).join('');}
function emojiOpen(t){emoT=t;$('ep').classList.add('on');}
function insEp(e){
var el=$(emoT);if(!el)return;
var s=el.selectionStart==null?el.value.length:el.selectionStart;
el.value=el.value.slice(0,s)+e+el.value.slice(el.selectionEnd==null?s:el.selectionEnd);
el.focus();grow(el);
}
document.addEventListener('click',function(e){
var t=e.target;
if(!t.closest('#ep')&&!t.closest('[onclick*="emojiOpen"]'))$('ep').classList.remove('on');
if(!t.closest('#pal')&&!t.closest('[onclick*="palOpen"]'))$('pal').classList.remove('on');
if(t.id==='ov')ovClose();
});

/* ---------- ЗВОНКИ (внутри приложения, без браузера) ---------- */
var ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
var call={room:null,peer:0,name:'',media:'audio',pc:null,st:null,poll:null,last:0,role:'caller',q:[],muted:false};
async function callStart(media){
if(!cur||!cur.peer){toast('Звонки доступны в личных чатах','warn');return;}
if(call.room){toast('Уже идёт звонок','warn');return;}
var peer=cur.peer;
var r=await api('messenger_call_invite',{peer_id:Number(peer.id),media:media});
if(!r.success){toast('❌ '+r.message,'err');return;}
call={room:r.data.call_id,peer:Number(peer.id),name:peer.name,media:media,pc:null,st:null,poll:null,last:0,role:'caller',q:[],muted:false};
showCall(peer.name,'📞 Вызов…','out');
try{call.st=await navigator.mediaDevices.getUserMedia({audio:true,video:media==='video'});}
catch(e){toast('❌ Нет доступа к микрофону/камере','err');callEnd(true);return;}
if(media==='video'){$('lv').srcObject=call.st;$('lv').style.display='block';$('rv').style.display='block';}
call.pc=mkPC();wire();
call.st.getTracks().forEach(function(t){call.pc.addTrack(t,call.st);});
call.poll=setInterval(callPoll,1200);
try{ILY.ring(true);}catch(e){}
}
function mkPC(){return new RTCPeerConnection({iceServers:ICE});}
function wire(){
call.pc.onicecandidate=function(e){if(e.candidate)sig('ice',{candidate:e.candidate,to:call.peer});};
call.pc.ontrack=function(e){
try{ILY.ring(false);}catch(x){}
if(call.media==='video')$('rv').srcObject=e.streams[0];else $('ra').srcObject=e.streams[0];
$('callSt').textContent='🟢 На связи';
};
call.pc.onnegotiationneeded=async function(){
if(call.role==='callee')return;
try{var o=await call.pc.createOffer();await call.pc.setLocalDescription(o);sig('offer',{type:o.type,sdp:o.sdp,to:call.peer});}catch(e){}
};
}
function sig(t,d){if(!call.room)return;return api('messenger_signal',{room:call.room,type:t,data:d,target_id:call.peer});}
async function callPoll(){
if(!call.room)return;
var r=await api('messenger_signals',{room:call.room,after_id:call.last});
if(!r.success)return;
(r.data||[]).forEach(function(s){call.last=Math.max(call.last,Number(s.id));handleSig(s.type,s.data||{});});
}
async function handleSig(t,d){
if(t==='call-invite')return;
if(t==='call-accept'){$('callSt').textContent='🔄 Соединение…';try{ILY.ring(false);}catch(e){}return;}
if(t==='call-reject'||t==='call-end'){toast('📵 Звонок завершён');callEnd(false);return;}
if(!call.pc)return;
if(t==='offer'){try{await call.pc.setRemoteDescription({type:d.type,sdp:d.sdp});await flushIce();var a=await call.pc.createAnswer();await call.pc.setLocalDescription(a);sig('answer',{type:a.type,sdp:a.sdp,to:call.peer});}catch(e){}}
else if(t==='answer'){try{await call.pc.setRemoteDescription({type:d.type,sdp:d.sdp});await flushIce();}catch(e){}}
else if(t==='ice'){var c=d.candidate||d;if(call.pc.remoteDescription){try{await call.pc.addIceCandidate(c);}catch(e){}}else call.q.push(c);}
}
async function flushIce(){for(var i=0;i<call.q.length;i++){try{await call.pc.addIceCandidate(call.q[i]);}catch(e){}}call.q=[];}
function showCall(n,s,mode){
$('callNm').textContent=n;$('callSt').textContent=s;$('callAv').textContent=mode==='in'?'📲':'📞';
$('callB').innerHTML=mode==='in'?'<button class="cbtn a" onclick="callAccept()">✅</button><button class="cbtn e" onclick="callReject()">❌</button>':
'<button class="cbtn m" onclick="callMute()">🎙</button><button class="cbtn e" onclick="callEnd(true)">📞</button>';
$('call').classList.add('on');
}
async function callIncoming(room){
if(call.room)return;
var r=await api('messenger_signals',{room:room,after_id:0});
var nm='Участник',md='audio',peer=0;
(r.data||[]).forEach(function(s){if(s.type==='call-invite'){nm=(s.data&&s.data.caller_name)||s.sender_name||nm;md=(s.data&&s.data.media)||md;peer=Number(s.sender_id);}});
call={room:room,peer:peer,name:nm,media:md,pc:null,st:null,poll:null,last:0,role:'callee',q:[],muted:false};
showCall(nm,'📲 Входящий '+(md==='video'?'видеозвонок':'аудиозвонок'),'in');
try{ILY.ring(true);}catch(e){}
call.poll=setInterval(async function(){
if(!call.room||call.pc)return;
var w=await api('messenger_signals',{room:call.room,after_id:0});
var stop=false;(w.data||[]).forEach(function(s){if(s.type==='call-end'||s.type==='call-reject')stop=true;});
if(stop){toast('📵 Вызов завершён');callEnd(false);}
},3000);
}
async function callAccept(){
if(!call.room)return;
try{ILY.ring(false);}catch(e){}
try{call.st=await navigator.mediaDevices.getUserMedia({audio:true,video:call.media==='video'});}
catch(e){toast('❌ Нет доступа к микрофону','err');callReject();return;}
if(call.media==='video'){$('lv').srcObject=call.st;$('lv').style.display='block';$('rv').style.display='block';}
call.role='callee';call.pc=mkPC();wire();
call.st.getTracks().forEach(function(t){call.pc.addTrack(t,call.st);});
showCall(call.name,'🔄 Соединение…','out');
sig('call-accept',{});
call.last=0;clearInterval(call.poll);call.poll=setInterval(callPoll,1200);callPoll();
}
function callReject(){sig('call-reject',{});callEnd(false);}
function callMute(){if(!call.st)return;call.muted=!call.muted;call.st.getAudioTracks().forEach(function(t){t.enabled=!call.muted;});toast(call.muted?'🔇 Микрофон выключен':'🎙 Микрофон включён');}
function callEnd(notify){
if(!call.room)return;
if(notify)sig('call-end',{});
try{ILY.ring(false);}catch(e){}
clearInterval(call.poll);
if(call.pc){try{call.pc.close();}catch(e){}}
if(call.st)call.st.getTracks().forEach(function(t){t.stop();});
$('rv').style.display='none';$('lv').style.display='none';$('call').classList.remove('on');
call={room:null,peer:0,name:'',media:'audio',pc:null,st:null,poll:null,last:0,role:'caller',q:[],muted:false};
}
setInterval(async function(){
if(document.hidden||!token||call.room||!me)return;
var r=await api('messenger_calls_log',{});
if(!r.success)return;
var rows=r.data||[];
for(var i=0;i<rows.length;i++){
var c=rows[i];
if(Number(c.callee_id)!==Number(me.id))continue;
if(String(c.status)!=='ringing')continue;
var t=pd(c.started_at);if(!t||Date.now()-t.getTime()>70000)continue;
callIncoming(c.call_id);break;
}
},6000);
