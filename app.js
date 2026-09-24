/* STUPIDIFICATION v0.6 — Supabase-backed frontend + fixed UUID routing */
const SUPABASE_URL='https://crndztiqvghsvtbprsrn.supabase.co';
const SUPABASE_KEY='sb_publishable_xXimMadw55KUp9KEglRc9Q_J1lnZ513';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const app=document.querySelector('#app');
let route=location.hash.slice(1)||'home';
let modules=[],topics=[],quizData=[],cardsData=[],authorsData=[],worksData=[],theoriesData=[],theoristsData=[],conceptsData=[];
let state=JSON.parse(localStorage.getItem('stupidificationState')||'null')||{quizAttempts:0,quizCorrect:0,wrong:[],cardRatings:{},gamesPlayed:0};
let quizQueue=[],quizIndex=0,currentQuiz=null,quizAnswered=false,cardQueue=[],cardIndex=0,cardFlipped=false,gamePairs=[],gameSelected=null,gameMatched=[];

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&#38;','<':'&#60;','>':'&#62;',"'":'&#39;','"':'&#34;'}[c]));
const save=()=>localStorage.setItem('stupidificationState',JSON.stringify(state));
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const shell=(head,sub)=>`<section class="page-head"><div class="eyebrow">STUPIDIFICATION · ${head.toUpperCase()}</div><h1 class="page-title">${head}</h1><p class="page-intro">${sub}</p></section>`;
function setActive(){document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===route.split('-')[0]))}
function feature(tag,title,text,href){return `<a class="card" href="${href}" style="text-decoration:none;color:inherit"><span class="tag">${tag}</span><h2>${title}</h2><p>${text}</p><span class="arrow">Open →</span></a>`}

function home(){
 app.innerHTML=`<section class="hero"><div class="hero-copy"><div class="eyebrow">ENGLISH LITERATURE · LEARNING SYSTEM</div><h1>Stop memorising.<br><em>Start connecting.</em></h1><p>Choose one thing. Learn it clearly. Test it. Play with it. Come back to what you forgot. STUPIDIFICATION is an adaptive literature-learning system built for students who are tired of drowning in disconnected facts.</p><div class="hero-actions"><a class="btn" href="#learn">Start learning</a><a class="btn secondary" href="#quiz">Take a quiz</a></div></div></section><div class="flower-line"></div><div class="grid">${feature('LEARN','Knowledge building','Move from module → topic → concept with the same database powering practice.','#learn')}${feature('QUIZ','Test yourself','Four options, instant explanations and randomized practice.','#quiz')}${feature('FLASHCARDS','Remember','Rate cards Hard, Good or Easy so repetition can adapt.','#flashcards')}${feature('GAMES','Play with literature','Match authors, works, dates and theories.','#games')}${feature('EXPLORE','Connect the dots','Search the growing knowledge graph of literature and theory.','#explore')}${feature('PROGRESS','See what you know','Track your practice now; cloud progress will follow with accounts.','#progress')}</div>`
}

async function loadData(){
 const [m,t,q,f,a,w,th,ty,c]=await Promise.all([
  sb.from('modules').select('*').order('sort_order'),
  sb.from('topics').select('*').order('sort_order'),
  sb.from('quiz_questions').select('*, quiz_options(*)').eq('published',true),
  sb.from('flashcards').select('*').eq('published',true),
  sb.from('authors').select('*').order('name'),
  sb.from('works').select('*, authors(name)').order('title'),
  sb.from('theories').select('*, theorists(name)').order('name'),
  sb.from('theorists').select('*').order('name'),
  sb.from('concepts').select('*').order('name')
 ]);
 modules=m.data||[]; topics=t.data||[]; quizData=q.data||[]; cardsData=f.data||[];
 authorsData=a.data||[]; worksData=w.data||[]; theoriesData=th.data||[];
 theoristsData=ty.data||[]; conceptsData=c.data||[];
}

