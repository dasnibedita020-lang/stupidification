/* STUPIDIFICATION v0.2 — structure-first prototype.
   Content is intentionally small for now. The architecture is ready for a larger database later. */

const syllabus = [
  {id:'british', name:'British Literature', topics:['Old & Middle English','Age of Chaucer','Age of Revival','Elizabethan Age','Jacobean & Caroline Age','Civil War & Interregnum','Restoration Age','Enlightenment Age','Romantic Age','Victorian Age','Modern Age','Postmodern & Contemporary Literature']},
  {id:'american', name:'American Literature', topics:['Early American Literature','American Romanticism','Major Poets','Major Novelists','Major Playwrights','Lost Generation','Beat Generation','Contemporary American Writers']},
  {id:'postcolonial', name:'Postcolonial Literature', topics:['Major Postcolonial Writers & Texts','Postcolonial Theory','Diaspora','Migration & Exile','Subaltern Studies']},
  {id:'european', name:'European Literature', topics:['Classical European Literature','French Literature','German Literature','Russian Literature','Existentialism','Modern European Literature']},
  {id:'indian', name:'Indian Literature', topics:['Indian English Literature','Indian Regional Literatures','Indian Poets','Indian Novelists','Indian Drama','Indian Literary Criticism']},
  {id:'english-india', name:'English in India', topics:['History & Evolution of English in India','Colonial Education & Language Policies','Indian English Linguistics','Indian Literary Criticism','Indian Aesthetics & Sanskrit Poetics','Rasa, Dhwani, Vakrokti & Alankara','Major Indian Thinkers']},
  {id:'criticism', name:'Literary Criticism', topics:['Plato & Aristotle','Renaissance & Enlightenment Critics','Sidney, Dryden & Johnson','Wordsworth & Coleridge','Matthew Arnold','T.S. Eliot & Modern Criticism','Henry James & Virginia Woolf','M.H. Abrams & Kenneth Burke','Critical Concepts','Criticism Timeline']},
  {id:'theory', name:'Literary Theory', topics:['New Criticism & Formalism','Structuralism & Semiotics','Post-Structuralism & Deconstruction','Postmodernism','Psychoanalysis','Archetypal Criticism','Reader-Response','Phenomenology','Marxism','New Historicism','Postcolonial Theory & Subaltern Studies','Feminist & Gender Theory','Critical Race Theory & Queer Theory','Ecocriticism']},
  {id:'cultural', name:'Cultural Studies', topics:['Foundations of Cultural Studies','Culture, Media & Society','Popular Culture','Globalization','Representation & Identity','Frankfurt School','Media & Communication Theory','Audience & Consumer Studies','Stuart Hall & Raymond Williams','Feminist & Visual Culture']},
  {id:'movements', name:'Literary Movements', topics:['Renaissance & Neoclassicism','Romanticism','Realism & Naturalism','Aestheticism','Symbolism','Imagism & Vorticism','Modernism','Bloomsbury Group','Existentialism & Absurdism','Beat & Confessional Poetry','Theatre of the Absurd','Epic Theatre']},
  {id:'linguistics', name:'Linguistics', topics:['Foundations of Linguistics','Phonology, Morphology & Semantics','Language & Meaning','Evolution of English','ELT','Major Linguists','Sapir-Whorf','Language Acquisition','Sociolinguistics','Psycholinguistics','Pragmatics & Speech Acts','Applied Linguistics']},
  {id:'research', name:'Research Methodology', topics:['Foundations of Literary Research','Research Methods','Topic Selection & Proposal Writing','Research Papers & Theses','Citation Styles & Academic Writing','Critical Research & Literary Analysis','Research Tools & Resources']},
  {id:'terms', name:'Literary Terms & Devices', topics:['Literary Terms','Figures of Speech','Genres of Fiction','Narrative Techniques','Character Types','Magic Realism & Metafiction','Prosody & Meter','Poetry Forms','Rhetoric & Poetic Devices']},
  {id:'exam', name:'UGC NET Exam Special', topics:['Reading Comprehension','Chronology-Based Questions','Statement Questions','Assertion-Reason','Match-the-Column','Quotes & Speakers','Coined Terms & Key Phrases','Literary Awards','Pseudonyms & Pen Names','Journals & Institutions','Dictionaries & Translations']}
];

