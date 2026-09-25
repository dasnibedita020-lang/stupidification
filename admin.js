const SUPABASE_URL="https://crndztiqvghsvtbprsrn.supabase.co";
const SUPABASE_KEY="sb_publishable_xXimMadw55KUp9KEglRc9Q_J1lnZ513";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const app=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user=null, profile=null, active='dashboard', rows={};

const configs={
 modules:{label:'Modules',table:'modules',title:'name',fields:[['name','Name','text'],['sort_order','Sort order','number']]},
 topics:{label:'Topics',table:'topics',title:'name',fields:[['module_id','Module','module'],['name','Name','text'],['sort_order','Sort order','number']]},
 authors:{label:'Authors',table:'authors',title:'name',fields:[['name','Name','text'],['birth_year','Birth year','number'],['death_year','Death year','number'],['nationality','Nationality','text'],['biography','Biography','textarea'],['notes','Notes','textarea']]},
 works:{label:'Works',table:'works',title:'title',fields:[['title','Title','text'],['author_id','Author','author'],['publication_year','Publication year','number'],['publication_date','Publication date','text'],['genre','Genre','text'],['description','Description','textarea'],['notes','Notes','textarea']]},
 characters:{label:'Characters',table:'characters',title:'name',fields:[['name','Name','text'],['work_id','Work','work'],['description','Description','textarea']]},
 theorists:{label:'Theorists',table:'theorists',title:'name',fields:[['name','Name','text'],['description','Description','textarea']]},
 theories:{label:'Theories',table:'theories',title:'name',fields:[['name','Name','text'],['theorist_id','Theorist','theorist'],['description','Description','textarea'],['key_terms','Key terms','textarea']]},
 concepts:{label:'Concepts',table:'concepts',title:'name',fields:[['name','Name','text'],['definition','Definition','textarea'],['notes','Notes','textarea']]},
 learn_content:{label:'Learn content',table:'learn_content',title:'title',fields:[['topic_id','Topic','topic'],['title','Title','text'],['body','Body','textarea'],['source','Source','text'],['published','Published','checkbox']]},
 quiz_questions:{label:'Quiz questions',table:'quiz_questions',title:'question',special:'quiz'},
 flashcards:{label:'Flashcards',table:'flashcards',title:'front',fields:[['topic_id','Topic','topic'],['front','Front','textarea'],['back','Back','textarea'],['source','Source','text'],['published','Published','checkbox']]},
 game_questions:{label:'Game questions',table:'game_questions',title:'prompt',special:'game'}
};
const baseTabs=['dashboard','modules','topics','authors','works','characters','theorists','theories','concepts','learn_content','quiz_questions','flashcards','game_questions'];
const gameTypes=[
 {key:'author_work',label:'Author ↔ Work',badge:'MATCH',description:'Connect an author to a work.'},
 {key:'character_work',label:'Character ↔ Work',badge:'MATCH',description:'Connect a character to its work.'},
 {key:'work_date',label:'Work ↔ Date',badge:'MATCH',description:'Match a work to its publication date.'},
 {key:'chronology',label:'Chronology',badge:'ORDER',description:'Put works in chronological order.'},
 {key:'theory',label:'Theory ↔ Theorist',badge:'THEORY',description:'Identify the thinker associated with a theory.'}
];
let gameFilter='all';
function relationOptions(type,value){const source=type==='module'?rows.modules:type==='topic'?rows.topics:type==='author'?rows.authors:type==='work'?rows.works:type==='theorist'?rows.theorists:[];const title=type==='module'||type==='topic'||type==='theorist'||type==='author'?'name':'title';return `<option value="">— None —</option>`+source.map(x=>`<option value="${x.id}" ${x.id===value?'selected':''}>${esc(x[title])}</option>`).join('')}
function inputFor(field,val){const [key,label,type]=field; if(type==='checkbox')return `<div class="field"><label><input type="checkbox" id="f_${key}" ${val?'checked':''}> ${label}</label></div>`; if(['module','topic','author','work','theorist'].includes(type))return `<div class="field"><label>${label}</label><select id="f_${key}">${relationOptions(type,val)}</select></div>`; const tag=type==='textarea'?'textarea':'input';return `<div class="field"><label>${label}</label><${tag} id="f_${key}" type="${type==='number'?'number':'text'}">${tag==='textarea'?esc(val):''}</${tag}>`}
function fieldValue(field){const [key,,type]=field;const el=document.querySelector('#f_'+key);return type==='checkbox'?el.checked:(type==='number'?(el.value===''?null:Number(el.value)):el.value)}
async function boot(){
 const {data:{session}}=await sb.auth.getSession(); user=session?.user||null;
 if(!user)return login();
 const {data,error}=await sb.from('profiles').select('id,display_name,is_admin').eq('id',user.id).maybeSingle();
 if(error||!data?.is_admin)return denied();
 profile=data; await loadRelations(); render();
}
function login(message=''){app.innerHTML=`<main class="wrap login"><div class="card"><div class="eyebrow">STUPIDIFICATION · ADMIN</div><h1>Content dashboard</h1><p>Sign in with the administrator account to add, edit and remove site content.</p><div class="field"><label>Email</label><input id="email" type="email" placeholder="admin email"></div><br><div class="field"><label>Password</label><input id="password" type="password" placeholder="password"></div><div class="actions"><button class="btn" id="login">Sign in</button><a class="btn secondary" href="./">Back to site</a></div><div class="msg" id="msg">${esc(message)}</div></div></main>`;document.querySelector('#login').onclick=async()=>{const msg=document.querySelector('#msg');const {data,error}=await sb.auth.signInWithPassword({email:document.querySelector('#email').value.trim(),password:document.querySelector('#password').value});if(error){msg.textContent=error.message;return}user=data.user;boot()}}
function denied(){app.innerHTML=`<main class="wrap login"><div class="card"><div class="eyebrow">ACCESS DENIED</div><h1>This account is not an admin.</h1><p>The dashboard checks the <code>profiles.is_admin</code> flag in Supabase.</p><div class="actions"><button class="btn secondary" id="signout">Sign out</button><a class="btn" href="./">Back to site</a></div></div></main>`;document.querySelector('#signout').onclick=async()=>{await sb.auth.signOut();login()}}
async function loadRelations(){const specs=['modules','topics','authors','works','characters','theorists','theories','concepts','learn_content','quiz_questions','quiz_options','flashcards','game_questions'];await Promise.all(specs.map(async t=>{let q=sb.from(t).select('*');if(['quiz_options'].includes(t))q=q.limit(5000);else q=q.limit(5000);const {data}=await q;rows[t]=data||[]}));}
function render(){app.innerHTML=`<header class="top"><a class="brand" href="./">STUPIDIFICATION</a><div class="top-actions"><button class="btn secondary small" id="site">View site</button><button class="btn small" id="logout">Sign out</button></div></header><main class="wrap"><div class="eyebrow">ADMIN CONTENT MANAGEMENT</div><h1>Content dashboard</h1><p>Add and manage the material that powers Learn, Quiz, Flashcards, Games and Explore.</p><div class="dashboard" id="metrics"></div><div class="tabs">${baseTabs.map(t=>`<button class="tab ${active===t?'active':''}" data-tab="${t}">${t==='dashboard'?'Overview':configs[t].label}</button>`).join('')}</div><div id="panel"></div></main><div class="modal" id="modal"></div>`;document.querySelector('#logout').onclick=async()=>{await sb.auth.signOut();login()};document.querySelector('#site').onclick=()=>location.href='./';document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.tab;gameFilter='all';document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));renderPanel()});renderMetrics();renderPanel()}
function renderMetrics(){const counts=['modules','topics','authors','works','characters','theorists','theories','concepts','learn_content','quiz_questions','flashcards','game_questions'];document.querySelector('#metrics').innerHTML=counts.slice(0,4).map(k=>`<div class="metric"><span>${configs[k].label}</span><strong>${rows[k]?.length||0}</strong></div>`).join('')}
function renderPanel(){
 const panel=document.querySelector('#panel');
 if(active==='dashboard'){
   panel.innerHTML=`<div class="card"><h2>Welcome, ${esc(profile.display_name||user.email)}</h2><p>Use the tabs above to manage content. Relations are dropdowns, so you never have to copy UUIDs. Quiz questions have a dedicated four-option builder, and Games are organised by game type.</p><div class="notice"><strong>Publishing:</strong> Keep new material unpublished while drafting. Only published Learn content, quizzes, flashcards and game questions appear on the student site.</div></div>`;
   return;
 }
 const c=configs[active];
 if(active==='game_questions'){
   renderGameManager(panel);
   return;
 }
 panel.innerHTML=`<div class="toolbar"><input class="search" id="search" placeholder="Search ${c.label.toLowerCase()}…"><button class="btn" id="add">+ Add ${singular(c.label)}</button></div><div class="table-wrap"><table class="table"><thead><tr><th>${tableHeading(c.label)}</th><th>Status</th><th>Actions</th></tr></thead><tbody id="tbody"></tbody></table></div>`;
 document.querySelector('#add').onclick=()=>openEditor(active);
 document.querySelector('#search').oninput=drawTable;
 drawTable();
}
function singular(label){
 const map={Modules:'Module',Topics:'Topic',Authors:'Author',Works:'Work',Characters:'Character',Theorists:'Theorist',Theories:'Theory',Concepts:'Concept', 'Learn content':'Content','Quiz questions':'Question',Flashcards:'Flashcard','Game questions':'Game question'};
 return map[label]||label.replace(/s$/,'');
}
function tableHeading(label){
 const map={Modules:'Module',Topics:'Topic',Authors:'Author',Works:'Work',Characters:'Character',Theorists:'Theorist',Theories:'Theory',Concepts:'Concept','Learn content':'Content','Quiz questions':'Question',Flashcards:'Flashcard','Game questions':'Game question'};
 return map[label]||label;
}
function renderGameManager(panel){
 const all=rows.game_questions||[];
 const visible=gameFilter==='all'?all:all.filter(r=>r.game_type===gameFilter);
 const filterLabel=gameFilter==='all'?'All games':gameTypes.find(g=>g.key===gameFilter)?.label||'Games';
 panel.innerHTML=`
   <div class="game-admin-head">
     <div><div class="eyebrow">GAME BUILDER</div><h2>Games</h2><p>Create questions separately for each game shown on the student site.</p></div>
     <button class="btn" id="addGame">+ Add ${esc(filterLabel==='All games'?'Game question':filterLabel+' question')}</button>
   </div>
   <div class="game-admin-grid">
     ${gameTypes.map(g=>{
       const count=all.filter(r=>r.game_type===g.key).length;
       return `<button class="game-admin-card ${gameFilter===g.key?'selected':''}" data-game-filter="${g.key}">
         <span class="game-badge">${g.badge}</span><strong>${g.label}</strong><span>${g.description}</span><em>${count} question${count===1?'':'s'}</em>
       </button>`;
     }).join('')}
   </div>
   <div class="game-list-head"><div><strong>${esc(filterLabel)}</strong><span>${visible.length} question${visible.length===1?'':'s'}</span></div>${gameFilter!=='all'?'<button class="btn secondary small" id="showAllGames">Show all</button>':''}</div>
   <div class="table-wrap"><table class="table"><thead><tr><th>Question</th><th>Game</th><th>Status</th><th>Actions</th></tr></thead><tbody id="tbody"></tbody></table></div>`;
 document.querySelector('#addGame').onclick=()=>openGame({},gameFilter==='all'?'author_work':gameFilter);
 document.querySelectorAll('[data-game-filter]').forEach(b=>b.onclick=()=>{gameFilter=b.dataset.gameFilter;renderGameManager(panel)});
 document.querySelector('#showAllGames')?.addEventListener('click',()=>{gameFilter='all';renderGameManager(panel)});
 drawGameTable(visible);
}
function drawGameTable(data){
 const tbody=document.querySelector('#tbody');
 if(!tbody)return;
 tbody.innerHTML=data.length?data.slice(0,300).map(r=>`<tr><td><strong>${esc(r.prompt||'Untitled')}</strong><br><small>${esc(subtitle('game_questions',r))}</small></td><td><span class="game-type-pill">${esc(gameTypes.find(g=>g.key===r.game_type)?.label||r.game_type||'Unknown')}</span></td><td>${status('game_questions',r)}</td><td><button class="btn secondary small" onclick="openEditor('game_questions','${r.id}')">Edit</button> <button class="btn danger small" onclick="removeRow('game_questions','${r.id}')">Delete</button></td></tr>`).join(''):`<tr><td colspan="4" class="empty">No questions in this game category yet.</td></tr>`;
}

