/* STUPIDIFICATION
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
let state=JSON.parse(localStorage.getItem("stupidificationState")||"null")||{
  quizAttempts:0,quizCorrect:0,wrongIds:[],cardRatings:{},gamesPlayed:0,quizRounds:0,flashcardsReviewed:0
};
let quizDeck=[],quizPos=0,quizStats={right:0,wrong:0},quizTimer=null,quizStarted=0;
let gameDeck=[],gamePos=0,gameStats={right:0,wrong:0},gameTimer=null,gameStarted=0;
let cardDeck=[],cardPos=0,cardTopic=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const save=()=>localStorage.setItem("stupidificationState",JSON.stringify(state));
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const feature=(tag,title,desc,href)=>`<a class="card card-link" href="${href}"><span class="tag">${tag}</span><h2>${title}</h2><p>${desc}</p><span class="arrow">Open →</span></a>`;
const shell=(title,intro)=>`<section class="page-head"><div class="eyebrow">STUPIDIFICATION · ${esc(title)}</div><h1 class="page-title">${esc(title)}</h1><p class="intro">${intro}</p></section>`;
const statBox=(label,value,cls="")=>`<div class="quiz-stat ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
const optionLetters=["A","B","C","D","E","F"];
function cleanQuizQuestion(text, options=[]){
  let s=String(text||"").replace(/\s+/g," ").trim();
  if(!s)return s;
  // Some imported PYQs contain the full A/B/C/D options inside the question field.
  // The actual options are already stored separately, so keep only the stem.
  if(Array.isArray(options) && options.length){
    const qmark=s.search(/[?।]/);
    if(qmark>=0){
      const after=s.slice(qmark+1);
      const aMark=after.match(/\s*[“”‘’'\(\[]?\s*A\s*[\.\):\-]/i);
      if(aMark)s=s.slice(0,qmark+1).trim();
    }
    const marker=/([.!])\s*[“”‘’'\(\[]?\s*A\s*[\.\):\-]/i;
    const match=s.match(marker);
    if(match && match.index>0)s=s.slice(0,match.index+1).trim();
  }
  return s.replace(/[“”‘’]$/g,"").trim();
}
function cleanQuizOption(text){
  return String(text||"").replace(/^\s*[A-F]\s*[\.\):\-]\s*/i,"").trim();
}
function quizHead(topicName){
  return `<section class="quiz-page-head"><div class="eyebrow">STUPIDIFICATION · QUIZ · ${esc(topicName||"Topic")}</div><h1>${esc(topicName||"Quiz")}</h1><p>Answer first. Then read the explanation and rate the question.</p></section>`;
}

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
  <p>STUPIDIFICATION turns literature study into a system: learn a topic, test yourself, see why an answer is right, and make difficult questions come back until they stick.</p>
  <div class="actions"><a class="btn" href="#learn">Start learning</a><a class="btn secondary" href="#quiz">Take a quiz</a></div></div></section>
  <div class="grid">
    ${feature("LEARN","Knowledge building","Move from module → topic → learning content.","#learn")}
    ${feature("QUIZ","Adaptive quiz","Answer, read the explanation, then choose Easy or Hard.","#quiz")}
    ${feature("FLASHCARDS","Active recall","Flip cards and rate them so difficult cards return more often.","#flashcards")}
    ${feature("GAMES","Literature games","Practice authors, works, dates, chronology and theory.","#games")}
    ${feature("EXPLORE","Knowledge graph","Open individual author pages and browse connected works.","#explore")}
    ${feature("PROFILE","Your practice","See your account, quiz accuracy, flashcards and games in one place.","#profile")}
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
  app.innerHTML+=content.length?`<div class="grid">${content.map(x=>`<article class="card"><span class="tag">LEARN</span><h2>${esc(x.title)}</h2><p>${esc(x.body).replaceAll("\n","<br>")}</p>${x.source?`<p><small>Source: ${esc(x.source)}</small></p>`:""}</article>`).join("")}</div>`:`<div class="empty"><strong>No learning content yet.</strong><p>Add published content from your content dashboard.</p></div>`;
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
    ...q,options:(q.quiz_options||[]).map(o=>o.option_text),optionRows:q.quiz_options||[],
    answer:(q.quiz_options||[]).find(o=>o.is_correct)?.option_text||"",
    explanation:q.explanation||"No explanation has been added yet."
  }));
  quizDeck=shuffle(usable);quizPos=0;quizStats={right:0,wrong:0};renderQuiz(topicId);
}
function renderQuiz(topicId){
  const topic=topics.find(t=>t.id===topicId);
  if(!quizDeck.length){app.innerHTML=shell("Quiz",topic?.name||"Topic")+`<div class="empty">No published questions are available for this topic.</div>`;return}
  const q=quizDeck[quizPos];
  const options=shuffle((q.options||[]).map(cleanQuizOption));
  const letters=optionLetters;
  const stem=cleanQuizQuestion(q.question,options);
  app.innerHTML=quizHead(topic?.name||"");
  app.innerHTML+=`<div class="quiz-wrap quiz-screen">
    <div class="quiz-dashboard">
      ${statBox("RIGHT",quizStats.right,"right")}${statBox("WRONG",quizStats.wrong,"wrong")}${statBox("TIME","0s")}
    </div>
    <div class="quiz-meta"><span>Question ${quizPos+1}</span><span>${quizDeck.length} in current deck</span></div>
    <h2 class="quiz-question">${esc(stem)}</h2>
    <div class="options">${options.map((o,i)=>`<button class="option" data-answer="${esc(o)}"><span class="option-letter">${letters[i]||String(i+1)}.</span><span>${esc(o)}</span></button>`).join("")}</div>
    <div id="quizFeedback"></div>
  </div>`;
  quizStarted=Date.now();
  quizTimer=setInterval(()=>{const boxes=document.querySelectorAll(".quiz-stat strong");if(boxes[2])boxes[2].textContent=timerText(quizStarted)},1000);
  document.querySelectorAll(".option").forEach(b=>b.onclick=()=>answerQuiz(b,q,topicId));
}
async function answerQuiz(btn,q,topicId){
  if(!quizTimer)return;
  stopTimer("quiz");
  const correct=btn.dataset.answer===q.answer;
  if(correct){quizStats.right++;state.quizCorrect++}else{quizStats.wrong++;if(!state.wrongIds.includes(q.id))state.wrongIds.push(q.id)}
  state.quizAttempts++;save();syncCloudProgress();
  if(currentUser){const selected=q.optionRows?.find(o=>o.option_text===btn.dataset.answer);await sb.from("user_quiz_attempts").insert({user_id:currentUser.id,question_id:q.id,selected_option_id:selected?.id||null,is_correct:correct});await syncCloudProgress()}
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
async function finishQuiz(topicId){
  stopTimer("quiz");
  const total=quizStats.right+quizStats.wrong,accuracy=total?Math.round(quizStats.right/total*100):0;
  const topic=topics.find(t=>t.id===topicId);
  state.quizRounds=(state.quizRounds||0)+1;save();await syncCloudProgress();
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
  div.querySelectorAll("button").forEach(b=>b.onclick=async()=>{state.cardRatings[c.id]=b.dataset.r;state.flashcardsReviewed=(state.flashcardsReviewed||0)+1;save();if(currentUser){const reps=(b.dataset.r==="hard"?0:1);await sb.from("user_flashcard_progress").upsert({user_id:currentUser.id,flashcard_id:c.id,rating:b.dataset.r,repetitions:reps,updated_at:new Date().toISOString()});await syncCloudProgress()}cardPos++;if(cardPos>=cardDeck.length)startCards(cardTopic.id);else renderCard()});
}

/* GAMES */
let selectedGameScope={module:"",topic:"",author:"",game:""};
function gameScopeOptions(){
  const moduleRows=[{id:"",name:"All Modules"},...modules.map(x=>({id:x.id,name:x.name}))];
  const topicRows=[{id:"",name:"All Topics / Ages"},...topics.filter(t=>!selectedGameScope.module||t.module_id===selectedGameScope.module).map(x=>({id:x.id,name:x.name}))];
  const allowedTopicIds=new Set(topicRows.map(x=>x.id));
  if(selectedGameScope.topic&&!allowedTopicIds.has(selectedGameScope.topic))selectedGameScope.topic="";
  const authorIds=new Set((gameQuestions||[]).filter(q=>{
    if(!q.author_id)return false;
    if(selectedGameScope.topic&&q.topic_id!==selectedGameScope.topic)return false;
    if(selectedGameScope.module&&q.module_id&&q.module_id!==selectedGameScope.module)return false;
    return true;
  }).map(q=>q.author_id));
  const authorRows=[{id:"",name:"All Authors"},...authors.filter(a=>!authorIds.size||authorIds.has(a.id)).map(x=>({id:x.id,name:x.name}))];
  return {moduleRows,topicRows,authorRows};
}
function gameScopeSelect(id,label,value,items){
  const current=items.find(x=>x.id===value)||items[0];
  return `<div class="game-scope-select"><span>${esc(label)}</span><button type="button" class="game-scope-trigger" data-menu="${id}"><strong>${esc(current?.name||"All")}</strong><span>⌄</span></button><div class="game-scope-menu" id="${id}">${items.map(x=>`<button type="button" data-value="${esc(x.id)}">${esc(x.name)}</button>`).join("")}</div></div>`;
}
function bindGameScope(){
  document.querySelectorAll(".game-scope-trigger").forEach(b=>b.onclick=e=>{e.stopPropagation();document.querySelectorAll(".game-scope-menu.open").forEach(x=>{if(x.id!==b.dataset.menu)x.classList.remove("open")});document.getElementById(b.dataset.menu)?.classList.toggle("open")});
  document.querySelectorAll(".game-scope-menu button").forEach(b=>b.onclick=()=>{const id=b.parentElement.id;const value=b.dataset.value;if(id==="gameModuleMenu")selectedGameScope.module=value;else if(id==="gameTopicMenu")selectedGameScope.topic=value;else if(id==="gameAuthorMenu")selectedGameScope.author=value;renderGamesScope()});
  document.addEventListener("click",closeGameMenus,{once:true});
}
function closeGameMenus(){document.querySelectorAll(".game-scope-menu.open").forEach(x=>x.classList.remove("open"))}
function renderGamesScope(){
  const {moduleRows,topicRows,authorRows}=gameScopeOptions();
  const selectedGame=selectedGameScope.game;
  const gameLabels={author_work:"Author ↔ Work",work_author:"Work ↔ Author",work_date:"Work ↔ Date",author_work_date:"Author → Work + Date",movement_writer:"Movement → Writer",writer_movement:"Writer → Movement",chronology:"Chronology",period_classification:"Victorian vs Modernist",who_am_i:"Who Am I?",full_stupidification:"Full Stupidification",character_work:"Character ↔ Work",theory:"Theory ↔ Theorist"};
  app.innerHTML=shell("Games","Choose only what you want to practise. Nothing here is mandatory — you can narrow by module, topic/age, author, or leave everything open.");
  app.innerHTML+=`<div class="game-scope-card"><div class="game-scope-heading"><div><span class="tag">OPTIONAL FILTERS</span><h2>Build your practice pool.</h2></div><button class="clear-game-scope" id="clearGameScope">Clear</button></div><div class="game-scope-grid">${gameScopeSelect("gameModuleMenu","Module",selectedGameScope.module,moduleRows).replace('game-scope-menu" id="gameModuleMenu"','game-scope-menu" id="gameModuleMenu"')} ${gameScopeSelect("gameTopicMenu","Topic / Age",selectedGameScope.topic,topicRows)} ${gameScopeSelect("gameAuthorMenu","Author",selectedGameScope.author,authorRows)}</div><div class="game-scope-summary"><span>${selectedGameScope.module?esc(moduleRows.find(x=>x.id===selectedGameScope.module)?.name):"All modules"}</span><span>${selectedGameScope.topic?esc(topicRows.find(x=>x.id===selectedGameScope.topic)?.name):"All topics"}</span><span>${selectedGameScope.author?esc(authorRows.find(x=>x.id===selectedGameScope.author)?.name):"All authors"}</span></div></div>`;
  app.innerHTML+=`<div class="game-choice-card"><div class="game-scope-heading"><div><span class="tag">GAME TYPE</span><h2>What do you want to play?</h2></div></div><div class="game-choice-grid">${[
    ["author_work","Author ↔ Work","Match writers with their works."],["work_author","Work ↔ Author","Identify the writer from a work."],["work_date","Work ↔ Date","Test publication dates."],["author_work_date","Author → Work + Date","Connect writer, work and date."],["chronology","Chronology","Arrange works in the correct order."],["movement_writer","Movement → Writer","Connect literary movements with writers."],["writer_movement","Writer → Movement","Identify a writer's movement."],["who_am_i","Who Am I?","Identify the writer from clues."],["full_stupidification","Full Stupidification","Mix author, work, date and movement."],["character_work","Character ↔ Work","Connect characters with works."],["theory","Theory ↔ Theorist","Connect theories and theorists."]
  ].map(([k,t,d])=>`<button type="button" class="game-choice ${selectedGame===k?'selected':''}" data-game="${k}"><strong>${t}</strong><span>${d}</span></button>`).join("")}</div><div class="game-start-row"><div id="gameScopeNote">${selectedGame?`Ready: <strong>${esc(gameLabels[selectedGame])}</strong> · ${selectedGameScope.author?esc(authorRows.find(x=>x.id===selectedGameScope.author)?.name):"all authors"}.`:"Choose a game to begin."}</div><button class="btn" id="startSelectedGame" ${selectedGame?"":"disabled"}>Start Game →</button></div></div>`;
  bindGameScope();
  document.querySelectorAll(".game-choice").forEach(b=>b.onclick=()=>{selectedGameScope.game=b.dataset.game;renderGamesScope()});
  document.querySelector("#clearGameScope").onclick=()=>{selectedGameScope={module:"",topic:"",author:"",game:selectedGame};renderGamesScope()};
  document.querySelector("#startSelectedGame").onclick=()=>startGame(selectedGameScope.game,{...selectedGameScope});
}
function games(){selectedGameScope={module:"",topic:"",author:"",game:""};renderGamesScope()}
function buildTheoryQuestions(){return shuffle(theories.filter(t=>t.theorists?.name)).map((t,i)=>{const correct=t.theorists.name;const distractors=shuffle(theorists.filter(x=>x.name!==correct)).slice(0,3).map(x=>x.name);return {id:`theory-${i}`,game_type:"theory",prompt:`Who is associated with the theory "${t.name}"?`,answer:correct,choices:shuffle([correct,...distractors]),explanation:t.description||""}})}
function startGame(kind,scope={}){
  stopTimer("game");gameStats={right:0,wrong:0};gamePos=0;
  let pool=kind==="theory"?buildTheoryQuestions():gameQuestions.filter(q=>q.game_type===kind);
  if(scope.module)pool=pool.filter(q=>q.module_id===scope.module || (!q.module_id&&topics.find(t=>t.id===q.topic_id)?.module_id===scope.module));
  if(scope.topic)pool=pool.filter(q=>q.topic_id===scope.topic);
  if(scope.author)pool=pool.filter(q=>q.author_id===scope.author);
  gameDeck=shuffle(pool);renderGame(kind,scope);
}
function renderGame(kind,scope={}){
  const labels={author_work:"Author ↔ Work",work_author:"Work ↔ Author",work_date:"Work ↔ Date",author_work_date:"Author → Work + Date",movement_writer:"Movement → Writer",writer_movement:"Writer → Movement",chronology:"Chronology",period_classification:"Victorian vs Modernist",who_am_i:"Who Am I?",full_stupidification:"Full Stupidification",character_work:"Character ↔ Work",theory:"Theory ↔ Theorist"};
  const scopeText=[scope.module?modules.find(x=>x.id===scope.module)?.name:"All modules",scope.topic?topics.find(x=>x.id===scope.topic)?.name:"All topics",scope.author?authors.find(x=>x.id===scope.author)?.name:"All authors"].join(" · ");
  if(!gameDeck.length){app.innerHTML=shell(labels[kind]||"Game","No questions match this selection yet.");app.innerHTML+=`<div class="empty"><strong>No published questions in this pool.</strong><p>Try a broader selection, or add more game questions from the Admin dashboard.</p><a class="btn secondary" href="#games">Change selection</a></div>`;return}
  const q=gameDeck[gamePos],choices=Array.isArray(q.choices)?shuffle(q.choices):[];
  app.innerHTML=shell(labels[kind]||"Game",`<span class="game-running-scope">${esc(scopeText)}</span>`);
  app.innerHTML+=`<div class="quiz-wrap"><div class="quiz-dashboard">${statBox("RIGHT",gameStats.right,"right")}${statBox("WRONG",gameStats.wrong,"wrong")}${statBox("TIME","0s")}</div><div class="quiz-meta"><span>Question ${gamePos+1}</span><span>${gameDeck.length} in current deck</span></div><h2 class="quiz-question">${esc(q.prompt||q.question||"")}</h2><div class="options">${choices.map(o=>`<button class="option" data-answer="${esc(o)}">${esc(o)}</button>`).join("")}</div><div id="gameFeedback"></div></div>`;
  gameStarted=Date.now();gameTimer=setInterval(()=>{const boxes=document.querySelectorAll(".quiz-stat strong");if(boxes[2])boxes[2].textContent=timerText(gameStarted)},1000);
  document.querySelectorAll(".option").forEach(b=>b.onclick=()=>answerGame(b,q,kind,scope));
}
function answerGame(btn,q,kind,scope){if(!gameTimer)return;stopTimer("game");const correct=btn.dataset.answer===q.answer;if(correct)gameStats.right++;else gameStats.wrong++;document.querySelectorAll(".option").forEach(b=>{b.disabled=true;if(b.dataset.answer===q.answer)b.classList.add("correct")});if(!correct)btn.classList.add("wrong");document.querySelector("#gameFeedback").innerHTML=`<div class="feedback"><strong>${correct?"✓ Correct":"✗ Not quite"}</strong><p>${esc(q.explanation||"")}</p><div class="rating-row"><button class="rating" id="gameEasy">Easy · next</button><button class="rating" id="gameHard">Hard · repeat later</button></div></div>`;document.querySelector("#gameEasy").onclick=()=>nextGame(kind,scope,false);document.querySelector("#gameHard").onclick=()=>nextGame(kind,scope,true)}
function nextGame(kind,scope,hard){if(hard)gameDeck.push(gameDeck[gamePos]);gamePos++;if(gamePos>=gameDeck.length)finishGame(kind,scope);else renderGame(kind,scope)}
async function finishGame(kind,scope){stopTimer("game");const total=gameStats.right+gameStats.wrong,accuracy=total?Math.round(gameStats.right/total*100):0;state.gamesPlayed++;save();if(currentUser){await sb.from("user_game_history").insert({user_id:currentUser.id,game_type:kind,score:gameStats.right,total:total});await syncCloudProgress()}app.innerHTML=shell("Game complete",kind);app.innerHTML+=`<div class="completion"><span class="tag">ROUND COMPLETE</span><h2>Nice. Round finished.</h2><div class="completion-stats">${statBox("RIGHT",gameStats.right,"right")}${statBox("WRONG",gameStats.wrong,"wrong")}<div><strong>${accuracy}%</strong><span>Accuracy</span></div></div><button class="btn" id="playAgain">Play again</button> <a class="btn secondary" href="#games">Change game</a></div>`;document.querySelector("#playAgain").onclick=()=>startGame(kind,scope)}

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
  app.innerHTML=shell("Progress","Your practice statistics. Sign in from Profile to keep them across devices.");
  app.innerHTML+=`<div class="grid">
    <div class="card"><span class="tag">QUIZ ACCURACY</span><div class="big-stat">${accuracy}%</div><p>${state.quizCorrect} correct out of ${state.quizAttempts} answered.</p><div class="progress-bar"><div class="progress-fill" style="width:${accuracy}%"></div></div></div>
    <div class="card"><span class="tag">REVIEW</span><div class="big-stat">${state.wrongIds.length}</div><p>Questions you have previously missed.</p></div>
    <div class="card"><span class="tag">FLASHCARDS</span><div class="big-stat">${hard}</div><p>Cards currently rated Hard.</p></div>
    <div class="card"><span class="tag">GAMES</span><div class="big-stat">${state.gamesPlayed}</div><p>Game rounds completed.</p></div>
  </div>`;
}