const demoQuiz = [
  {id:'q1',topic:'Structuralism & Semiotics',q:'Which pair is central to Saussure’s model of the linguistic sign?',o:['Langue and parole','Signifier and signified','Author and reader','Fabula and sjuzet'],a:'Signifier and signified',e:'Saussure distinguishes the signifier (sound-image) from the signified (concept).'},
  {id:'q2',topic:'Modern Age',q:'Who wrote The Waste Land?',o:['W.B. Yeats','T.S. Eliot','Ezra Pound','James Joyce'],a:'T.S. Eliot',e:'T.S. Eliot published The Waste Land in 1922.'},
  {id:'q3',topic:'Victorian Age',q:'Which novel was written by George Eliot?',o:['Middlemarch','Jane Eyre','North and South','The Mill on the Floss'],a:'Middlemarch',e:'Middlemarch was written by George Eliot and published in 1871–72.'}
];
const demoCards = [
  {id:'c1',topic:'Modern Age',front:'The Waste Land',back:'T.S. Eliot · 1922'},
  {id:'c2',topic:'Structuralism & Semiotics',front:'Signifier / Signified',back:'Saussure · the two parts of the linguistic sign'},
  {id:'c3',topic:'Victorian Age',front:'Middlemarch',back:'George Eliot · 1871–72'}
];
const authors=[['T.S. Eliot','Modernism','1888–1965'],['Virginia Woolf','Modernism','1882–1941'],['Ferdinand de Saussure','Structuralism','1857–1913'],['George Eliot','Victorian','1819–1880']];
const works=[['The Waste Land','T.S. Eliot','1922'],['Mrs Dalloway','Virginia Woolf','1925'],['Course in General Linguistics','Ferdinand de Saussure','1916'],['Middlemarch','George Eliot','1871–72']];

const state = JSON.parse(localStorage.getItem('stupidificationState')||'null') || {quizAttempts:0,quizCorrect:0,wrong:[],cardRatings:{},gamesPlayed:0};
const save=()=>localStorage.setItem('stupidificationState',JSON.stringify(state));
const app=document.querySelector('#app');
let route=(location.hash.slice(1)||'home');
let quizQueue=[]; let quizIndex=0; let currentQuiz=null; let quizAnswered=false;
let cardQueue=[]; let cardIndex=0; let cardFlipped=false;
let gamePairs=[]; let gameSelected=null; let gameMatched=[];

function shuffle(arr){return [...arr].sort(()=>Math.random()-0.5)}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function setActive(){document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===route))}
function shell(head,sub){return `<section class="page-head"><div class="eyebrow">STUPIDIFICATION · ${head.toUpperCase()}</div><h1 class="page-title">${head}</h1><p class="page-intro">${sub}</p></section>`}

function home(){app.innerHTML=`<section class="hero"><div class="hero-copy"><div class="eyebrow">ENGLISH LITERATURE · LEARNING SYSTEM</div><h1>Stop memorising.<br><em>Start connecting.</em></h1><p>Choose one thing. Learn it clearly. Test it. Play with it. Come back to what you forgot. STUPIDIFICATION is being built as an adaptive literature-learning system for students who are tired of drowning in disconnected facts.</p><div class="hero-actions"><a class="btn" href="#learn">Start learning</a><a class="btn secondary" href="#quiz">Take a quiz</a></div></div></section><div class="flower-line"></div><div class="grid">${feature('LEARN','Knowledge building','Pick a syllabus area, then move from module → topic → concept without getting lost.','#learn')}${feature('QUIZ','Test yourself','Four options, instant explanation, shuffled attempts and intelligent repetition.','#quiz')}${feature('FLASHCARDS','Remember','Rate cards as Hard, Good or Easy. Hard cards return more often.','#flashcards')}${feature('GAMES','Play with literature','Match authors, works, dates and theories. Every round reshuffles.','#games')}${feature('EXPLORE','Connect the dots','Search authors, works, concepts and later connect everything through the database.','#explore')}${feature('PROGRESS','See what you know','Accuracy, weak areas, difficult cards and game history—saved in your browser for now.','#progress')}</div>`}
function feature(tag,title,text,href){return `<a class="card" href="${href}" style="text-decoration:none;color:inherit"><span class="tag">${tag}</span><h2>${title}</h2><p>${text}</p><span class="arrow">Open →</span></a>`}