/* ---------- LEARN ---------- */
function learn(){
 app.innerHTML=shell('Learn','Choose a module, then a topic. The same taxonomy powers learning, practice and games.');
 app.innerHTML+=`<div class="grid">${modules.map((m,i)=>`<a class="card" href="#learn-${encodeURIComponent(m.id)}" style="text-decoration:none;color:inherit"><span class="tag">MODULE ${String(i+1).padStart(2,'0')}</span><h2>${esc(m.name)}</h2><p>${topics.filter(t=>t.module_id===m.id).length} topics</p><span class="arrow">Browse topics →</span></a>`).join('')}</div>`
}
function learnModule(id){
 const m=modules.find(x=>x.id===id);
 if(!m)return learn();
 const ts=topics.filter(t=>t.module_id===id);
 app.innerHTML=shell(m.name,'Choose a topic. Knowledge pages will contain explanations, key terms, authors, works, examples and related concepts.');
 app.innerHTML+=`<div class="grid">${ts.map((t,i)=>`<a class="card" href="#learn-topic-${encodeURIComponent(t.id)}" style="text-decoration:none;color:inherit"><span class="tag">TOPIC ${String(i+1).padStart(2,'0')}</span><h2>${esc(t.name)}</h2><p>Knowledge building · quiz · cards · games</p><span class="arrow">Open topic →</span></a>`).join('')}</div>`
}
function learnTopic(id){
 const t=topics.find(x=>x.id===id);
 if(!t){learn();return}
 const contents=window.learnCache?.filter(x=>x.topic_id===id)||[];
 app.innerHTML=shell(t.name,'Learn the concept, then test and review it.');
 app.innerHTML+=contents.length
  ? contents.map(x=>`<article class="card"><span class="tag">LEARN</span><h2>${esc(x.title)}</h2><p>${esc(x.body).replaceAll('\n','<br>')}</p>${x.source?`<p><small>Source: ${esc(x.source)}</small></p>`:''}</article>`).join('')
  : `<div class="empty"><strong>No learning content here yet.</strong><p>This topic is ready for content. Add it from the admin panel.</p><a class="btn" href="#quiz-category-${encodeURIComponent(t.module_id)}">Practice instead</a></div>`
}

/* ---------- QUIZ / FLASHCARDS ---------- */
function topicCards(mode){
 app.innerHTML=shell(mode==='quiz'?'Quiz':'Flashcards',`Choose a module and topic. ${mode==='quiz'?'Questions are randomized and missed questions return in the session.':'Cards are shuffled and weighted by difficulty.'}`);
 app.innerHTML+=`<div class="grid">${modules.map(m=>`<a class="card" href="#${mode}-category-${encodeURIComponent(m.id)}" style="text-decoration:none;color:inherit"><span class="tag">MODULE</span><h2>${esc(m.name)}</h2><p>${topics.filter(t=>t.module_id===m.id).length} topics</p><span class="arrow">Choose topic →</span></a>`).join('')}</div>`
}
function topicCategory(mode,id){
 const m=modules.find(x=>x.id===id);
 if(!m)return topicCards(mode);
 const ts=topics.filter(t=>t.module_id===id);
 app.innerHTML=shell(`${mode==='quiz'?'Quiz':'Flashcards'} · ${m.name}`,'Choose a topic.');
 app.innerHTML+=`<div class="grid">${ts.map(t=>`<a class="card" href="#${mode}-topic-${encodeURIComponent(t.id)}" style="text-decoration:none;color:inherit"><span class="tag">TOPIC</span><h2>${esc(t.name)}</h2><p>${mode==='quiz'?'Start quiz →':'Start flashcards →'}</p></a>`).join('')}</div>`
}
function selectedTopic(mode,tid){
 const t=topics.find(x=>x.id===tid);
 if(!t){topicCards(mode);return}
 if(mode==='quiz')startQuiz(t);else prepareCards(t);
}
function startQuiz(topic){
 const usable=quizData.filter(q=>q.topic_id===topic.id).map(q=>({...q,topic:topic.name,o:(q.quiz_options||[]).map(x=>x.option_text),a:(q.quiz_options||[]).find(x=>x.is_correct)?.option_text,e:q.explanation||''}));
 const wrong=usable.filter(q=>state.wrong.includes(q.id));
 quizQueue=shuffle([...usable,...wrong]);quizIndex=0;quizAnswered=false;renderQuiz(topic);
}
function renderQuiz(topic){
 if(!quizQueue.length){app.innerHTML=shell('Quiz',topic.name)+`<div class="empty"><strong>No quiz questions here yet.</strong><p>Add published questions for this topic from Admin.</p></div>`;return}
 currentQuiz=quizQueue[quizIndex%quizQueue.length];
 const opts=shuffle(currentQuiz.o);
 app.innerHTML=shell('Quiz',`${esc(topic.name)} · Four-option practice.`)+`<div class="quiz-wrap"><div class="quiz-meta"><span>${quizIndex+1} / ${quizQueue.length}</span><span>${esc(topic.name)}</span></div><h2 class="quiz-question">${esc(currentQuiz.question)}</h2><div class="options">${opts.map(o=>`<button class="option" data-answer="${esc(o)}">${esc(o)}</button>`).join('')}</div><div id="quizFeedback"></div></div>`;
 document.querySelectorAll('.option').forEach(b=>b.onclick=()=>answerQuiz(b,currentQuiz,topic))
}
async function answerQuiz(btn,q,topic){
 if(quizAnswered)return;
 quizAnswered=true;
 const chosen=btn.dataset.answer,correct=chosen===q.a;
 state.quizAttempts++;
 if(correct)state.quizCorrect++;else if(!state.wrong.includes(q.id))state.wrong.push(q.id);
 save();
 document.querySelectorAll('.option').forEach(b=>{b.disabled=true;if(b.dataset.answer===q.a)b.classList.add('correct')});
 if(!correct)btn.classList.add('wrong');
 app.querySelector('#quizFeedback').innerHTML=`<div class="feedback"><strong>${correct?'✓ Correct':'✗ Not quite'}</strong><p>${esc(q.e)}</p><button class="btn" id="nextQuiz">${quizIndex+1===quizQueue.length?'New round':'Next question →'}</button></div>`;
 document.querySelector('#nextQuiz').onclick=()=>{quizIndex++;quizAnswered=false;if(quizIndex>=quizQueue.length)startQuiz(topic);else renderQuiz(topic)}
}
function prepareCards(topic){
 const base=cardsData.filter(c=>c.topic_id===topic.id),weighted=[];
 base.forEach(c=>{const r=state.cardRatings[c.id]||'new',w=r==='hard'?4:r==='good'?2:r==='easy'?1:3;for(let i=0;i<w;i++)weighted.push(c)});
 cardQueue=shuffle(weighted);cardIndex=0;cardFlipped=false;renderCard(topic);
}
function renderCard(topic){
 if(!cardQueue.length){app.innerHTML=shell('Flashcards',topic.name)+`<div class="empty"><strong>No flashcards here yet.</strong><p>Add published cards for this topic from Admin.</p></div>`;return}
 const c=cardQueue[cardIndex%cardQueue.length];
 app.innerHTML=shell('Flashcards',`${esc(topic.name)} · Flip, then rate the card.`)+`<div class="flash-wrap"><div class="quiz-meta"><span>Card ${cardIndex+1} / ${cardQueue.length}</span><span>${esc(topic.name)}</span></div><div class="flashcard ${cardFlipped?'flipped':''}" id="flashcard"><div class="flash-inner"><div class="flash-content">${cardFlipped?`<strong>${esc(c.back)}</strong>`:`<strong>${esc(c.front)}</strong><span class="flash-hint">Tap to reveal</span>`}</div></div></div>${cardFlipped?`<div class="rating-row"><button class="rating" data-rate="hard">Hard · show again</button><button class="rating" data-rate="good">Good</button><button class="rating" data-rate="easy">Easy</button></div>`:''}</div>`;
 document.querySelector('#flashcard').onclick=()=>{cardFlipped=!cardFlipped;renderCard(topic)};
 document.querySelectorAll('.rating').forEach(b=>b.onclick=()=>rateCard(c,b.dataset.rate,topic))
}
function rateCard(c,r,topic){state.cardRatings[c.id]=r;save();cardIndex++;cardFlipped=false;if(cardIndex>=cardQueue.length)prepareCards(topic);else renderCard(topic)}

