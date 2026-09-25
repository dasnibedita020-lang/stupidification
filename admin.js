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
const baseTabs=['dashboard','modules','topics','authors','works','characters','theorists','theories','concepts','learn_content','quiz_questions','flashcards','game_questions','bulk_import'];
const gameTypes=[
 {key:'author_work',label:'Author → Work',badge:'MATCH',description:'Given an author, identify a work.'},
 {key:'work_author',label:'Work → Author',badge:'MATCH',description:'Given a work, identify its author.'},
 {key:'work_date',label:'Work → Date',badge:'DATE',description:'Given a work, identify its date.'},
 {key:'author_work_date',label:'Author → Work + Date',badge:'DATE',description:'Match an author to the correct work and date.'},
 {key:'movement_writer',label:'Movement → Writer',badge:'MOVE',description:'Given a literary movement, identify a writer.'},
 {key:'writer_movement',label:'Writer → Movement',badge:'MOVE',description:'Given a writer, identify the associated movement.'},
 {key:'chronology',label:'Chronology',badge:'ORDER',description:'Put works in chronological order.'},
 {key:'period_classification',label:'Victorian vs Modernist',badge:'PERIOD',description:'Identify the literary period of a writer or work.'},
 {key:'who_am_i',label:'Who Am I?',badge:'CLUES',description:'Identify the writer from literary clues.'},
 {key:'full_stupidification',label:'Full Stupidification',badge:'BRUTAL',description:'Mix writer, work, date and movement.'},
 {key:'character_work',label:'Character ↔ Work',badge:'MATCH',description:'Connect a character to its work.'},
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
function render(){app.innerHTML=`<header class="top"><a class="brand" href="./">STUPIDIFICATION</a><div class="top-actions"><button class="btn secondary small" id="site">View site</button><button class="btn small" id="logout">Sign out</button></div></header><main class="wrap"><div class="eyebrow">ADMIN CONTENT MANAGEMENT</div><h1>Content dashboard</h1><p>Add and manage the material that powers Learn, Quiz, Flashcards, Games and Explore.</p><div class="dashboard" id="metrics"></div><div class="tabs">${baseTabs.map(t=>`<button class="tab ${active===t?'active':''}" data-tab="${t}">${t==='dashboard'?'Overview':t==='bulk_import'?'Bulk import':configs[t].label}</button>`).join('')}</div><div id="panel"></div></main><div class="modal" id="modal"></div>`;document.querySelector('#logout').onclick=async()=>{await sb.auth.signOut();login()};document.querySelector('#site').onclick=()=>location.href='./';document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.tab;gameFilter='all';document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));renderPanel()});renderMetrics();renderPanel()}
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
 if(active==='bulk_import'){
   renderBulkImport(panel);
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


const bulkSchemas={
 modules:{label:'Modules',required:['name'],headers:['name','sort_order']},
 topics:{label:'Topics',required:['name'],headers:['module','name','sort_order']},
 authors:{label:'Authors',required:['name'],headers:['name','birth_year','death_year','nationality','biography','notes']},
 works:{label:'Works',required:['title'],headers:['title','author','publication_year','publication_date','genre','description','notes']},
 characters:{label:'Characters',required:['name'],headers:['name','work','description']},
 theorists:{label:'Theorists',required:['name'],headers:['name','description']},
 theories:{label:'Theories',required:['name'],headers:['name','theorist','description','key_terms']},
 concepts:{label:'Concepts',required:['name'],headers:['name','definition','notes']},
 learn_content:{label:'Learn content',required:['title'],headers:['topic','title','body','source','published']},
 quiz_questions:{label:'Quiz questions',required:['question'],headers:['topic','question','option1','option2','option3','option4','correct_answer','explanation','source','published']},
 flashcards:{label:'Flashcards',required:['front','back'],headers:['topic','front','back','source','published']},
 game_questions:{label:'Game questions',required:['game_type','prompt','answer'],headers:['game_type','topic','prompt','answer','choices','explanation','source','published']}
};
let bulkParsedRows=[];
let bulkFileName='';
let bulkPreview=[];
function renderBulkImport(panel){
 panel.innerHTML=`
 <div class="bulk-head">
   <div><div class="eyebrow">BULK CONTENT IMPORT</div><h2>Import lots of content at once</h2><p>Upload a CSV or Excel file. The importer understands your existing Supabase structure, resolves topic/author/work names automatically, and can load large PYQ sets without entering them one by one.</p></div>
   <div class="bulk-head-actions"><button class="btn secondary" id="downloadTemplate">Download template</button></div>
 </div>
 <div class="bulk-grid">
   <div class="card bulk-card">
     <div class="step"><span>1</span><div><strong>Choose what you're importing</strong><small>For UGC NET PYQs, choose Quiz questions.</small></div></div>
     <div class="field"><label>Content type</label><select id="bulkType">${Object.entries(bulkSchemas).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></div>
     <div class="field"><label>Duplicate handling</label><label class="checkline"><input type="checkbox" id="bulkSkipDuplicates" checked> Skip exact duplicates</label></div>
     <div class="bulk-format" id="bulkFormat"></div>
   </div>
   <div class="card bulk-card">
     <div class="step"><span>2</span><div><strong>Upload CSV / Excel</strong><small>Accepted: .csv, .xlsx, .xls</small></div></div>
     <label class="file-drop" id="fileDrop"><input id="bulkFile" type="file" accept=".csv,.xlsx,.xls"><span class="upload-icon">↑</span><strong>Choose a file</strong><small id="fileName">No file selected</small></label>
     <div class="actions"><button class="btn" id="previewImport" disabled>Preview import</button><button class="btn secondary" id="clearImport">Clear</button></div>
     <div id="bulkMsg" class="msg"></div>
   </div>
 </div>
 <div class="card bulk-preview-card" id="bulkPreviewCard" style="display:none"></div>`;
 const typeEl=document.querySelector('#bulkType');
 typeEl.onchange=()=>{bulkParsedRows=[];bulkPreview=[];document.querySelector('#bulkPreviewCard').style.display='none';updateBulkFormat()};
 document.querySelector('#bulkFile').onchange=handleBulkFile;
 document.querySelector('#previewImport').onclick=previewBulkImport;
 document.querySelector('#clearImport').onclick=()=>renderBulkImport(panel);
 document.querySelector('#downloadTemplate').onclick=()=>downloadBulkTemplate(typeEl.value);
 updateBulkFormat();
}
function updateBulkFormat(){
 const type=document.querySelector('#bulkType')?.value||'quiz_questions';
 const s=bulkSchemas[type];
 const el=document.querySelector('#bulkFormat'); if(!el)return;
 el.innerHTML=`<div class="template-box"><strong>Columns for this import</strong><code>${s.headers.join(', ')}</code><small>Required: ${s.required.join(', ')}. Relation fields such as <b>topic</b>, <b>author</b>, <b>work</b> and <b>module</b> can use their names instead of UUIDs.</small></div>`;
}
async function handleBulkFile(e){
 const file=e.target.files?.[0]; if(!file)return;
 bulkFileName=file.name;
 document.querySelector('#fileName').textContent=file.name;
 document.querySelector('#previewImport').disabled=false;
 document.querySelector('#bulkMsg').textContent='File ready. Click Preview import.';
}
async function readBulkFile(file){
 const buf=await file.arrayBuffer();
 const wb=XLSX.read(buf,{type:'array',cellDates:false});
 const ws=wb.Sheets[wb.SheetNames[0]];
 return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
}
function normKey(v){return String(v??'').trim().toLowerCase().replace(/[\s\-]+/g,'_').replace(/[^a-z0-9_]/g,'')}
function cleanObject(row){const out={};Object.entries(row||{}).forEach(([k,v])=>out[normKey(k)]=typeof v==='string'?v.trim():v);return out}
function alias(row,names){for(const n of names){const k=normKey(n);if(row[k]!==undefined&&String(row[k]).trim()!=='')return row[k]}return ''}
function boolValue(v,def=false){if(v===undefined||v===null||String(v).trim()==='')return def;return ['true','1','yes','y','published','publish'].includes(String(v).trim().toLowerCase())}
function numberValue(v){if(v===undefined||v===null||String(v).trim()==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null}
function relationSource(type){return type==='module'?rows.modules:type==='topic'?rows.topics:type==='author'?rows.authors:type==='work'?rows.works:type==='theorist'?rows.theorists:[]}
function relationTitle(type){return type==='work'?'title':'name'}
function relationMatches(type,value){
 const v=String(value??'').trim().toLowerCase(); if(!v)return [];
 const source=relationSource(type),title=relationTitle(type);
 const exact=source.find(x=>String(x.id)===String(value)||String(x[title]??'').trim().toLowerCase()===v);
 if(exact)return [exact];
 const compact=v.replace(/[^a-z0-9]+/g,' ');
 const tokens=compact.split(/\s+/).filter(Boolean);
 const scored=source.map(x=>{const name=String(x[title]??'').trim().toLowerCase();const nt=name.replace(/[^a-z0-9]+/g,' ');let score=0;if(nt.includes(compact)||compact.includes(nt))score+=100;for(const t of tokens)if(t.length>2&&nt.includes(t))score+=10;return{x,score}}).filter(z=>z.score>0).sort((a,b)=>b.score-a.score);
 if(!scored.length)return [];
 const best=scored[0].score;
 return scored.filter(z=>z.score===best).slice(0,5).map(z=>z.x);
}
function relationId(type,value){const m=relationMatches(type,value);return m.length===1?m[0].id:null}
function relationLabel(type,value){const v=String(value??'').trim();if(!v)return '';const hit=relationSource(type).find(x=>String(x.id)===v);return hit?String(hit[relationTitle(type)]):v}
function gameTypeValue(v){
 const x=String(v??'').trim().toLowerCase();
 const hit=gameTypes.find(g=>g.key===x||g.label.toLowerCase()===x||g.label.toLowerCase().replace(/[^a-z0-9]+/g,'_')===x);
 return hit?.key||null;
}
function splitChoices(v){
 const s=String(v??'').trim(); if(!s)return [];
 return s.includes('\n')?s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):s.split('|').map(x=>x.trim()).filter(Boolean);
}
function parseBulkRecord(type,row,index){
 const r=cleanObject(row), err=[];
 const required=bulkSchemas[type].required;
 for(const key of required){if(!String(alias(r,[key])).trim())err.push(`missing ${key}`)}
 let payload={};
 if(type==='modules')payload={name:alias(r,['name']),sort_order:numberValue(alias(r,['sort_order','order']))};
 if(type==='topics'){
   payload={module_id:relationId('module',alias(r,['module','module_name','module_id'])),name:alias(r,['name']),sort_order:numberValue(alias(r,['sort_order','order']))};
   if(alias(r,['module','module_name','module_id'])&&!payload.module_id)err.push(`module not found: ${alias(r,['module','module_name','module_id'])}`);
 }
 if(type==='authors')payload={name:alias(r,['name']),birth_year:numberValue(alias(r,['birth_year','birth'])),death_year:numberValue(alias(r,['death_year','death'])),nationality:alias(r,['nationality']),biography:alias(r,['biography','bio']),notes:alias(r,['notes'])};
 if(type==='works'){
   const a=alias(r,['author','author_name','author_id']);payload={title:alias(r,['title']),author_id:relationId('author',a),publication_year:numberValue(alias(r,['publication_year','year'])),publication_date:alias(r,['publication_date','date']),genre:alias(r,['genre']),description:alias(r,['description']),notes:alias(r,['notes'])};
   if(a&&!payload.author_id)err.push(`author not found: ${a}`);
 }
 if(type==='characters'){
   const w=alias(r,['work','work_title','work_id']);payload={name:alias(r,['name']),work_id:relationId('work',w),description:alias(r,['description'])};if(w&&!payload.work_id)err.push(`work not found: ${w}`);
 }
 if(type==='theorists')payload={name:alias(r,['name']),description:alias(r,['description'])};
 if(type==='theories'){
   const t=alias(r,['theorist','theorist_name','theorist_id']);payload={name:alias(r,['name']),theorist_id:relationId('theorist',t),description:alias(r,['description']),key_terms:alias(r,['key_terms','keyterms'])};if(t&&!payload.theorist_id)err.push(`theorist not found: ${t}`);
 }
 if(type==='concepts')payload={name:alias(r,['name']),definition:alias(r,['definition']),notes:alias(r,['notes'])};
 if(type==='learn_content'){
   const t=alias(r,['topic','topic_name','topic_id']);payload={topic_id:relationId('topic',t),title:alias(r,['title']),body:alias(r,['body','content']),source:alias(r,['source']),published:boolValue(alias(r,['published','status']),false)};if(t&&!payload.topic_id){const candidates=relationMatches('topic',t);err.push(candidates.length>1?`topic needs selection: ${t}`:`topic not found: ${t}`)}
 }
 if(type==='quiz_questions'){
   const t=alias(r,['topic','topic_name','topic_id']);
   const opts=[alias(r,['option1','option_1','a','option_a']),alias(r,['option2','option_2','b','option_b']),alias(r,['option3','option_3','c','option_c']),alias(r,['option4','option_4','d','option_d'])];
   if(!opts.some(Boolean))opts.push(...splitChoices(alias(r,['options'])));
   while(opts.length<4)opts.push('');
   const correctRaw=String(alias(r,['correct_answer','correct','answer','correct_option'])).trim();
   let ci=-1;if(/^[1-4]$/.test(correctRaw))ci=Number(correctRaw)-1;else if(/^[a-d]$/i.test(correctRaw))ci=correctRaw.toLowerCase().charCodeAt(0)-97;else ci=opts.findIndex(x=>String(x).trim().toLowerCase()===correctRaw.toLowerCase());
   payload={topic_id:relationId('topic',t),question:alias(r,['question','prompt']),explanation:alias(r,['explanation']),source:alias(r,['source']),published:boolValue(alias(r,['published','status']),false),_options:opts.slice(0,4),_correct:ci};
   if(t&&!payload.topic_id){const candidates=relationMatches('topic',t);err.push(candidates.length>1?`topic needs selection: ${t}`:`topic not found: ${t}`)}if(payload._options.some(x=>!x))err.push('needs 4 options');if(ci<0||ci>3)err.push('correct_answer must be 1-4, A-D, or exact option text');
 }
 if(type==='flashcards'){
   const t=alias(r,['topic','topic_name','topic_id']);payload={topic_id:relationId('topic',t),front:alias(r,['front','question']),back:alias(r,['back','answer']),source:alias(r,['source']),published:boolValue(alias(r,['published','status']),false)};if(t&&!payload.topic_id){const candidates=relationMatches('topic',t);err.push(candidates.length>1?`topic needs selection: ${t}`:`topic not found: ${t}`)}
 }
 if(type==='game_questions'){
   const t=alias(r,['topic','topic_name','topic_id']),gt=gameTypeValue(alias(r,['game_type','game','category']));
   payload={topic_id:relationId('topic',t),game_type:gt,prompt:alias(r,['prompt','question']),answer:alias(r,['answer','correct_answer']),choices:splitChoices(alias(r,['choices','options'])),explanation:alias(r,['explanation']),source:alias(r,['source']),published:boolValue(alias(r,['published','status']),false)};
   if(!gt)err.push('unknown game_type');if(t&&!payload.topic_id){const candidates=relationMatches('topic',t);err.push(candidates.length>1?`topic needs selection: ${t}`:`topic not found: ${t}`)}if(payload.choices.length<2)err.push('needs at least 2 choices');if(payload.answer&&!payload.choices.includes(payload.answer))err.push('answer must exactly match one choice');
 }
 return {row:r,payload,error:err.join('; '),rowNumber:index+2};
}
function duplicateExists(type,payload){
 const key=type==='works'?'title':type==='learn_content'?'title':type==='quiz_questions'?'question':type==='flashcards'?'front':type==='game_questions'?'prompt':'name';
 const value=String(payload[key]??'').trim().toLowerCase(); if(!value)return false;
 return (rows[type]||[]).some(x=>String(x[key]??'').trim().toLowerCase()===value);
}
async function previewBulkImport(){
 const file=document.querySelector('#bulkFile').files?.[0],type=document.querySelector('#bulkType').value,msg=document.querySelector('#bulkMsg');
 if(!file){msg.textContent='Choose a CSV or Excel file first.';return}
 msg.textContent='Reading file…';
 try{
   const raw=await readBulkFile(file);bulkParsedRows=raw.map((r,i)=>parseBulkRecord(type,r,i));
   const skip=document.querySelector('#bulkSkipDuplicates').checked;
   const dupCount=bulkParsedRows.filter(x=>!x.error&&skip&&duplicateExists(type,x.payload)).length;
   bulkPreview=bulkParsedRows.slice(0,12);
   const valid=bulkParsedRows.filter(x=>!x.error).length,invalid=bulkParsedRows.length-valid;
   renderBulkPreview(type,bulkParsedRows,valid,invalid,dupCount);
   msg.textContent=`Loaded ${bulkParsedRows.length} row${bulkParsedRows.length===1?'':'s'} from ${bulkFileName}.`;
 }catch(e){msg.textContent=`Could not read file: ${e.message}`}
}
function fixBulkRelation(rowNumber,type,value){
 const item=bulkParsedRows.find(x=>x.rowNumber===Number(rowNumber));if(!item)return;
 if(type==='topic'){const id=relationId('topic',value);item.payload.topic_id=id||null;item.error=item.error.replace(/topic (not found|needs selection):[^;]*/i,'').replace(/^;\s*|;\s*$/g,'').trim();}
 const valid=bulkParsedRows.filter(x=>!x.error).length,invalid=bulkParsedRows.length-valid;
 const dupCount=bulkParsedRows.filter(x=>!x.error&&document.querySelector('#bulkSkipDuplicates')?.checked&&duplicateExists(type,x.payload)).length;
 renderBulkPreview(type,bulkParsedRows,valid,invalid,dupCount);
}
function renderBulkPreview(type,data,valid,invalid,dupCount){
 const card=document.querySelector('#bulkPreviewCard');card.style.display='block';
 const schema=bulkSchemas[type];
 card.innerHTML=`<div class="bulk-preview-head"><div><div class="eyebrow">STEP 3 · PREVIEW</div><h2>${schema.label}</h2><p>${data.length} rows loaded · <span class="good-text">${valid} valid</span> · <span class="bad-text">${invalid} invalid</span>${dupCount?` · ${dupCount} exact duplicate${dupCount===1?'':'s'} will be skipped`:''}</p></div><button class="btn" id="startBulkImport" ${valid?'':'disabled'}>Import ${valid} row${valid===1?'':'s'}</button></div>
 <div class="bulk-errors">${data.filter(x=>x.error).slice(0,8).map(x=>`<div><strong>Row ${x.rowNumber}:</strong> ${esc(x.error)}</div>`).join('')||'<span>No validation errors in the preview.</span>'}</div>
 <div class="table-wrap"><table class="table bulk-table"><thead><tr><th>Row</th><th>Preview</th><th>Topic / relation</th><th>Status</th></tr></thead><tbody>${data.slice(0,12).map(x=>{const p=x.payload;const title=p.question||p.prompt||p.title||p.name||p.front||'—';const rel=relationLabel('topic',p.topic_id)||relationLabel('author',p.author_id)||relationLabel('work',p.work_id)||'';const rawTopic=alias(x.row,['topic','topic_name','topic_id']);const needsTopic=x.error&&/topic (not found|needs selection):/i.test(x.error);const choices=needsTopic?relationMatches('topic',rawTopic):[];const ui=needsTopic&&choices.length?`<select class="bulk-relation-select" onchange="fixBulkRelation(${x.rowNumber},'topic',this.value)"><option value="">Select matching topic…</option>${choices.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>`:(rel||'—');return `<tr><td>${x.rowNumber}</td><td><strong>${esc(String(title).slice(0,180))}</strong></td><td>${ui}</td><td>${x.error?`<span class="pill no">${esc(x.error)}</span>`:'<span class="pill ok">Ready</span>'}</td></tr>`}).join('')}</tbody></table></div>`;
 document.querySelector('#startBulkImport')?.addEventListener('click',()=>runBulkImport(type));
}
async function runBulkImport(type){
 const btn=document.querySelector('#startBulkImport'),msg=document.querySelector('#bulkMsg'),skip=document.querySelector('#bulkSkipDuplicates').checked;
 if(!btn)return;btn.disabled=true;btn.textContent='Importing…';
 const valid=bulkParsedRows.filter(x=>!x.error&&!((skip)&&duplicateExists(type,x.payload)));
 let imported=0,skipped=bulkParsedRows.length-valid.length,failed=[];
 const batch=type==='quiz_questions'?50:100;
 for(let i=0;i<valid.length;i+=batch){
   const chunk=valid.slice(i,i+batch);
   if(type==='quiz_questions'){
     const qRows=chunk.map(x=>{const p={...x.payload};delete p._options;delete p._correct;return p});
     const qr=await sb.from('quiz_questions').insert(qRows).select('id');
     if(qr.error){
       for(const x of chunk){const p={...x.payload};const opts=p._options,ci=p._correct;delete p._options;delete p._correct;const one=await sb.from('quiz_questions').insert(p).select('id').single();if(one.error){failed.push(`Row ${x.rowNumber}: ${one.error.message}`);continue}const or=await sb.from('quiz_options').insert(opts.map((t,j)=>({question_id:one.data.id,option_text:t,is_correct:j===ci,sort_order:j})));if(or.error){failed.push(`Row ${x.rowNumber}: ${or.error.message}`);continue}imported++}
     }else{
       const options=[];qr.data.forEach((q,j)=>{const x=chunk[j],p=x.payload;x.payload._options.forEach((t,k)=>options.push({question_id:q.id,option_text:t,is_correct:k===p._correct,sort_order:k}))});
       const or=await sb.from('quiz_options').insert(options);if(or.error){failed.push(`Quiz options batch: ${or.error.message}`);}
       else imported+=chunk.length;
     }
   }else{
     const clean=chunk.map(x=>x.payload);
     const r=await sb.from(type).insert(clean);
     if(r.error){for(const x of chunk){const one=await sb.from(type).insert(x.payload);if(one.error)failed.push(`Row ${x.rowNumber}: ${one.error.message}`);else imported++}}
     else imported+=chunk.length;
   }
   msg.textContent=`Imported ${imported} of ${valid.length} rows…`;
 }
 await loadRelations();
 const card=document.querySelector('#bulkPreviewCard');
 card.querySelector('.bulk-preview-head').innerHTML=`<div><div class="eyebrow">IMPORT COMPLETE</div><h2>${imported} imported</h2><p>${skipped} skipped · ${failed.length} failed</p></div><button class="btn secondary" id="newBulkImport">Import another file</button>`;
 card.querySelector('.bulk-errors').innerHTML=failed.length?failed.slice(0,20).map(x=>`<div>${esc(x)}</div>`).join(''):'<span>Everything else imported successfully.</span>';
 document.querySelector('#newBulkImport').onclick=()=>renderBulkImport(document.querySelector('#panel'));
 renderMetrics();
}
function downloadBulkTemplate(type){
 const s=bulkSchemas[type||document.querySelector('#bulkType')?.value||'quiz_questions'];
 const sample={};s.headers.forEach(h=>sample[h]='');
 if(type==='quiz_questions'||(!type&&document.querySelector('#bulkType')?.value==='quiz_questions')){Object.assign(sample,{question:'Example question',option1:'Option A',option2:'Option B',option3:'Option C',option4:'Option D',correct_answer:'A',published:'false'});}
 if((type||document.querySelector('#bulkType')?.value)==='game_questions')Object.assign(sample,{game_type:'author_work',prompt:'Example prompt',answer:'Correct answer',choices:'Choice 1|Choice 2|Choice 3|Choice 4',published:'false'});
 const ws=XLSX.utils.json_to_sheet([sample]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Import');XLSX.writeFile(wb,`stupidification_${type||document.querySelector('#bulkType')?.value}_template.xlsx`);
}

function showModal(title,body){const m=document.querySelector('#modal');m.innerHTML=`<div class="modal-box"><div class="modal-head"><div><div class="eyebrow">CONTENT EDITOR</div><h2>${esc(title)}</h2></div><button class="close" id="x">×</button></div>${body}</div>`;m.classList.add('open');document.querySelector('#x').onclick=closeModal;document.querySelector('#cancel')?.addEventListener('click',closeModal)}
function closeModal(){document.querySelector('#modal')?.classList.remove('open')}
async function removeRow(k,id){const r=rows[k].find(x=>x.id===id);if(!confirm(`Delete “${displayTitle(k,r)}”? This cannot be undone.`))return;const res=await sb.from(configs[k].table).delete().eq('id',id);if(res.error){alert(res.error.message);return}await refresh(k);if(k==='quiz_questions')await refresh('quiz_options');if(k==='game_questions')renderGameManager(document.querySelector('#panel'));else drawTable();renderMetrics()}
async function refresh(k){let q=sb.from(k).select('*').limit(5000);const {data}=await q;rows[k]=data||[]}
window.openEditor=openEditor;window.removeRow=removeRow;window.fixBulkRelation=fixBulkRelation;
sb.auth.onAuthStateChange((_event,session)=>{if(!session){user=null;login()}});
boot();
