/* STUPIDIFICATION V2
   Supabase-backed literature learning site.
   Existing public tables used:
   modules, topics, learn_content, quiz_questions, quiz_options,
   flashcards, authors, works, characters, theories, theorists,
   concepts, game_questions.
*/
const SUPABASE_URL="https://crndztiqvghsvtbprsrn.supabase.co";
const SUPABASE_KEY="sb_publishable_xXimMadw55KUp9KEglRc9Q_J1lnZ513";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const app=document.querySelector("#app");

let route=location.hash.slice(1)||"home";
let modules=[],topics=[],learnData=[],quizData=[],cardsData=[],authors=[],works=[],theories=[],theorists=[],concepts=[],gameQuestions=[];
let state=JSON.parse(localStorage.getItem("stupidificationV2")||"null")||{
  quizAttempts:0,quizCorrect:0,wrongIds:[],cardRatings:{},gamesPlayed:0
};
let quizDeck=[],quizPos=0,quizStats={right:0,wrong:0},quizTimer=null,quizStarted=0;
let gameDeck=[],gamePos=0,gameStats={right:0,wrong:0},gameTimer=null,gameStarted=0;
let cardDeck=[],cardPos=0,cardTopic=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const save=()=>localStorage.setItem("stupidificationV2",JSON.stringify(state));
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const feature=(tag,title,desc,href)=>`<a class="card card-link" href="${href}"><span class="tag">${tag}</span><h2>${title}</h2><p>${desc}</p><span class="arrow">Open →</span></a>`;
const shell=(title,intro)=>`<section class="page-head"><div class="eyebrow">STUPIDIFICATION · ${esc(title)}</div><h1 class="page-title">${esc(title)}</h1><p class="intro">${intro}</p></section>`;
const statBox=(label,value,cls="")=>`<div class="quiz-stat ${cls}"><span>${label}</span><strong>${value}</strong></div>`;

function setActive(){
  document.querySelectorAll("[data-route]").forEach(a=>{
    a.classList.toggle("active",a.dataset.route===route.split("-")[0]);
  });
}
function stopTimer(type){
  if(type==="quiz"&&quizTimer){clearInterval(quizTimer);quizTimer=null}
  if(type==="game"&&gameTimer){clearInterval(gameTimer);gameTimer=null}
}
function timerText(start){return `${Math.floor((Date.now()-start)/1000)}s`}

async function loadData(){
  const results=await Promise.all([
    sb.from("modules").select("*").order("sort_order"),
    sb.from("topics").select("*").order("sort_order"),
    sb.from("learn_content").select("*").eq("published",true),
    sb.from("quiz_questions").select("*, quiz_options(*)").eq("published",true),
    sb.from("flashcards").select("*").eq("published",true),
    sb.from("authors").select("*").order("name"),
    sb.from("works").select("*, authors(name)").order("title"),
    sb.from("theories").select("*, theorists(name)").order("name"),
    sb.from("theorists").select("*").order("name"),
    sb.from("concepts").select("*").order("name"),
    sb.from("game_questions").select("*").eq("published",true)
  ]);
  [modules,topics,learnData,quizData,cardsData,authors,works,theories,theorists,concepts,gameQuestions]=results.map(x=>x.data||[]);
}

/* HOME */
function home(){
  app.innerHTML=`<section class="hero"><div><div class="eyebrow">ENGLISH LITERATURE · ADAPTIVE LEARNING</div>
  <h1>Stop memorising.<br><em>Start connecting.</em></h1>
  <p>STUPIDIFICATION V2 turns literature study into a system: learn a topic, test yourself, see why an answer is right, and make difficult questions come back until they stick.</p>
  <div class="actions"><a class="btn" href="#learn">Start learning</a><a class="btn secondary" href="#quiz">Take a quiz</a></div></div></section>
  <div class="grid">
    ${feature("LEARN","Knowledge building","Move from module → topic → learning content.","#learn")}
    ${feature("QUIZ","Adaptive quiz","Answer, read the explanation, then choose Easy or Hard.","#quiz")}
    ${feature("FLASHCARDS","Active recall","Flip cards and rate them so difficult cards return more often.","#flashcards")}
    ${feature("GAMES","Literature games","Practice authors, works, dates, chronology and theory.","#games")}
    ${feature("EXPLORE","Knowledge graph","Open individual author pages and browse connected works.","#explore")}
    ${feature("PROGRESS","Your practice","See accuracy, repeated questions and study activity.","#progress")}
  </div>`;
}