/* ---------- GAMES ---------- */
function games(){app.innerHTML=shell('Games','Choose a game. Each round is randomized and draws from the same database.');app.innerHTML+=`<div class="grid">${feature('MATCH','Author ↔ Work','Connect writers with their works.','#game-match')}${feature('MATCH','Work ↔ Date','Match works with publication dates.','#game-date')}${feature('ORDER','Chronology','Arrange works from earliest to latest.','#game-chronology')}${feature('MATCH','Theory ↔ Theorist','Connect theories with their key thinkers.','#game-theory')}</div>`}
function gameMatch(kind){const source=worksData.filter(w=>w.publication_year).slice(0,8);const pairs=shuffle(source).map((w,i)=>({id:String(i),left:kind==='date'?w.title:(w.authors?.name||'Unknown'),right:kind==='date'?String(w.publication_year):w.title}));gamePairs=shuffle(pairs.flatMap(p=>[{id:p.id,side:'left',text:p.left},{id:p.id,side:'right',text:p.right}]));gameSelected=null;gameMatched=[];state.gamesPlayed++;save();renderMatchGame(kind,pairs)}
function renderMatchGame(kind,pairs){app.innerHTML=shell(kind==='date'?'Work ↔ Date':'Author ↔ Work','Click two tiles to match them.')+`<div class="game-score">Matched <strong>${gameMatched.length}</strong> / ${pairs.length}</div><div class="game-board">${gamePairs.map((x,i)=>`<button class="game-tile ${gameMatched.includes(x.id)?'matched':''} ${gameSelected===i?'selected':''}" data-i="${i}">${esc(x.text)}</button>`).join('')}</div>`;document.querySelectorAll('.game-tile').forEach(b=>b.onclick=()=>matchClick(+b.dataset.i,pairs,kind))}
function matchClick(i,pairs,kind){if(gameMatched.includes(gamePairs[i].id))return;if(gameSelected===null){gameSelected=i;renderMatchGame(kind,pairs);return}const a=gamePairs[gameSelected],b=gamePairs[i];if(a.id===b.id&&a.side!==b.side)gameMatched.push(a.id);gameSelected=null;renderMatchGame(kind,pairs)}
function chronology(){const items=shuffle(worksData.filter(w=>w.publication_year).slice(0,5));let selected=[];app.innerHTML=shell('Chronology','Click the works in chronological order.');app.innerHTML+=`<div class="card"><p>Selected order: <span id="selectedOrder">—</span></p><div class="grid">${items.map((x,i)=>`<button class="game-tile" data-i="${i}">${esc(x.title)}<br><small>${x.publication_year}</small></button>`).join('')}</div><div id="chronoResult"></div></div>`;document.querySelectorAll('.game-tile').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(selected.includes(i))return;selected.push(i);b.classList.add('selected');document.querySelector('#selectedOrder').textContent=selected.map(i=>items[i].title).join(' → ');if(selected.length===items.length){const years=selected.map(i=>items[i].publication_year);const ok=years.every((v,j)=>j===0||v>=years[j-1]);document.querySelector('#chronoResult').innerHTML=`<div class="feedback"><strong>${ok?'✓ Correct chronology':'✗ Try again'}</strong><p>${ok?'Excellent.':'The order runs from earliest to latest publication year.'}</p><button class="btn" onclick="location.hash='game-chronology'">New round</button></div>`}})}
function gameTheory(){const pairs=shuffle(theoriesData.filter(x=>x.theorist_id&&x.theorists).slice(0,8));app.innerHTML=shell('Theory ↔ Theorist','The database now supplies theories and theorists. A richer game interface will expand from these records.');app.innerHTML+=pairs.length?`<div class="grid">${pairs.map(x=>`<div class="card"><span class="tag">THEORY</span><h2>${esc(x.name)}</h2><p>${esc(x.theorists.name)}</p></div>`).join('')}`:`<div class="empty">Add theories and theorists from Admin to populate this game.</div>`}