/* ACCOUNT / PROFILE */
let currentUser=null;
let currentProfile=null;

async function getSessionUser(){
  const {data}=await sb.auth.getSession();
  currentUser=data?.session?.user||null;
  return currentUser;
}

async function ensureProfile(user, displayName){
  if(!user)return null;
  const {data,error}=await sb.from("profiles").select("id,display_name,is_admin").eq("id",user.id).maybeSingle();
  if(error)return null;
  if(data){currentProfile=data;return data;}
  const name=displayName||user.user_metadata?.display_name||user.email?.split("@")[0]||"Student";
  const {data:created}=await sb.from("profiles").insert({id:user.id,display_name:name}).select("id,display_name,is_admin").single();
  currentProfile=created||null;
  return currentProfile;
}

async function syncCloudProgress(){
  if(!currentUser)return;
  const accuracy=state.quizAttempts?Math.round(state.quizCorrect/state.quizAttempts*100):0;
  await sb.from("user_progress").upsert({
    user_id:currentUser.id,accuracy,quizzes_completed:state.quizRounds||0,
    flashcards_reviewed:state.flashcardsReviewed||0,games_played:state.gamesPlayed||0,updated_at:new Date().toISOString()
  });
}

async function loadCloudProgress(){
  if(!currentUser)return;
  const [{data},{data:attempts},{data:flashProgress},{data:gameHistory}]=await Promise.all([
    sb.from("user_progress").select("accuracy,quizzes_completed,flashcards_reviewed,games_played").eq("user_id",currentUser.id).maybeSingle(),
    sb.from("user_quiz_attempts").select("is_correct,question_id").eq("user_id",currentUser.id),
    sb.from("user_flashcard_progress").select("flashcard_id,rating").eq("user_id",currentUser.id),
    sb.from("user_game_history").select("id,game_type,score,total,created_at").eq("user_id",currentUser.id).order("created_at",{ascending:false})
  ]);
  if(data){
    state.quizRounds=Math.max(state.quizRounds||0,data.quizzes_completed||0);
    state.flashcardsReviewed=Math.max(state.flashcardsReviewed||0,data.flashcards_reviewed||0);
    state.gamesPlayed=Math.max(state.gamesPlayed||0,data.games_played||0);
  }
  if(attempts){
    state.quizAttempts=Math.max(state.quizAttempts||0,attempts.length);
    state.quizCorrect=Math.max(state.quizCorrect||0,attempts.filter(x=>x.is_correct).length);
  }
  if(flashProgress){flashProgress.forEach(x=>{state.cardRatings[x.flashcard_id]=x.rating})}
  if(gameHistory){state.gamesPlayed=Math.max(state.gamesPlayed||0,gameHistory.length)}
  save();
}