/* LEARN */
function learn(){
  app.innerHTML=shell("Learn","Choose a module, then a topic. The same taxonomy powers learning and practice.");
  app.innerHTML+=`<div class="grid">${modules.map((m,i)=>feature(`MODULE ${String(i+1).padStart(2,"0")}`,m.name,`${topics.filter(t=>t.module_id===m.id).length} topics`,`#learn-module-${encodeURIComponent(m.id)}`)).join("")}</div>`;
}
function learnModule(id){
  const m=modules.find(x=>x.id===id);if(!m)return learn();
  const ts=topics.filter(x=>x.module_id===id);
  app.innerHTML=shell(m.name,"Choose a topic.");
  app.innerHTML+=`<a class="back" href="#learn">← All modules</a><div class="grid">${ts.map(t=>feature("TOPIC",t.name,"Open learning content",`#learn-topic-${encodeURIComponent(t.id)}`)).join("")}</div>`;
}
function learnTopic(id){
  const t=topics.find(x=>x.id===id);if(!t)return learn();
  const content=learnData.filter(x=>x.topic_id===id);
  app.innerHTML=shell(t.name,"Read the material, then use Quiz or Flashcards to practise it.");
  app.innerHTML+=`<a class="back" href="#learn-module-${encodeURIComponent(t.module_id)}">← Back to topics</a>`;
  app.innerHTML+=content.length?`<div class="grid">${content.map(x=>`<article class="card"><span class="tag">LEARN</span><h2>${esc(x.title)}</h2><p>${esc(x.body).replaceAll("\n","<br>")}</p>${x.source?`<p><small>Source: ${esc(x.source)}</small></p>`:""}</article>`).join("")}</div>`:`<div class="empty"><strong>No learning content yet.</strong><p>Add published content from Admin.</p></div>`;
}