/* ---------- EXPLORE / PROGRESS ---------- */
function explore(){
 app.innerHTML=shell('Explore','Search authors, works, theories and concepts across the growing knowledge graph.');
 app.innerHTML+=`<input class="search" id="search" placeholder="Search author, work, theory, concept…"><div id="results"></div>`;
 const draw=()=>{const q=document.querySelector('#search').value.toLowerCase();const a=authorsData.filter(x=>x.name.toLowerCase().includes(q)),w=worksData.filter(x=>[x.title,x.authors?.name].join(' ').toLowerCase().includes(q)),t=theoriesData.filter(x=>x.name.toLowerCase().includes(q)),c=conceptsData.filter(x=>x.name.toLowerCase().includes(q));document.querySelector('#results').innerHTML=`<div class="grid">${a.map(x=>`<div class="card"><span class="tag">AUTHOR</span><h2>${esc(x.name)}</h2><p>${x.birth_year||''}${x.death_year?'–'+x.death_year:''}</p></div>`).join('')}${w.map(x=>`<div class="card"><span class="tag">WORK</span><h2>${esc(x.title)}</h2><p>${esc(x.authors?.name||'')} · ${x.publication_year||''}</p></div>`).join('')}${t.map(x=>`<div class="card"><span class="tag">THEORY</span><h2>${esc(x.name)}</h2><p>${esc(x.theorists?.name||'')}</p></div>`).join('')}${c.map(x=>`<div class="card"><span class="tag">CONCEPT</span><h2>${esc(x.name)}</h2><p>${esc(x.definition||'')}</p></div>`).join('')||'<div class="empty">No matching records.</div>'}</div>`};
 document.querySelector('#search').oninput=draw;draw()
}
function progress(){const accuracy=state.quizAttempts?Math.round(state.quizCorrect/state.quizAttempts*100):0;const hard=Object.values(state.cardRatings).filter(x=>x==='hard').length;app.innerHTML=shell('Progress','Local practice stats are shown here for now. Account-based cloud progress will be added alongside authentication.');app.innerHTML+=`<div class="grid"><div class="card"><span class="tag">QUIZ</span><div class="stat">${accuracy}%</div><p>Current quiz accuracy</p><div class="progress-bar"><div class="progress-fill" style="width:${accuracy}%"></div></div></div><div class="card"><span class="tag">REPETITION</span><div class="stat">${state.wrong.length}</div><p>Questions marked for repetition</p></div><div class="card"><span class="tag">FLASHCARDS</span><div class="stat">${hard}</div><p>Cards rated Hard</p></div><div class="card"><span class="tag">GAMES</span><div class="stat">${state.gamesPlayed}</div><p>Game rounds played</p></div></div>`}