function learn(){app.innerHTML=shell('Learn','This follows the UGC NET English literature study map as a starting taxonomy: British, American, Postcolonial, European, Indian, English in India, Criticism, Theory, Cultural Studies, Movements, Linguistics, Research Methodology, Literary Terms & Devices and Exam Special. The exact content will be added later.');app.innerHTML+=`<div class="grid">${syllabus.map((m,i)=>`<a class="card" href="#learn-${m.id}" style="text-decoration:none;color:inherit"><span class="tag">MODULE ${String(i+1).padStart(2,'0')}</span><h2>${m.name}</h2><p>${m.topics.length} starter topics ready for the database.</p><span class="arrow">Browse topics →</span></a>`).join('')}</div>`}
function learnModule(id){const m=syllabus.find(x=>x.id===id);if(!m)return learn();app.innerHTML=shell(m.name,`Choose a topic. Later, every topic will open a structured knowledge page with concepts, authors, works, examples, related ideas, quiz questions and flashcards.`)+`<div class="grid">${m.topics.map((t,i)=>`<a class="card" href="#learn-topic-${id}-${i}" style="text-decoration:none;color:inherit"><span class="tag">TOPIC ${String(i+1).padStart(2,'0')}</span><h2>${t}</h2><p>Knowledge building · quiz · cards · games</p><span class="arrow">Open topic →</span></a>`).join('')}</div>`}
function topicPlaceholder(){app.innerHTML=shell('Topic workspace','The structure is ready. This is where the actual knowledge content will go next: concise explanation → key terms → important authors/works → examples → related concepts → practice.');app.innerHTML+=`<div class="card"><span class="tag">CONTENT COMING NEXT</span><h2>Database-first learning</h2><p>We are deliberately keeping the data layer separate from the interface. Once the content is loaded, the same records can feed Learn, Quiz, Flashcards, Games and Explore.</p></div>`}

function topicCards(mode){
  const title=mode==='quiz'?'Quiz':'Flashcards';
  const desc=mode==='quiz'
    ? 'Choose exactly what you want to practise. Pick a module, then a topic, and begin a randomized quiz.'
    : 'Choose exactly what you want to review. Pick a module, then a topic, and begin a shuffled card session.';
  app.innerHTML=shell(title,desc);
  app.innerHTML+=`<div class="grid">${syllabus.map((m,i)=>`<a class="card" href="#${mode}-category-${m.id}" style="text-decoration:none;color:inherit"><span class="tag">MODULE ${String(i+1).padStart(2,'0')}</span><h2>${m.name}</h2><p>${m.topics.length} topics available</p><span class="arrow">Choose topic →</span></a>`).join('')}</div>`;
}

function topicCategory(mode,id){
  const m=syllabus.find(x=>x.id===id);
  if(!m){topicCards(mode);return}
  const title=mode==='quiz'?'Quiz · '+m.name:'Flashcards · '+m.name;
  app.innerHTML=shell(title,`Choose a topic from ${m.name}. Every session is randomized, and your performance can be used for repetition.`);
  app.innerHTML+=`<div class="grid">${m.topics.map((t,i)=>`<a class="card" href="#${mode}-topic-${m.id}-${i}" style="text-decoration:none;color:inherit"><span class="tag">TOPIC ${String(i+1).padStart(2,'0')}</span><h2>${t}</h2><p>${mode==='quiz'?'Start quiz →':'Start flashcards →'}</p><span class="arrow">Open topic →</span></a>`).join('')}</div>`;
}

function selectedTopic(mode,id,index){
  const m=syllabus.find(x=>x.id===id);
  if(!m || !m.topics[Number(index)]){topicCards(mode);return}
  const topic=m.topics[Number(index)];
  if(mode==='quiz') startQuiz(topic); else prepareCards(topic);
}