/* QUIZ */
function quiz(){
  app.innerHTML=shell("Quiz","Choose a module and topic. Every question gives you an explanation and lets you decide whether it felt Easy or Hard.");
  app.innerHTML+=`<div class="grid">${modules.map(m=>feature("MODULE",m.name,`${topics.filter(t=>t.module_id===m.id).length} topics`,`#quiz-module-${encodeURIComponent(m.id)}`)).join("")}</div>`;
}
function quizModule(id){
  const m=modules.find(x=>x.id===id);if(!m)return quiz();
  const ts=topics.filter(x=>x.module_id===id);
  app.innerHTML=shell(`Quiz · ${m.name}`,"Choose a topic.");
  app.innerHTML+=`<a class="back" href="#quiz">← All modules</a><div class="grid">${ts.map(t=>feature("TOPIC",t.name,"Start adaptive quiz",`#quiz-topic-${encodeURIComponent(t.id)}`)).join("")}</div>`;
}
function startQuiz(topicId){
  stopTimer("quiz");
  const usable=quizData.filter(q=>q.topic_id===topicId).map(q=>({
    ...q,options:(q.quiz_options||[]).map(o=>o.option_text),
    answer:(q.quiz_options||[]).find(o=>o.is_correct)?.option_text||"",
    explanation:q.explanation||"No explanation has been added yet."
  }));
  quizDeck=shuffle(usable);quizPos=0;quizStats={right:0,wrong:0};renderQuiz(topicId);
}
function renderQuiz(topicId){
  const topic=topics.find(t=>t.id===topicId);
  if(!quizDeck.length){app.innerHTML=shell("Quiz",topic?.name||"Topic")+`<div class="empty">No published questions are available for this topic.</div>`;return}
  const q=quizDeck[quizPos];
  const options=shuffle(q.options);
  app.innerHTML=shell(`Quiz · ${topic?.name||""}`,"Answer first. Then read the explanation and rate the question.");
  app.innerHTML+=`<div class="quiz-wrap">
    <div class="quiz-dashboard">
      ${statBox("RIGHT",quizStats.right,"right")}${statBox("WRONG",quizStats.wrong,"wrong")}${statBox("TIME","0s")}
    </div>
    <div class="quiz-meta"><span>Question ${quizPos+1}</span><span>${quizDeck.length} in current deck</span></div>
    <h2 class="quiz-question">${esc(q.question)}</h2>
    <div class="options">${options.map(o=>`<button class="option" data-answer="${esc(o)}">${esc(o)}</button>`).join("")}</div>
    <div id="quizFeedback"></div>
  </div>`;
  quizStarted=Date.now();
  quizTimer=setInterval(()=>{const boxes=document.querySelectorAll(".quiz-stat strong");if(boxes[2])boxes[2].textContent=timerText(quizStarted)},1000);
  document.querySelectorAll(".option").forEach(b=>b.onclick=()=>answerQuiz(b,q,topicId));
}
function answerQuiz(btn,q,topicId){
  if(!quizTimer)return;
  stopTimer("quiz");
  const correct=btn.dataset.answer===q.answer;
  if(correct){quizStats.right++;state.quizCorrect++}else{quizStats.wrong++;if(!state.wrongIds.includes(q.id))state.wrongIds.push(q.id)}
  state.quizAttempts++;save();
  document.querySelectorAll(".option").forEach(b=>{b.disabled=true;if(b.dataset.answer===q.answer)b.classList.add("correct")});
  if(!correct)btn.classList.add("wrong");
  const feedback=document.querySelector("#quizFeedback");
  feedback.innerHTML=`<div class="feedback"><strong>${correct?"✓ Correct":"✗ Not quite"}</strong><p>${esc(q.explanation)}</p>
    <div class="rating-row"><button class="rating" id="quizEasy">Easy · next</button><button class="rating" id="quizHard">Hard · repeat later</button></div></div>`;
  document.querySelector("#quizEasy").onclick=()=>nextQuiz(topicId,false);
  document.querySelector("#quizHard").onclick=()=>nextQuiz(topicId,true);
}
function nextQuiz(topicId,hard){
  if(hard)quizDeck.push(quizDeck[quizPos]);
  quizPos++;
  if(quizPos>=quizDeck.length)finishQuiz(topicId);else renderQuiz(topicId);
}
function finishQuiz(topicId){
  stopTimer("quiz");
  const total=quizStats.right+quizStats.wrong,accuracy=total?Math.round(quizStats.right/total*100):0;
  const topic=topics.find(t=>t.id===topicId);
  app.innerHTML=shell("Quiz complete",topic?.name||"Round");
  app.innerHTML+=`<div class="completion"><span class="tag">ROUND COMPLETE</span><h2>You finished the deck.</h2>
    <div class="completion-stats">${statBox("RIGHT",quizStats.right,"right")}${statBox("WRONG",quizStats.wrong,"wrong")}<div><strong>${accuracy}%</strong><span>Accuracy</span></div></div>
    <button class="btn" id="again">Start again</button></div>`;
  document.querySelector("#again").onclick=()=>startQuiz(topicId);
}