/* ---------- ADMIN CMS ---------- */
let adminEditId=null;
let adminTabName='authors';

const adminConfig={
 authors:{label:'Authors',table:'authors',fields:[
  ['name','Name','text',true],['birth_year','Birth year','number'],['death_year','Death year','number'],['nationality','Nationality','text'],['biography','Biography','textarea'],['notes','Notes','textarea']
 ]},
 works:{label:'Works',table:'works',fields:[
  ['title','Title','text',true],['author_id','Author','author'],['publication_year','Publication year','number'],['publication_date','Publication date','text'],['genre','Genre','text'],['description','Description','textarea'],['notes','Notes','textarea']
 ]},
 characters:{label:'Characters',table:'characters',fields:[
  ['name','Name','text',true],['work_id','Work','work'],['description','Description','textarea']
 ]},
 movements:{label:'Movements',table:'movements',fields:[
  ['name','Name','text',true],['period','Period','text'],['description','Description','textarea']
 ]},
 theorists:{label:'Theorists',table:'theorists',fields:[
  ['name','Name','text',true],['description','Description','textarea']
 ]},
 theories:{label:'Theories',table:'theories',fields:[
  ['name','Theory name','text',true],['theorist_id','Theorist','theorist'],['description','Description','textarea'],['key_terms','Key terms','textarea']
 ]},
 concepts:{label:'Concepts',table:'concepts',fields:[
  ['name','Name','text',true],['definition','Definition','textarea'],['notes','Notes','textarea']
 ]},
 learn_content:{label:'Learn Pages',table:'learn_content',content:true,fields:[
  ['topic_id','Topic','topic'],['title','Page title','text',true],['body','Page content','textarea',true],['source','Source','text'],['published','Published','checkbox']
 ]},
 quiz_questions:{label:'Quiz Questions',table:'quiz_questions',content:true,quiz:true,fields:[
  ['topic_id','Topic','topic'],['question','Question','textarea',true],['explanation','Explanation','textarea'],['source','Source','text'],['published','Published','checkbox']
 ]},
 flashcards:{label:'Flashcards',table:'flashcards',content:true,fields:[
  ['topic_id','Topic','topic'],['front','Front','text',true],['back','Back','textarea',true],['source','Source','text'],['published','Published','checkbox']
 ]},
 game_questions:{label:'Game Questions',table:'game_questions',content:true,fields:[
  ['topic_id','Topic','topic'],['game_type','Game type','text',true],['prompt','Prompt','textarea',true],['answer','Answer','text',true],['choices','Choices (JSON)','textarea'],['explanation','Explanation','textarea'],['source','Source','text'],['published','Published','checkbox']
 ]}
};

function admin(){app.innerHTML=shell('Admin','Private content management for STUPIDIFICATION. Create, edit, publish, unpublish and delete your literature database records.');app.innerHTML+=`<div id="adminRoot"></div>`;renderAdmin()}

async function renderAdmin(){
 const {data:{session}}=await sb.auth.getSession();
 const root=document.querySelector('#adminRoot');
 if(!session){
  root.innerHTML=`<div class="card" style="max-width:520px;margin:auto"><span class="tag">ADMIN LOGIN</span><h2>Enter the library</h2><p>Use your Supabase account. If this is the first account, you can claim the first admin seat.</p><input class="search" id="email" type="email" placeholder="Email"><input class="search" id="password" type="password" placeholder="Password"><div class="hero-actions"><button class="btn" id="login">Sign in</button><button class="btn secondary" id="signup">Create account</button></div><div id="authMsg"></div></div>`;
  document.querySelector('#login').onclick=authLogin;document.querySelector('#signup').onclick=authSignup;return;
 }
 const {data:profile}=await sb.from('profiles').select('is_admin,display_name').eq('id',session.user.id).single();
 if(!profile?.is_admin){
  root.innerHTML=`<div class="empty"><strong>Your account is not an admin yet.</strong><p>If you are the owner and this is the first account, click below to claim the first admin seat.</p><button class="btn" id="claim">Claim first admin</button> <button class="btn secondary" id="logout">Sign out</button><div id="adminMsg"></div></div>`;
  document.querySelector('#claim').onclick=async()=>{const {data,error}=await sb.rpc('claim_first_admin');document.querySelector('#adminMsg').innerHTML=error?`<p>${esc(error.message)}</p>`:`<p>${data?'Admin access granted. Refreshing…':'No admin seat available.'}</p>`;if(data)setTimeout(renderAdmin,600)};
  document.querySelector('#logout').onclick=()=>sb.auth.signOut().then(renderAdmin);return;
 }
 root.innerHTML=adminDashboard(session.user);wireAdmin();
}