function displayTitle(k,r){if(k==='works')return r.title;if(k==='learn_content')return r.title;if(k==='quiz_questions')return r.question;if(k==='flashcards')return r.front;if(k==='game_questions')return r.prompt;return r.name}
function status(k,r){if('published' in r)return `<span class="pill ${r.published?'ok':'no'}">${r.published?'Published':'Draft'}</span>`;return '<span class="pill ok">Active</span>'}
function drawTable(){
 const tbody=document.querySelector('#tbody');
 if(!tbody||active==='game_questions')return;
 const q=(document.querySelector('#search')?.value||'').toLowerCase();
 const data=(rows[active]||[]).filter(r=>String(displayTitle(active,r)||'').toLowerCase().includes(q)).slice(0,300);
 tbody.innerHTML=data.length?data.map(r=>`<tr><td><strong>${esc(displayTitle(active,r))}</strong><br><small>${esc(subtitle(active,r))}</small></td><td>${status(active,r)}</td><td><button class="btn secondary small" onclick="openEditor('${active}','${r.id}')">Edit</button> <button class="btn danger small" onclick="removeRow('${active}','${r.id}')">Delete</button></td></tr>`).join(''):`<tr><td colspan="3" class="empty">No matching records.</td></tr>`;
}

function subtitle(k,r){if(k==='works')return rows.authors?.find(x=>x.id===r.author_id)?.name||'No author';if(k==='characters')return rows.works?.find(x=>x.id===r.work_id)?.title||'No work';if(k==='theories')return rows.theorists?.find(x=>x.id===r.theorist_id)?.name||'No theorist';if(['learn_content','quiz_questions','flashcards','game_questions'].includes(k))return rows.topics?.find(x=>x.id===r.topic_id)?.name||'No topic';if(k==='topics')return rows.modules?.find(x=>x.id===r.module_id)?.name||'No module';return ''}
function openEditor(k,id=null){const c=configs[k],r=id?(rows[k]||[]).find(x=>x.id===id):{};if(c.special==='quiz')return openQuiz(r);if(c.special==='game')return openGame(r,gameFilter==='all'?'author_work':gameFilter);const body=c.fields.map(f=>inputFor(f,r[f[0]])).join('');showModal(`${id?'Edit':'Add'} ${c.label.replace(/s$/,'')}`,`<div class="form">${body}</div><div class="actions"><button class="btn" id="save">Save</button><button class="btn secondary" id="cancel">Cancel</button></div><div id="saveMsg" class="msg"></div>`);document.querySelector('#save').onclick=async()=>{const payload={};c.fields.forEach(f=>payload[f[0]]=fieldValue(f));const msg=document.querySelector('#saveMsg');const res=id?await sb.from(c.table).update(payload).eq('id',id).select().single():await sb.from(c.table).insert(payload).select().single();if(res.error){msg.textContent=res.error.message;return}await refresh(c.table);closeModal();drawTable();renderMetrics()}}
function openQuiz(r={}){const opts=rows.quiz_options.filter(o=>o.question_id===r.id).sort((a,b)=>a.sort_order-b.sort_order);const vals=[0,1,2,3].map(i=>opts[i]||{});showModal(`${r.id?'Edit':'Add'} Quiz Question`,`<div class="form"><div class="field full"><label>Question</label><textarea id="q_question">${esc(r.question)}</textarea></div><div class="field full"><label>Topic</label><select id="q_topic">${relationOptions('topic',r.topic_id)}</select></div><div class="field full"><label>Options — choose exactly one correct answer</label>${vals.map((o,i)=>`<div class="option-row"><input id="opt_${i}" placeholder="Option ${i+1}" value="${esc(o.option_text)}"><label><input type="radio" name="correct" value="${i}" ${o.is_correct?'checked':''}> Correct</label><span>${i+1}</span></div>`).join('')}</div><div class="field full"><label>Explanation</label><textarea id="q_explanation">${esc(r.explanation)}</textarea></div><div class="field"><label>Source</label><input id="q_source" value="${esc(r.source)}"></div><div class="field"><label><input type="checkbox" id="q_published" ${r.published?'checked':''}> Published</label></div></div><div class="actions"><button class="btn" id="saveQuiz">Save question</button><button class="btn secondary" id="cancel">Cancel</button></div><div id="saveMsg" class="msg"></div>`);document.querySelector('#saveQuiz').onclick=async()=>{const msg=document.querySelector('#saveMsg'),correct=Number(document.querySelector('input[name="correct"]:checked')?.value);const option_text=[0,1,2,3].map(i=>document.querySelector('#opt_'+i).value.trim());if(!document.querySelector('#q_question').value.trim()||option_text.some(x=>!x)||![0,1,2,3].includes(correct)){msg.textContent='Add a question, four options, and select one correct answer.';return}const payload={topic_id:document.querySelector('#q_topic').value||null,question:document.querySelector('#q_question').value.trim(),explanation:document.querySelector('#q_explanation').value.trim()||null,source:document.querySelector('#q_source').value.trim()||null,published:document.querySelector('#q_published').checked};let qid=r.id;if(qid){const res=await sb.from('quiz_questions').update(payload).eq('id',qid);if(res.error){msg.textContent=res.error.message;return}await sb.from('quiz_options').delete().eq('question_id',qid)}else{const res=await sb.from('quiz_questions').insert(payload).select('id').single();if(res.error){msg.textContent=res.error.message;return}qid=res.data.id}const opts=option_text.map((text,i)=>({question_id:qid,option_text:text,is_correct:i===correct,sort_order:i}));const or=await sb.from('quiz_options').insert(opts);if(or.error){msg.textContent=or.error.message;return}await refresh('quiz_questions');await refresh('quiz_options');closeModal();drawTable();renderMetrics()}}
function openGame(r={},presetType=null){
 const type=r.game_type||presetType||'author_work';
 const meta=gameTypes.find(g=>g.key===type)||gameTypes[0];
 let choices=Array.isArray(r.choices)?r.choices:[];
 showModal(`${r.id?'Edit':'Add'} ${meta.label} Question`,`
   <div class="game-editor-type"><span class="game-badge">${meta.badge}</span><div><strong>${meta.label}</strong><small>${meta.description}</small></div></div>
   <div class="form">
     <div class="field full"><label>Game category</label><select id="g_type">${gameTypes.map(g=>`<option value="${g.key}" ${g.key===type?'selected':''}>${g.label}</option>`).join('')}</select></div>
     <div class="field"><label>Topic</label><select id="g_topic">${relationOptions('topic',r.topic_id)}</select></div>
     <div class="field"><label>Correct answer</label><input id="g_answer" value="${esc(r.answer)}" placeholder="Exact correct answer"></div>
     <div class="field full"><label>Question / prompt</label><textarea id="g_prompt" placeholder="Write the question shown to students">${esc(r.prompt)}</textarea></div>
     <div class="field full"><label>Answer choices <span class="muted-inline">(one per line)</span></label><textarea class="choice-json" id="g_choices" placeholder="Option 1
Option 2
Option 3
Option 4">${esc(choices.join('\n'))}</textarea></div>
     <div class="field full"><label>Explanation</label><textarea id="g_explanation">${esc(r.explanation)}</textarea></div>
     <div class="field"><label>Source</label><input id="g_source" value="${esc(r.source)}"></div>
     <div class="field"><label><input type="checkbox" id="g_published" ${r.published?'checked':''}> Published</label></div>
   </div>
   <div class="actions"><button class="btn" id="saveGame">Save ${meta.label} question</button><button class="btn secondary" id="cancel">Cancel</button></div><div id="saveMsg" class="msg"></div>`);
 document.querySelector('#g_type').onchange=()=>{
   const selected=document.querySelector('#g_type').value;
   const m=gameTypes.find(g=>g.key===selected)||gameTypes[0];
   document.querySelector('.game-editor-type').innerHTML=`<span class="game-badge">${m.badge}</span><div><strong>${m.label}</strong><small>${m.description}</small></div>`;
 };
 document.querySelector('#saveGame').onclick=async()=>{
   const msg=document.querySelector('#saveMsg'),choiceText=document.querySelector('#g_choices').value.split('\n').map(x=>x.trim()).filter(Boolean);
   const selectedType=document.querySelector('#g_type').value;
   const payload={topic_id:document.querySelector('#g_topic').value||null,game_type:selectedType,prompt:document.querySelector('#g_prompt').value.trim(),answer:document.querySelector('#g_answer').value.trim(),choices:choiceText,explanation:document.querySelector('#g_explanation').value.trim()||null,source:document.querySelector('#g_source').value.trim()||null,published:document.querySelector('#g_published').checked};
   if(!payload.prompt||!payload.answer){msg.textContent='Question/prompt and correct answer are required.';return}
   if(payload.choices.length<2){msg.textContent='Add at least two answer choices.';return}
   if(!payload.choices.includes(payload.answer)){msg.textContent='The correct answer must exactly match one of the answer choices.';return}
   const res=r.id?await sb.from('game_questions').update(payload).eq('id',r.id):await sb.from('game_questions').insert(payload);
   if(res.error){msg.textContent=res.error.message;return}
   await refresh('game_questions');closeModal();renderGameManager(document.querySelector('#panel'));renderMetrics();
 };
}

function showModal(title,body){const m=document.querySelector('#modal');m.innerHTML=`<div class="modal-box"><div class="modal-head"><div><div class="eyebrow">CONTENT EDITOR</div><h2>${esc(title)}</h2></div><button class="close" id="x">×</button></div>${body}</div>`;m.classList.add('open');document.querySelector('#x').onclick=closeModal;document.querySelector('#cancel')?.addEventListener('click',closeModal)}
function closeModal(){document.querySelector('#modal')?.classList.remove('open')}
async function removeRow(k,id){const r=rows[k].find(x=>x.id===id);if(!confirm(`Delete “${displayTitle(k,r)}”? This cannot be undone.`))return;const res=await sb.from(configs[k].table).delete().eq('id',id);if(res.error){alert(res.error.message);return}await refresh(k);if(k==='quiz_questions')await refresh('quiz_options');if(k==='game_questions')renderGameManager(document.querySelector('#panel'));else drawTable();renderMetrics()}
async function refresh(k){let q=sb.from(k).select('*').limit(5000);const {data}=await q;rows[k]=data||[]}
window.openEditor=openEditor;window.removeRow=removeRow;
sb.auth.onAuthStateChange((_event,session)=>{if(!session){user=null;login()}});
boot();
