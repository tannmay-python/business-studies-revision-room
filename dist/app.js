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
  function renderProgress(){var total=totalCards(),known=progress.known.length,percent=total?Math.round(known/total*100):0;document.getElementById("progress-percent").textContent=percent+"%";document.getElementById("progress-fill").style.width=percent+"%";document.getElementById("progress-detail").textContent=known+" of "+total+" recall cards marked known."}
  function renderChapterList(){var list=document.getElementById("chapter-list");list.innerHTML=chapters.map(function(c){return '<button class="chapter-link '+(activeChapter.id===c.id?"active":"")+'" data-chapter="'+c.id+'"><span class="chapter-no">'+c.id.padStart(2,"0")+'</span>'+esc(c.title)+'</button>'}).join("");list.querySelectorAll("[data-chapter]").forEach(function(b){b.addEventListener("click",function(){activeChapter=chapters.find(function(c){return c.id===b.dataset.chapter});currentView="notes";session.questions=[];render();document.getElementById("rail").classList.remove("open")})})}
  function renderNotes(){
    var c=activeChapter;
    return '<div class="view-head"><div><div class="eyebrow">CHAPTER '+esc(c.id)+' · CORE NOTES</div><h1>'+esc(c.title)+'</h1><p class="deck">'+esc(c.focus)+'</p></div><select class="chapter-switch" id="chapter-select" aria-label="Choose chapter">'+chapters.map(function(x){return '<option value="'+x.id+'" '+(x.id===c.id?"selected":"")+'>'+esc(x.title)+'</option>'}).join("")+'</select></div>'+
    '<div class="summary-strip"><article class="summary-card primary"><div class="summary-label">Remember this</div><p class="summary-copy">'+esc(c.headline)+'</p></article>'+c.takeaways.map(function(t,i){return '<article class="summary-card"><div class="summary-label">Key idea 0'+(i+1)+'</div><p class="summary-copy">'+esc(t)+'</p></article>'}).join("")+'</div>'+
    '<section class="map-card"><div class="map-heading"><h2>One-glance flow</h2><span class="mini-label">Recall the order</span></div><div class="flow">'+c.flow.map(function(x){return '<div class="flow-step"><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div>'}).join("")+'</div></section>'+
    '<div class="section-grid">'+c.sections.map(function(s){return '<article class="content-card"><h2>'+esc(s.title)+'</h2><p>'+esc(s.lead)+'</p><ul>'+s.items.map(function(i){return '<li><span class="term">'+esc(i[0])+': </span>'+esc(i[1])+'</li>'}).join("")+'</ul></article>'}).join("")+'</div>'+
    '<div class="content-card" style="margin-top:14px"><h2>Case-study clue finder</h2><p>Underline the action first. Name the concept, then use the case as evidence for your link.</p>'+c.cues.map(function(x){return '<div class="case-box"><strong>'+esc(x[0])+'</strong>'+esc(x[1])+'</div>'}).join("")+'</div>'+
    '<div class="content-card" style="margin-top:14px"><h2>'+esc(c.compare.title)+'</h2><div style="overflow:auto"><table class="compare-table"><thead><tr>'+c.compare.heads.map(function(h){return '<th>'+esc(h)+'</th>'}).join("")+'</tr></thead><tbody>'+c.compare.rows.map(function(row){return '<tr>'+row.map(function(cell){return '<td>'+esc(cell)+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table></div><div class="callout"><strong>Exam move:</strong> Name the concept, point to the case evidence, and explain the link in one clear sentence.</div></div>';
  }
  function candidateQuestions(){return bank.filter(function(q){return (filterChapter==="all"||q.chapter===filterChapter)&&(filterMarks==="all"||String(q.marks)===filterMarks)&&(!filterCases||q.case)})}
  function startSet(){var pool=shuffle(candidateQuestions());session={questions:pool.slice(0,Math.min(10,pool.length)),index:0,correct:0,answered:0,finished:false};renderPractice()}
  function finishSet(){session.finished=true;renderPractice()}
  function advance(){if(session.index+1>=session.questions.length){finishSet();return}session.index++;renderPractice()}
  function selectAnswer(index){var q=session.questions[session.index];if(q.selected!==undefined)return;q.selected=index;q.answered=true;session.answered++;progress.total++;progress.attempted.push(q.id);if(index===q.a){session.correct++;progress.correct++}save();renderPractice()}
  function selfRate(rate){var q=session.questions[session.index];if(q.selfRate)return;q.selfRate=rate;session.answered++;progress.attempted.push(q.id);if(rate==="review")progress.review.push(q.id);save();renderPractice()}
  function renderPractice(){
    var view=document.getElementById("view");
    var options='<option value="all">All chapters</option>'+chapters.map(function(c){return '<option value="'+c.id+'">Chapter '+c.id+' · '+esc(c.title)+'</option>'}).join("");
    var toolbar='<div class="practice-tools"><select id="qchapter" aria-label="Filter by chapter">'+options+'</select><select id="qmarks" aria-label="Filter by marks"><option value="all">All marks</option><option value="1">1 mark · MCQ</option><option value="2">2 marks</option><option value="3">3 marks</option><option value="4">4 marks</option></select><label class="check-filter"><input id="case-only" type="checkbox"> Case-based only</label><button class="primary-button" id="start-set">Start 10-question set</button></div>';
    var head='<div class="view-head"><div><div class="eyebrow">PRACTICE · '+bank.length+' QUESTIONS</div><h1>Question bank</h1><p class="deck">Mix instant-check MCQs with 2–4 mark prompts. For written answers, attempt first, then reveal the marking points.</p></div></div>';
    if(session.finished){
      view.innerHTML=head+toolbar+'<article class="practice-card empty-state"><div class="eyebrow">SET COMPLETE</div><h2>You finished '+session.questions.length+' questions.</h2><p>'+session.answered+' attempted · '+session.correct+' MCQs correct. Written answers are self-assessed against the points you revealed.</p><button class="primary-button" id="again">Build another set</button></article>';
    }else if(!session.questions.length){
      view.innerHTML=head+toolbar+'<article class="practice-card empty-state"><h2>Start with one focused set</h2><p>'+bank.length+' questions across all ten chapters. Choose a chapter, mark value or case-only filter, then start a set of up to ten.</p><button class="primary-button" id="first-set">Start 10-question set</button></article>';
    }else{
      var q=session.questions[session.index], chapter=chapters.find(function(c){return c.id===q.chapter}), meta='<div class="question-meta"><span class="pill">'+q.marks+' MARK'+(q.marks===1?"":"S")+'</span><span>Chapter '+q.chapter+' · '+esc(chapter.title)+'</span>'+(q.case?'<span class="pill case">CASE-BASED</span>':'')+'<span class="mini-label" style="margin-left:auto">Question '+(session.index+1)+' of '+session.questions.length+'</span></div>';
      var body=q.case?'<div class="case-box"><strong>CASE</strong>'+esc(q.caseText)+'</div>':'';
      body+='<p class="question-text">'+esc(q.q)+'</p>';
      if(q.type==="mcq"){
        body+='<div class="option-list">'+q.o.map(function(o,i){var cl="option";if(q.answered&&i===q.a)cl+=" correct";if(q.answered&&i===q.selected&&i!==q.a)cl+=" wrong";return '<button class="'+cl+'" data-answer="'+i+'" '+(q.answered?"disabled":"")+'><span class="option-key">'+String.fromCharCode(65+i)+'</span>'+esc(o)+'</button>'}).join("")+'</div>';
        if(q.answered)body+='<div class="feedback '+(q.selected===q.a?"good":"bad")+'"><strong>'+(q.selected===q.a?"Correct.":"Not quite.")+'</strong> '+esc(q.x)+'</div>';
      }else{
        body+='<label class="mini-label" for="answer-draft">Your attempt (optional)</label><textarea id="answer-draft" rows="4" placeholder="Write a quick outline, or answer on paper...">'+esc(q.draft||"")+'</textarea>';
        body+='<details class="answer-points"><summary>'+((q.revealed)?"Marking points":"Reveal marking points")+'</summary><ul>'+q.key.map(function(x){return '<li>'+esc(x)+'</li>'}).join("")+'</ul></details>';
        body+='<div class="practice-tools" style="margin-top:12px"><button class="secondary-button" data-rate="secure" '+(q.selfRate?"disabled":"")+'>I covered the key points</button><button class="secondary-button" data-rate="review" '+(q.selfRate?"disabled":"")+'>Needs another look</button></div>';
        if(q.selfRate)body+='<div class="feedback '+(q.selfRate==="secure"?"good":"bad")+'">'+(q.selfRate==="secure"?"Marked as secure for this attempt.":"Added to your review list.")+'</div>';
      }
      view.innerHTML=head+toolbar+'<article class="practice-card">'+meta+body+'</article><div class="practice-tools"><button class="secondary-button" id="skip-question">Skip</button><button class="primary-button" id="next-question">'+(session.index+1===session.questions.length?"Finish set":"Next question")+'</button><span class="mini-label">'+session.answered+' answered in this set</span></div>';
    }
    var chapterSel=document.getElementById("qchapter");chapterSel.value=filterChapter;chapterSel.addEventListener("change",function(){filterChapter=this.value;session.questions=[];renderPractice()});
    var markSel=document.getElementById("qmarks");markSel.value=filterMarks;markSel.addEventListener("change",function(){filterMarks=this.value;session.questions=[];renderPractice()});
    var caseToggle=document.getElementById("case-only");caseToggle.checked=filterCases;caseToggle.addEventListener("change",function(){filterCases=this.checked;session.questions=[];renderPractice()});
    ["start-set","first-set","again"].forEach(function(id){var b=document.getElementById(id);if(b)b.addEventListener("click",startSet)});
    var next=document.getElementById("next-question");if(next)next.addEventListener("click",advance);
    var skip=document.getElementById("skip-question");if(skip)skip.addEventListener("click",advance);
    document.querySelectorAll("[data-answer]").forEach(function(b){b.addEventListener("click",function(){selectAnswer(Number(b.dataset.answer))})});
    document.querySelectorAll("[data-rate]").forEach(function(b){b.addEventListener("click",function(){selfRate(b.dataset.rate)})});
    var draft=document.getElementById("answer-draft");if(draft)draft.addEventListener("input",function(){session.questions[session.index].draft=this.value});
    var details=document.querySelector(".answer-points");if(details)details.addEventListener("toggle",function(){if(details.open){session.questions[session.index].revealed=true}});
  }
  function renderRecall(){
    var c=activeChapter, cards=c.cards||[];
    var html='<div class="view-head"><div><div class="eyebrow">ACTIVE RECALL · CHAPTER '+esc(c.id)+'</div><h1>Recall cards</h1><p class="deck">Try to say the answer before you flip. Mark it known only when you can recall it without a hint.</p></div><select class="chapter-switch" id="recall-select" aria-label="Choose chapter">'+chapters.map(function(x){return '<option value="'+x.id+'" '+(x.id===c.id?"selected":"")+'>'+esc(x.title)+'</option>'}).join("")+'</select></div><div class="recall-grid">';
    html+=cards.map(function(card,i){var key=c.id+":"+i,show=!!flipped[key],known=progress.known.indexOf(key)>=0;return '<article class="recall-card" tabindex="0" data-flip="'+key+'"><div><div class="eyebrow">'+(show?"ANSWER":"PROMPT")+'</div><div class="'+(show?"back":"front")+'">'+esc(card[show?1:0])+'</div></div><div class="recall-foot"><span>'+esc(c.title)+'</span><span>'+(known?"KNOWN":"TAP TO FLIP")+'</span></div><div class="card-actions"><button data-known="'+key+'" class="'+(known?"known":"")+'">'+(known?"Known ✓":"I know this")+'</button><button data-review="'+key+'">Review again</button></div></article>'}).join("")+'</div>';
    document.getElementById("view").innerHTML=html;
    document.getElementById("recall-select").addEventListener("change",function(){activeChapter=chapters.find(function(x){return x.id===this.value},this);render()});
    document.querySelectorAll("[data-flip]").forEach(function(el){el.addEventListener("click",function(e){if(e.target.closest("button"))return;flipped[el.dataset.flip]=!flipped[el.dataset.flip];renderRecall()});el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();flipped[el.dataset.flip]=!flipped[el.dataset.flip];renderRecall()}})});
    document.querySelectorAll("[data-known]").forEach(function(b){b.addEventListener("click",function(){var key=b.dataset.known,i=progress.known.indexOf(key);if(i<0)progress.known.push(key);else progress.known.splice(i,1);save();renderRecall()})});
    document.querySelectorAll("[data-review]").forEach(function(b){b.addEventListener("click",function(){var key=b.dataset.review;progress.review.push(key);progress.known=progress.known.filter(function(x){return x!==key});save();flipped[key]=false;renderRecall()})});
  }
  function render(){
    renderChapterList();renderProgress();document.querySelectorAll(".nav-item").forEach(function(b){b.classList.toggle("active",b.dataset.view===currentView)});
    document.getElementById("crumb").textContent=currentView==="notes"?"Chapter "+activeChapter.id:currentView==="practice"?"Question bank":"Recall cards";
    if(currentView==="notes"){document.getElementById("view").innerHTML=renderNotes();document.getElementById("chapter-select").addEventListener("change",function(){activeChapter=chapters.find(function(c){return c.id===this.value},this);render()})}
    else if(currentView==="practice")renderPractice();else renderRecall();
  }
  document.querySelectorAll(".nav-item").forEach(function(b){b.addEventListener("click",function(){currentView=b.dataset.view;render();document.getElementById("rail").classList.remove("open")})});
  document.getElementById("sprint-button").addEventListener("click",function(){currentView="practice";session.questions=[];render();startSet()});
  document.getElementById("mobile-menu").addEventListener("click",function(){document.getElementById("rail").classList.toggle("open")});
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