async function authLogin(){const email=document.querySelector('#email').value,password=document.querySelector('#password').value,msg=document.querySelector('#authMsg');const {error}=await sb.auth.signInWithPassword({email,password});msg.innerHTML=error?`<p>${esc(error.message)}</p>`:'<p>Signed in.</p>';if(!error)renderAdmin()}
async function authSignup(){const email=document.querySelector('#email').value,password=document.querySelector('#password').value,msg=document.querySelector('#authMsg');const {error}=await sb.auth.signUp({email,password});msg.innerHTML=error?`<p>${esc(error.message)}</p>`:'<p>Account created. If email confirmation is enabled, confirm your email, then sign in.</p>'}

function adminDashboard(user){
 const tabs=Object.entries(adminConfig).map(([key,c],i)=>`<button class="btn ${i?'secondary':''}" data-tab="${key}">${c.label}</button>`).join('');
 return `<div class="card"><div class="section-bar"><div><span class="tag">CONTENT CONTROL</span><h2>Admin dashboard</h2><p>${esc(user.email)}</p></div><button class="btn secondary" id="logout">Sign out</button></div><div class="filters" style="flex-wrap:wrap">${tabs}</div><div id="adminPanel"></div></div>`
}
function wireAdmin(){document.querySelector('#logout').onclick=()=>sb.auth.signOut().then(renderAdmin);document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>adminTab(b.dataset.tab));adminTab(adminTabName||'authors')}

async function adminTab(tab){
 adminTabName=tab;adminEditId=null;
 const p=document.querySelector('#adminPanel');const c=adminConfig[tab];if(!c)return;
 p.innerHTML=`<div class="filters"><span class="tag">${c.label.toUpperCase()}</span><button class="btn" id="newRecord">+ Add new</button></div><div id="adminEditor"></div><div id="adminList"><p>Loading…</p></div>`;
 document.querySelector('#newRecord').onclick=()=>{adminEditId=null;renderAdminEditor(tab)};
 await renderAdminList(tab);
}