function startQuiz(topicFilter=null){
  const usable=demoQuiz.filter(q=>!topicFilter || q.topic===topicFilter);
  const wrong=usable.filter(q=>(state.wrong||[]).includes(q.id));
  quizQueue=shuffle([...usable,...wrong]); quizIndex=0; quizAnswered=false; currentQuiz=null; renderQuiz(topicFilter);
}
function renderQuiz(topicFilter=null){
  if(!quizQueue.length){
    app.innerHTML=shell('Quiz',`${topicFilter?escapeHtml(topicFilter):'Choose a topic'}`);
    app.innerHTML+=`<div class="empty"><strong>No quiz questions here yet.</strong><p>This topic is ready for content. Once we load the data, questions for this exact topic will appear here.</p><a class="btn" href="#quiz">Choose another topic</a></div>`;
    return;
  }
  currentQuiz=quizQueue[quizIndex%quizQueue.length];
  const options=shuffle(currentQuiz.o);
  app.innerHTML=shell('Quiz',`${topicFilter?escapeHtml(topicFilter)+' · ':''}Four-option practice. Each attempt gets a new question sequence and a new option order. Questions you miss are deliberately reintroduced later in the same session.`);
  app.innerHTML+=`<div class="quiz-wrap"><div class="quiz-meta"><span>${quizIndex+1} / ${quizQueue.length}</span><span>${escapeHtml(currentQuiz.topic)}</span></div><h2 class="quiz-question">${escapeHtml(currentQuiz.q)}</h2><div class="options">${options.map(o=>`<button class="option" data-answer="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div><div id="quizFeedback"></div></div>`;
  document.querySelectorAll('.option').forEach(btn=>btn.onclick=()=>answerQuiz(btn,currentQuiz,options,topicFilter));
}
function answerQuiz(btn,q,options,topicFilter){
  if(quizAnswered)return; quizAnswered=true; const chosen=btn.dataset.answer; const correct=chosen===q.a; state.quizAttempts++; if(correct)state.quizCorrect++; else if(!state.wrong.includes(q.id))state.wrong.push(q.id); save();
  document.querySelectorAll('.option').forEach(b=>{b.disabled=true;if(b.dataset.answer===q.a)b.classList.add('correct')}); if(!correct)btn.classList.add('wrong');
  document.querySelector('#quizFeedback').innerHTML=`<div class="feedback"><strong>${correct?'✓ Correct':'✗ Not quite'}</strong><p>${escapeHtml(q.e)}</p><button class="btn" id="nextQuiz">${quizIndex+1===quizQueue.length?'Finish attempt':'Next question →'}</button></div>`;
  document.querySelector('#nextQuiz').onclick=()=>{quizIndex++;quizAnswered=false;if(quizIndex>=quizQueue.length){startQuiz(topicFilter)}else renderQuiz(topicFilter)}
}
function quiz(){topicCards('quiz')}

function prepareCards(topicFilter=null){
  const base=demoCards.filter(c=>!topicFilter || c.topic===topicFilter);
  const weighted=[];
  base.forEach(c=>{const rating=state.cardRatings[c.id]||'new';const weight=rating==='hard'?4:rating==='good'?2:rating==='easy'?1:3;for(let i=0;i<weight;i++)weighted.push(c)});
  cardQueue=shuffle(weighted); cardIndex=0; cardFlipped=false; renderCard(topicFilter);
}
function renderCard(topicFilter=null){
  if(!cardQueue.length){
    app.innerHTML=shell('Flashcards',`${topicFilter?escapeHtml(topicFilter):'Choose a topic'}`);
    app.innerHTML+=`<div class="empty"><strong>No flashcards here yet.</strong><p>This topic is ready for cards. Once we load the data, flashcards for this exact topic will appear here.</p><a class="btn" href="#flashcards">Choose another topic</a></div>`;
    return;
  }
  const c=cardQueue[cardIndex%cardQueue.length];
  app.innerHTML=shell('Flashcards',`${topicFilter?escapeHtml(topicFilter)+' · ':''}Flip a card, then rate how difficult it was. Hard cards receive more weight and return sooner; every new session is shuffled.`);
  app.innerHTML+=`<div class="flash-wrap"><div class="quiz-meta"><span>Card ${cardIndex+1} / ${cardQueue.length}</span><span>${escapeHtml(c.topic)}</span></div><div class="flashcard ${cardFlipped?'flipped':''}" id="flashcard"><div class="flash-inner"><div class="flash-content">${cardFlipped?`<strong>${escapeHtml(c.back)}</strong>`:`<strong>${escapeHtml(c.front)}</strong><span class="flash-hint">Tap to reveal</span>`}</div></div></div>${cardFlipped?`<div class="rating-row"><button class="rating" data-rate="hard">Hard · show again</button><button class="rating" data-rate="good">Good</button><button class="rating" data-rate="easy">Easy</button></div>`:''}</div>`;
  document.querySelector('#flashcard').onclick=()=>{cardFlipped=!cardFlipped;renderCard(topicFilter)};
  document.querySelectorAll('.rating').forEach(b=>b.onclick=()=>rateCard(c,b.dataset.rate,topicFilter));
}
function rateCard(c,rating,topicFilter=null){state.cardRatings[c.id]=rating;save();cardIndex++;cardFlipped=false;if(cardIndex>=cardQueue.length)prepareCards(topicFilter);else renderCard(topicFilter)}
function flashcards(){topicCards('flashcards')}