/* FLASHCARDS */
function flashcards(){
  app.innerHTML=shell("Flashcards","Choose a topic. Cards you rate Hard appear more frequently.");
  app.innerHTML+=`<div class="grid">${modules.map(m=>feature("MODULE",m.name,"Choose a topic",`#cards-module-${encodeURIComponent(m.id)}`)).join("")}</div>`;
}
function cardsModule(id){
  const m=modules.find(x=>x.id===id);if(!m)return flashcards();
  const ts=topics.filter(x=>x.module_id===id);
  app.innerHTML=shell(`Flashcards · ${m.name}`,"Choose a topic.");
  app.innerHTML+=`<a class="back" href="#flashcards">← All modules</a><div class="grid">${ts.map(t=>feature("TOPIC",t.name,"Start flashcards",`#cards-topic-${encodeURIComponent(t.id)}`)).join("")}</div>`;
}
function startCards(topicId){
  cardTopic=topics.find(t=>t.id===topicId);
  const base=cardsData.filter(c=>c.topic_id===topicId),weighted=[];
  base.forEach(c=>{const r=state.cardRatings[c.id]||"new";const n=r==="hard"?4:r==="good"?2:1;for(let i=0;i<n;i++)weighted.push(c)});
  cardDeck=shuffle(weighted);cardPos=0;renderCard();
}
function renderCard(){
  if(!cardDeck.length){app.innerHTML=shell("Flashcards",cardTopic?.name||"Topic")+`<div class="empty">No published flashcards are available for this topic.</div>`;return}
  const c=cardDeck[cardPos];
  app.innerHTML=shell(`Flashcards · ${cardTopic.name}`,"Tap the card to reveal the answer.");
  app.innerHTML+=`<div class="flashcard"><div class="flash-inner" id="flash">${cardPos%2===0?`<div><strong>${esc(c.front)}</strong><span class="flash-hint">Click to reveal</span></div>`:`<div><strong>${esc(c.back)}</strong><span class="flash-hint">Answer · click to continue</span></div>`}</div></div>`;
  let revealed=cardPos%2!==0;
  document.querySelector("#flash").onclick=()=>{
    if(!revealed){revealed=true;document.querySelector("#flash").innerHTML=`<div><strong>${esc(c.back)}</strong><span class="flash-hint">Answer</span></div>`;addRatings(c)}
  };
  if(revealed)addRatings(c);
}
function addRatings(c){
  if(document.querySelector("#cardRatings"))return;
  const div=document.createElement("div");div.id="cardRatings";div.className="rating-row center";
  div.innerHTML=`<button class="rating" data-r="hard">Hard · again</button><button class="rating" data-r="good">Good</button><button class="rating" data-r="easy">Easy</button>`;
  document.querySelector(".flashcard").after(div);
  div.querySelectorAll("button").forEach(b=>b.onclick=()=>{state.cardRatings[c.id]=b.dataset.r;save();cardPos++;if(cardPos>=cardDeck.length)startCards(cardTopic.id);else renderCard()});
}

