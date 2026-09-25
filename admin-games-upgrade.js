/* STUPIDIFICATION — Games scope upgrade
   Loaded after admin.js so the existing admin (including bulk import) is preserved.
*/
(function(){
  const URL="https://crndztiqvghsvtbprsrn.supabase.co";
  const KEY="sb_publishable_xXimMadw55KUp9KEglRc9Q_J1lnZ513";
  const db=window.supabase.createClient(URL,KEY);
  const types=[
    ["author_work","Author ↔ Work","MATCH","Connect an author to a work."],
    ["work_author","Work ↔ Author","MATCH","Identify the writer from a work."],
    ["work_date","Work ↔ Date","DATE","Match a work to its publication date."],
    ["author_work_date","Author → Work + Date","DATE","Connect writer, work and date."],
    ["movement_writer","Movement → Writer","MOVE","Connect literary movements with writers."],
    ["writer_movement","Writer → Movement","MOVE","Identify a writer's movement."],
    ["chronology","Chronology","ORDER","Put works in chronological order."],
    ["period_classification","Victorian vs Modernist","PERIOD","Identify the literary period."],
    ["who_am_i","Who Am I?","CLUES","Identify the writer from clues."],
    ["full_stupidification","Full Stupidification","BRUTAL","Mix author, work, date and movement."],
    ["character_work","Character ↔ Work","MATCH","Connect a character to its work."],
    ["theory","Theory ↔ Theorist","THEORY","Identify the thinker associated with a theory."]
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const typeMap=Object.fromEntries(types.map(x=>[x[0],x]));
  let cache={modules:[],topics:[],authors:[],works:[]};
  const relation=(arr,key,value,label)=>`<option value="">— None —</option>${arr.map(x=>`<option value="${x.id}" ${x.id===value?'selected':''}>${esc(x[key]||label)}</option>`).join('')}`;
  async function load(){
    const [m,t,a,w]=await Promise.all([
      db.from('modules').select('id,name').order('name'),
      db.from('topics').select('id,name,module_id').order('name'),
      db.from('authors').select('id,name').order('name'),
      db.from('works').select('id,title,author_id').order('title')
    ]);
    cache.modules=m.data||[];cache.topics=t.data||[];cache.authors=a.data||[];cache.works=w.data||[];
  }
  function titleForType(k){return typeMap[k]?.[1]||k}
  function openGameUpgrade(r={},preset='author_work'){
    const type=r.game_type||preset||'author_work',meta=typeMap[type]||types[0];
    const choices=Array.isArray(r.choices)?r.choices:[];
    const modal=document.querySelector('#modal');
    modal.innerHTML=`<div class="modal-box"><div class="modal-head"><div><div class="eyebrow">GAME EDITOR</div><h2>${r.id?'Edit':'Add'} ${esc(meta[1])}</h2></div><button class="close" id="gx">×</button></div>
      <div class="game-editor-type"><span class="game-badge">${meta[2]}</span><div><strong>${meta[1]}</strong><small>${meta[3]}</small></div></div>
      <div class="form">
        <div class="field full"><label>Game category</label><select id="ug_type">${types.map(x=>`<option value="${x[0]}" ${x[0]===type?'selected':''}>${x[1]}</option>`).join('')}</select></div>
        <div class="field"><label>Module</label><select id="ug_module">${relation(cache.modules,'name',r.module_id,'Module')}</select></div>
        <div class="field"><label>Topic / Age</label><select id="ug_topic">${relation(cache.topics,'name',r.topic_id,'Topic')}</select></div>
        <div class="field"><label>Author</label><select id="ug_author">${relation(cache.authors,'name',r.author_id,'Author')}</select></div>
        <div class="field"><label>Work</label><select id="ug_work">${relation(cache.works,'title',r.work_id,'Work')}</select></div>
        <div class="field"><label>Correct answer</label><input id="ug_answer" value="${esc(r.answer)}" placeholder="Exact correct answer"></div>
        <div class="field full"><label>Question / prompt</label><textarea id="ug_prompt" placeholder="Write the question shown to students">${esc(r.prompt)}</textarea></div>
        <div class="field full"><label>Answer choices <span class="muted-inline">(one per line)</span></label><textarea id="ug_choices" class="choice-json" placeholder="Option 1\nOption 2\nOption 3\nOption 4">${esc(choices.join('\n'))}</textarea></div>
        <div class="field full"><label>Explanation</label><textarea id="ug_explanation">${esc(r.explanation)}</textarea></div>
        <div class="field"><label>Source</label><input id="ug_source" value="${esc(r.source)}"></div>
        <div class="field"><label><input type="checkbox" id="ug_published" ${r.published?'checked':''}> Published</label></div>
      </div>
      <div class="actions"><button class="btn" id="ug_save">Save game question</button><button class="btn secondary" id="ug_cancel">Cancel</button></div><div id="ug_msg" class="msg"></div></div>`;
    modal.classList.add('open');
    document.querySelector('#gx').onclick=()=>modal.classList.remove('open');
    document.querySelector('#ug_cancel').onclick=()=>modal.classList.remove('open');
    document.querySelector('#ug_save').onclick=async()=>{
      const msg=document.querySelector('#ug_msg');
      const payload={module_id:document.querySelector('#ug_module').value||null,topic_id:document.querySelector('#ug_topic').value||null,author_id:document.querySelector('#ug_author').value||null,work_id:document.querySelector('#ug_work').value||null,game_type:document.querySelector('#ug_type').value,prompt:document.querySelector('#ug_prompt').value.trim(),answer:document.querySelector('#ug_answer').value.trim(),choices:document.querySelector('#ug_choices').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),explanation:document.querySelector('#ug_explanation').value.trim()||null,source:document.querySelector('#ug_source').value.trim()||null,published:document.querySelector('#ug_published').checked};
      if(!payload.prompt||!payload.answer){msg.textContent='Question/prompt and correct answer are required.';return}
      if(payload.choices.length<2){msg.textContent='Add at least two answer choices.';return}
      if(!payload.choices.includes(payload.answer)){msg.textContent='Correct answer must exactly match one choice.';return}
      const res=r.id?await db.from('game_questions').update(payload).eq('id',r.id):await db.from('game_questions').insert(payload);
      if(res.error){msg.textContent=res.error.message;return}
      modal.classList.remove('open');window.renderGameManager?.(document.querySelector('#panel'));
    };
  }
  window.openGame=openGameUpgrade;
  window.openEditor=(function(original){return async function(k,id){if(k!=='game_questions')return original(k,id);await load();let r=(window.__stupidGameRows||[]).find(x=>x.id===id);if(!r&&id){const got=await db.from('game_questions').select('*').eq('id',id).maybeSingle();r=got.data||{}}openGameUpgrade(r||{},r?.game_type||'author_work')}})(window.openEditor);
  window.renderGameManager=async function(panel){
    await load();
    const {data,error}=await db.from('game_questions').select('*').order('created_at',{ascending:false});
    const rows=data||[];window.__stupidGameRows=rows;
    panel.innerHTML=`<div class="game-admin-head"><div><div class="eyebrow">GAME BUILDER</div><h2>Games</h2><p>Attach every game question to its module, topic/age, author and work so the student Games filters can narrow the pool.</p></div><button class="btn" id="ug_add">+ Add game question</button></div><div class="game-admin-grid">${types.map(x=>{const n=rows.filter(r=>r.game_type===x[0]).length;return `<button class="game-admin-card" data-ug-filter="${x[0]}"><span class="game-badge">${x[2]}</span><strong>${x[1]}</strong><span>${x[3]}</span><em>${n} question${n===1?'':'s'}</em></button>`}).join('')}</div><div class="table-wrap"><table class="table"><thead><tr><th>Question</th><th>Scope</th><th>Game</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.length?rows.slice(0,300).map(r=>{const m=cache.modules.find(x=>x.id===r.module_id)?.name||'',t=cache.topics.find(x=>x.id===r.topic_id)?.name||'',a=cache.authors.find(x=>x.id===r.author_id)?.name||'',w=cache.works.find(x=>x.id===r.work_id)?.title||'';return `<tr><td><strong>${esc(r.prompt||'Untitled')}</strong></td><td><small>${esc([m,t,a,w].filter(Boolean).join(' · ')||'Unscoped')}</small></td><td><span class="game-type-pill">${esc(titleForType(r.game_type))}</span></td><td>${r.published?'<span class="pill ok">Published</span>':'<span class="pill no">Draft</span>'}</td><td><button class="btn secondary small" data-ug-edit="${r.id}">Edit</button> <button class="btn danger small" data-ug-delete="${r.id}">Delete</button></td></tr>`}).join(''):`<tr><td colspan="5" class="empty">${error?'Could not load game questions.':'No game questions yet.'}</td></tr>`}</tbody></table></div>`;
    document.querySelector('#ug_add').onclick=()=>openGameUpgrade({},'author_work');
    document.querySelectorAll('[data-ug-edit]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.ugEdit)||{};openGameUpgrade(r,r.game_type)});
    document.querySelectorAll('[data-ug-delete]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.ugDelete);if(!confirm(`Delete “${r?.prompt||'this question'}”?`))return;const res=await db.from('game_questions').delete().eq('id',b.dataset.ugDelete);if(res.error)alert(res.error.message);else window.renderGameManager(panel)});
  };
  // Wait until admin.js has finished its initial boot/render, then refresh the Games tab if opened.
  window.setTimeout(()=>{if(document.querySelector('[data-tab="game_questions"]')&&document.querySelector('#panel')){document.querySelector('[data-tab="game_questions"]')?.addEventListener('click',()=>setTimeout(()=>window.renderGameManager(document.querySelector('#panel')),0))}},400);
})();