function games(){app.innerHTML=shell('Games','Every game round is generated from the same content records, but the order is randomized each time. More game types will plug into this system as the database grows.');app.innerHTML+=`<div class="grid">${feature('MATCH','Author ↔ Work','Connect writers with the right works.','#game-match')}${feature('MATCH','Work ↔ Date','Match a literary work with its publication date.','#game-date')}${feature('ORDER','Chronology','Arrange authors or works from earliest to latest.','#game-chronology')}${feature('MATCH','Theory ↔ Theorist','Connect concepts and theories with their key thinkers.','#game-theory')}</div>`}
function gameMatch(kind){
  const source=kind==='date'?works:works.slice(0,3).map(w=>[w[0],w[1]]);const pairs=shuffle(source.map((x,i)=>({id:String(i),left:x[0],right:kind==='date'?x[2]:x[1]})));gamePairs=shuffle(pairs.flatMap(p=>[{id:p.id,side:'left',text:p.left},{id:p.id,side:'right',text:p.right}]));gameSelected=null;gameMatched=[];state.gamesPlayed++;save();renderMatchGame(kind,pairs)
}
function renderMatchGame(kind,pairs){app.innerHTML=shell(kind==='date'?'Work ↔ Date':'Author ↔ Work','Click two tiles to match them. The tile order changes every round.');app.innerHTML+=`<div class="game-score">Matched <strong>${gameMatched.length}</strong> / ${pairs.length}</div><div class="game-board">${gamePairs.map((x,i)=>`<button class="game-tile ${gameMatched.includes(x.id)?'matched':''} ${gameSelected===i?'selected':''}" data-i="${i}">${escapeHtml(x.text)}</button>`).join('')}</div>`;document.querySelectorAll('.game-tile').forEach(b=>b.onclick=()=>matchClick(+b.dataset.i,pairs,kind))}
function matchClick(i,pairs,kind){if(gameMatched.includes(gamePairs[i].id))return;if(gameSelected===null){gameSelected=i;renderMatchGame(kind,pairs);return}const a=gamePairs[gameSelected],b=gamePairs[i];if(a.id===b.id&&a.side!==b.side){gameMatched.push(a.id)}gameSelected=null;renderMatchGame(kind,pairs)}
function chronology(){const items=shuffle(works.slice(0,4));let selected=[];app.innerHTML=shell('Chronology','Click the works in chronological order. Your next round will be shuffled.');app.innerHTML+=`<div class="card"><p>Selected order: ${selected.length?selected.map(i=>escapeHtml(items[i][0])).join(' → '):'—'}</p><div class="grid">${items.map((x,i)=>`<button class="game-tile" data-i="${i}">${escapeHtml(x[0])}<br><small>${escapeHtml(x[2])}</small></button>`).join('')}</div><div id="chronoResult"></div></div>`;document.querySelectorAll('.game-tile').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(!selected.includes(i)){selected.push(i);b.classList.add('selected')}if(selected.length===items.length){const years=selected.map(i=>parseInt(items[i][2]));const ok=years.every((v,j)=>j===0||v>=years[j-1]);document.querySelector('#chronoResult').innerHTML=`<div class="feedback"><strong>${ok?'✓ Correct chronology':'✗ Try again'}</strong><p>${ok?'Excellent.':'The correct order runs from the earliest publication year to the latest.'}</p><button class="btn" onclick="location.hash='game-chronology'">New round</button></div>`}})}
function gameTheory(){app.innerHTML=shell('Theory ↔ Theorist','A placeholder game shell for the theory database. Once the theory records are loaded, this will use the same randomized matching engine.');app.innerHTML+=`<div class="empty">Theory game ready for data. No content has been bulk-loaded yet.</div>`}