/* GAMES */
function games(){
  app.innerHTML=shell("Games","Every game uses an adaptive deck. Hard questions return later; Easy questions leave the deck.");
  app.innerHTML+=`<div class="grid">
    ${feature("MATCH","Author ↔ Work","Connect an author to a work.","#game-author_work")}
    ${feature("MATCH","Character ↔ Work","Connect a character to its work.","#game-character_work")}
    ${feature("MATCH","Work ↔ Date","Match a work to its publication date.","#game-work_date")}
    ${feature("ORDER","Chronology","Put works in chronological order.","#game-chronology")}
    ${feature("THEORY","Theory ↔ Theorist","Identify the thinker associated with a theory.","#game-theory")}
  </div>`;
}
function buildTheoryQuestions(){
  return shuffle(theories.filter(t=>t.theorists?.name)).map((t,i)=>{
    const correct=t.theorists.name;
    const distractors=shuffle(theorists.filter(x=>x.name!==correct)).slice(0,3).map(x=>x.name);
    return {id:`theory-${i}`,game_type:"theory",prompt:`Who is associated with the theory "${t.name}"?`,answer:correct,choices:shuffle([correct,...distractors]),explanation:t.description||""};
  });
}
function startGame(kind){
  stopTimer("game");gameStats={right:0,wrong:0};gamePos=0;
  let pool=gameQuestions.filter(q=>q.game_type===kind);
  if(kind==="theory"&&!pool.length)pool=buildTheoryQuestions();
  gameDeck=shuffle(pool);renderGame(kind);
}
function renderGame(kind){
  const labels={author_work:"Author ↔ Work",character_work:"Character ↔ Work",work_date:"Work ↔ Date",chronology:"Chronology",theory:"Theory ↔ Theorist"};
  if(!gameDeck.length){app.innerHTML=shell(labels[kind]||"Game","Game");app.innerHTML+=`<div class="empty">No published game questions are available yet.</div>`;return}
  const q=gameDeck[gamePos],choices=Array.isArray(q.choices)?shuffle(q.choices):[];
  app.innerHTML=shell(labels[kind]||"Game","Answer, read the explanation, then decide whether the question is Easy or Hard.");
  app.innerHTML+=`<div class="quiz-wrap"><div class="quiz-dashboard">${statBox("RIGHT",gameStats.right,"right")}${statBox("WRONG",gameStats.wrong,"wrong")}${statBox("TIME","0s")}</div>
    <div class="quiz-meta"><span>Question ${gamePos+1}</span><span>${gameDeck.length} in current deck</span></div>
    <h2 class="quiz-question">${esc(q.prompt||q.question||"")}</h2>
    <div class="options">${choices.map(o=>`<button class="option" data-answer="${esc(o)}">${esc(o)}</button>`).join("")}</div><div id="gameFeedback"></div></div>`;
  gameStarted=Date.now();gameTimer=setInterval(()=>{const boxes=document.querySelectorAll(".quiz-stat strong");if(boxes[2])boxes[2].textContent=timerText(gameStarted)},1000);
  document.querySelectorAll(".option").forEach(b=>b.onclick=()=>answerGame(b,q,kind));
}
function answerGame(btn,q,kind){
  if(!gameTimer)return;stopTimer("game");
  const correct=btn.dataset.answer===q.answer;if(correct)gameStats.right++;else gameStats.wrong++;
  document.querySelectorAll(".option").forEach(b=>{b.disabled=true;if(b.dataset.answer===q.answer)b.classList.add("correct")});if(!correct)btn.classList.add("wrong");
  document.querySelector("#gameFeedback").innerHTML=`<div class="feedback"><strong>${correct?"✓ Correct":"✗ Not quite"}</strong><p>${esc(q.explanation||"")}</p>
    <div class="rating-row"><button class="rating" id="gameEasy">Easy · next</button><button class="rating" id="gameHard">Hard · repeat later</button></div></div>`;
  document.querySelector("#gameEasy").onclick=()=>nextGame(kind,false);document.querySelector("#gameHard").onclick=()=>nextGame(kind,true);
}
function nextGame(kind,hard){if(hard)gameDeck.push(gameDeck[gamePos]);gamePos++;if(gamePos>=gameDeck.length)finishGame(kind);else renderGame(kind)}
function finishGame(kind){
  stopTimer("game");const total=gameStats.right+gameStats.wrong,accuracy=total?Math.round(gameStats.right/total*100):0;
  state.gamesPlayed++;save();
  app.innerHTML=shell("Game complete",kind);
  app.innerHTML+=`<div class="completion"><span class="tag">ROUND COMPLETE</span><h2>Nice. Round finished.</h2><div class="completion-stats">${statBox("RIGHT",gameStats.right,"right")}${statBox("WRONG",gameStats.wrong,"wrong")}<div><strong>${accuracy}%</strong><span>Accuracy</span></div></div><button class="btn" id="playAgain">Play again</button></div>`;
  document.querySelector("#playAgain").onclick=()=>startGame(kind);
}