async function profile(){
  const user=await getSessionUser();
  if(!user){
    app.innerHTML=shell("Profile","Create a free account so your study progress can follow you across devices.");
    app.innerHTML+=`<div class="auth-card card"><span class="tag">YOUR ACCOUNT</span><h2>Keep your progress.</h2><p>Sign up to save quiz progress, flashcard reviews and game activity with your account.</p><div class="form-grid"><div class="field"><label>Name</label><input id="authName" placeholder="Your name"></div><div class="field"><label>Email</label><input id="authEmail" type="email" placeholder="you@example.com"></div><div class="field full"><label>Password</label><input id="authPassword" type="password" placeholder="At least 6 characters"></div></div><div class="actions"><button class="btn" id="signupBtn">Create account</button><button class="btn secondary" id="loginBtn">Sign in</button></div><p id="authMessage" class="muted"></p></div>`;
    document.querySelector("#signupBtn").onclick=signUp;
    document.querySelector("#loginBtn").onclick=signIn;
    return;
  }
  await ensureProfile(user);
  await loadCloudProgress();
  const accuracy=state.quizAttempts?Math.round(state.quizCorrect/state.quizAttempts*100):0;
  const hard=Object.values(state.cardRatings).filter(x=>x==="hard").length;
  const answered=Math.max(0,state.quizAttempts||0);
  const practiceScore=Math.min(100,Math.round((Math.min(answered,50)/50)*60 + (Math.min(state.flashcardsReviewed||0,50)/50)*20 + (Math.min(state.gamesPlayed||0,25)/25)*20));
  app.innerHTML=shell("Profile","Your STUPIDIFICATION study account and saved progress.");
  app.innerHTML+=`<div class="profile-progress-hero">
    <div class="profile-progress-copy"><span class="tag">YOUR STUDY MOMENTUM</span><h2>${practiceScore>=80?"You’re in the zone.":practiceScore>=45?"You’re building momentum.":"Let’s get started."}</h2><p>Every quiz answer, flashcard review and completed game round adds to this little snapshot of your practice.</p></div>
    <div class="progress-orb" style="--progress:${practiceScore}%"><div><strong>${practiceScore}%</strong><span>practice</span></div></div>
  </div>
  <div class="profile-grid">
    <div class="card profile-main"><div class="profile-avatar">${esc((currentProfile?.display_name||user.email||"S").charAt(0).toUpperCase())}</div><span class="tag">STUDENT ACCOUNT</span><h2 class="profile-name">${esc(currentProfile?.display_name||"Student")}</h2><p class="profile-email">${esc(user.email||"")}</p><button class="btn secondary" id="logoutBtn">Sign out</button></div>
    <div class="card profile-stat"><span class="tag">QUIZ ACCURACY</span><div class="big-stat">${accuracy}%</div><p>${state.quizCorrect} correct out of ${state.quizAttempts} answered.</p><div class="progress-bar"><div class="progress-fill" style="width:${accuracy}%"></div></div></div>
    <div class="card profile-stat"><span class="tag">QUESTIONS ANSWERED</span><div class="big-stat">${answered}</div><p>Total quiz answers recorded.</p></div>
    <div class="card profile-stat"><span class="tag">QUIZ ROUNDS</span><div class="big-stat">${state.quizRounds||0}</div><p>Completed quiz rounds.</p></div>
    <div class="card profile-stat"><span class="tag">FLASHCARDS</span><div class="big-stat">${state.flashcardsReviewed||0}</div><p>Cards reviewed · ${hard} currently Hard.</p></div>
    <div class="card profile-stat"><span class="tag">GAMES</span><div class="big-stat">${state.gamesPlayed||0}</div><p>Game rounds completed.</p></div>
    <div class="card profile-review"><span class="tag">REVIEW QUEUE</span><div class="big-stat">${state.wrongIds.length}</div><p>Questions you have previously missed and should revisit.</p></div>
  </div>`;
  document.querySelector("#logoutBtn").onclick=async()=>{await sb.auth.signOut();currentUser=null;currentProfile=null;location.hash="#profile";render()};
}

