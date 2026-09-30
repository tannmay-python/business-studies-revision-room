(function(){
  var chapters=window.CHAPTERS||[];
  var bank=[];
  var activeChapter=chapters[0];
  var currentView="notes";
  var flipped={};
  var storageKey="bst-revision-progress-v1";
  var progress={known:[],attempted:[],correct:0,total:0,review:[]};
  var filterChapter="all",filterMarks="all",filterCases=false;
  var session={questions:[],index:0,correct:0,answered:0,finished:false};

  try{progress=JSON.parse(localStorage.getItem(storageKey))||progress}catch(e){}
  function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function shuffle(a){var x=a.slice();for(var i=x.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=x[i];x[i]=x[j];x[j]=t}return x}
  function makeOptions(correct,source,answerIndex){var opts=new Array(4);opts[answerIndex]=correct;var others=source.filter(function(x){return x!==correct});var p=0;for(var i=0;i<4;i++){if(i!==answerIndex)opts[i]=others[p++%others.length]}return opts}
  chapters.forEach(function(c){
    (c.mcqs||[]).forEach(function(q,i){bank.push({id:c.id+"-mcq-"+i,chapter:c.id,type:"mcq",marks:1,case:false,q:q.q,o:q.o,a:q.a,x:q.x})});
    (c.subjective||[]).forEach(function(q,i){bank.push({id:c.id+"-short-"+i,chapter:c.id,type:"short",marks:q.m,case:!!q.case,caseText:q.case||"",q:q.q,key:q.key})});
    (c.cards||[]).forEach(function(card,i){var others=c.cards.filter(function(x,j){return j!==i}).map(function(x){return x[1]});var ai=i%4;bank.push({id:c.id+"-recall-"+i,chapter:c.id,type:"mcq",marks:1,case:false,q:"Which description best matches "+card[0]+"?",o:makeOptions(card[1],others,ai),a:ai,x:card[1]})});
    (c.cues||[]).forEach(function(cue,i){var label=cue[1];var others=c.cards.map(function(x){return x[0]}).filter(function(x){return x!==label});var ai=(i+1)%4;bank.push({id:c.id+"-case-"+i,chapter:c.id,type:"mcq",marks:1,case:true,caseText:cue[0],q:"Which concept is most directly shown by this case clue?",o:makeOptions(label,others,ai),a:ai,x:label+" is the best match for the action described."})});
  });
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(progress))}catch(e){}renderProgress()}
  function totalCards(){return chapters.reduce(function(n,c){return n+(c.cards||[]).length},0)}
  function renderProgress(){var total=totalCards(),known=progress.known.length,percent=total?Math.round(known/total*100):0;var label=document.getElementById("progress-percent"),fill=document.getElementById("progress-fill"),detail=document.getElementById("progress-detail"),track=fill&&fill.parentElement;if(label)label.textContent=percent+"%";if(fill)fill.style.width=percent+"%";if(detail)detail.textContent=known+" of "+total+" recall cards marked known.";if(track)track.setAttribute("aria-valuenow",String(percent))}
  function closeRail(){var rail=document.getElementById("rail"),scrim=document.getElementById("rail-scrim"),menu=document.getElementById("mobile-menu");if(rail)rail.classList.remove("open");if(scrim)scrim.classList.remove("open");if(menu)menu.setAttribute("aria-expanded","false")}
  function renderChapterList(){var list=document.getElementById("chapter-list");list.innerHTML=chapters.map(function(c){return '<button class="chapter-link '+(activeChapter.id===c.id?"active":"")+'" data-chapter="'+esc(c.id)+'"><span class="chapter-no">'+esc(c.id.padStart(2,"0"))+'</span><span class="chapter-title">'+esc(c.title)+'</span></button>'}).join("");list.querySelectorAll("[data-chapter]").forEach(function(b){b.addEventListener("click",function(){activeChapter=chapters.find(function(c){return c.id===b.dataset.chapter});currentView="notes";session.questions=[];render();closeRail()})})}
  function renderNotes(){
    var c=activeChapter,index=chapters.indexOf(c),prev=chapters[(index+chapters.length-1)%chapters.length],next=chapters[(index+1)%chapters.length];
    return '<div class="page page-notes">'+
      '<section class="notes-intro"><div class="notes-intro-top"><div class="eyebrow">CHAPTER '+esc(c.id.padStart(2,"0"))+' · CORE NOTES</div><div class="chapter-pagination"><button class="chapter-pill" id="previous-chapter" type="button" aria-label="Previous chapter">← Previous</button><button class="chapter-pill" id="next-chapter" type="button" aria-label="Next chapter">Next →</button></div></div><h1>'+esc(c.title)+'</h1><p class="deck">'+esc(c.focus)+'</p></section>'+
      '<section class="notes-summary"><div class="summary-block"><div class="summary-label">Remember this</div><p>'+esc(c.headline)+'</p></div><div class="takeaways">'+c.takeaways.map(function(t,i){return '<article class="takeaway"><span class="takeaway-number">'+String(i+1).padStart(2,"0")+'</span><p>'+esc(t)+'</p></article>'}).join("")+'</div></section>'+
      '<section class="flow-section"><div class="section-heading"><h2>One-glance flow</h2><span>Recall the order</span></div><div class="flow">'+c.flow.map(function(x,i){return '<div class="flow-step"><div class="flow-step-top"><span class="flow-number">'+String(i+1).padStart(2,"0")+'</span><span class="flow-connector" aria-hidden="true"></span></div><b>'+esc(x[0])+'</b><span class="flow-description">'+esc(x[1])+'</span></div>'}).join("")+'</div></section>'+
      '<section class="section-grid">'+c.sections.map(function(s){return '<article class="content-card"><h3>'+esc(s.title)+'</h3><p class="card-lead">'+esc(s.lead)+'</p><div class="term-list">'+s.items.map(function(i){return '<div class="term-row"><span class="term">'+esc(i[0])+'</span><span class="definition">'+esc(i[1])+'</span></div>'}).join("")+'</div></article>'}).join("")+'</section>'+
      '<section class="case-section"><div class="section-heading stacked"><h2>Case-study clue finder</h2><p>Underline the action first. Name the concept, then use the case as evidence for your link.</p></div><div class="case-list">'+c.cues.map(function(x){return '<div class="case-row"><span class="case-clue">“'+esc(x[0])+'”</span><span class="case-concept">'+esc(x[1])+'</span></div>'}).join("")+'</div></section>'+
      '<section class="compare-section"><h2>'+esc(c.compare.title)+'</h2><div class="compare-scroll"><table class="compare-table"><thead><tr>'+c.compare.heads.map(function(h){return '<th>'+esc(h)+'</th>'}).join("")+'</tr></thead><tbody>'+c.compare.rows.map(function(row){return '<tr>'+row.map(function(cell,i){return '<td'+(i===0?' class="compare-term"':'')+'>'+esc(cell)+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table></div><div class="exam-callout"><span>Exam move</span><p>Name the concept, point to the case evidence, and explain the link in one clear sentence.</p></div></section></div>';
  }
  function candidateQuestions(){return bank.filter(function(q){return (filterChapter==="all"||q.chapter===filterChapter)&&(filterMarks==="all"||String(q.marks)===filterMarks)&&(!filterCases||q.case)})}
  function startSet(){var pool=shuffle(candidateQuestions());session={questions:pool.slice(0,Math.min(10,pool.length)),index:0,correct:0,answered:0,finished:false};renderPractice()}
  function finishSet(){session.finished=true;renderPractice()}
  function advance(){if(session.index+1>=session.questions.length){finishSet();return}session.index++;renderPractice()}
  function selectAnswer(index){var q=session.questions[session.index];if(q.selected!==undefined)return;q.selected=index;q.answered=true;session.answered++;progress.total++;progress.attempted.push(q.id);if(index===q.a){session.correct++;progress.correct++}save();renderPractice()}
  function selfRate(rate){var q=session.questions[session.index];if(q.selfRate)return;q.selfRate=rate;session.answered++;progress.attempted.push(q.id);if(rate==="review")progress.review.push(q.id);save();renderPractice()}
  function renderPractice(){
    var view=document.getElementById("view");
    var options='<option value="all">All chapters</option>'+chapters.map(function(c){return '<option value="'+esc(c.id)+'">Chapter '+esc(c.id)+' · '+esc(c.title)+'</option>'}).join("");
    var toolbar='<div class="practice-tools"><select id="qchapter" class="chapter-filter" aria-label="Filter by chapter">'+options+'</select><div class="marks-segment" role="group" aria-label="Filter by marks">'+[['all','All'],['1','1'],['2','2'],['3','3'],['4','4']].map(function(x){return '<button type="button" class="mark-chip '+(filterMarks===x[0]?'active':'')+'" data-marks="'+x[0]+'" aria-pressed="'+(filterMarks===x[0])+'">'+x[1]+(x[0]==="all"?'':x[0]==="1"?' mark':' marks')+'</button>'}).join("")+'</div><button type="button" class="case-toggle '+(filterCases?'active':'')+'" id="case-only" aria-pressed="'+filterCases+'"><span class="toggle-dot" aria-hidden="true"></span>Case-based only</button><button class="start-set" id="start-set" type="button">Start 10-question set</button></div>';
    var head='<div class="practice-head"><div class="eyebrow">PRACTICE · '+bank.length+' QUESTIONS</div><h1>Question bank</h1><p class="deck">Mix instant-check MCQs with 2–4 mark prompts. For written answers, attempt first, then reveal the marking points.</p></div>';
    if(session.finished){
      view.innerHTML='<div class="page page-practice">'+head+toolbar+'<article class="done-state"><div class="eyebrow">SET COMPLETE</div><h2>You finished '+session.questions.length+' questions.</h2><p>'+session.answered+' attempted · '+session.correct+' MCQs correct. Written answers are self-assessed against the points you revealed.</p><button class="dark-pill" id="again" type="button">Build another set</button></article></div>';
    }else if(!session.questions.length){
      view.innerHTML='<div class="page page-practice">'+head+toolbar+'<article class="empty-state"><h2>Start with one focused set</h2><p>'+bank.length+' questions across all ten chapters. Choose a chapter, mark value or case-only filter, then start a set of up to ten.</p></article></div>';
    }else{
      var q=session.questions[session.index],chapter=chapters.find(function(c){return c.id===q.chapter}),pct=Math.round((session.index+1)/session.questions.length*100);
      var meta='<div class="question-meta"><span class="pill">'+q.marks+' mark'+(q.marks===1?'':'s')+'</span>'+(q.case?'<span class="pill case">Case-based</span>':'')+'<span class="question-chapter">Chapter '+esc(q.chapter)+' · '+esc(chapter.title)+'</span></div>';
      var body=q.case?'<div class="question-case"><span>Case</span><p>'+esc(q.caseText)+'</p></div>':'';
      body+='<p class="question-text">'+esc(q.q)+'</p>';
      if(q.type==="mcq"){
        body+='<div class="option-list">'+q.o.map(function(o,i){var cl="option";if(q.answered&&i===q.a)cl+=" correct";if(q.answered&&i===q.selected&&i!==q.a)cl+=" wrong";return '<button class="'+cl+'" data-answer="'+i+'" '+(q.answered?'disabled':'')+'><span class="option-key">'+String.fromCharCode(65+i)+'</span><span>'+esc(o)+'</span></button>'}).join("")+'</div>';
        if(q.answered)body+='<div class="feedback '+(q.selected===q.a?'good':'bad')+'"><strong>'+(q.selected===q.a?'Correct.':'Not quite.')+'</strong> '+esc(q.x)+'</div>';
      }else{
        body+='<label class="attempt-label" for="answer-draft">Your attempt (optional)</label><textarea id="answer-draft" rows="4" placeholder="Your attempt (optional) — write a quick outline, or answer on paper…">'+esc(q.draft||'')+'</textarea>';
        body+='<button type="button" class="reveal-button" id="reveal-points" aria-expanded="'+!!q.revealed+'">'+(q.revealed?'Hide marking points':'Reveal marking points')+' <span aria-hidden="true">'+(q.revealed?'−':'+')+'</span></button>';
        if(q.revealed)body+='<div class="answer-points">'+q.key.map(function(x,i){return '<div class="answer-point"><span>'+String(i+1).padStart(2,"0")+'</span><p>'+esc(x)+'</p></div>'}).join("")+'</div>';
        body+='<div class="self-rate"> <button class="rate-pill" data-rate="secure" '+(q.selfRate?'disabled':'')+'>I covered the key points</button><button class="rate-pill" data-rate="review" '+(q.selfRate?'disabled':'')+'>Needs another look</button></div>';
        if(q.selfRate)body+='<div class="feedback '+(q.selfRate==="secure"?'good':'review')+'"><strong>'+(q.selfRate==="secure"?'Secure.':'Added to review.')+'</strong></div>';
      }
      view.innerHTML='<div class="page page-practice">'+head+toolbar+'<div class="set-progress"><div class="set-progress-track" role="progressbar" aria-label="Question set progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div><span>'+String(session.index+1).padStart(2,"0")+' / '+String(session.questions.length).padStart(2,"0")+'</span></div><article class="practice-card">'+meta+body+'</article><div class="question-footer"><span>'+session.answered+' answered in this set</span><div><button class="outline-pill" id="skip-question" type="button">Skip</button><button class="dark-pill" id="next-question" type="button">'+(session.index+1===session.questions.length?'Finish set':'Next question')+'</button></div></div></div>';
    }
    var chapterSel=document.getElementById("qchapter");chapterSel.value=filterChapter;chapterSel.addEventListener("change",function(){filterChapter=this.value;session.questions=[];renderPractice()});
    document.querySelectorAll("[data-marks]").forEach(function(b){b.addEventListener("click",function(){filterMarks=b.dataset.marks;session.questions=[];renderPractice()})});
    var caseToggle=document.getElementById("case-only");caseToggle.addEventListener("click",function(){filterCases=!filterCases;session.questions=[];renderPractice()});
    ["start-set","again"].forEach(function(id){var b=document.getElementById(id);if(b)b.addEventListener("click",startSet)});
    var next=document.getElementById("next-question");if(next)next.addEventListener("click",advance);
    var skip=document.getElementById("skip-question");if(skip)skip.addEventListener("click",advance);
    document.querySelectorAll("[data-answer]").forEach(function(b){b.addEventListener("click",function(){selectAnswer(Number(b.dataset.answer))})});
    document.querySelectorAll("[data-rate]").forEach(function(b){b.addEventListener("click",function(){selfRate(b.dataset.rate)})});
    var draft=document.getElementById("answer-draft");if(draft)draft.addEventListener("input",function(){session.questions[session.index].draft=this.value});
    var reveal=document.getElementById("reveal-points");if(reveal)reveal.addEventListener("click",function(){var q=session.questions[session.index];q.revealed=!q.revealed;renderPractice()});
  }
  function renderRecall(){
    var c=activeChapter,cards=c.cards||[];
    var html='<div class="page page-recall"><div class="recall-head"><div><div class="eyebrow">ACTIVE RECALL · CHAPTER '+esc(c.id.padStart(2,"0"))+'</div><h1>Recall cards</h1><p class="deck">Try to say the answer before you flip. Mark it known only when you can recall it without a hint.</p></div><select class="chapter-filter recall-select" id="recall-select" aria-label="Choose chapter">'+chapters.map(function(x){return '<option value="'+esc(x.id)+'" '+(x.id===c.id?'selected':'')+'>'+esc(x.title)+'</option>'}).join("")+'</select></div><div class="recall-grid">';
    html+=cards.map(function(card,i){var key=c.id+":"+i,show=!!flipped[key],known=progress.known.indexOf(key)>=0;return '<article class="recall-card '+(show?'is-flipped ':'')+(known?'is-known':'')+'" tabindex="0" data-flip="'+esc(key)+'" aria-label="'+(show?'Answer: '+esc(card[1]):'Prompt: '+esc(card[0])+'. Press Enter or Space to flip')+'"><div class="recall-top"><span class="eyebrow">'+(show?'ANSWER':'PROMPT')+'</span><span class="recall-status">'+(known?'KNOWN':String(i+1).padStart(2,"0"))+'</span></div><div class="recall-copy '+(show?'back':'front')+'">'+esc(card[show?1:0])+'</div><div class="recall-actions"><button data-known="'+esc(key)+'" class="'+(known?'known':'')+'" type="button">'+(known?'Known ✓':'I know this')+'</button><button data-review="'+esc(key)+'" type="button">Review again</button></div></article>'}).join("")+'</div></div>';
    document.getElementById("view").innerHTML=html;
    document.getElementById("recall-select").addEventListener("change",function(){activeChapter=chapters.find(function(x){return x.id===this.value},this);render()});
    document.querySelectorAll("[data-flip]").forEach(function(el){el.addEventListener("click",function(e){if(e.target.closest("button"))return;flipped[el.dataset.flip]=!flipped[el.dataset.flip];renderRecall()});el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();flipped[el.dataset.flip]=!flipped[el.dataset.flip];renderRecall()}})});
    document.querySelectorAll("[data-known]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();var key=b.dataset.known,i=progress.known.indexOf(key);if(i<0)progress.known.push(key);else progress.known.splice(i,1);save();renderRecall()})});
    document.querySelectorAll("[data-review]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();var key=b.dataset.review;progress.review.push(key);progress.known=progress.known.filter(function(x){return x!==key});save();flipped[key]=false;renderRecall()})});
  }
  function render(){
    renderChapterList();renderProgress();document.querySelectorAll(".nav-item").forEach(function(b){var active=b.dataset.view===currentView;b.classList.toggle("active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
    document.getElementById("crumb").textContent=currentView==="notes"?"Chapter "+activeChapter.id:currentView==="practice"?"Question bank":"Recall cards";
    if(currentView==="notes"){
      document.getElementById("view").innerHTML=renderNotes();
      document.getElementById("previous-chapter").addEventListener("click",function(){activeChapter=chapters[(chapters.indexOf(activeChapter)+chapters.length-1)%chapters.length];render()});
      document.getElementById("next-chapter").addEventListener("click",function(){activeChapter=chapters[(chapters.indexOf(activeChapter)+1)%chapters.length];render()});
    }else if(currentView==="practice")renderPractice();else renderRecall();
  }
  document.querySelectorAll(".nav-item").forEach(function(b){b.addEventListener("click",function(){currentView=b.dataset.view;render();closeRail()})});
  document.getElementById("sprint-button").addEventListener("click",function(){currentView="practice";session.questions=[];render();startSet()});
  document.getElementById("mobile-menu").addEventListener("click",function(){var rail=document.getElementById("rail"),scrim=document.getElementById("rail-scrim"),open=!rail.classList.contains("open");rail.classList.toggle("open",open);scrim.classList.toggle("open",open);this.setAttribute("aria-expanded",String(open))});
  document.getElementById("rail-scrim").addEventListener("click",closeRail);
  document.getElementById("bank-count").textContent=bank.length+"";
  function registerTools(){
    var context=document.modelContext;if(!context||typeof context.registerTool!=="function")return;
    var life=new AbortController();
    try{
      Promise.resolve(context.registerTool({name:"open_study_chapter",title:"Open chapter notes",description:"Open one of the Business Studies revision chapters already present in the visible study site.",inputSchema:{type:"object",properties:{chapter:{type:"string",enum:chapters.map(function(c){return c.id})}},required:["chapter"],additionalProperties:false},annotations:{readOnlyHint:false},execute:function(input){var c=chapters.find(function(x){return x.id===input.chapter});if(!c)throw new Error("Unknown chapter");activeChapter=c;currentView="notes";render();return {chapter:c.id,title:c.title,view:"notes"}}},{signal:life.signal})).catch(function(){});
      Promise.resolve(context.registerTool({name:"start_revision_question_set",title:"Start practice set",description:"Start a visible ten-question practice set using the selected chapter, mark value and case filter.",inputSchema:{type:"object",properties:{chapter:{type:"string"},marks:{type:"string",enum:["all","1","2","3","4"]},caseBasedOnly:{type:"boolean"}},additionalProperties:false},annotations:{readOnlyHint:false},execute:function(input){filterChapter=input.chapter||"all";filterMarks=input.marks||"all";filterCases=!!input.caseBasedOnly;currentView="practice";startSet();return {questions:session.questions.length,chapter:filterChapter,marks:filterMarks,caseBasedOnly:filterCases}}},{signal:life.signal})).catch(function(){});
      Promise.resolve(context.registerTool({name:"read_revision_progress",title:"Read revision progress",description:"Read the current local recall-card and objective-question progress shown by the study site.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:function(){return {recallCardsKnown:progress.known.length,recallCardsTotal:totalCards(),mcqCorrect:progress.correct,mcqAttempted:progress.total,availableQuestions:bank.length}}},{signal:life.signal})).catch(function(){});
    }catch(e){}
  }
  registerTools();render();
})();