/* EXPLORE */
function explore(){
  app.innerHTML=shell("Explore","Search the literature database. Author results are clickable and open dedicated author pages.");
  app.innerHTML+=`<input class="search" id="exploreSearch" placeholder="Search author, work, theory or concept…"><div id="exploreResults"></div>`;
  const draw=()=>{
    const q=document.querySelector("#exploreSearch").value.toLowerCase().trim();
    const a=authors.filter(x=>x.name.toLowerCase().includes(q));
    const w=works.filter(x=>`${x.title} ${x.authors?.name||""}`.toLowerCase().includes(q));
    const t=theories.filter(x=>x.name.toLowerCase().includes(q));
    const c=concepts.filter(x=>`${x.name} ${x.definition||""}`.toLowerCase().includes(q));
    const html=[...a.map(x=>`<a class="card card-link" href="#author-${encodeURIComponent(x.id)}"><span class="tag">AUTHOR</span><h2>${esc(x.name)}</h2><p>${x.birth_year||""}${x.death_year?"–"+x.death_year:""}</p><span class="arrow">Open author page →</span></a>`),
      ...w.map(x=>`<div class="card"><span class="tag">WORK</span><h2>${esc(x.title)}</h2><p>${esc(x.authors?.name||"")} ${x.publication_year?"· "+x.publication_year:""}</p></div>`),
      ...t.map(x=>`<div class="card"><span class="tag">THEORY</span><h2>${esc(x.name)}</h2><p>${esc(x.theorists?.name||"")}</p></div>`),
      ...c.map(x=>`<div class="card"><span class="tag">CONCEPT</span><h2>${esc(x.name)}</h2><p>${esc(x.definition||"")}</p></div>`)].join("");
    document.querySelector("#exploreResults").innerHTML=html?`<div class="grid">${html}</div>`:`<div class="empty">No matching records.</div>`;
  };
  document.querySelector("#exploreSearch").oninput=draw;draw();
}
function authorPage(id){
  const a=authors.find(x=>x.id===id);if(!a)return explore();
  const linked=works.filter(w=>w.author_id===id||w.authors?.name===a.name);
  app.innerHTML=shell(a.name,"Author profile from the STUPIDIFICATION literature database.");
  app.innerHTML+=`<a class="back" href="#explore">← Back to Explore</a><div class="card author-hero">
    <div class="portrait-letter">${esc(a.name.charAt(0))}</div><span class="tag">AUTHOR</span><h2>${esc(a.name)}</h2>
    <p>${a.birth_year||""}${a.death_year?"–"+a.death_year:""}${a.nationality?" · "+esc(a.nationality):""}</p>
    ${a.biography?`<p>${esc(a.biography)}</p>`:""}${a.notes?`<p>${esc(a.notes)}</p>`:""}</div>
    <div class="section-head"><div><span class="tag">WORKS</span><h2>Works</h2></div></div>
    ${linked.length?`<div class="grid">${linked.map(w=>`<article class="card"><span class="tag">WORK</span><h2>${esc(w.title)}</h2><p>${w.publication_year||""}${w.genre?" · "+esc(w.genre):""}</p>${w.description?`<p>${esc(w.description)}</p>`:""}</article>`).join("")}</div>`:`<div class="empty">No works are linked to this author yet.</div>`}`;
}

/* PROGRESS */
function progress(){
  const accuracy=state.quizAttempts?Math.round(state.quizCorrect/state.quizAttempts*100):0;
  const hard=Object.values(state.cardRatings).filter(x=>x==="hard").length;
  app.innerHTML=shell("Progress","Your practice statistics are stored locally in this browser.");
  app.innerHTML+=`<div class="grid">
    <div class="card"><span class="tag">QUIZ ACCURACY</span><div class="big-stat">${accuracy}%</div><p>${state.quizCorrect} correct out of ${state.quizAttempts} answered.</p><div class="progress-bar"><div class="progress-fill" style="width:${accuracy}%"></div></div></div>
    <div class="card"><span class="tag">REVIEW</span><div class="big-stat">${state.wrongIds.length}</div><p>Questions you have previously missed.</p></div>
    <div class="card"><span class="tag">FLASHCARDS</span><div class="big-stat">${hard}</div><p>Cards currently rated Hard.</p></div>
    <div class="card"><span class="tag">GAMES</span><div class="big-stat">${state.gamesPlayed}</div><p>Game rounds completed.</p></div>
  </div>`;
}