function explore(){app.innerHTML=shell('Explore','Search across the knowledge graph. As we add data, authors, works, concepts, movements and theories will become connected records.');app.innerHTML+=`<input class="search" id="search" placeholder="Search author, work, theory, concept…"><div id="results"></div>`;const draw=()=>{const q=document.querySelector('#search').value.toLowerCase();const a=authors.filter(x=>x.join(' ').toLowerCase().includes(q));const w=works.filter(x=>x.join(' ').toLowerCase().includes(q));document.querySelector('#results').innerHTML=`<div class="grid">${a.map(x=>`<div class="card"><span class="tag">AUTHOR</span><h2>${escapeHtml(x[0])}</h2><p>${escapeHtml(x[1])} · ${escapeHtml(x[2])}</p></div>`).join('')}${w.map(x=>`<div class="card"><span class="tag">WORK</span><h2>${escapeHtml(x[0])}</h2><p>${escapeHtml(x[1])} · ${escapeHtml(x[2])}</p></div>`).join('')}</div>`};document.querySelector('#search').oninput=draw;draw()}
function progress(){const accuracy=state.quizAttempts?Math.round(state.quizCorrect/state.quizAttempts*100):0;const hard=Object.values(state.cardRatings).filter(x=>x==='hard').length;app.innerHTML=shell('Progress','Your prototype stores progress locally in this browser. Later, the same system can be moved to a real account/database so it follows you between phone and PC.');app.innerHTML+=`<div class="grid"><div class="card"><span class="tag">QUIZ</span><div class="stat">${accuracy}%</div><p>Current quiz accuracy</p><div class="progress-bar"><div class="progress-fill" style="width:${accuracy}%"></div></div></div><div class="card"><span class="tag">REPETITION</span><div class="stat">${state.wrong.length}</div><p>Questions currently marked for repetition</p></div><div class="card"><span class="tag">FLASHCARDS</span><div class="stat">${hard}</div><p>Cards currently rated Hard</p></div><div class="card"><span class="tag">GAMES</span><div class="stat">${state.gamesPlayed}</div><p>Game rounds played</p></div></div>`}

function render(){setActive();document.title=`STUPIDIFICATION · ${route.replaceAll('-',' ')}`;if(route==='home')home();else if(route==='learn')learn();else if(route.startsWith('learn-')){const id=route.split('-')[1]; if(route.startsWith('learn-topic-')) topicPlaceholder(); else learnModule(id)}else if(route==='quiz')quiz();else if(route.startsWith('quiz-category-'))topicCategory('quiz',route.replace('quiz-category-',''));else if(route.startsWith('quiz-topic-')){const parts=route.replace('quiz-topic-','').split('-');const idx=parts.pop();selectedTopic('quiz',parts.join('-'),idx)}else if(route==='flashcards')flashcards();else if(route.startsWith('flashcards-category-'))topicCategory('flashcards',route.replace('flashcards-category-',''));else if(route.startsWith('flashcards-topic-')){const parts=route.replace('flashcards-topic-','').split('-');const idx=parts.pop();selectedTopic('flashcards',parts.join('-'),idx)}else if(route==='games')games();else if(route==='game-match')gameMatch('author');else if(route==='game-date')gameMatch('date');else if(route==='game-chronology')chronology();else if(route==='game-theory')gameTheory();else if(route==='explore')explore();else if(route==='progress')progress();else home();window.scrollTo({top:0,behavior:'smooth'})}
window.addEventListener('hashchange',()=>{route=location.hash.slice(1)||'home';document.querySelector('#mainNav').classList.remove('open');document.querySelector('#menuToggle').setAttribute('aria-expanded','false');render()});document.querySelector('#menuToggle').onclick=()=>{const nav=document.querySelector('#mainNav');nav.classList.toggle('open');document.querySelector('#menuToggle').setAttribute('aria-expanded',nav.classList.contains('open'))};render();