function relationOptions(type,selected){
 let arr=[],label='';
 if(type==='author'){arr=authorsData;label='author';}
 if(type==='work'){arr=worksData;label='work';}
 if(type==='theorist'){arr=theoristsData;label='theorist';}
 if(type==='topic'){arr=topics;label='topic';}
 return `<select class="search" id="f_${type}_id"><option value="">Select ${label}…</option>${arr.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(x.name||x.title)}</option>`).join('')}</select>`;
}

function fieldHtml(field,value){
 const [k,label,type,required]=field;
 if(type==='checkbox')return `<label class="card" style="padding:14px"><input id="f_${k}" type="checkbox" ${value?'checked':''}> ${label}</label>`;
 if(['author','work','theorist','topic'].includes(type))return relationOptions(type,value);
 if(type==='textarea')return `<textarea class="search" id="f_${k}" rows="6" placeholder="${label}" ${required?'required':''}>${esc(value||'')}</textarea>`;
 return `<input class="search" id="f_${k}" type="${type||'text'}" placeholder="${label}" value="${esc(value||'')}" ${required?'required':''}>`;
}

async function renderAdminEditor(tab,record=null){
 const c=adminConfig[tab],editor=document.querySelector('#adminEditor');if(!editor)return;
 let optionsHtml='';
 if(c.quiz){
  const existing=record?.quiz_options||[];
  optionsHtml=`<div class="card"><span class="tag">ANSWER OPTIONS</span><p>Enter four options and mark the correct answer.</p>${[0,1,2,3].map(i=>{const o=existing[i]?.option_text||'';return `<div style="display:flex;gap:10px;align-items:center;margin:10px 0"><input class="search" id="qopt_${i}" placeholder="Option ${i+1}" value="${esc(o)}"><label><input type="radio" name="correctOpt" value="${i}" ${existing[i]?.is_correct?'checked':''}> Correct</label></div>`}).join('')}</div>`;
 }
 editor.innerHTML=`<div class="card"><div class="section-bar"><div><span class="tag">${record?'EDIT':'NEW'} ${c.label.toUpperCase()}</span><h2>${record?'Edit record':'Add record'}</h2></div>${record?'<button class="btn secondary" id="cancelEdit">Cancel</button>':''}</div><div class="grid">${c.fields.map(f=>fieldHtml(f,record?.[f[0]])).join('')}</div>${optionsHtml}<button class="btn" id="saveAdminRecord">${record?'Save changes':'Create record'}</button><div id="adminFormMsg"></div></div>`;
 if(record)document.querySelector('#cancelEdit').onclick=()=>{adminEditId=null;renderAdminEditor(tab)};
 document.querySelector('#saveAdminRecord').onclick=()=>saveAdminRecord(tab,record?.id||null);
}

function recordLabel(tab,r){
 if(tab==='works')return `${r.title}${r.authors?.name?' · '+r.authors.name:''}`;
 if(tab==='characters')return `${r.name}${r.works?.title?' · '+r.works.title:''}`;
 if(tab==='theories')return `${r.name}${r.theorists?.name?' · '+r.theorists.name:''}`;
 if(tab==='learn_content'||tab==='quiz_questions'||tab==='flashcards'||tab==='game_questions')return r.title||r.question||r.front||r.prompt||'Untitled';
 return r.name||'Untitled';
}

function statusBadge(r){if(!('published' in r))return '';return `<span class="tag" style="margin-left:8px">${r.published?'PUBLISHED':'DRAFT'}</span>`}

async function renderAdminList(tab){
 const c=adminConfig[tab],list=document.querySelector('#adminList');if(!list)return;
 let query;
 if(tab==='works')query=sb.from('works').select('*, authors(name)').order('title');
 else if(tab==='characters')query=sb.from('characters').select('*, works(title)').order('name');
 else if(tab==='theories')query=sb.from('theories').select('*, theorists(name)').order('name');
 else if(tab==='learn_content')query=sb.from('learn_content').select('*').order('created_at',{ascending:false});
 else if(tab==='quiz_questions')query=sb.from('quiz_questions').select('*, quiz_options(*)').order('created_at',{ascending:false});
 else query=sb.from(c.table).select('*').order('created_at',{ascending:false});
 const {data,error}=await query;
 if(error){list.innerHTML=`<div class="empty"><strong>Could not load records.</strong><p>${esc(error.message)}</p></div>`;return}
 const rows=data||[];
 if(!rows.length){list.innerHTML=`<div class="empty"><strong>No records yet.</strong><p>Use “+ Add new” to create the first ${esc(c.label.toLowerCase())}.</p></div>`;return}
 list.innerHTML=`<div class="card"><input class="search" id="adminSearch" placeholder="Search ${esc(c.label.toLowerCase())}…"><div id="recordRows"></div></div>`;
 const draw=()=>{const q=(document.querySelector('#adminSearch')?.value||'').toLowerCase();const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));document.querySelector('#recordRows').innerHTML=filtered.length?filtered.map(r=>`<div class="section-bar" style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,.08)"><div><strong>${esc(recordLabel(tab,r))}</strong>${statusBadge(r)}<p style="margin:5px 0 0;opacity:.7">${esc(r.source||r.description||r.definition||r.body||r.explanation||'')}</p></div><div class="hero-actions" style="margin:0;display:flex;gap:6px;flex-wrap:wrap"><button class="btn secondary" data-edit="${r.id}">Edit</button>${'published' in r?`<button class="btn secondary" data-publish="${r.id}">${r.published?'Unpublish':'Publish'}</button>`:''}<button class="btn secondary" data-delete="${r.id}">Delete</button></div></div>`).join(''):`<div class="empty">No matching records.</div>`;wireAdminRowButtons(tab,rows)};
 document.querySelector('#adminSearch').oninput=draw;draw();
}

function wireAdminRowButtons(tab,rows){
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.edit);adminEditId=r.id;renderAdminEditor(tab,r);window.scrollTo({top:document.querySelector('#adminEditor').getBoundingClientRect().top+window.scrollY-80,behavior:'smooth'})});
 document.querySelectorAll('[data-publish]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.publish);const {error}=await sb.from(adminConfig[tab].table).update({published:!r.published}).eq('id',r.id);if(error)alert(error.message);else{await refreshAdminData(tab)}});
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.delete);if(!confirm(`Delete “${recordLabel(tab,r)}”? This cannot be undone.`))return;const ok=await deleteAdminRecord(tab,r.id);if(ok)await refreshAdminData(tab)});
}

async function deleteAdminRecord(tab,id){
 try{
  if(tab==='quiz_questions'){
   const {error:e1}=await sb.from('quiz_options').delete().eq('question_id',id);if(e1)throw e1;
  }
  if(tab==='works'){
   const {error:e2}=await sb.from('characters').delete().eq('work_id',id);if(e2)throw e2;
  }
  const {error}=await sb.from(adminConfig[tab].table).delete().eq('id',id);if(error)throw error;
  return true;
 }catch(e){alert(`Could not delete this record. ${e.message||e}`);return false}
}