/* SIMPLE ADMIN */
const adminTabs=["authors","works","theorists","theories","concepts","learn_content","quiz_questions","flashcards","game_questions"];
const adminLabels={authors:"Authors",works:"Works",theorists:"Theorists",theories:"Theories",concepts:"Concepts",learn_content:"Learn Pages",quiz_questions:"Quiz Questions",flashcards:"Flashcards",game_questions:"Game Questions"};
let adminTab="authors",editingId=null;

function admin(){
  app.innerHTML=shell("Admin","Manage the database from one place. This is intentionally simple so you can keep adding literature content.");
  app.innerHTML+=`<div class="admin-tabs">${adminTabs.map(t=>`<button class="${t===adminTab?"active":""}" data-admin="${t}">${adminLabels[t]}</button>`).join("")}</div><div id="adminEditor"></div><div id="adminList"></div>`;
  document.querySelectorAll("[data-admin]").forEach(b=>b.onclick=()=>{adminTab=b.dataset.admin;editingId=null;admin()});
  renderAdminEditor();renderAdminList();
}
function fieldsFor(tab){
  const base={
    authors:[["name","Name","text"],["birth_year","Birth year","number"],["death_year","Death year","number"],["nationality","Nationality","text"],["biography","Biography","textarea"],["notes","Notes","textarea"]],
    works:[["title","Title","text"],["author_id","Author ID","text"],["publication_year","Publication year","number"],["genre","Genre","text"],["description","Description","textarea"],["notes","Notes","textarea"]],
    theorists:[["name","Name","text"],["description","Description","textarea"]],
    theories:[["name","Theory name","text"],["theorist_id","Theorist ID","text"],["description","Description","textarea"],["key_terms","Key terms","textarea"]],
    concepts:[["name","Name","text"],["definition","Definition","textarea"],["notes","Notes","textarea"]],
    learn_content:[["topic_id","Topic ID","text"],["title","Title","text"],["body","Content","textarea"],["source","Source","text"],["published","Published","checkbox"]],
    quiz_questions:[["topic_id","Topic ID","text"],["question","Question","textarea"],["explanation","Explanation","textarea"],["source","Source","text"],["published","Published","checkbox"]],
    flashcards:[["topic_id","Topic ID","text"],["front","Front","textarea"],["back","Back","textarea"],["source","Source","text"],["published","Published","checkbox"]],
    game_questions:[["topic_id","Topic ID","text"],["game_type","Game type","text"],["prompt","Prompt","textarea"],["answer","Answer","text"],["choices","Choices JSON","textarea"],["explanation","Explanation","textarea"],["source","Source","text"],["published","Published","checkbox"]]
  };
  return base[tab]||[];
}
function renderAdminEditor(){
  const target=document.querySelector("#adminEditor");if(!target)return;
  const fields=fieldsFor(adminTab);
  target.innerHTML=`<div class="card"><div class="section-head"><div><span class="tag">${editingId?"EDIT":"NEW"} · ${adminLabels[adminTab]}</span><h2>${editingId?"Edit record":"Add record"}</h2></div></div>
  <div class="form-grid">${fields.map(([k,l,type])=>`<div class="field ${type==="textarea"?"full":""}"><label>${l}</label>${type==="textarea"?`<textarea id="af_${k}" rows="4"></textarea>`:type==="checkbox"?`<input id="af_${k}" type="checkbox">`:`<input id="af_${k}" type="${type}" id="af_${k}">`}</div>`).join("")}</div>
  <div class="actions"><button class="btn" id="saveAdmin">Save</button>${editingId?`<button class="btn secondary" id="cancelAdmin">Cancel</button>`:""}</div><div id="adminMsg"></div></div>`;
  if(editingId)loadAdminRecord(editingId);
  document.querySelector("#saveAdmin").onclick=saveAdmin;
  document.querySelector("#cancelAdmin")?.addEventListener("click",()=>{editingId=null;renderAdminEditor()});
}
async function loadAdminRecord(id){
  const {data}=await sb.from(adminTab).select("*").eq("id",id).single();if(!data)return;
  fieldsFor(adminTab).forEach(([k])=>{const e=document.querySelector("#af_"+k);if(!e)return;if(e.type==="checkbox")e.checked=!!data[k];else e.value=typeof data[k]==="object"?JSON.stringify(data[k]):data[k]??""});
}
async function saveAdmin(){
  const payload={};
  for(const [k,l,type] of fieldsFor(adminTab)){const e=document.querySelector("#af_"+k);if(!e)continue;if(type==="checkbox")payload[k]=e.checked;else if(adminTab==="game_questions"&&k==="choices"){try{payload[k]=JSON.parse(e.value||"[]")}catch(_){document.querySelector("#adminMsg").textContent="Choices JSON is invalid.";return}}else payload[k]=e.value||null}
  const result=editingId?await sb.from(adminTab).update(payload).eq("id",editingId):await sb.from(adminTab).insert(payload);
  document.querySelector("#adminMsg").textContent=result.error?result.error.message:"Saved.";
  if(!result.error){editingId=null;await loadData();renderAdminEditor();renderAdminList()}
}
async function renderAdminList(){
  const target=document.querySelector("#adminList");if(!target)return;
  const {data,error}=await sb.from(adminTab).select("*").order("created_at",{ascending:false});
  if(error){target.innerHTML=`<div class="empty">${esc(error.message)}</div>`;return}
  target.innerHTML=`<div class="card"><input class="search" id="adminSearch" placeholder="Search ${adminLabels[adminTab]}…"><div id="adminRows"></div></div>`;
  const draw=()=>{
    const q=(document.querySelector("#adminSearch").value||"").toLowerCase();
    const rows=(data||[]).filter(r=>JSON.stringify(r).toLowerCase().includes(q));
    document.querySelector("#adminRows").innerHTML=rows.length?rows.map(r=>`<div class="admin-row"><div><strong>${esc(r.name||r.title||r.question||r.front||r.prompt||"Untitled")}</strong><div class="muted">${esc(r.description||r.explanation||r.source||"")}</div></div><div class="mini-actions"><button class="mini-btn" data-edit="${r.id}">Edit</button><button class="mini-btn danger" data-del="${r.id}">Delete</button></div></div>`).join(""):`<div class="empty">No records found.</div>`;
    document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{editingId=b.dataset.edit;renderAdminEditor();window.scrollTo({top:0,behavior:"smooth"})});
    document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this record?"))return;const {error}=await sb.from(adminTab).delete().eq("id",b.dataset.del);if(error)alert(error.message);else{await loadData();renderAdminList()}});
  };
  document.querySelector("#adminSearch").oninput=draw;draw();
}