async function signUp(){
  const name=document.querySelector("#authName").value.trim(),email=document.querySelector("#authEmail").value.trim(),password=document.querySelector("#authPassword").value;
  const msg=document.querySelector("#authMessage");
  if(!email||password.length<6){msg.textContent="Please enter an email and a password of at least 6 characters.";return}
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name:name||email.split("@")[0]}}});
  if(error){msg.textContent=error.message;return}
  if(data.session){await ensureProfile(data.user,name);await syncCloudProgress();msg.textContent="Account created. Opening your profile…";location.hash="#profile";render()}
  else msg.textContent="Account created. Check your email to confirm your account, then sign in.";
}
async function signIn(){
  const email=document.querySelector("#authEmail").value.trim(),password=document.querySelector("#authPassword").value,msg=document.querySelector("#authMessage");
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){msg.textContent=error.message;return}
  currentUser=data.user;await ensureProfile(data.user);await loadCloudProgress();await syncCloudProgress();location.hash="#profile";render();
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
  else if(route==="progress"){location.hash="#profile";return;}
  else if(route==="profile")profile();
  else home();
  window.scrollTo({top:0,behavior:"smooth"});
}
window.addEventListener("hashchange",()=>{route=location.hash.slice(1)||"home";document.querySelector("#mainNav").classList.remove("open");render()});
document.querySelector("#menuToggle").onclick=()=>document.querySelector("#mainNav").classList.toggle("open");

(async()=>{try{await loadData();await getSessionUser();if(currentUser){await ensureProfile(currentUser);await loadCloudProgress()}}catch(e){console.error(e)}render()})();