async function refreshAdminData(tab){await loadData();await renderAdminList(tab)}

async function saveAdminRecord(tab,id){
 const c=adminConfig[tab],msg=document.querySelector('#adminFormMsg');const payload={};
 for(const [k,label,type,required] of c.fields){const el=document.querySelector('#f_'+k);if(!el)continue;if(required && !el.value?.trim() && type!=='checkbox'){msg.innerHTML=`<p>Please fill in ${esc(label)}.</p>`;return}if(['author','work','theorist','topic'].includes(type))payload[k]=el.value||null;else if(type==='checkbox')payload[k]=el.checked;else payload[k]=el.value||null}
 if(tab==='game_questions' && payload.choices){try{payload.choices=JSON.parse(payload.choices)}catch(e){msg.innerHTML='<p>Choices must be valid JSON, for example ["A","B","C","D"].</p>';return}}
 let recordId=id;
 let result=id?await sb.from(c.table).update(payload).eq('id',id).select().single():await sb.from(c.table).insert(payload).select().single();
 if(result.error){msg.innerHTML=`<p>${esc(result.error.message)}</p>`;return}
 recordId=result.data.id;
 if(c.quiz){
  const options=[0,1,2,3].map(i=>({option_text:(document.querySelector('#qopt_'+i)?.value||'').trim(),is_correct:document.querySelector(`input[name="correctOpt"][value="${i}"]`)?.checked||false,sort_order:i})).filter(x=>x.option_text);
  if(options.length!==4||options.filter(x=>x.is_correct).length!==1){msg.innerHTML='<p>A quiz question needs exactly four options and exactly one correct answer.</p>';if(!id)await sb.from(c.table).delete().eq('id',recordId);return}
  const {error:delError}=await sb.from('quiz_options').delete().eq('question_id',recordId);if(delError){msg.innerHTML=`<p>${esc(delError.message)}</p>`;return}
  const {error:optError}=await sb.from('quiz_options').insert(options.map(x=>({...x,question_id:recordId})));if(optError){msg.innerHTML=`<p>${esc(optError.message)}</p>`;return}
 }
 msg.innerHTML=`<p>${id?'Changes saved.':'Record created.'}</p>`;adminEditId=null;await refreshAdminData(tab);renderAdminEditor(tab);
}

/* ---------- ROUTING ----------
   IMPORTANT: UUIDs contain hyphens. Never split a UUID on "-".
   Topic routes now contain only the topic UUID:
   #learn-topic-TOPIC_UUID
   #quiz-topic-TOPIC_UUID
   #flashcards-topic-TOPIC_UUID
*/
function render(){
 setActive();
 document.title=`STUPIDIFICATION · ${route.replaceAll('-',' ')}`;
 if(route==='home')home();
 else if(route==='learn')learn();
 else if(route.startsWith('learn-topic-'))learnTopic(decodeURIComponent(route.slice('learn-topic-'.length)));
 else if(route.startsWith('learn-'))learnModule(decodeURIComponent(route.slice('learn-'.length)));
 else if(route==='quiz')topicCards('quiz');
 else if(route.startsWith('quiz-category-'))topicCategory('quiz',decodeURIComponent(route.slice('quiz-category-'.length)));
 else if(route.startsWith('quiz-topic-'))selectedTopic('quiz',decodeURIComponent(route.slice('quiz-topic-'.length)));
 else if(route==='flashcards')topicCards('flashcards');
 else if(route.startsWith('flashcards-category-'))topicCategory('flashcards',decodeURIComponent(route.slice('flashcards-category-'.length)));
 else if(route.startsWith('flashcards-topic-'))selectedTopic('flashcards',decodeURIComponent(route.slice('flashcards-topic-'.length)));
 else if(route==='games')games();
 else if(route==='game-match')gameMatch('author');
 else if(route==='game-date')gameMatch('date');
 else if(route==='game-chronology')chronology();
 else if(route==='game-theory')gameTheory();
 else if(route==='explore')explore();
 else if(route==='progress')progress();
 else if(route==='admin')admin();
 else home();
 window.scrollTo({top:0,behavior:'smooth'})
}
async function boot(){window.learnCache=(await sb.from('learn_content').select('*').eq('published',true)).data||[];await loadData();render()}
window.addEventListener('hashchange',()=>{route=location.hash.slice(1)||'home';document.querySelector('#mainNav').classList.remove('open');document.querySelector('#menuToggle').setAttribute('aria-expanded','false');render()});
document.querySelector('#menuToggle').onclick=()=>{const nav=document.querySelector('#mainNav');nav.classList.toggle('open');document.querySelector('#menuToggle').setAttribute('aria-expanded',nav.classList.contains('open'))};
boot();