/* ROUTING */
function render(){
  setActive();
  if(route==="home")home();
  else if(route==="learn")learn();
  else if(route.startsWith("learn-module-"))learnModule(decodeURIComponent(route.slice(12)));
  else if(route.startsWith("learn-topic-"))learnTopic(decodeURIComponent(route.slice(11)));
  else if(route==="quiz")quiz();
  else if(route.startsWith("quiz-module-"))quizModule(decodeURIComponent(route.slice(12)));
  else if(route.startsWith("quiz-topic-"))startQuiz(decodeURIComponent(route.slice(11)));
  else if(route==="flashcards")flashcards();
  else if(route.startsWith("cards-module-"))cardsModule(decodeURIComponent(route.slice(13)));
  else if(route.startsWith("cards-topic-"))startCards(decodeURIComponent(route.slice(12)));
  else if(route==="games")games();
  else if(route.startsWith("game-"))startGame(route.slice(5));
  else if(route==="explore")explore();
  else if(route.startsWith("author-"))authorPage(decodeURIComponent(route.slice(7)));
  else if(route==="progress")progress();
  else if(route==="admin")admin();
  else home();
  window.scrollTo({top:0,behavior:"smooth"});
}
window.addEventListener("hashchange",()=>{route=location.hash.slice(1)||"home";document.querySelector("#mainNav").classList.remove("open");render()});
document.querySelector("#menuToggle").onclick=()=>document.querySelector("#mainNav").classList.toggle("open");

(async()=>{try{await loadData()}catch(e){console.error(e)}render()})();
