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
  function noteMarkup(s){
    var text=esc(s);
    return text.replace(/(^|[.!?]\s+)([A-Z][A-Za-z0-9’'&(),/\- ]{1,54}?):(?=\s)/g,function(_,lead,label){return lead+'<strong>'+label+':</strong>'});
  }
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
  // Group existing source sections into a deliberate reading order; retain every section.
  var noteTopics={
    "1":[["Meaning and characteristics",[0,1,6]],["Objectives and importance",[5,2]],["Science, art and profession",[7]],["Levels and functions",[3,4]],["Coordination",[8]]],
    "2":[["Understanding principles",[0]],["Taylor: principles and techniques",[1,2,6]],["Fayol’s 14 principles",[3,5]],["Key distinctions",[4]]],
    "3":[["Meaning and importance",[0,1]],["Dimensions and case clues",[2,6]],["Economic reforms",[3,7]],["Demonetisation",[4,5]]],
    "4":[["Meaning, importance and limits",[0,1,2]],["Planning process",[3]],["Types of plans and vocabulary",[4,5]]],
    "5":[["Organising process",[0]],["Organisation structures",[1,2]],["Delegation",[3,5]],["Decentralisation",[4]]],
    "6":[["Staffing and workforce planning",[0,5]],["Recruitment",[1]],["Selection and placement",[2,4]],["Training and development",[3,6]]],
    "7":[["Meaning and elements",[0,1]],["Motivation",[2,6]],["Incentives and leadership",[3,7]],["Communication and barriers",[4,5,8]]],
    "8":[["Meaning and link with planning",[0,2]],["Control process and correction",[1,5]],["Control techniques",[3,4]]],
    "11":[["Marketing and its philosophies",[0,1]],["Functions of marketing",[2,5]],["Product and price",[3,6]],["Place and promotion",[4,7]]],
    "12":[["Who is a consumer? Why protect them?",[0,7]],["Rights and responsibilities",[1,2]],["Complaints and remedies",[3,5,8]],["Redressal and appeals",[4,9]],["Consumer organisations",[6]]]
  };
  /* Detailed textbook notes */
  var chapterLessons={
  "1": [
    {
      "title": "Management: meaning and performance",
      "sections": [
        {
          "title": "Meaning of management",
          "category": "Definition",
          "examPrompt": "Define management and explain its purpose.",
          "lead": "Management is a deliberate process for guiding people and using organisational resources to achieve stated goals. It combines coordinated work with results: completing the right tasks and using resources carefully.",
          "items": [
            [
              "Management as a process",
              "Managers perform connected functions—planning, organising, staffing, directing and controlling. The functions recur and depend on one another: plans guide the structure and staffing, direction puts work into action, and control checks results and feeds information into later plans.",
              "A production target planned in advance must be staffed, supervised and checked against actual output."
            ],
            [
              "Management works through and with people",
              "Managers do not normally achieve organisational objectives by acting alone. They coordinate the efforts of employees and other participants, assign responsibilities and provide direction so that individual contributions add up to a common result.",
              "A store manager coordinates sales, inventory and customer-service employees to meet the store's targets."
            ],
            [
              "Limited resources and a changing environment",
              "Organisations pursue objectives with limited money, materials, equipment, time and people. Management therefore has to choose how resources will be used while responding to changes outside the organisation that can alter costs, demand or available methods.",
              "A firm may revise its production plan after a supplier raises prices or a new technology becomes available."
            ]
          ]
        },
        {
          "title": "Effectiveness and efficiency",
          "category": "Concepts and distinctions",
          "examPrompt": "Distinguish between effectiveness and efficiency in management.",
          "lead": "Effective and efficient management are related but not interchangeable. A manager aims to achieve the intended result and to use resources economically while doing so.",
          "items": [
            [
              "Effectiveness: achieving the intended result",
              "Effectiveness is about whether the planned task or target is completed. It focuses on ends and outcomes, such as meeting a delivery date or reaching a production target. Completing a task after the deadline or missing the stated result is ineffective even if little money was spent.",
              "Producing the required 5,000 units by the promised date is effective."
            ],
            [
              "Efficiency: doing the task with minimum waste and cost",
              "Efficiency concerns the relationship between inputs and outputs. It improves when the same output is achieved with fewer resources, or when more output is obtained from the same inputs. Relevant inputs include money, materials, equipment and employee time; reducing waste helps lower cost.",
              "Making 5,000 units with less material and overtime is more efficient."
            ],
            [
              "Why management must balance both",
              "A business may meet its target but spend too much, making it effective but inefficient. It may also cut costs so aggressively that output is delayed or unsuitable, making it efficient in a narrow sense but ineffective. Good management seeks the required result at a sensible cost.",
              "Double shifts may meet a target but increase labour and power costs; under-producing to save costs misses the target."
            ]
          ]
        }
      ]
    },
    {
      "title": "Characteristics of management",
      "sections": [
        {
          "title": "Seven characteristics",
          "category": "Characteristics",
          "examPrompt": "Explain any three characteristics of management.",
          "lead": "Management is recognised through the way it directs organised effort. The following seven characteristics are distinct and commonly examined as separate points.",
          "items": [
            [
              "Goal-oriented process",
              "Management unites the work of different people around objectives. Goals give the organisation a reason for acting and let managers decide which tasks, resources and standards matter. Different organisations can have different goals, but management directs activity towards the goals chosen for that organisation.",
              "A school and a retail business both need management, although their central goals differ."
            ],
            [
              "Continuous process",
              "Management is not a one-time act. Planning, organising, staffing, directing and controlling are interrelated functions that continue as the organisation operates. Managers may carry out several functions at once, though the time devoted to each function can differ by level.",
              "Control findings from this month's production become information for next month's plan."
            ],
            [
              "All-pervasive activity",
              "Management is needed in organisations of every size and purpose, throughout departments and at all managerial levels. The basic work of management is common, even though the methods and priorities used in a hospital, school, factory or public body will differ.",
              "A hospital manages people, budgets and service delivery just as a manufacturer manages people, money and production."
            ],
            [
              "Intangible force",
              "Management itself cannot be seen as a physical object, but its presence can be inferred from results and the work climate. Orderly operations, progress towards targets and employees who understand their responsibilities are signs that management is working; confusion and missed plans can signal the reverse.",
              "On-time service and clear staff responsibilities are observable effects of good management."
            ],
            [
              "Group activity",
              "Management is required because people work together in groups while bringing different skills, needs and aims. It gives their efforts a common direction, coordinates their contributions and helps the organisation pursue shared results while allowing individuals to develop.",
              "A product launch requires design, purchasing, production and sales employees to cooperate."
            ],
            [
              "Dynamic function",
              "Management must adjust as the organisation's external environment changes. Social expectations, technology, economic conditions and political or legal developments can alter what customers want or what the organisation can do. A manager monitors these shifts and adapts plans and practices to keep the organisation viable.",
              "A restaurant that changes its menu to reflect local tastes is adapting management to its environment."
            ],
            [
              "Multidimensional activity",
              "Management has three connected dimensions: managing work, managing people and managing operations. Work must be translated into objectives and assigned tasks; people must be guided as individuals and as a group; operations transform inputs, often with technology, into products or services. A weakness in one dimension can affect the others.",
              "A hospital coordinates treatment work, medical teams and the processes that turn staff, equipment and supplies into patient care."
            ]
          ]
        },
        {
          "title": "Three dimensions in practice",
          "category": "Dimensions of management",
          "examPrompt": "Explain the three dimensions of management.",
          "lead": "The dimensions show what managers have to manage within an organisation; they are related aspects of the same activity rather than separate departments.",
          "items": [
            [
              "Management of work",
              "Every organisation exists to perform work, such as manufacturing a product, treating patients or serving customers. Management converts this work into objectives, decides what needs to be done and assigns the means, responsibilities and authority required to complete it.",
              "A garment retailer turns the general aim of serving customers into sales, stocking and fitting-room tasks."
            ],
            [
              "Management of people",
              "Managers work with employees both as individuals with varied needs and behaviour and as members of a group. Their task is to make strengths useful, address weaknesses and encourage people to contribute towards organisational objectives.",
              "A supervisor may coach one new employee while also coordinating the whole shift."
            ],
            [
              "Management of operations",
              "An organisation needs a process that transforms inputs—such as materials, people, capital and technology—into the product or service it provides. This operational process is linked to the work to be completed and the people who perform it.",
              "A bakery combines ingredients, ovens, equipment and trained workers to produce bread for customers."
            ]
          ]
        }
      ]
    },
    {
      "title": "Functions of management",
      "sections": [
        {
          "title": "Five functions of management",
          "category": "Functions",
          "examPrompt": "Explain the five functions of management.",
          "lead": "Managers perform five connected functions. Their definitions are useful for identifying what a manager is doing in a case or example.",
          "items": [
            [
              "Planning",
              "Planning determines in advance what is to be done and who is to do it. It means setting objectives, considering possible courses of action and selecting a suitable way to achieve the objectives. Planning can anticipate problems and prepare contingencies, though it cannot prevent every problem.",
              "A manager sets a monthly sales target and selects the staffing and promotion actions needed to pursue it."
            ],
            [
              "Organising",
              "Organising assigns duties, groups related tasks, establishes authority and reporting relationships, and allocates the resources needed to carry out a plan. It clarifies who will do each task, where and when the work will happen, and how units fit together.",
              "A product launch plan is organised by assigning product design, procurement and advertising to responsible teams."
            ],
            [
              "Staffing",
              "Staffing obtains, uses and maintains a suitable workforce. It includes making sure qualified people are available where and when the organisation needs them and involves activities such as recruitment, selection, placement and training.",
              "A hotel recruits and trains front-desk staff before opening a new location."
            ],
            [
              "Directing",
              "Directing leads, influences and motivates employees to carry out assigned tasks. It includes motivation, leadership, communication and supervision. The manager creates conditions that encourage people to do their best and makes sure instructions and feedback are understood.",
              "A supervisor explains the day's work, answers questions and encourages employees to meet service standards."
            ],
            [
              "Controlling",
              "Controlling monitors performance towards organisational goals. Managers set standards, measure actual results, compare them with the standards and take corrective action when a significant deviation appears. The process requires deciding what results matter, how they will be measured and who can respond.",
              "If product defects exceed the standard, the manager investigates and corrects the production process."
            ]
          ]
        }
      ]
    },
    {
      "title": "Objectives of management",
      "sections": [
        {
          "title": "Three major objectives of management",
          "category": "Objectives",
          "examPrompt": "Name and explain the three major objectives of management.",
          "lead": "Management seeks organisational, social and personnel objectives. These are the three major classes; survival, profit and growth are three economic objectives contained within the organisational class and should be listed separately when that question is asked.",
          "items": [
            [
              "Organisational objectives",
              "Management sets and pursues results for the organisation while considering stakeholders such as shareholders, employees, customers and government. The basic economic objectives within this category are survival, profit and growth; they are distinct sub-objectives, not additional major categories.",
              "A business combines continuity, returns and expansion goals in its overall plans."
            ],
            [
              "Social objectives",
              "An organisation is part of society and has obligations beyond its own economic results. It should create value for different groups, provide useful and good-quality goods or services at reasonable prices, create employment and use environmentally responsible methods of production.",
              "A company that recycles production waste instead of dumping it advances a social objective."
            ],
            [
              "Personnel or individual objectives",
              "Employees have different needs and aims, including fair pay, benefits, recognition, social connection and opportunities for personal growth. Management seeks to satisfy these needs while aligning individual effort with organisational goals; this reconciliation supports cooperation and workplace harmony.",
              "Training and recognition can support an employee’s development while improving the team’s work."
            ]
          ]
        },
        {
          "title": "Three organisational objectives",
          "category": "Organisational objectives",
          "examPrompt": "Explain the organisational objectives of survival, profit and growth.",
          "lead": "The organisation’s economic objectives are a three-point list. Survival secures continuity, profit supports continued operation and growth improves the organisation’s long-term prospects.",
          "items": [
            [
              "Survival",
              "Survival is the basic objective of a business. The organisation must continue operating by earning sufficient revenue to cover its costs. Management protects continuity by using resources well and responding to the conditions that affect the business.",
              "A small firm must bring in enough revenue to pay suppliers, wages, rent and other costs."
            ],
            [
              "Profit",
              "Survival alone does not ensure long-term success. Profit provides an incentive for continued operation and helps a business cover costs and the risks it accepts. Management must seek profit while considering the interests of stakeholders and the organisation’s broader responsibilities.",
              "A retailer uses a margin on sales to meet expenses and fund continued operations."
            ],
            [
              "Growth",
              "Growth means improving the organisation’s prospects and using its potential so that it can develop over time. Growth may be seen in increased sales or output, more employees, a wider product range or higher capital investment; the most useful measure depends on the organisation.",
              "A manufacturer may show growth through higher output, additional products and investment in new equipment."
            ]
          ]
        }
      ]
    },
    {
      "title": "Management as an art, science and profession",
      "sections": [
        {
          "title": "Management as an art",
          "category": "Nature of management: art",
          "examPrompt": "Explain why management is considered an art.",
          "lead": "Art involves applying knowledge skilfully and personally to produce a desired result. Management meets the main criteria for art because managers learn principles and then apply them in practice.",
          "items": [
            [
              "Existing theoretical knowledge",
              "An art has an organised body of ideas that can be learned. Management has extensive literature and concepts in areas such as finance, marketing and human resources. Managers draw on this knowledge to understand the work they are responsible for.",
              "A manager studies marketing concepts before planning a product launch."
            ],
            [
              "Personalised application",
              "Art is not just knowing principles; it involves applying them in a way shaped by the practitioner. Managers use acquired knowledge in their own way, taking account of the circumstances, people and constraints of a particular situation. As a result, competent managers may have different management styles.",
              "Two managers may use the same leadership principle but motivate their teams differently."
            ],
            [
              "Practice and creativity",
              "Art requires practice and a degree of creativity. Managers develop judgement through experience, observation and repeated application of knowledge. They may have to devise a practical response to an unusual situation instead of simply repeating a textbook answer.",
              "A manager adapts a standard service policy to resolve an unusual customer problem fairly."
            ]
          ]
        },
        {
          "title": "Management as a science",
          "category": "Nature of management: science",
          "examPrompt": "Explain why management is called a science but not an exact science.",
          "lead": "Science is a systematised body of knowledge whose principles are tested and explain relationships. Management has scientific features, but its subject includes people, so its principles do not produce perfectly predictable results in every setting.",
          "items": [
            [
              "Systematised body of knowledge",
              "A science organises knowledge into concepts and principles rather than relying only on scattered opinions. Management also has an organised vocabulary, theories and principles that can be studied and used to analyse organisational activity.",
              "Planning, authority and coordination are concepts studied systematically in management."
            ],
            [
              "Principles developed through observation and experimentation",
              "Scientific principles are developed by observing events and testing explanations, often repeatedly. Management principles have likewise developed through observation and experience in organisations. But organisational experiments are difficult to control because people and circumstances differ.",
              "A motivation practice may be observed across teams, but differences among employees affect its results."
            ],
            [
              "Universal validity as a useful guide",
              "Management principles provide standardised techniques that can guide managers in different situations and support training and development. They are useful beyond one individual case because they express lessons drawn from organisational experience.",
              "A clear reporting relationship can help coordinate teams in many kinds of organisation."
            ],
            [
              "Management is not an exact science",
              "Management does not have the precision or universal application of a pure science such as physics or chemistry. It deals with people and changing circumstances, so principles must be adapted to the situation rather than applied as fixed laws with guaranteed results.",
              "A close-supervision approach may work for safety-critical tasks but reduce initiative in creative work."
            ]
          ]
        },
        {
          "title": "Management as a profession",
          "category": "Nature of management: profession",
          "examPrompt": "Assess whether management is a full-fledged profession using its criteria.",
          "lead": "A profession normally combines specialised knowledge with regulated entry, a professional association, an enforceable ethical code and a service motive. Management shares some features but does not satisfy all of them fully.",
          "items": [
            [
              "Well-defined body of knowledge: substantially present",
              "Management is based on organised principles that can be learned through books, courses and professional institutions. Colleges and management institutes teach the subject, making specialised education available to people who want to become managers.",
              "A management degree can prepare a candidate in finance, marketing and organisational behaviour."
            ],
            [
              "Restricted entry: not fully present",
              "Admission to some management programmes requires examinations, but appointment as a manager is not legally restricted to people with a specified degree. Professional training is valued and can improve prospects, yet there is no universal licensing requirement comparable to that for some regulated occupations.",
              "A business can appoint an experienced employee as a manager without a mandatory management licence."
            ],
            [
              "Professional association: only partly present",
              "Associations such as the All India Management Association support practicing managers and may set professional standards. However, managers are generally not required to join an association in order to hold a management position, so membership does not regulate entry to the occupation.",
              "A manager may belong to AIMA, but membership is not a legal precondition for the role."
            ],
            [
              "Ethical code: present in guidance, not fully enforceable",
              "Management associations may publish codes of conduct, but those codes do not have the same statutory force across the occupation as professional regulation in some fields. Ethical expectations matter, but a single enforceable code does not govern every manager.",
              "An association can discipline its members, while non-members may not be bound by its rules."
            ],
            [
              "Service motive: increasingly recognised, but not exclusive",
              "A profession is expected to serve clients or the public. Management seeks organisational goals while serving society through useful products or services at reasonable prices. This public-service dimension is increasingly recognised, but management's purpose also includes organisational performance and profit.",
              "A business manager balances customer value and fair prices with the firm's need to remain viable."
            ],
            [
              "Overall judgement",
              "Management is often described as a developing profession rather than a fully fledged profession. It has a substantial knowledge base and professional bodies, but open entry, voluntary association membership and the limited statutory force of ethical codes mean that it does not meet all professional criteria completely.",
              "A qualified manager has formal preparation, but the occupation is not universally licensed."
            ]
          ]
        }
      ]
    },
    {
      "title": "Importance of management",
      "sections": [
        {
          "title": "Why management matters",
          "category": "Importance",
          "examPrompt": "Explain any three points showing the importance of management.",
          "lead": "Management matters because it turns group effort and resources into coordinated performance and helps the organisation respond to change.",
          "items": [
            [
              "Helps achieve group goals",
              "Management gives individual effort a common direction. Without a shared direction, people can work hard on tasks that do not contribute to the organisation's overall objective. Managers connect tasks and decisions to the group's intended result.",
              "A manager aligns purchasing and production schedules so a factory can meet its delivery goal."
            ],
            [
              "Increases efficiency",
              "Managers seek to reduce costs and improve productivity through planning, organising, staffing, directing and controlling. Better coordination can limit waste and make more effective use of money, materials, equipment and employee time.",
              "A revised workflow can reduce waiting time and material waste while maintaining output."
            ],
            [
              "Creates a dynamic organisation",
              "Organisations operate in environments that change, while employees may prefer familiar routines. Management helps people understand and adapt to change so the organisation can continue functioning and protect its ability to compete.",
              "Management may retrain staff when a business introduces a new production technology."
            ],
            [
              "Helps achieve personal objectives",
              "A manager can motivate and lead employees so they make progress towards their own goals while contributing to organisational objectives. When both sets of aims receive attention, employees have a clearer reason to participate and perform well.",
              "A staff member can gain new skills while taking on work needed to improve customer service."
            ],
            [
              "Contributes to social development",
              "Management supports society by helping organisations provide useful goods and services, create employment and adopt new technology. These contributions can improve access, productivity and living standards when organisations meet real social needs.",
              "A firm that provides reliable, affordable products and local jobs contributes to its community."
            ]
          ]
        }
      ]
    },
    {
      "title": "Levels of management",
      "sections": [
        {
          "title": "Three levels and their roles",
          "category": "Levels of management",
          "examPrompt": "Describe the responsibilities of top, middle and supervisory management.",
          "lead": "The hierarchy commonly has three levels. Top management sets overall direction, middle management connects that direction to departments, and supervisory managers oversee day-to-day work.",
          "items": [
            [
              "Top management",
              "Top managers are responsible for the organisation as a whole and for its welfare and survival. They set organisational goals and strategies, frame major plans and policies, coordinate departments and remain accountable for overall performance. Common roles include chief executive, managing director and chief finance officer.",
              "A chief executive decides the organisation's overall growth priorities and approves a major investment."
            ],
            [
              "Middle management",
              "Middle managers link top and lower management. They interpret and communicate policies, develop departmental plans and coordinate the work of different units. They also assign duties, secure staff and resources and help departments carry out plans set by senior managers.",
              "A marketing manager converts the organisation's sales goals into a campaign plan for the department."
            ],
            [
              "Supervisory or operational management",
              "Supervisors and forepersons work closest to the actual workforce. They pass instructions to workers, oversee performance, maintain work quality and safety, and report operational issues upwards. Their authority is limited by plans and policies set at higher levels, but their role directly affects output and workmanship.",
              "A shift supervisor checks product quality, allocates station work and enforces safety procedures."
            ]
          ]
        }
      ]
    },
    {
      "title": "Coordination: concept and role",
      "sections": [
        {
          "title": "Meaning and essence of coordination",
          "category": "Definition and role",
          "examPrompt": "Explain coordination and why it is called the essence of management.",
          "lead": "Coordination is the process of synchronising the work of people, departments and specialists so that their efforts are properly timed and directed towards common objectives.",
          "items": [
            [
              "Synchronising interdependent activities",
              "Departments and employees often depend on one another for information, materials or timely decisions. Coordination links their activities, allocates work appropriately and helps ensure that tasks are performed in a suitable sequence and with the required quality.",
              "Production needs timely purchasing information so that materials arrive before a scheduled manufacturing run."
            ],
            [
              "Unity of effort towards common objectives",
              "Coordination reconciles separate contributions and, where necessary, differences in priorities or approaches. It ensures that departments do not merely complete their own tasks in isolation but direct their combined efforts towards the organisation's purpose.",
              "Sales and production coordinate demand forecasts with manufacturing capacity rather than pursuing conflicting targets."
            ],
            [
              "The essence of management",
              "Coordination is inherent in planning, organising, staffing, directing and controlling. Plans establish common direction, organising creates relationships, staffing fills roles, directing guides people and controlling compares results; each function needs coordination to work as part of a whole.",
              "A structure and plan that are not communicated and coordinated will not produce unified action."
            ]
          ]
        },
        {
          "title": "Six characteristics of coordination",
          "category": "Characteristics",
          "examPrompt": "Explain any three characteristics of coordination.",
          "lead": "Coordination has six distinct characteristics. In exam answers, name and explain each selected point separately.",
          "items": [
            [
              "Integrates group efforts",
              "Coordination brings diverse or otherwise unrelated interests into purposeful work. It gives group effort a common focus and helps actual performance follow the intended plan and schedule.",
              "The design, purchasing and sales teams align their separate work around a product launch."
            ],
            [
              "Ensures unity of action",
              "The purpose of coordination is unity of action in pursuing a common purpose. It acts as a binding force between departments so that their decisions and activities support organisational goals instead of pulling in opposing directions.",
              "A marketing promise is matched to the delivery capacity of the operations team."
            ],
            [
              "Is a continuous process",
              "Coordination is not a one-time instruction. It starts during planning and continues through implementation and control because relationships, dependencies and conditions can change as work proceeds.",
              "A manager keeps coordinating deliveries and staff even after the initial schedule is approved."
            ],
            [
              "Is an all-pervasive function",
              "Coordination is required at every level because activities are interdependent across departments and levels. Top managers coordinate organisation-wide policy, while departmental and operational managers coordinate the work within and between their units.",
              "A sales manager coordinates both with senior leadership and with frontline sales staff."
            ],
            [
              "Is the responsibility of all managers",
              "Every manager must coordinate the people and work within their area and maintain links with others. Coordination is not assigned solely to a specialist or to top management; each manager contributes to unity of effort.",
              "A production supervisor coordinates operators and informs the purchasing department about material shortages."
            ],
            [
              "Is a deliberate function",
              "Coordination requires conscious, timely managerial effort. Willing cooperation by itself may not ensure that tasks are properly sequenced or directed; the manager gives that cooperation a clear direction and resolves mismatches as they arise.",
              "Employees may be willing to help, but a manager still assigns who handles each urgent order."
            ]
          ]
        },
        {
          "title": "Why coordination is needed",
          "category": "Importance",
          "examPrompt": "Explain the importance or need for coordination.",
          "lead": "The need for coordination increases as organisations grow, divide work among specialised units and rely on more interdependent tasks.",
          "items": [
            [
              "Growth in organisational size",
              "As an organisation expands, the number of employees and layers of management tends to increase. People may lose sight of how their individual tasks contribute to common goals, and personal aims may not naturally match organisational aims. Coordination reconnects their effort to the overall purpose.",
              "A growing chain uses common schedules so that separate branches support the same service standards."
            ],
            [
              "Functional differentiation",
              "Organisations divide work into departments such as production, marketing and human resources. Each unit may focus on its own targets, yet its work depends on other units. Coordination connects the departments, improves information flow and reduces conflict caused by isolated decision-making.",
              "Production and marketing share information so that promotional plans reflect available stock."
            ],
            [
              "Specialisation",
              "Modern work relies on specialists with different knowledge and approaches. Their expertise can improve performance, but it can also create separate priorities and communication gaps. Coordination brings their contributions together and reconciles differences so specialisation supports, rather than fragments, the whole organisation.",
              "Finance, engineering and legal specialists coordinate before a major equipment purchase is approved."
            ]
          ]
        }
      ]
    }
  ],
  "2": [
    {
      "title": "Meaning and terminology",
      "sections": [
        {
          "title": "Meaning of management principles",
          "category": "Meaning and distinctions",
          "examPrompt": "Define management principles. Distinguish a principle from a technique.",
          "lead": "Management principles are broad guidelines for managerial decisions and behaviour. They help a manager judge how to act in a situation.",
          "items": [
            [
              "Principles versus techniques",
              "A principle gives a general basis for a decision, such as balancing authority with responsibility. A technique is a procedure or method used to achieve a result, such as time study. Principles guide the choice and use of techniques; the two terms are not interchangeable.",
              "‘Use scientific investigation’ is a principle; measuring task times to establish a standard is a technique."
            ],
            [
              "Management principles versus pure-science principles",
              "Management works with people whose responses vary with circumstances, so its principles cannot be applied as rigidly as laws of pure science. A manager interprets a principle in the light of the situation, staff and environment. This flexibility does not make the underlying knowledge useless or merely a guess."
            ],
            [
              "Management principles versus values",
              "Values concern what people and society consider desirable or morally acceptable. Management principles arise from study and experience of work situations and guide managerial practice. Although their origins and purposes differ, managers must still respect social and ethical values when applying principles."
            ]
          ]
        }
      ]
    },
    {
      "title": "Characteristics of management principles",
      "sections": [
        {
          "title": "Characteristics of management principles",
          "category": "Characteristics — 7 points",
          "examPrompt": "Explain any three characteristics of management principles.",
          "lead": "These describe the nature of the principles themselves. They are a different list from the characteristics of management in Chapter 1.",
          "items": [
            [
              "Universal applicability",
              "The principles can guide managers in different types of organisations, at different levels and in different places. However, the extent and manner of use vary with circumstances. Universal applicability means broad relevance, not an identical operating method everywhere.",
              "A school and a factory both need discipline, but their rules and how they apply them will differ."
            ],
            [
              "General guidelines",
              "Principles give managers direction when making decisions, rather than a ready-made solution to every problem. Real situations combine many changing factors, so judgement is needed to choose and adapt a principle. Treating a guideline as an automatic answer can lead to poor decisions."
            ],
            [
              "Formed by practice and experimentation",
              "Principles develop from the experience of managers, systematic observation and experimentation in organisations. Repeated experience can reveal practices that tend to work. Experiments can examine the effect of changing a work method or condition, giving a reasoned basis for a guideline."
            ],
            [
              "Flexible",
              "Managers can modify how a principle is applied to suit the situation. The principles are not rigid instructions that must always be followed in exactly the same way. Flexibility gives discretion, but it does not mean acting without reasons or abandoning organisational objectives."
            ],
            [
              "Mainly behavioural",
              "The principles primarily aim to influence human behaviour, relationships and effort at work. People react differently, making application more complex than dealing only with physical objects. Resources still matter, but much of management involves getting people to use them effectively."
            ],
            [
              "Cause-and-effect relationships",
              "Principles help managers understand likely links between an action and its results. Specialisation, for example, can improve efficiency through greater skill. These relationships are less exact than in pure science because several conditions affect human behaviour at the same time."
            ],
            [
              "Contingent",
              "Application depends on the circumstances prevailing at the time. A principle may be relevant generally, but the correct action depends on factors in the particular case. Do not confuse contingent with flexible: contingent identifies dependence on conditions; flexible identifies scope to adapt the application.",
              "Fair remuneration depends on contribution, prevailing wages and the employer’s ability to pay."
            ]
          ]
        }
      ]
    },
    {
      "title": "Importance of management principles",
      "sections": [
        {
          "title": "Importance of management principles",
          "category": "Importance — 6 points",
          "examPrompt": "Explain any three reasons why management principles are important.",
          "lead": "For each point, explain how using principles improves managerial work. Naming a characteristic does not answer a question about importance.",
          "items": [
            [
              "Useful insights into reality",
              "Principles give managers a base of experience for understanding work situations. They help managers recognise patterns and anticipate likely consequences, reducing the need to discover every lesson through repeated personal mistakes. Managers still judge which principle is relevant to the specific problem."
            ],
            [
              "Optimum use of resources and effective administration",
              "Principles help organise human and material resources so effort, time and money are not wasted. They also support fair administration by defining duties, authority and expectations. Decisions become less dependent on a manager’s personal likes and dislikes."
            ],
            [
              "Scientific decisions",
              "Principles encourage decisions based on facts, logic and analysis instead of prejudice, unsupported intuition or blind faith. Managers examine relevant information and the expected relationship between action and result. Scientific decision-making means a reasoned basis, not a guarantee of a perfect outcome."
            ],
            [
              "Meeting changing environmental requirements",
              "Because principles can be adapted, managers can use them as technology, markets and organisational conditions change. A useful guideline remains a starting point even when its application changes. Managers therefore respond to new requirements without treating past routines as permanently binding."
            ],
            [
              "Fulfilling social responsibility",
              "Principles help managers consider responsibilities to employees and society as well as business results. Fair remuneration and equitable treatment, for example, encourage socially responsible behaviour. Rising public expectations make it necessary to consider the effects of decisions on relevant groups."
            ],
            [
              "Management training, education and research",
              "Principles provide the core knowledge used in management education and training. They give researchers propositions to study and refine, helping develop improved practices and techniques. Future managers can learn from accumulated knowledge instead of relying entirely on trial and error."
            ]
          ]
        }
      ]
    },
    {
      "title": "Fayol 1–4: work, authority and command",
      "sections": [
        {
          "title": "Fayol’s principles: division of work to unity of command",
          "category": "Fayol’s principles",
          "examPrompt": "Explain any two of Fayol’s principles, with examples.",
          "lead": "For each principle, learn its name, what it requires, why it helps, and the clue that shows its application or violation.",
          "items": [
            [
              "Division of work",
              "Divide work into small, specialised tasks and assign each task to a suitably trained person. Repetition develops skill, reduces time lost in switching activities and allows more and better output for the same effort. This applies to technical as well as managerial work. The idea is specialisation, not merely increasing the number of employees. If everyone performs every task without developing expertise, the gains from division of work are lost.",
              "In a furniture business, different trained employees handle cutting, assembly and finishing instead of each person doing every operation."
            ],
            [
              "Authority and responsibility",
              "Authority is the right to give orders and obtain obedience; responsibility is the obligation to carry out an assigned duty. The two must be balanced. A manager cannot fairly demand a result while withholding the powers and resources needed to achieve it. Excess authority without matching responsibility encourages misuse, so safeguards are also necessary. Fayol distinguishes authority attached to a position from personal authority arising from the manager’s qualities and influence.",
              "A production supervisor is held responsible for output but cannot requisition materials. The missing authority prevents the supervisor from meeting that responsibility."
            ],
            [
              "Discipline",
              "Discipline means respecting organisational rules and employment agreements. It depends on good supervision, clear and fair agreements, and sensible application of penalties. Both management and workers must honour their commitments: discipline does not mean that employees alone must obey while managers may break promises. It keeps activities orderly and supports cooperation. In a case, look for compliance with agreed duties, working arrangements, rules or promises.",
              "Workers agree to extra shifts during a difficult period, and management agrees to a later reward. Discipline requires both sides to fulfil the agreement."
            ],
            [
              "Unity of command",
              "Every employee should receive orders from, and be answerable to, only one superior. Two bosses giving conflicting instructions create confusion over priorities and make it difficult to fix responsibility. Dual subordination can undermine authority, discipline and stability. The focus is the reporting relationship of an individual employee. Do not identify this principle merely because several departments have different plans—that issue concerns unity of direction.",
              "The sales head tells a salesperson to offer credit, while the finance head tells the same salesperson to refuse credit. Two conflicting bosses violate unity of command."
            ]
          ],
          "start": 1
        }
      ]
    },
    {
      "title": "Fayol 5–9: direction, interests and authority",
      "sections": [
        {
          "title": "Fayol’s principles: unity of direction to scalar chain",
          "category": "Fayol’s principles",
          "examPrompt": "Identify the principle in the case and explain it using the evidence.",
          "lead": "The scope of the clue matters: distinguish an individual’s reporting line, a shared activity’s plan, and the organisation’s hierarchy.",
          "items": [
            [
              "Unity of direction",
              "Activities pursuing the same objective should operate under one head and one plan. This brings effort and resources toward a common result and prevents overlapping or contradictory activity. Different product divisions may each have their own head and plan because their objectives differ; activities within each division still need a unified direction. The principle concerns a group of related activities, whereas unity of command concerns the boss of an individual employee.",
              "Two teams launch the same product with separate budgets and conflicting campaigns. One coordinated launch plan under one head would establish unity of direction."
            ],
            [
              "Subordination of individual interest to general interest",
              "When individual and organisational interests conflict, the common organisational interest should take priority. Managers must avoid using their authority for personal or family gain at the organisation’s expense and should set an example for employees. This does not mean ignoring every legitimate personal need; the principle addresses conflicts where one person or group pursues its advantage at the cost of the wider organisation and its stakeholders.",
              "A purchasing manager awards an overpriced order to a relative despite a better supplier offer. Personal interest has displaced the organisation’s general interest."
            ],
            [
              "Remuneration of employees",
              "Pay and compensation should be fair to both employees and the organisation. Employees should receive a reasonable standard of living, while the payment must remain within the organisation’s capacity. Fair remuneration helps maintain satisfaction, motivation and harmonious relations between workers and management. Explain both sides of fairness in an answer. The principle does not require an identical salary for every role irrespective of contribution, skill or responsibility.",
              "A firm reviews wages using employees’ work, prevailing pay and its ability to pay, so compensation is fair to staff and financially sustainable."
            ],
            [
              "Centralisation and decentralisation",
              "Centralisation concentrates decision authority at the top; decentralisation spreads it to lower levels. Fayol recommends an appropriate balance between subordinate participation and senior managers’ retention of final authority. The right degree depends on circumstances, including organisational size and the ability of staff. Large organisations often need more dispersed decisions. Neither total concentration nor unrestricted delegation is automatically best: identify whether authority is suitably balanced for the situation.",
              "Head office sets overall policy while regional managers adjust local delivery schedules. This combines central direction with decentralised operating decisions."
            ],
            [
              "Scalar chain",
              "The scalar chain is the formal line of authority from the highest to the lowest level. Normal official communication follows this route so authority and responsibility remain clear. Following the entire route can take too long in an emergency, so Fayol allows a gang plank: a direct link between appropriate employees at the same level to speed urgent communication. The shortcut is an authorised exception, not permission to routinely disregard the hierarchy.",
              "Two section heads contact each other directly during an urgent supply breakdown rather than passing the message up and down both chains. This is a gang plank."
            ]
          ],
          "start": 5
        }
      ]
    },
    {
      "title": "Fayol 10–14: order, fairness and teamwork",
      "sections": [
        {
          "title": "Fayol’s principles: order to esprit de corps",
          "category": "Fayol’s principles",
          "examPrompt": "Explain any three principles relating to people and their work.",
          "lead": "Keep the names distinct. Correct placement, fair treatment, secure tenure, employee ideas and team spirit identify different principles.",
          "items": [
            [
              "Order",
              "There should be a proper place for every material and person, and each should be in that place. Material order means arranging tools and resources so they can be found and used when needed. Social order means placing suitable people in appropriate jobs. Order reduces searching, delays and obstruction, raising efficiency. Do not confuse it with discipline: order concerns correct placement, while discipline concerns respecting rules and agreements.",
              "Tools are labelled and kept at assigned workstations, and qualified staff are placed in the roles that need their skills. Both material and social order are present."
            ],
            [
              "Equity",
              "Managers should treat employees with fairness, kindness and justice. Discrimination based on religion, caste, language, nationality, gender or similar irrelevant grounds violates equity. Fair treatment encourages loyalty and devotion. Equity does not prevent justified action against misconduct or require identical treatment despite different performance; it requires impartial judgement and appropriate consideration. Case clues include favouritism, denial of equal opportunity or unfair promotion decisions.",
              "Two equally qualified employees are considered for promotion, but one is rejected solely because of their religion. The decision violates equity."
            ],
            [
              "Stability of personnel",
              "Recruit and select employees carefully, then give them reasonable time to settle into their positions and demonstrate performance. Frequent transfers or unnecessary replacement prevent people from learning their work and increase recruitment and training costs. Minimising avoidable employee turnover supports efficiency and confidence. Stability does not mean that nobody can ever be transferred or dismissed; it means avoiding insecurity and disruption without sufficient reason.",
              "A newly appointed accountant is repeatedly transferred before learning each role. A stable assignment would allow the employee to become competent and contribute."
            ],
            [
              "Initiative",
              "Employees should be encouraged to suggest, develop and carry out plans for improvement within their authority. Initiative involves thinking of an idea and making an effort to put it into action. Managers should listen to useful suggestions and give appropriate recognition instead of suppressing them to preserve their own importance. It must operate within agreed rules and responsibilities; arbitrary departure from established procedures is not the intended meaning.",
              "A packing employee proposes a safer arrangement, receives approval and helps implement it. Encouraging that employee’s plan demonstrates initiative."
            ],
            [
              "Esprit de corps",
              "Management should build team spirit, unity and harmony among employees. A sense of belonging and mutual trust helps people cooperate toward common objectives, especially in large organisations where divisions can develop. Managers should emphasise collective achievement and use inclusive language such as ‘we’. Avoid divide-and-rule behaviour and unnecessary public humiliation. Strong team spirit supports coordination and can reduce the need for coercion or penalties.",
              "A manager credits the whole team for a successful launch and encourages departments to support each other rather than compete for individual praise."
            ]
          ],
          "start": 10
        }
      ]
    },
    {
      "title": "Taylor: four principles and mental revolution",
      "sections": [
        {
          "title": "Meaning of scientific management",
          "category": "Meaning",
          "examPrompt": "What is scientific management?",
          "lead": "Scientific management applies investigation and analysis to work so that it can be performed efficiently using an established best method.",
          "items": [
            [
              "Scientific approach to factory work",
              "Taylor studied tasks, methods, worker selection and supervision to improve productivity. Work should be investigated and planned rather than left to each worker’s habits. Management helps determine and teach the method, while workers cooperate in carrying it out. The approach links productivity with cooperation and development."
            ]
          ]
        },
        {
          "title": "Taylor’s principles of scientific management",
          "category": "Taylor’s principles — 4 points",
          "examPrompt": "Explain any two principles of scientific management.",
          "lead": "These are Taylor’s four guiding principles. Functional foremanship and work studies are techniques, so do not substitute them in an answer asking for principles.",
          "items": [
            [
              "Science, not rule of thumb",
              "Replace personal guesswork and traditional trial-and-error methods with systematic study. Analyse how a job can be done, compare methods and establish the best method for the conditions. The chosen method should be taught and used consistently to reduce wasted effort, time and materials. The principle calls for investigation, not simply buying modern machines.",
              "A factory studies different loading methods and adopts the one that moves materials safely with the least unnecessary effort."
            ],
            [
              "Harmony, not discord",
              "Management and workers should recognise that each depends on the other and avoid treating their relationship as permanent conflict. They should seek the organisation’s prosperity together and share its gains fairly. This requires a mental revolution: a change in both sides’ attitudes from suspicion and conflict to mutual understanding. The emphasis is harmony between labour and management.",
              "Workers cooperate to improve output and management shares the resulting benefits instead of each side trying to gain at the other’s expense."
            ],
            [
              "Cooperation, not individualism",
              "Management and workers should actively work together. Management should welcome constructive suggestions and involve workers in decisions affecting their work; workers should cooperate with scientifically developed methods. Work and responsibility should be divided appropriately rather than leaving all improvement to one side. This develops harmony into practical cooperation and shared responsibility for results.",
              "A supervisor and machine operators jointly examine a bottleneck, and useful employee suggestions are acknowledged and adopted."
            ],
            [
              "Development of each person to greatest efficiency and prosperity",
              "Select employees scientifically for jobs that match their abilities and provide the training needed to perform the best method. Developing every worker’s skill raises efficiency and benefits both the individual and the organisation. Selection, placement and training belong together: simply demanding a higher target without developing capability does not meet this principle.",
              "A firm checks candidates’ aptitude, places them in suitable roles and trains them in the established operating method."
            ]
          ]
        },
        {
          "title": "Mental revolution",
          "category": "Underlying attitude",
          "examPrompt": "Explain the concept of mental revolution.",
          "lead": "Mental revolution supports Taylor’s approach, especially harmony and cooperation.",
          "items": [
            [
              "A change on both sides",
              "Workers and management change how they view each other, recognising their mutual dependence and shared interest in prosperity. Instead of concentrating only on dividing an existing surplus through conflict, they cooperate to increase it and share the gains. Management must respect employees’ needs and workers must support agreed improvements; a one-sided demand for obedience is insufficient."
            ]
          ]
        }
      ]
    },
    {
      "title": "Taylor: functional foremanship",
      "sections": [
        {
          "title": "Structure of functional foremanship",
          "category": "Technique of scientific management",
          "examPrompt": "Explain functional foremanship and name its specialist supervisors.",
          "lead": "Taylor separates planning from execution and divides supervision among specialists because one foreman is unlikely to possess every required skill.",
          "items": [
            [
              "Planning and production are separated",
              "Four specialists work under the planning in-charge and four under the production in-charge. A worker receives guidance from each specialist in that person’s field. This extends division of work and specialisation to supervision. It differs from Fayol’s unity of command because the worker may receive instructions from eight specialists rather than a single boss."
            ]
          ]
        },
        {
          "title": "Planning specialists",
          "category": "Functional foremanship — planning roles",
          "examPrompt": "Name the four specialists working under the planning in-charge.",
          "lead": "These roles prepare instructions, sequence, estimates and discipline before or alongside execution.",
          "items": [
            [
              "Instruction card clerk",
              "Prepares detailed instructions telling workers how to carry out their tasks. Clear written directions communicate the prescribed method and relevant work requirements, reducing reliance on each worker’s interpretation."
            ],
            [
              "Route clerk",
              "Specifies the route or sequence that production work should follow. This helps each operation occur in the right order so material moves through the process without avoidable confusion or unnecessary movement."
            ],
            [
              "Time and cost clerk",
              "Prepares time and cost information for the work. Estimates and records help management understand how long tasks should take and what labour and production costs are involved."
            ],
            [
              "Disciplinarian",
              "Ensures that rules and discipline are maintained. This specialist deals with the behavioural and rule-compliance side of work, leaving the other supervisors to focus on their technical areas."
            ]
          ]
        },
        {
          "title": "Production specialists",
          "category": "Functional foremanship — production roles",
          "examPrompt": "Name the four specialists working under the production in-charge.",
          "lead": "These roles support the actual preparation, speed, condition and quality of production.",
          "items": [
            [
              "Gang boss",
              "Ensures that machines, tools and the workplace are ready for workers to begin. Proper preparation prevents delays caused by missing equipment or an unprepared working area."
            ],
            [
              "Speed boss",
              "Supervises timely and accurate completion of work using the proper operating speeds. This role is concerned with execution at the planned pace rather than setting the production route."
            ],
            [
              "Repair boss",
              "Keeps machines and tools in proper working condition and arranges maintenance and repairs. Good equipment condition reduces stoppages and supports consistent production."
            ],
            [
              "Inspector",
              "Checks the quality of the work and whether output meets the prescribed standard. Inspection identifies deviations so defective output can be addressed instead of passing unnoticed to later operations."
            ]
          ]
        }
      ]
    },
    {
      "title": "Taylor: standardisation, work studies and wages",
      "sections": [
        {
          "title": "Standardisation and simplification of work",
          "category": "Technique: standards versus variety",
          "examPrompt": "Distinguish standardisation from simplification of work.",
          "lead": "Both improve efficiency, but they solve different problems: inconsistent standards and unnecessary variety.",
          "items": [
            [
              "Standardisation",
              "Set benchmarks for methods, processes, materials, machines, time and output, then adhere to them during production. Fixed specifications help make parts interchangeable, establish required performance of people and machines, and maintain consistent quality. A standard is a benchmark against which actual work can be judged; standardisation does not by itself mean reducing the number of product varieties.",
              "Every replacement part is made to agreed dimensions so it fits the relevant machine without adjustment."
            ],
            [
              "Simplification",
              "Eliminate unnecessary varieties, sizes and dimensions of products and work. Reducing avoidable diversity can save labour, machines and tools, reduce stock requirements and improve equipment utilisation. The purpose is an economical, useful range, rather than producing every possible variant. Look for a firm discontinuing redundant product sizes or designs as the case clue.",
              "A business removes several almost-identical container sizes from its range to reduce unnecessary stock and production changes."
            ]
          ]
        },
        {
          "title": "Work-study techniques",
          "category": "Techniques — 4 distinct studies",
          "examPrompt": "Identify the work-study technique from the purpose stated in a case.",
          "lead": "Learn the precise question each technique answers: how to do it, which movements, how much time, and when to rest.",
          "items": [
            [
              "Method study: the best way",
              "Examine all relevant activities from obtaining inputs through producing and delivering the output to find the best way of doing the job. Study the sequence of operations and placement of people, machines and materials. The objective is to reduce production cost while improving the quality and usefulness of results. It considers the overall method, whereas motion study focuses on movements within work.",
              "A firm redesigns its assembly sequence and machine layout to reduce delays between operations."
            ],
            [
              "Motion study: unnecessary movements",
              "Observe movements such as lifting, reaching, walking and changing position during a task. Identify useful, incidental and avoidable movements, then eliminate unnecessary effort. Removing wasteful motions reduces the time and energy needed for the job and raises productivity. A case about reaching repeatedly for a distant tool concerns motion study, even though saving time is the eventual benefit.",
              "Moving frequently used parts within easy reach removes repeated walking between a bench and a store."
            ],
            [
              "Time study: standard task time",
              "Measure how long a worker of reasonable skill and efficiency takes to perform a well-defined task, using repeated observations of its elements. Establish a standard time for the whole task. This helps estimate workers required, frame incentive schemes and calculate labour costs. It establishes an expected duration; it does not primarily decide rest frequency or remove unnecessary movements.",
              "At 30 minutes per unit and seven productive hours per shift, the standard output is 14 units per worker per shift."
            ],
            [
              "Fatigue study: rest intervals",
              "Determine the amount and frequency of rest needed during a task to limit physical and mental fatigue. Long hours, unsuitable working conditions or poor relations can increase fatigue. Appropriate breaks help workers recover and maintain output and safety. The best rest schedule depends on the task and conditions, rather than assuming uninterrupted work always produces more.",
              "A factory studies a tiring lifting task and introduces suitable rest intervals to maintain workers’ stamina."
            ]
          ]
        },
        {
          "title": "Differential piece wage system",
          "category": "Technique: wage incentive",
          "examPrompt": "Explain how differential piece wages reward efficient workers.",
          "lead": "First establish a scientific performance standard. Then use different rates per unit for workers who meet the required standard and those who fall below it.",
          "items": [
            [
              "Two rates linked to output standard",
              "A higher piece rate rewards workers classified as efficient, while a lower rate applies to workers below the standard. The distinction is intended to motivate improved efficiency. Pay depends on output multiplied by the applicable rate; it is not a flat bonus independent of production. In a numerical question, use the stated threshold and rates carefully.",
              "If the question sets 10 units as the standard, ₹50 per unit at or above it and ₹40 below it, a worker producing 10 earns ₹500 while one producing 9 earns ₹360."
            ]
          ]
        }
      ]
    },
    {
      "title": "Distinctions and answering case questions",
      "sections": [
        {
          "title": "Fayol and Taylor: a comparison",
          "category": "Comparison",
          "examPrompt": "Distinguish Fayol’s contribution from Taylor’s on any three bases.",
          "lead": "Their work is complementary: one emphasises overall administration and the other scientific improvement of factory work.",
          "items": [
            [
              "Focus and level",
              "Fayol emphasises improving overall administration and managerial efficiency, conventionally viewed from the top downward. Taylor focuses on workers’ productivity and the organisation of work on the shop floor. Do not state that only one of them is concerned with efficiency; their main emphasis and starting points differ."
            ],
            [
              "Basis and scope",
              "Fayol’s administrative principles arose mainly from managerial experience and address the organisation broadly. Taylor’s scientific management developed through work studies and experiments focused on productive tasks. A scientific technique such as functional foremanship cannot be imposed identically on every organisation."
            ],
            [
              "Unity of command",
              "Fayol advocates one superior for an individual employee. Taylor’s functional foremanship allows directions from specialised foremen in their respective fields. This is the clearest contrast to name when a question asks which technique conflicts with unity of command."
            ],
            [
              "Complementary contributions",
              "Better administrative coordination and better work methods can both benefit an organisation. Fayol and Taylor should therefore not be described as making wholly incompatible contributions simply because they differ on functional foremanship and unity of command."
            ]
          ]
        },
        {
          "title": "Common identification traps",
          "category": "Case distinctions",
          "examPrompt": "Identify the principle or technique and justify it using a case clue.",
          "lead": "Name the exact idea, explain its requirement, then link a specific action from the case to that requirement.",
          "items": [
            [
              "Unity of command versus unity of direction",
              "Conflicting orders to one employee point to unity of command. Separate plans for activities sharing one objective point to unity of direction. The first asks ‘How many bosses does this person answer to?’; the second asks ‘Are these activities under one head and one plan?’"
            ],
            [
              "Equity versus remuneration versus stability",
              "Unfair discrimination points to equity; unfair compensation points to remuneration; frequent transfers or replacement without settling time point to stability of personnel. A general statement that employees are unhappy is insufficient: identify what management actually did."
            ],
            [
              "Initiative versus esprit de corps",
              "Encouraging employees to propose and implement improvements shows initiative. Encouraging mutual trust, unity and collective achievement shows esprit de corps. Both can motivate employees, but a case answer should identify the distinctive action described."
            ],
            [
              "Principle versus technique",
              "For Taylor, science rather than rule of thumb is a guiding principle. Method, motion, time and fatigue studies, standardisation/simplification, functional foremanship and differential piece wages are techniques. For Fayol, learn all fourteen principle names individually rather than substituting vague headings such as ‘work and authority’."
            ],
            [
              "How much to write",
              "If asked to list or state two principles, give two precise names and the brief statements the question requires. If asked to explain them, develop the meaning and its consequence. For a case, add a clear link to the stated evidence. Do not treat a category heading or an example as an extra independently countable principle."
            ]
          ]
        }
      ]
    }
  ],
  "3": [
    {
      "title": "Business environment: meaning and forces",
      "sections": [
        {
          "title": "Meaning and scope",
          "category": "Definition",
          "examPrompt": "Define business environment and distinguish specific from general forces.",
          "lead": "Business environment is the set of external people, institutions and forces that lie outside a business's control but can affect its performance. It includes both forces that reach an individual enterprise directly and wider conditions that shape many enterprises.",
          "items": [
            [
              "Business environment",
              "The term means the totality of individuals, institutions and other forces outside an enterprise that may influence how it performs. A business does not control these external factors, but managers can monitor them and adjust decisions in response.",
              "A change in customer tastes can affect demand even though a firm cannot control those tastes."
            ],
            [
              "Specific forces",
              "Specific forces affect an individual enterprise directly and immediately in its daily work. Customers, investors, competitors and suppliers are examples: their decisions can affect sales, finance, market position or the availability and cost of inputs.",
              "A supplier's delay can interrupt one manufacturer's production schedule."
            ],
            [
              "General forces",
              "General forces shape the conditions faced by businesses more broadly and may affect an individual firm indirectly. Economic, social, political, legal and technological conditions are examples. Their effect may differ among businesses depending on what each firm sells and where it operates.",
              "A change in interest rates affects many businesses, although its impact differs by sector."
            ]
          ]
        },
        {
          "title": "How environmental change reaches business",
          "category": "Effects of change",
          "examPrompt": "Explain how changes in the business environment may affect an enterprise.",
          "lead": "Environmental shifts can change both the cost of operating and the conditions under which a firm sells, invests and competes. Their effects can be threats for one firm and opportunities for another.",
          "items": [
            [
              "Higher taxes or input costs",
              "A rise in taxes or the prices of materials, labour or finance can increase the cost of production. A firm may have to absorb the added cost, adjust its prices, reduce other expenses or change suppliers; the response can affect demand and profit margins.",
              "Higher fuel costs can make distribution more expensive for a retailer."
            ],
            [
              "Lower profit margins",
              "If costs rise faster than selling prices, or competition forces prices down, the margin left after expenses can shrink. Management needs to identify whether the cause is temporary or structural and decide how to protect the viability of the business.",
              "A manufacturer facing more expensive inputs may review waste and sourcing."
            ],
            [
              "Shifts in demand and consumer preferences",
              "Changes in fashion, tastes, disposable income or lifestyles can move demand away from existing products and towards new ones. Businesses that fail to recognise the shift may lose customers, while firms offering suitable alternatives may gain sales.",
              "Growing demand for healthier food can create a market for organic products."
            ],
            [
              "Products or methods becoming obsolete",
              "Technological improvements can make an established product or process less attractive or outdated. Firms may need to update their product range, equipment and skills; postponing adaptation can weaken competitiveness and waste earlier investment.",
              "New display technology can reduce demand for an older television format."
            ],
            [
              "Greater uncertainty about long-term investment",
              "Rapid or unpredictable change makes future sales, costs and regulation harder to estimate. Investors may become cautious about long-term projects when the expected return is less certain, delaying finance and expansion.",
              "Uncertainty about a major regulation can cause a firm to defer a factory investment."
            ]
          ]
        }
      ]
    },
    {
      "title": "Characteristics of business environment",
      "sections": [
        {
          "title": "Seven characteristics",
          "category": "Characteristics",
          "examPrompt": "Explain any three characteristics of the business environment.",
          "lead": "The external environment is broad, connected and changing. Its seven characteristics help explain why managers need to study it as a whole and keep reviewing their assumptions.",
          "items": [
            [
              "Totality of external forces",
              "Business environment is aggregative: it is the sum of many external individuals, institutions and conditions rather than a single influence. A manager who considers only one force may overlook another that changes the meaning or effect of a decision.",
              "A retailer's outlook depends on customers, competitors, suppliers, laws and economic conditions together."
            ],
            [
              "Specific and general forces",
              "The environment contains specific forces that affect an enterprise directly and general forces that influence businesses indirectly or widely. The categories help identify how a change reaches the firm, but both must be considered in planning.",
              "A competitor's price is a specific force; a national tax policy is a general force."
            ],
            [
              "Inter-relatedness",
              "Environmental elements are closely connected, so a change in one may affect another. For example, higher income can change purchasing power and demand; new products may alter lifestyles; changing lifestyles can then influence future demand. Managers should consider these links instead of treating each force as isolated.",
              "Health awareness may increase demand for fitness services and also create new technology-enabled health products."
            ],
            [
              "Dynamic nature",
              "The business environment keeps changing in its economic, social, technological, political and legal dimensions. The pace and direction of change can vary, so information that was useful earlier may need review. Businesses have to adapt their plans as conditions evolve.",
              "A business may update its online sales plan as customer use of digital services grows."
            ],
            [
              "Uncertainty",
              "It is difficult to predict future environmental developments accurately, especially when change is frequent. Managers can use forecasts and scenarios, but they cannot know with certainty how a new policy, competitor move or technology will unfold.",
              "A sudden political crisis or a fast-moving innovation can alter a firm's forecasts."
            ],
            [
              "Complexity",
              "The environment consists of many forces that interact, making the overall impact difficult to understand. It may be easier to examine individual forces separately, but managers must reconnect them to assess the full effect on the enterprise.",
              "A new tax can affect a firm's prices, suppliers, customers and cash-flow plan at once."
            ],
            [
              "Relativity",
              "The business environment is relative because it differs across countries and even across regions within a country. A product, policy or business method that is suitable in one market may not fit another market's income levels, culture, laws or demand.",
              "Demand for a service may be high in India and very limited in France."
            ]
          ]
        }
      ]
    },
    {
      "title": "Importance of understanding the environment",
      "sections": [
        {
          "title": "Six reasons it matters",
          "category": "Importance",
          "examPrompt": "Explain any three reasons why understanding the business environment is important.",
          "lead": "Environmental understanding gives managers information for action. It helps a firm notice favourable conditions, prepare for risk, use external resources and improve the quality of its decisions.",
          "items": [
            [
              "Identifies opportunities and first-mover advantage",
              "A favourable change in the environment can create a business opportunity. A firm that identifies it early can act before rivals, build customer recognition and gain an advantage. Early recognition matters because opportunities may disappear once competitors respond.",
              "An early provider of an affordable product for a growing middle-income market can build a strong position."
            ],
            [
              "Identifies threats and provides early warning",
              "Environmental monitoring can reveal developments likely to hinder performance, such as a new competitor, a change in customer preference or a legal restriction. Early warning gives managers time to revise plans and reduce exposure before the threat causes severe loss.",
              "Noticing that customers are shifting to online orders can prompt a store to build a digital channel."
            ],
            [
              "Helps tap useful resources",
              "Businesses depend on the environment for inputs such as finance, labour, materials, information and technology. Understanding the environment helps managers identify where useful resources are available and secure them in time to produce goods or services that customers value.",
              "A firm may identify a trained local workforce before choosing a location for expansion."
            ],
            [
              "Helps cope with rapid change",
              "When managers understand the forces changing around the enterprise, they can develop suitable responses rather than relying on outdated assumptions. This ability to adapt helps the organisation remain viable and respond to shifting economic, social or technological conditions.",
              "A manufacturer can train workers before replacing a manual process with automated equipment."
            ],
            [
              "Supports planning and policy formulation",
              "Planning requires assumptions about future demand, costs, regulations and competition. Environmental information improves those assumptions and helps managers set more realistic objectives and policies. As conditions change, it also signals when a plan may need revision.",
              "A retailer uses income and demand forecasts when deciding store locations and stock levels."
            ],
            [
              "Helps improve performance",
              "A firm that responds appropriately to environmental opportunities and threats can use resources more effectively, meet changing customer needs and strengthen its competitive position. Understanding the environment is therefore not an academic exercise; it can contribute to better business results.",
              "A firm that updates its product range as tastes change may retain customers and protect sales."
            ]
          ]
        }
      ]
    },
    {
      "title": "Five dimensions of the business environment",
      "sections": [
        {
          "title": "The five dimensions",
          "category": "Dimensions",
          "examPrompt": "Name and briefly explain the five dimensions of the business environment.",
          "lead": "The chapter groups the general business environment into exactly five dimensions. Specific forces such as customers and suppliers are separate from this five-part classification.",
          "items": [
            [
              "Economic",
              "Economic conditions affect purchasing power, costs, finance, investment and demand. Relevant indicators include income, inflation, interest rates and market conditions.",
              "A rise in disposable income can increase demand for products."
            ],
            [
              "Social",
              "Social conditions include customs, traditions, values, social trends, family composition and society’s expectations of business.",
              "A festival can create demand for sweets and greeting cards."
            ],
            [
              "Technological",
              "Scientific improvements, innovations and new operating methods can change production, distribution, communication and the products businesses offer.",
              "Online booking changes how customers buy airline tickets."
            ],
            [
              "Political",
              "Political conditions include stability and peace, government policy and the state’s approach to business; these influence confidence and the conditions for investment.",
              "Political instability can make firms delay long-term investment."
            ],
            [
              "Legal",
              "The legal dimension includes legislation, administrative orders and decisions by government commissions and agencies at different levels. Businesses need to know and follow applicable requirements.",
              "Consumer-protection requirements affect product labelling and advertising."
            ]
          ]
        }
      ]
    },
    {
      "title": "Economic and social environment: components",
      "sections": [
        {
          "title": "Economic factors and examples",
          "category": "Economic factors",
          "examPrompt": "Explain economic factors that influence business decisions, with examples.",
          "lead": "Economic forces alter costs, purchasing power, demand and access to finance. The following are components of the economic dimension, not additional dimensions of the environment.",
          "items": [
            [
              "Stock-market indices",
              "Market indices indicate movements in share prices and investor sentiment. Their movement can affect the confidence of investors and businesses and can influence decisions about investment and finance.",
              "A sustained fall in a market index may make a firm more cautious about expansion."
            ],
            [
              "Disposable income and national income",
              "Changes in national output and people’s disposable income affect how much customers can spend. Rising income can create demand for a wider range of goods and services, while declining income may constrain purchases.",
              "Higher disposable income can increase demand for household appliances."
            ],
            [
              "Inflation and cost levels",
              "High inflation tends to raise the cost of materials, production and wages. Businesses may pass costs into prices, but higher prices may restrain demand; if costs rise faster than selling prices, profit margins can fall.",
              "A manufacturer faces pressure when both ingredient and wage costs rise."
            ],
            [
              "Short- and long-term interest rates",
              "Interest rates affect the cost of borrowing and can influence spending on products and services. Lower longer-term rates can encourage consumers to borrow for homes and related purchases, while high rates can restrain demand and investment.",
              "Lower home-loan rates can support demand for housing and furnishings."
            ],
            [
              "Foreign-exchange and balance-of-payments conditions",
              "Exchange rates and external-payment conditions influence the cost of imports and the value of export earnings. A business that buys or sells internationally must consider these conditions when setting prices and preparing budgets.",
              "A weaker domestic currency can raise the local cost of imported machinery."
            ],
            [
              "Government taxes and economic policy",
              "Taxation and public economic choices can change a firm’s costs, incentives and demand conditions. Managers need to monitor policy changes because they can require revised prices, investments or operating plans.",
              "An increase in an indirect tax can affect a product’s final price."
            ]
          ]
        },
        {
          "title": "Social factors and examples",
          "category": "Social factors",
          "examPrompt": "Explain social factors that influence business decisions, with examples.",
          "lead": "Social forces shape customer tastes, lifestyles and expectations of employers and producers. They provide businesses with opportunities and can also make existing products less suitable.",
          "items": [
            [
              "Customs and traditions",
              "Customs and traditions define practices that have lasted for decades or centuries. They affect seasonal and occasion-based demand and can create opportunities for businesses that provide relevant products and services.",
              "Diwali, Eid, Christmas and Guru Parv can increase demand for sweets, cards and catering."
            ],
            [
              "Values",
              "Values are ideas that society holds in high regard. They influence customer choice and expectations of business responsibility, including fair treatment, equality of opportunity and responsible employment practices.",
              "A firm’s non-discriminatory hiring practices respond to social expectations of fairness."
            ],
            [
              "Social trends",
              "Trends in interests and lifestyles create opportunities and threats. Businesses need to observe whether a trend changes demand and whether it is likely to last before committing resources to a response.",
              "Growing interest in health can increase demand for gyms and organic food."
            ],
            [
              "Composition of families and population",
              "Changes in family structure, age, life expectancy and population composition affect the type and amount of goods and services people need. These changes can alter markets for housing, food, healthcare and other products.",
              "More single-person households may increase demand for smaller homes and package sizes."
            ],
            [
              "Society’s expectations of business",
              "People expect businesses to provide useful products responsibly and to treat workers and communities fairly. These expectations can affect reputation, customer loyalty and the practices firms need to adopt.",
              "Customers may favour a firm that reduces pollution in its production process."
            ]
          ]
        }
      ]
    },
    {
      "title": "Technological, political and legal environment: components",
      "sections": [
        {
          "title": "Technological factors and examples",
          "category": "Technological factors",
          "examPrompt": "Explain technological factors affecting business, with examples.",
          "lead": "Technology covers both improvements in what can be produced and new methods for operating a business.",
          "items": [
            [
              "Scientific improvements and innovations",
              "Scientific progress can provide new ways of producing goods and services. It can improve quality or productivity, but it may also make established products and processes less competitive.",
              "A manufacturer adopts a more efficient production technology."
            ],
            [
              "New operating methods",
              "New techniques can change how firms organise production, sales, distribution and inventory. Businesses may need new skills and systems to use them effectively.",
              "Flexible manufacturing lets a producer adapt output to customer requirements."
            ],
            [
              "Online customer access",
              "Internet and World Wide Web services allow customers to obtain information and complete transactions directly. This can broaden access and require businesses to manage their digital service alongside other channels.",
              "Airline websites let customers compare destinations and fares and book tickets."
            ],
            [
              "Supplier and product communication links",
              "Digital product information and links with suppliers can improve communication and replenish stock when needed. These connections can make operations more responsive, provided that the technology and information are reliable.",
              "A retailer’s system can alert a supplier when inventory falls below a set level."
            ]
          ]
        },
        {
          "title": "Political factors and examples",
          "category": "Political factors",
          "examPrompt": "Explain political factors affecting business decisions.",
          "lead": "Political conditions affect confidence, investment and the policy framework in which firms operate.",
          "items": [
            [
              "Stability and peace",
              "Political stability and peace support confidence among businesses and investors. Political unrest, emergencies or war can interrupt activity and create uncertainty about future operations.",
              "A firm may defer a long-term project during a period of political instability."
            ],
            [
              "Government policy and attitude towards business",
              "The government’s economic policy and attitude towards private enterprise can encourage, restrict or redirect business activity. Changes in policy can alter the conditions and costs of operation.",
              "A policy that opens a sector to private firms can create new entry opportunities."
            ],
            [
              "Relations with foreign countries",
              "A country’s relations with other countries can influence trade, investment, imports and access to markets. A change in these relations may have a positive or negative effect on businesses connected to international supply or sales.",
              "Trade tensions may delay imported components or affect an export market."
            ]
          ]
        },
        {
          "title": "Legal factors and examples",
          "category": "Legal factors",
          "examPrompt": "Explain the legal dimension of the business environment and give relevant examples.",
          "lead": "The legal dimension comprises formal rules and official decisions that businesses must understand and obey.",
          "items": [
            [
              "Legislation, orders and agency decisions",
              "Legal conditions include laws passed by government, administrative orders and decisions by commissions and agencies at central, state and local levels. Managers need adequate working knowledge of relevant rules to support lawful and effective performance.",
              "A competition authority’s decision can affect how firms structure a transaction."
            ],
            [
              "Examples of Indian business laws",
              "The chapter names laws including the Companies Act, 2013; Consumer Protection Act, 2019; Factories Act, 1948; Trade Union Act, 1926; Industrial Disputes Act, 1947; Competition Act, 2002; and laws on foreign exchange and imports and exports. Which provisions apply depends on the business activity.",
              "A manufacturer must consider factory, company and labour requirements."
            ],
            [
              "Consumer-protection rules",
              "Regulation may restrict advertising and other conduct to protect consumers. Businesses need to ensure that promotional messages and sales practices meet applicable legal requirements.",
              "The chapter gives prohibition of advertising alcoholic beverages as an example."
            ]
          ]
        }
      ]
    },
    {
      "title": "LPG reforms and their effects on business",
      "sections": [
        {
          "title": "Three policy reforms",
          "category": "LPG policy changes",
          "examPrompt": "Explain liberalisation, privatisation and globalisation.",
          "lead": "LPG is a three-part shorthand for changes in economic policy. Explain each term separately; the seven business effects are listed in the next section.",
          "items": [
            [
              "Liberalisation",
              "Liberalisation means reducing unnecessary government controls and restrictions on business activity, including easing licensing and opening more areas to enterprise. It gives firms greater freedom to make decisions and can make it easier for new businesses to enter markets.",
              "A firm may have greater freedom to expand production when licensing restrictions are eased."
            ],
            [
              "Privatisation",
              "Privatisation means increasing private-sector ownership and management in economic activity, including transferring some activities or enterprises from public to private control. This changes who makes operational decisions and can increase pressure to improve efficiency and customer service.",
              "A privately managed service provider may face a stronger incentive to improve service quality."
            ],
            [
              "Globalisation",
              "Globalisation is the integration of domestic markets and businesses with the world economy. Greater movement of goods, services, investment and technology links Indian firms to international customers and competitors, expanding potential markets while exposing firms to global standards and rivalry.",
              "An Indian producer can seek overseas customers and compete with imported products."
            ]
          ]
        },
        {
          "title": "Seven effects of policy changes on business and industry",
          "category": "Effects of LPG policy changes",
          "examPrompt": "Explain any three effects of economic policy changes on business and industry.",
          "lead": "The policy shift changed how firms competed and what they needed to do to remain viable. The seven effects below are separate textbook points, not additional names for the LPG reforms.",
          "items": [
            [
              "Increasing competition",
              "Liberalisation and globalisation increased competition, including competition from foreign firms and multinational companies. Businesses had to improve performance, price and quality because customers could choose among more suppliers and rivals could enter markets more easily.",
              "A domestic producer improves product quality when imported alternatives enter the market."
            ],
            [
              "More demanding customers",
              "Greater competition gives customers more choice and makes them more aware of price, quality and service. Businesses can no longer assume that buyers will accept limited options; they must understand and respond to customer expectations.",
              "Customers can compare models and switch brands when a product does not meet expectations."
            ],
            [
              "Rapidly changing technological environment",
              "Access to new technology and competition accelerate changes in production and business methods. Firms need to keep up with technology to control costs, improve quality and respond to competitors; outdated systems can reduce productivity and market relevance.",
              "A manufacturer updates machinery to meet quality standards and lower unit costs."
            ],
            [
              "Necessity for change",
              "The new competitive environment requires businesses to change policies, practices and attitudes. Managers must be willing to reconsider established methods because practices suited to a protected market may fail in a more open one.",
              "A firm shifts from relying on a protected market to actively improving its products."
            ],
            [
              "Need for developing human resources",
              "New technology and more demanding work require employees with suitable skills and capabilities. Businesses need to recruit, train and develop people so they can use new systems, serve customers and meet changing performance expectations.",
              "A company trains employees before introducing an advanced manufacturing process."
            ],
            [
              "Market orientation",
              "Businesses need to focus more closely on customer needs and market conditions when deciding what to produce and how to sell it. Market research and feedback become important because a product that does not meet demand is unlikely to succeed simply because the firm can produce it.",
              "A company uses customer research to shape the features of a new product."
            ],
            [
              "Loss of budgetary support to the public sector",
              "Reduced budgetary support meant public-sector enterprises could not rely to the same extent on government funding. They had to become more self-reliant, improve performance and seek finance through other sources while facing greater competition.",
              "A public enterprise may need to raise funds from the market and control costs more carefully."
            ]
          ]
        }
      ]
    },
    {
      "title": "Demonetisation",
      "sections": [
        {
          "title": "Meaning, announcement and aims",
          "category": "Definition and aims",
          "examPrompt": "Define demonetisation and state its aims as discussed in the chapter.",
          "lead": "Demonetisation is a government action that removes the legal-tender status of a currency unit in circulation. The chapter discusses India's 2016 announcement and its stated aims and business effects.",
          "items": [
            [
              "Meaning of demonetisation",
              "Demonetisation is the cancellation of the legal-tender status of a currency unit already in circulation. Affected notes can no longer be used as ordinary legal payment after the effective change, subject to the exchange or deposit arrangements announced by the government.",
              "When specified old notes cease to be legal tender, holders must follow the official exchange or deposit process."
            ],
            [
              "India's 2016 note announcement",
              "The chapter records the Government of India's announcement affecting the then ₹500 and ₹1,000 denomination notes. These notes ceased to be legal tender, and the source states that the affected currency represented about 86 percent of money in circulation by value.",
              "The change made ordinary cash transactions dependent on valid notes or other payment methods."
            ],
            [
              "Stated aims",
              "The stated aims included curbing corruption, counterfeiting and the use of high-denomination notes for illegal activities, especially the accumulation of black money arising from income that had not been declared to tax authorities.",
              "The policy sought to bring undeclared cash into a process where it could be identified and taxed."
            ]
          ]
        },
        {
          "title": "Four features or intended effects",
          "category": "Features and effects",
          "examPrompt": "Explain any three features or effects of demonetisation given in the chapter.",
          "lead": "The text discusses demonetisation as a tax-administration measure and describes effects on disclosure, bank deposits and digital payment use.",
          "items": [
            [
              "Tax-administration measure",
              "Cash arising from declared income could be deposited in banks or exchanged through the prescribed process. Holders of unaccounted wealth had to disclose it and could face tax and a penalty. This made the policy a means of bringing cash holdings into tax administration.",
              "A person depositing large undeclared holdings could be required to explain and pay tax on them."
            ],
            [
              "Improving tax compliance",
              "The measure signalled that tax evasion would not be accepted. The chapter describes increased disclosure and tax collection and a reduction in tax evasion as outcomes associated with this compliance objective.",
              "Greater scrutiny of deposits can encourage people to report income accurately."
            ],
            [
              "Savings moving into the formal financial system",
              "Depositing cash in banks increased the funds held in the formal financial system. The chapter notes that bank deposits increased, while interest rates decreased. This is an effect on financial institutions and the broader availability of recorded funds.",
              "A household deposits cash in a bank instead of keeping it outside the formal system."
            ],
            [
              "Growth in non-cash and digital transactions",
              "Cash constraints encouraged use of alternatives such as RuPay and debit cards and Aadhaar Enabled Payment System transactions. The chapter notes a rise in digital transactions and related savings, reflecting a move towards recorded payment channels.",
              "A customer pays a shop by debit card when a cash note is no longer usable."
            ]
          ]
        }
      ]
    }
  ],
  "4": [
    {
      "title": "Planning: meaning and scope",
      "sections": [
        {
          "title": "Definition and key elements",
          "category": "Definition",
          "examPrompt": "Define planning and explain what it involves.",
          "lead": "Planning is deciding in advance what to do and how to do it. It is a basic managerial function because objectives give direction and managers must choose a course of action before putting work into operation.",
          "items": [
            [
              "Setting objectives for a time period",
              "Planning begins by specifying what the organisation wants to achieve and by when. Objectives are the intended results against which later performance can be compared. They provide a basis for deciding what work and resources will be needed.",
              "A business may set a target to increase sales by 10 percent in the coming year."
            ],
            [
              "Developing possible courses of action",
              "After identifying the intended results, managers consider ways of reaching them. Planning requires judgement about available actions and the conditions under which they may work; it is not merely writing down an aspiration.",
              "A firm seeking higher sales may compare a price promotion, a new product and a new sales channel."
            ],
            [
              "Selecting a suitable alternative",
              "The manager evaluates possible courses and chooses the most appropriate option, sometimes combining alternatives. The selected plan should be feasible and should take account of expected benefits, resource requirements and possible negative consequences.",
              "A retailer may combine an online launch with limited in-store promotions."
            ],
            [
              "Concerned with both ends and means",
              "The ends are the objectives or results to be achieved; the means are the actions and resources used to achieve them. A plan is incomplete if it states only a target without an approach, or describes activity without saying what result it is meant to produce.",
              "A sales target is the end; staffing, distribution and promotion choices are means."
            ],
            [
              "Planning is future-oriented and must be implemented",
              "A plan concerns a future period and has to account for time, a limited resource. Conditions may change while a plan waits, so managers need to act on it and review it. Planning that is never implemented is a futile exercise.",
              "A seasonal sales plan must be put into effect before the season begins."
            ]
          ]
        },
        {
          "title": "Planning and decision-making",
          "category": "Relationship and distinction",
          "examPrompt": "Explain why planning involves decision-making.",
          "lead": "Planning is a mental and managerial activity that involves choices. When only one course is possible, the element of choice is absent; when alternatives exist, managers have to decide which one best fits the objectives and circumstances.",
          "items": [
            [
              "Choice among alternatives",
              "Managers consider more than one possible course of action and decide what should be done. The decision should be connected to the objective and based on available information, forecasts and judgement rather than guesswork or wishful thinking.",
              "A manufacturer compares outsourcing, adding a shift and buying machinery before choosing a capacity plan."
            ],
            [
              "Ordered thinking and judgement",
              "Planning requires application of the mind, foresight, intelligent imagination and sound judgement. Managers use facts and forecasts to anticipate possible conditions, while recognising that future events cannot be known with certainty.",
              "A manager analyses expected demand and costs before preparing next year's production plan."
            ]
          ]
        }
      ]
    },
    {
      "title": "Characteristics of planning",
      "sections": [
        {
          "title": "Seven characteristics",
          "category": "Characteristics",
          "examPrompt": "Explain any three characteristics of planning.",
          "lead": "Planning has seven distinct features. Together, they describe its purpose, its place in management and the thinking involved.",
          "items": [
            [
              "Focuses on achieving objectives",
              "Planning starts from objectives and selects actions that can lead to those results. This objective focus keeps the plan from becoming a collection of unrelated activities and helps employees understand the intended outcome.",
              "A cost-reduction plan should be tied to a measurable target and a defined period."
            ],
            [
              "Is a primary function of management",
              "Planning lays the foundation for other functions. Organising, staffing, directing and controlling are performed in relation to plans; the other functions remain important and interconnected, but planning establishes what the organisation intends to do.",
              "Roles and staffing requirements are set after a plan identifies the work to be done."
            ],
            [
              "Is pervasive",
              "Planning is required at all levels of management and in all departments, not only at the top or in a planning department. Its scope and time horizon vary: senior managers plan for the whole organisation, while lower managers plan the work of their units.",
              "A company-wide growth plan sits alongside a weekly plan for a production team."
            ],
            [
              "Is continuous",
              "Planning does not end when a document is approved. Managers make plans for different periods, monitor progress and revise action as results or conditions change. New plans often build on what was learned from earlier plans.",
              "A monthly sales plan is reviewed and adjusted after actual sales are known."
            ],
            [
              "Is futuristic",
              "Planning looks ahead and anticipates future conditions. Managers use forecasts about matters such as demand, government policy, interest rates or costs to prepare for likely developments, while accepting that forecasts may not be exact.",
              "A business forecasts demand before deciding how much inventory to hold."
            ],
            [
              "Involves decision-making",
              "Planning requires a choice among alternative courses of action. Managers compare options and select one, or a suitable combination, that best supports the objectives and fits the available resources and circumstances.",
              "A company chooses whether to meet rising demand through overtime or new equipment."
            ],
            [
              "Is a mental exercise",
              "Planning is an intellectual activity that requires logical and systematic thinking, foresight and sound judgement. It is more than guesswork: managers gather information, anticipate conditions and reason through what should be done before implementation.",
              "A manager studies likely costs and customer demand before fixing a product launch date."
            ]
          ]
        }
      ]
    },
    {
      "title": "Importance of planning",
      "sections": [
        {
          "title": "Six benefits",
          "category": "Importance",
          "examPrompt": "Explain any three points showing the importance of planning.",
          "lead": "Planning gives people direction, helps prepare for uncertainty, coordinates work and provides standards for later control. It improves the basis for decisions but does not make outcomes certain.",
          "items": [
            [
              "Provides direction",
              "Clearly stated objectives tell employees what the organisation is trying to achieve and what they should contribute. Shared direction helps individuals and departments coordinate their effort; without it, people may work at cross-purposes and fail to meet the organisation's goals.",
              "A shared delivery target aligns purchasing, production and transport schedules."
            ],
            [
              "Reduces the risks of uncertainty",
              "Planning cannot eliminate uncertainty, but managers can anticipate possible developments and prepare responses in advance. This makes the organisation less likely to be caught wholly unprepared by changes in demand, costs or policy.",
              "A contingency supplier can be identified before a likely supply interruption occurs."
            ],
            [
              "Reduces overlapping and wasteful activities",
              "Planning helps coordinate the plans and actions of different divisions and departments. When responsibilities and timing are considered together, duplicate work and interruptions are easier to prevent, and inefficiencies can be identified for correction.",
              "Two departments can use one shared customer survey instead of commissioning duplicate studies."
            ],
            [
              "Promotes innovative ideas",
              "Considering alternatives can prompt managers to find new ways to achieve objectives. A planning process that invites ideas can support growth and prosperity by encouraging people to examine whether existing methods remain suitable.",
              "A team may develop a new delivery option while planning how to reach more customers."
            ],
            [
              "Facilitates decision-making",
              "Planning sets targets and anticipates future conditions, giving managers a reasoned basis for choosing among options. The information and comparison of alternatives can improve the quality and timing of managerial decisions.",
              "Demand forecasts help a firm decide whether to add a shift or expand a facility."
            ],
            [
              "Establishes standards for controlling",
              "Plans specify intended results and timing, which can be used as performance standards. During control, managers compare actual results with these standards, identify deviations and decide whether corrective action is required.",
              "A planned production quantity gives the manager a benchmark for reviewing actual output."
            ]
          ]
        }
      ]
    },
    {
      "title": "Limitations of planning",
      "sections": [
        {
          "title": "Six limitations",
          "category": "Limitations",
          "examPrompt": "Explain any three limitations of planning.",
          "lead": "Planning is essential, but it cannot guarantee a successful outcome. Internal rigidity, environmental change and the cost of planning can all limit its usefulness.",
          "items": [
            [
              "Can lead to rigidity",
              "A detailed plan can commit managers to specific goals and actions for a set period. If circumstances change, rigid adherence may prevent a timely response and harm the organisation. Plans need appropriate flexibility so managers can respond when the original assumptions no longer hold.",
              "A firm should reconsider a launch date if a critical safety problem appears."
            ],
            [
              "May not work in a dynamic environment",
              "The business environment can change because of technology, competition, political or legal conditions, prices or unexpected events. A plan based on earlier conditions may become unsuitable, so it must be reviewed and modified rather than treated as a certain prediction.",
              "A sudden legal change can make a previously planned product launch unviable."
            ],
            [
              "May reduce creativity",
              "When senior managers create detailed plans and others are expected only to follow them, middle managers and employees may have little scope to propose alternatives. They can become order-takers instead of contributors, reducing initiative and innovative thinking.",
              "A rigid script may stop frontline staff from suggesting a better way to serve customers."
            ],
            [
              "Involves substantial costs",
              "Preparing plans can require time, money, research and detailed calculations. Managers may need to collect and verify facts, prepare forecasts and compare alternatives. If the expense of planning is greater than the benefit it creates, the plan is not worthwhile.",
              "A costly market study may not be justified for a very small, low-risk purchase."
            ],
            [
              "Is time-consuming",
              "A planning process can take so long that little time remains to implement the plan. This is especially harmful when a decision is urgent or conditions are changing quickly; managers must balance careful preparation with timely action.",
              "A lengthy review can cause a retailer to miss the main seasonal selling window."
            ],
            [
              "Does not guarantee success",
              "Even a well-designed plan depends on assumptions and future events that may not occur as expected. Unforeseen changes, poor implementation or incorrect estimates can cause failure. Planning improves preparation, but managers still need execution, monitoring and adjustment.",
              "A demand forecast may be sound, yet a competitor's unexpected price cut can reduce sales."
            ]
          ]
        }
      ]
    },
    {
      "title": "The planning process",
      "sections": [
        {
          "title": "Seven steps in sequence",
          "category": "Process steps",
          "examPrompt": "Describe the seven steps in the planning process.",
          "lead": "The process moves from defining the result to monitoring implementation. Keep the sequence clear: objectives, premises, alternatives, evaluation, selection, implementation and follow-up.",
          "items": [
            [
              "1. Setting objectives",
              "The first step is deciding what the organisation wants to achieve. Objectives may be set for the whole organisation and for each department or unit. They should state the intended result clearly enough to guide action and later comparison with actual performance.",
              "A company sets an annual objective to increase sales by 10 percent."
            ],
            [
              "2. Developing planning premises",
              "Premises are assumptions and forecasts about conditions that may affect the plan. Managers gather information about demand, costs, policy, competition and other relevant factors. Shared premises help different units prepare plans that fit together; poor assumptions can undermine later steps.",
              "A furniture maker estimates housing demand and timber prices before planning output."
            ],
            [
              "3. Identifying alternative courses of action",
              "Managers identify the different ways in which objectives could be achieved. Considering more than one course matters because the first idea may not be the most feasible or economical. Alternatives may involve different methods, resources, timing or combinations of actions.",
              "To meet higher demand, a firm might add shifts, buy equipment or outsource some work."
            ],
            [
              "4. Evaluating alternative courses",
              "Each alternative is assessed by weighing its advantages and disadvantages, including feasibility, cost, expected benefit, risk and possible consequences. Evaluation enables managers to compare options against the objective and the assumptions on which the plan rests.",
              "A firm compares the cost and reliability of outsourcing with buying its own machinery."
            ],
            [
              "5. Selecting an alternative",
              "Selection is the real point of decision-making: managers choose the most suitable course, often the one that is feasible and offers a good return with limited negative consequences. A combination of alternatives may be chosen when one option alone is inadequate.",
              "A business may buy basic equipment and outsource peak-season production."
            ],
            [
              "6. Implementing the plan",
              "The selected plan is put into action. This requires assigning duties, organising the work and arranging the resources needed, such as labour and machinery. Managers also need to communicate the plan so people understand their roles, timing and expected results.",
              "The production manager assigns staff and orders machinery to put an approved capacity plan into effect."
            ],
            [
              "7. Follow-up action",
              "Managers monitor whether implementation is proceeding as intended and whether the plan is producing the expected results. They compare progress with objectives, respond to deviations and revise the plan when assumptions or circumstances change. Follow-up keeps planning connected to real performance.",
              "A monthly review compares actual sales with the target and revises the next campaign if needed."
            ]
          ]
        }
      ]
    },
    {
      "title": "Types of plans: single-use and standing",
      "sections": [
        {
          "title": "Single-use plans and standing plans",
          "category": "Types of plans",
          "examPrompt": "Distinguish between single-use plans and standing plans.",
          "lead": "Plans may be classified according to whether they address a one-time situation or repeated organisational activity. This distinction helps managers select a suitable form for the decision at hand.",
          "items": [
            [
              "Single-use plan",
              "A single-use plan is prepared for a particular event or project that is not expected to recur in the same form. Its duration depends on the task and may be brief or extend over a longer project. Budgets, programmes and projects are examples in the chapter.",
              "A conference plan is designed for that event rather than for a recurring daily activity."
            ],
            [
              "Standing plan",
              "A standing plan is prepared for recurring situations and used repeatedly over time. It supports consistent routine decisions and smooth internal operations. It may be updated when business needs change; objectives, strategies, policies, procedures, methods and rules are examples.",
              "A standing attendance procedure guides employees each time they report an absence."
            ],
            [
              "Choosing the right type",
              "Use a single-use plan when the situation is exceptional or non-recurring; use a standing plan when similar decisions arise regularly. A standing plan may provide the general rule while a single-use plan applies it to a particular event or project.",
              "A company policy may apply generally while a one-time programme organises a product launch."
            ]
          ]
        }
      ]
    },
    {
      "title": "Standing plans: objectives, strategy, policy, procedure, method and rule",
      "sections": [
        {
          "title": "Standing plan: objectives and strategy",
          "category": "Types of standing plans",
          "examPrompt": "Explain objectives and strategy as types of plans.",
          "lead": "Objectives state intended results, while strategy provides an overall route for achieving them after taking the business environment into account.",
          "items": [
            [
              "Objectives",
              "Objectives are the specific results that management seeks within a stated period. They are commonly set by top management and guide overall planning; departments then set their own objectives in line with the organisation's overall goals. Clear objectives should be measurable where possible.",
              "A department sets a customer-retention target that supports the organisation's broader growth objective."
            ],
            [
              "Strategy",
              "A strategy is a comprehensive plan for achieving organisational objectives while considering the business environment. It combines long-term objectives, a chosen course of action and allocation of the resources needed. Strategy gives an organisation a broad direction for competing and developing.",
              "A retailer may choose an online-first strategy and allocate investment to its delivery network."
            ]
          ]
        },
        {
          "title": "Standing plan: policy, procedure, method and rule",
          "category": "Types of standing plans",
          "examPrompt": "Explain policy, procedure, method and rule, distinguishing them from one another.",
          "lead": "These plans guide recurring decisions at different levels of detail. A policy sets a broad boundary, a procedure orders steps, a method describes how a task step is done, and a rule specifies required or prohibited conduct.",
          "items": [
            [
              "Policy",
              "A policy is a general guideline that channels decisions towards a particular direction and promotes consistency. It sets broad parameters within which managers may exercise judgement. Policies are standing plans and can be interpreted into more detailed procedures or decisions.",
              "A purchase policy may require competitive quotations while letting a manager select among qualified suppliers."
            ],
            [
              "Procedure",
              "A procedure is a sequence of steps performed in a specified order to carry out an activity. It indicates what steps are to be followed, providing a repeatable way to complete routine work. Procedures are more detailed than broad policies.",
              "A procedure can specify the order for reporting a production problem and requesting supplies."
            ],
            [
              "Method",
              "A method is the prescribed way of performing a particular task or a step within a procedure. The method can vary by task. Choosing a suitable method can save time, money and effort and increase efficiency.",
              "A method specifies how to inspect a product at one step of a quality procedure."
            ],
            [
              "Rule",
              "A rule clearly states what must or must not be done. It guides behaviour, allows little or no discretion and may specify a penalty for violation. A rule reflects a managerial decision that an action is required or forbidden.",
              "A no-smoking rule prohibits smoking on office premises."
            ]
          ]
        }
      ]
    },
    {
      "title": "Single-use plans: budget, programme and project",
      "sections": [
        {
          "title": "Three single-use plan types",
          "category": "Types of plans",
          "examPrompt": "Explain budget, programme and project as types of plans.",
          "lead": "Single-use plans organise a non-recurring activity or express expected results for a particular future period. They differ in what they specify and how broad the planned activity is.",
          "items": [
            [
              "Budget",
              "A budget is a statement of expected results for a future period expressed in numerical terms. It may state expected income, revenue or expenses, or forecast quantities and sales. Because actual figures can be compared with budgeted figures, a budget also serves as a control device; its forecasting role makes it a planning instrument.",
              "A sales budget estimates monthly sales of each product in each area."
            ],
            [
              "Programme",
              "A programme is a coordinated package of activities for achieving an objective. It can specify the sequence of work, procedures, responsibilities, timing and resources, and is carried out within the organisation's broader plans and policies. A programme is broader than a single procedure or method.",
              "A programme for opening a new department may include hiring, equipment purchase and staff training."
            ],
            [
              "Project",
              "A project is a specific one-time undertaking with a defined task and outcome. Projects are related to programmes but generally differ in scope and complexity; a programme may contain several projects or smaller activities that collectively advance a larger objective.",
              "A programme to expand service may contain a project to build one new branch."
            ],
            [
              "Programme versus project",
              "A programme coordinates a broader set of related activities, while a project is a more specific undertaking within or alongside that work. Both are planned for a defined purpose, but the programme normally integrates a wider range of steps, responsibilities and resources.",
              "A digital-transformation programme might contain separate projects for a website, payment system and staff training."
            ]
          ]
        }
      ]
    }
  ],
  "5": [
    {
      "title": "Organising: meaning and importance",
      "sections": [
        {
          "title": "Meaning and role of organising",
          "category": "Concept of organising",
          "examPrompt": "What is organising? Explain its role in management.",
          "lead": "Organising converts plans into an arrangement of work, people and resources that can be acted on.",
          "items": [
            [
              "Coordinating resources",
              "Organising brings people together with physical and financial resources and coordinates their efforts so that the enterprise can pursue stated objectives in an orderly way.",
              "A retailer assigns staff, stock and store space to deliver a planned seasonal campaign."
            ],
            [
              "Turning plans into action",
              "Planning decides what the organisation intends to achieve; organising creates the roles, duties and authority relationships needed to carry those plans out.",
              "A plan to open a new branch becomes jobs for hiring, fitting out, marketing and operations."
            ],
            [
              "Creating a structure",
              "The organising process produces a structure of positions and relationships. It shows how work is divided and how the resulting duties connect across departments and management levels."
            ]
          ],
          "source": "Section 5.1"
        },
        {
          "title": "Importance of organising",
          "category": "Importance of organising",
          "examPrompt": "Explain the importance of organising.",
          "lead": "Each point shows how a suitable work structure improves performance or the organisation’s ability to adapt.",
          "items": [
            [
              "Benefits of specialisation",
              "Organising divides work into jobs that can be handled by people with relevant capabilities. Repeated performance builds experience, raises skill and productivity, and reduces the time needed to complete tasks."
            ],
            [
              "Clarity in working relationships",
              "Defining positions and reporting links makes it clear who gives instructions, who receives them and where a matter should be referred. This reduces ambiguity and supports a workable hierarchy."
            ],
            [
              "Effective administration",
              "Clear job descriptions and assigned duties help managers coordinate, monitor and direct work. Employees are less likely to duplicate effort or leave an essential activity unattended."
            ],
            [
              "Optimum use of resources",
              "Assigning specific people, equipment and funds to defined tasks reduces overlap and waste. Managers can identify whether resources are being used where they make the greatest contribution."
            ],
            [
              "Development of personnel",
              "Delegating suitable duties gives employees practice in decision-making and problem-solving. The experience can prepare them for more demanding responsibilities and future managerial positions."
            ],
            [
              "Adaptation to change",
              "An organisation can revise its structure, duties and reporting links when technology, markets or business conditions change. A flexible arrangement helps it continue operating through change."
            ],
            [
              "Growth and diversification",
              "A clear structure can accommodate additional departments, job positions, product lines or territories as the enterprise expands. This allows growth without leaving new work unassigned."
            ]
          ],
          "source": "Section 5.1"
        }
      ]
    },
    {
      "title": "Process of organising",
      "sections": [
        {
          "title": "Steps in the organising process",
          "category": "Process steps",
          "examPrompt": "Describe the steps in the organising process.",
          "lead": "The process progressively turns broad work into assigned positions and clear reporting links.",
          "items": [
            [
              "Identification and division of work",
              "Management identifies the activities needed to achieve the plan and divides the total workload into manageable tasks. Work division avoids leaving essential activities undone and makes it possible to share the burden."
            ],
            [
              "Departmentalisation",
              "Related activities are grouped into departments using a suitable basis, such as function, product or territory. Grouping similar work supports specialisation and makes coordination within each area easier."
            ],
            [
              "Assignment of duties",
              "After departments and positions are defined, specific jobs are allocated to employees according to their skills and competencies. Duties should be described clearly so each person knows the expected work."
            ],
            [
              "Establishing reporting relationships",
              "Authority and reporting links are set between positions and departments. Employees then know who may give instructions, to whom they report and how coordination or unresolved matters should move."
            ]
          ],
          "source": "Section 5.1"
        }
      ]
    },
    {
      "title": "Organisation structure and types",
      "sections": [
        {
          "title": "Structure, organisation chart and span of management",
          "category": "Organisation structure",
          "examPrompt": "What is organisation structure? Explain how span of management shapes it.",
          "lead": "The structure is the framework for carrying out managerial and operating work; an organisation chart displays its reporting relationships.",
          "items": [
            [
              "Framework for work",
              "Organisation structure is the arrangement within which tasks are performed. It connects positions, people, work and departments so the enterprise can operate as an integrated unit."
            ],
            [
              "Communication and control",
              "A sound structure establishes reporting lines that support communication, coordination and control over operations. It can improve performance by clarifying where decisions and information should flow."
            ],
            [
              "Organisation chart",
              "The structure is commonly represented by an organisation chart. The chart displays positions and formal lines of authority or reporting, helping staff see how roles connect."
            ],
            [
              "Span of management",
              "Span of management is the number of subordinates a manager can supervise effectively. It influences how many management levels are needed and therefore the shape of the structure."
            ],
            [
              "Tall and short structures",
              "A relatively narrow span usually requires more levels and creates a taller structure; a wider span generally permits fewer levels and a flatter, shorter structure. The appropriate span depends on the work and managerial capacity."
            ]
          ],
          "source": "Section 5.2"
        },
        {
          "title": "Functional and divisional structures",
          "category": "Types of organisation structure",
          "examPrompt": "Distinguish functional and divisional structures. State when each is suitable.",
          "lead": "The choice depends on the organisation’s products, scale, range of activities and need for specialisation.",
          "items": [
            [
              "Functional structure",
              "Jobs with a similar nature or purpose are grouped into departments such as production, marketing, finance and human resources. Functional heads coordinate work in their specialised areas."
            ],
            [
              "Functional suitability",
              "This structure suits an enterprise offering a single main product or product category, especially when its scale and activities require specialised functional departments."
            ],
            [
              "Divisional structure",
              "The enterprise is divided into relatively self-contained units, commonly around products. Each division has a manager responsible for the product line and authority over its unit."
            ],
            [
              "Divisional suitability",
              "A multi-product enterprise can use divisions for distinct product lines. Each unit can focus on its own market and operating requirements while the overall organisation coordinates the divisions."
            ]
          ],
          "source": "Section 5.2"
        }
      ]
    },
    {
      "title": "Functional structure: advantages and limitations",
      "sections": [
        {
          "title": "Functional structure: advantages and limitations",
          "category": "Functional structure advantages and disadvantages",
          "examPrompt": "Explain the merits and limitations of a functional structure.",
          "lead": "Its key strength is depth of functional expertise; its main risks arise when decisions must cross departmental boundaries.",
          "items": [
            [
              "Specialisation and efficiency",
              "Grouping similar work develops expertise and encourages consistent methods within each function. Repetition and scale can lower operating costs and improve efficiency."
            ],
            [
              "Functional attention",
              "Separate departments ensure that important functions receive focused managerial attention. Specialists can keep up with methods and requirements in their area."
            ],
            [
              "Training and career development",
              "Employees work with colleagues who perform related tasks, making job learning and supervision easier. Staff can build depth in one field and see a functional career path."
            ],
            [
              "Clear functional accountability",
              "A functional head can monitor the work of their department and hold staff answerable for results within that area, supporting supervision and control."
            ],
            [
              "Cross-functional coordination difficulties",
              "Departmental heads may prioritise their own functional targets. Decisions requiring several departments can be delayed or poorly coordinated if no one integrates the whole process."
            ],
            [
              "Limited view of enterprise-wide results",
              "Employees may concentrate on their own specialism and have less exposure to other functions or the organisation’s overall performance. This can restrict broader managerial development."
            ],
            [
              "Less suited to diverse products",
              "When an enterprise has many distinct product lines, common functional departments may struggle to respond to each product’s separate needs and performance requirements."
            ]
          ],
          "source": "Section 5.2"
        }
      ]
    },
    {
      "title": "Divisional structure: advantages and limitations",
      "sections": [
        {
          "title": "Divisional structure: advantages and limitations",
          "category": "Divisional structure advantages and disadvantages",
          "examPrompt": "Explain the merits and limitations of a divisional structure.",
          "lead": "Separate product units sharpen responsibility and market focus, but may duplicate resources and create competition over the organisation’s funds.",
          "items": [
            [
              "Product accountability",
              "Each division has a manager responsible for the performance of a product line. Results can be assessed by division, making responsibility for success or failure more visible."
            ],
            [
              "Product focus",
              "A division can respond to the needs, competition and operating conditions of its product market without waiting for every decision to be resolved across central functional departments."
            ],
            [
              "Managerial development",
              "Divisional managers gain experience coordinating several functions for a product. This broad responsibility can develop people for senior leadership roles."
            ],
            [
              "Growth and flexibility",
              "An enterprise can add or adjust a product division as its product range changes. Each unit can adapt its work to the requirements of its product line."
            ],
            [
              "Duplication of resources",
              "Separate divisions may each need staff, equipment and support for similar functions. Repeating these resources can raise costs and reduce economies of scale."
            ],
            [
              "Competition between divisions",
              "Divisions may compete for investment, staff or other resources. One division may pursue its own result at the expense of the wider organisation."
            ],
            [
              "Reduced functional specialisation",
              "With functional staff spread across divisions, the organisation may not develop the same depth or consistency of specialist expertise as a central functional arrangement."
            ]
          ],
          "source": "Section 5.2"
        }
      ]
    },
    {
      "title": "Formal and informal organisation",
      "sections": [
        {
          "title": "Formal organisation: meaning and features",
          "category": "Formal organisation",
          "examPrompt": "What is a formal organisation? Explain its features.",
          "lead": "Formal relationships are deliberately established by management to organise work and make authority and responsibility clear.",
          "items": [
            [
              "Designed by management",
              "The formal structure is deliberately created by management to support the enterprise’s objectives and orderly operation."
            ],
            [
              "Based on planned objectives",
              "It translates plans into positions, rules and procedures that guide how organisational work is to be performed."
            ],
            [
              "Defined authority and responsibility",
              "It states the boundaries of authority and responsibility attached to positions, helping employees understand their duties and decision rights."
            ],
            [
              "Specified reporting links",
              "The structure identifies formal relationships between positions, including who reports to whom, which supports coordination and accountability."
            ],
            [
              "Emphasis on work",
              "Formal organisation primarily arranges work and prescribed relationships. Personal friendship and informal social ties are not its organising basis."
            ]
          ],
          "source": "Section 5.3"
        },
        {
          "title": "Informal organisation: meaning, characteristics and effects",
          "category": "Informal organisation",
          "examPrompt": "Explain informal organisation and its advantages and limitations.",
          "lead": "Informal groups arise naturally from social interaction at work. Their communication can help or hinder formal operations.",
          "items": [
            [
              "Meaning and origin",
              "Informal organisation is the network of social relationships that develops among employees through interaction, shared interests and friendship, rather than through a management-designed chart."
            ],
            [
              "No fixed chart or prescribed authority",
              "Informal groups do not depend on official positions or formally assigned reporting relationships. Their membership and influence can shift as employees interact."
            ],
            [
              "Fast communication",
              "Employees may exchange information informally more quickly than through official channels. Managers can use these relationships to understand concerns and build cooperation."
            ],
            [
              "Social support and belonging",
              "Informal groups can meet employees’ social needs, provide companionship and help newcomers feel accepted, which can support morale."
            ],
            [
              "Rumours and distortion",
              "Because informal messages may not be verified or passed accurately, rumours can spread and create anxiety or misunderstandings."
            ],
            [
              "Possible resistance or conflict",
              "A group’s norms or interests may conflict with organisational plans. Members may resist a change or exert pressure on colleagues in ways that weaken formal goals."
            ]
          ],
          "source": "Section 5.3"
        },
        {
          "title": "Formal and informal organisation: distinction",
          "category": "Formal and informal organisation",
          "examPrompt": "Distinguish between formal and informal organisation.",
          "lead": "Use these separate comparison bases when asked for differences.",
          "items": [
            [
              "Origin",
              "Formal organisation is intentionally designed by management; informal organisation emerges spontaneously from employee interaction and personal relationships."
            ],
            [
              "Basis of relationships",
              "Formal links arise from job positions, authority and assigned duties. Informal links arise from friendship, shared interests and social contact."
            ],
            [
              "Communication",
              "Formal communication follows established channels. Informal communication moves through personal contacts and does not have to follow the organisation chart."
            ],
            [
              "Stability and authority",
              "Formal roles and reporting relationships are relatively defined by the structure. Informal group membership and influence can change as relationships change."
            ],
            [
              "Purpose and effect",
              "Formal organisation is arranged to achieve planned business objectives. Informal organisation meets social needs and may either support or obstruct those objectives."
            ]
          ],
          "source": "Section 5.3"
        }
      ]
    },
    {
      "title": "Delegation: elements, principles and importance",
      "sections": [
        {
          "title": "Meaning and elements of delegation",
          "category": "Elements of delegation",
          "examPrompt": "Define delegation and explain its three elements.",
          "lead": "Delegation shares work and authority so a subordinate can act, while preserving clear duties and answerability.",
          "items": [
            [
              "Meaning of delegation",
              "Delegation is the process in which a manager assigns work to a subordinate and grants the authority needed to carry it out within stated limits. It establishes a superior–subordinate relationship."
            ],
            [
              "Authority",
              "Authority is the right attached to a position to give directions, make decisions and require compliance within its scope. It flows downward from superior to subordinate through the formal hierarchy."
            ],
            [
              "Responsibility",
              "Responsibility is the subordinate’s obligation to perform the duty assigned by the superior. The subordinate accepts responsibility for the work; it flows upward in the reporting relationship."
            ],
            [
              "Accountability",
              "Accountability is the obligation to explain and answer for the final outcome of the assigned task. It arises from responsibility and flows upward to the manager."
            ],
            [
              "Relationship among elements",
              "Authority is granted, responsibility is accepted and accountability is imposed. Authority must be adequate for the duty; otherwise the subordinate cannot reasonably deliver the required result."
            ]
          ],
          "source": "Section 5.4"
        },
        {
          "title": "Principles of delegation",
          "category": "Principles of delegation",
          "examPrompt": "State and explain the principles of delegation.",
          "lead": "These principles keep delegated work achievable and ensure that the manager retains proper answerability.",
          "items": [
            [
              "Authority commensurate with responsibility",
              "The scope of authority granted should match the duty assigned. Too little authority makes performance difficult, while authority beyond the duty can lead to misuse."
            ],
            [
              "Unity of command",
              "A subordinate should receive instructions for a task from one reporting superior. Conflicting directions from multiple managers can create confusion and make accountability unclear."
            ],
            [
              "Scalar chain",
              "Delegation should respect the formal line of authority connecting positions. This preserves orderly reporting and clarifies where instructions and reports should pass."
            ],
            [
              "Absoluteness of accountability",
              "A manager can assign duties and delegate authority but cannot transfer away final accountability for the subordinate’s performance. The manager must monitor and ensure proper discharge of work."
            ],
            [
              "Authority can be redelegated within limits",
              "A subordinate may pass some delegated authority to another person when permitted and useful. The original superior remains accountable for the result, and the scope must be controlled."
            ]
          ],
          "source": "Section 5.4"
        },
        {
          "title": "Importance of delegation",
          "category": "Importance of delegation",
          "examPrompt": "Explain the importance of delegation.",
          "lead": "Delegation improves managerial capacity and gives employees responsibility that can build skills and motivation.",
          "items": [
            [
              "Effective management",
              "When routine work is assigned to subordinates, managers gain time for higher-priority planning, coordination and policy matters. This improves their ability to manage."
            ],
            [
              "Employee development",
              "Delegated tasks give employees experience, confidence and opportunities to practise judgement. The learning can prepare them for complex work and advancement."
            ],
            [
              "Employee motivation",
              "Being trusted with responsibility can raise an employee’s confidence and sense of worth. A subordinate may feel encouraged to improve performance when their contribution matters."
            ],
            [
              "Facilitates growth",
              "As an enterprise expands, a manager cannot personally handle every task. Delegation allows more work and decisions to be handled across positions and units."
            ],
            [
              "Basis of management hierarchy",
              "Delegated authority establishes superior–subordinate relationships and helps determine the relative power attached to positions in the organisation."
            ],
            [
              "Better coordination",
              "Defined authority, duties and answerability clarify who handles each task. This reduces overlapping work and helps connect efforts across departments and levels."
            ]
          ],
          "source": "Section 5.4"
        }
      ]
    },
    {
      "title": "Decentralisation and its relationship to delegation",
      "sections": [
        {
          "title": "Meaning and degree of decentralisation",
          "category": "Decentralisation",
          "examPrompt": "What is decentralisation? Distinguish it from centralisation.",
          "lead": "Decentralisation is a management policy about how far decision-making authority is distributed across organisational levels.",
          "items": [
            [
              "Meaning",
              "Decentralisation is the systematic distribution of decision-making authority to lower levels, except for matters that need to remain at central points."
            ],
            [
              "Decisions near the work",
              "In a decentralised organisation, authority is placed closer to the point of action. Lower-level managers can decide matters within the scope set by the organisation."
            ],
            [
              "Degree, not an absolute condition",
              "Organisations are usually neither completely centralised nor completely decentralised. The degree depends on how many decisions are made below the top and how important those decisions are."
            ],
            [
              "Centralisation",
              "Centralisation retains decision-making authority at higher management levels. It can provide consistent direction, while placing more decisions and workload at the top."
            ]
          ],
          "source": "Section 5.4"
        },
        {
          "title": "Importance of decentralisation",
          "category": "Importance of decentralisation",
          "examPrompt": "Explain the importance of decentralisation.",
          "lead": "Dispersed authority can improve responsiveness and capability, while also helping senior management focus on broader decisions.",
          "items": [
            [
              "Relieves top management",
              "Lower levels handle more operating decisions, leaving top managers with time to focus on strategy, policy and significant organisation-wide issues."
            ],
            [
              "Develops initiative",
              "Subordinates have to assess local problems and propose solutions within their authority. This encourages them to take initiative instead of referring every issue upward."
            ],
            [
              "Builds future managers",
              "Lower-level managers practise decision-making and responsibility in real operating situations. The experience helps the organisation identify and develop managerial talent."
            ],
            [
              "Speeds decisions",
              "Decisions can be made by managers close to the relevant information and activity. This reduces the delays that can occur when routine matters must move up the hierarchy."
            ],
            [
              "Supports growth",
              "Autonomous departments or divisions can adapt their work and pursue results. Their capacity and productivity can contribute to expansion of the organisation."
            ],
            [
              "Improves control",
              "Results can be evaluated by level or unit, with departments held accountable for their own performance. Feedback helps identify variances and improve operations."
            ]
          ],
          "source": "Section 5.4"
        },
        {
          "title": "Delegation and decentralisation: distinction",
          "category": "Delegation and decentralisation",
          "examPrompt": "Distinguish between delegation and decentralisation.",
          "lead": "Delegation describes a manager–subordinate relationship; decentralisation is a wider organisational policy that extends decision-making downward.",
          "items": [
            [
              "Nature",
              "Delegation is the assignment of duties with authority to an individual subordinate. Decentralisation is the organisation-wide dispersal of decision-making authority among levels."
            ],
            [
              "Need or choice",
              "Delegation is necessary because a manager cannot personally perform every task. Decentralisation is a policy choice made by top management, so its extent can vary."
            ],
            [
              "Scope",
              "Delegation concerns authority shared between a superior and subordinate for assigned work. Decentralisation has a wider scope because it extends decision rights across departments and management levels."
            ],
            [
              "Control and autonomy",
              "Under delegation the superior continues to supervise the subordinate’s work and accountability remains with that superior. Decentralisation generally gives lower levels greater operating freedom within policy limits."
            ],
            [
              "Purpose",
              "Delegation helps reduce a manager’s workload and enables tasks to be completed. Decentralisation aims to increase lower-level participation and autonomy in organisational decision-making."
            ]
          ],
          "source": "Section 5.4"
        }
      ]
    }
  ],
  "6": [
    {
      "title": "Staffing: concept and importance",
      "sections": [
        {
          "title": "Meaning and scope of staffing",
          "category": "Concept of staffing",
          "examPrompt": "Define staffing and state what the function covers.",
          "lead": "Staffing fills the positions in an organisation structure by finding, developing and retaining people suited to the work.",
          "items": [
            [
              "Right person for the right job",
              "Staffing is the management function concerned with placing suitable people in the jobs created by the organisation structure. It aims to match employee capability with the requirements of each position."
            ],
            [
              "Continuous workforce function",
              "Staffing includes workforce planning, recruitment, selection, placement, orientation, training, development, performance appraisal, promotion and compensation. It continues as jobs and employee needs change."
            ],
            [
              "Responsibility of all managers",
              "Every manager has staffing responsibilities because each must make sure the people in their area can perform the work. Larger organisations also employ specialised human resource personnel."
            ],
            [
              "Human resource management",
              "As organisations grow, a human resource department may handle specialised activities such as job analysis, recruitment, compensation plans, training, employee welfare and labour relations. Managers still supervise and develop their own teams."
            ]
          ],
          "source": "Section 6.1"
        },
        {
          "title": "Importance of staffing",
          "category": "Importance of staffing",
          "examPrompt": "Explain the importance of staffing.",
          "lead": "Staffing affects whether the organisation can perform its plans through capable and motivated employees.",
          "items": [
            [
              "Obtains competent personnel",
              "A staffing process identifies and attracts people who have the qualifications and abilities needed for jobs. This helps the organisation fill important positions with suitable employees."
            ],
            [
              "Improves performance",
              "Placing an appropriate person in a suitable job enables work to be performed more effectively. Well-matched employees can improve the quality and quantity of organisational output."
            ],
            [
              "Supports survival and growth",
              "Planned staffing, including succession for managerial positions, helps ensure that key work continues when people leave, retire or move into new roles."
            ],
            [
              "Optimises human resources",
              "Workforce planning helps identify understaffing, overstaffing and skill gaps. The organisation can then recruit, transfer, train or reassign people to use its workforce appropriately."
            ],
            [
              "Improves job satisfaction and morale",
              "Objective selection and fair recognition or reward can help employees feel their capabilities and contributions are valued, supporting morale and satisfaction."
            ]
          ],
          "source": "Section 6.1"
        }
      ]
    },
    {
      "title": "Staffing process",
      "sections": [
        {
          "title": "Estimating manpower requirements",
          "category": "Process step: workforce planning",
          "examPrompt": "Explain how an organisation estimates manpower requirements.",
          "lead": "The organisation determines both the number and type of employees required, then compares that need with its available workforce.",
          "items": [
            [
              "Workload analysis",
              "Workload analysis estimates the number and types of employees required to perform jobs and meet organisational objectives. It considers the volume and nature of work to be done."
            ],
            [
              "Workforce analysis",
              "Workforce analysis assesses the number and type of employees already available inside the organisation. Comparing it with workload needs reveals shortages, surpluses or an adequate match."
            ],
            [
              "Translate needs into job specifications",
              "After identifying a staffing need, management should define the position and candidate profile, including duties, qualifications, experience, skills and other relevant attributes. This guides recruitment."
            ],
            [
              "Respond to shortages and surpluses",
              "An understaffed area may require recruitment, while an overstaffed area may need transfers or other workforce adjustments. Planning helps avoid both excessive workload and idle capacity."
            ]
          ],
          "source": "Section 6.2"
        },
        {
          "title": "Remaining steps in the staffing process",
          "category": "Process steps",
          "examPrompt": "Describe the main steps in the staffing process after manpower planning.",
          "lead": "The steps build from attracting candidates to placing, developing and rewarding selected employees.",
          "items": [
            [
              "Recruitment",
              "The organisation identifies sources of potential employees and invites suitable candidates to apply. Recruitment builds a pool from which a choice can later be made."
            ],
            [
              "Selection",
              "Applicants are assessed and the person most suitable for a specific job is chosen. Selection narrows the recruitment pool using screening, tests, interviews and other checks."
            ],
            [
              "Placement and orientation",
              "The selected person is assigned to the position and introduced to the organisation, colleagues, work setting and relevant rules. This helps the employee start work with a clear understanding."
            ],
            [
              "Training and development",
              "Training improves job-related knowledge and skill for present work; development supports broader and future growth. Both can improve employee contribution and prepare people for changing responsibilities."
            ],
            [
              "Performance appraisal",
              "Employee performance is assessed against relevant expectations. The results can identify strengths, training needs and a basis for decisions about rewards or advancement."
            ],
            [
              "Compensation",
              "The organisation provides wages, salaries and other forms of reward in return for employee work. A compensation plan should reflect the role, policy and relevant requirements."
            ],
            [
              "Promotion and career progression",
              "Employees who are ready for greater responsibility may move to higher positions. Career planning and development help the organisation fill future roles and give employees growth opportunities."
            ]
          ],
          "source": "Section 6.2"
        }
      ]
    },
    {
      "title": "Recruitment and internal sources",
      "sections": [
        {
          "title": "Meaning, objective and process of recruitment",
          "category": "Recruitment",
          "examPrompt": "Define recruitment and explain its objective and process.",
          "lead": "Recruitment searches for potential applicants and encourages them to apply; it does not itself decide who will be hired.",
          "items": [
            [
              "Meaning of recruitment",
              "Recruitment is the process of searching for prospective employees and stimulating them to apply for jobs in the organisation. It may use internal or external sources."
            ],
            [
              "Objective: create an applicant pool",
              "The objective is to identify and attract an adequate number of potential candidates with the qualifications or characteristics needed for available jobs. A larger suitable pool supports a better selection decision."
            ],
            [
              "Specify the vacancy",
              "The organisation describes the job and candidate requirements before approaching potential applicants. Accurate information helps candidates judge whether to apply and supports later assessment."
            ],
            [
              "Choose recruitment sources",
              "Management selects appropriate internal or external sources according to the job, urgency, skills required, available talent and the organisation’s recruitment policy."
            ],
            [
              "Invite applications",
              "The organisation communicates vacancies through the chosen source, such as an internal notice, advertisement or recruitment agency, and invites prospective candidates to submit applications."
            ]
          ],
          "source": "Section 6.3"
        },
        {
          "title": "Internal sources: transfers and promotions",
          "category": "Internal recruitment sources",
          "examPrompt": "Explain transfer and promotion as internal sources of recruitment.",
          "lead": "Internal recruitment fills a vacancy with a person already working in the organisation.",
          "items": [
            [
              "Transfer",
              "A transfer moves an employee to another job, department, branch or shift, generally without changing the employee’s pay or status. It can address a staffing shortage in one area using surplus capacity in another."
            ],
            [
              "Use of transfer",
              "A transfer may prevent unnecessary termination in an overstaffed unit, resolve a placement problem, or give an employee experience in different jobs. The employee must be capable of doing the new work."
            ],
            [
              "Promotion",
              "A promotion moves an employee to a higher position, usually with greater responsibility, status, facilities and pay. It recognises performance, ability or qualifications and fills a higher-level vacancy."
            ],
            [
              "Use of promotion",
              "Filling senior posts from within can reward capable employees and encourage them to develop. The organisation should use fair, known criteria so employees understand how advancement decisions are made."
            ]
          ],
          "source": "Section 6.3"
        },
        {
          "title": "Internal recruitment: merits and limitations",
          "category": "Merits and limitations of internal recruitment",
          "examPrompt": "Explain the advantages and disadvantages of internal recruitment.",
          "lead": "Internal recruitment draws on known employees but can restrict the range of applicants and organisational renewal.",
          "items": [
            [
              "Motivates existing employees",
              "A visible chance of promotion or transfer to better work may encourage staff to improve their performance and prepare for future opportunities."
            ],
            [
              "Known candidates",
              "Managers already have information about internal candidates’ work, reliability and capabilities. This can make assessment more informed and reduce uncertainty in selection."
            ],
            [
              "Less costly and quicker",
              "Internal candidates are easier to reach and may not require the same advertising, agency or screening expenditure as outside candidates. They can also need less introduction to organisational practices."
            ],
            [
              "Adjusts staffing imbalances",
              "Transfers allow the organisation to move available employees from overstaffed sections to vacancies elsewhere, helping use its current workforce more effectively."
            ],
            [
              "Restricts fresh talent",
              "Reliance on internal recruitment can reduce opportunities to bring in new skills, viewpoints and experience from outside the organisation."
            ],
            [
              "Narrows the choice",
              "The available internal pool may be small or may not include a person with the specific capabilities required, limiting the manager’s options."
            ],
            [
              "May cause resentment or a promotion chain",
              "Employees who are not selected may feel unfairly treated. A promotion can also leave a further vacancy at the lower level, requiring additional staffing decisions."
            ]
          ],
          "source": "Section 6.3"
        }
      ]
    },
    {
      "title": "External sources of recruitment",
      "sections": [
        {
          "title": "External recruitment sources",
          "category": "External recruitment sources",
          "examPrompt": "Describe commonly used external sources of recruitment.",
          "lead": "External sources widen the candidate pool and are used when suitable staff are not available internally or fresh expertise is needed.",
          "items": [
            [
              "Direct recruitment",
              "The organisation posts a vacancy notice at its premises and invites job-seekers to attend or apply. This is often used for casual vacancies in unskilled or semi-skilled work and can be inexpensive."
            ],
            [
              "Labour contractors",
              "Contractors who maintain contact with workers can supply the required number of labourers at short notice. The organisation may face disruption if the contractor leaves and workers follow."
            ],
            [
              "Casual callers and unsolicited applicants",
              "An organisation may keep details of people who apply without a vacancy being advertised. Such records can provide candidates when a suitable post opens, though their information may need updating."
            ],
            [
              "Government employment exchanges",
              "Employment exchanges connect employers with job-seekers and are often used for operative roles. In some cases, employers must notify vacancies to the relevant exchange."
            ],
            [
              "Advertisements",
              "Notices in newspapers, professional publications or electronic media can announce vacancies to a wide audience. A clear advertisement states the role and relevant candidate requirements."
            ],
            [
              "Placement agencies",
              "Placement agencies maintain candidate information and recommend suitable people to employers. They can provide broad reach and screening support, particularly when the search is extensive."
            ],
            [
              "Management consultants",
              "Consultancy firms may recruit technical, professional and managerial employees, often for middle or senior positions. Their candidate databases and search expertise can help locate specialised personnel."
            ],
            [
              "Campus recruitment",
              "Employers recruit students or recent graduates through colleges, universities, vocational schools and management institutes. This source can introduce new talent for technical, professional and managerial jobs."
            ],
            [
              "Online portals and professional networks",
              "Digital vacancy platforms and professional networks allow employers to reach applicants across locations and occupations. Applications still need screening for accuracy, fit and relevant qualifications."
            ]
          ],
          "source": "Section 6.3"
        },
        {
          "title": "External recruitment: merits and limitations",
          "category": "Merits and limitations of external recruitment",
          "examPrompt": "Explain the advantages and disadvantages of external recruitment.",
          "lead": "External sources expand choice and introduce new capability, though the process may involve greater expense and adjustment.",
          "items": [
            [
              "Wider choice",
              "A larger external pool gives the organisation access to more applicants and can improve the chance of finding a person whose profile closely fits the job."
            ],
            [
              "Fresh talent and ideas",
              "New employees can bring updated knowledge, different experience and perspectives from outside the organisation. This can help when the organisation needs new skills or a change in approach."
            ],
            [
              "Qualified and experienced candidates",
              "External sources may locate people with specialist training or substantial experience that is not currently available inside the organisation."
            ],
            [
              "Encourages internal effort",
              "The possibility of outside competition can encourage internal candidates to maintain skills and performance, though this effect depends on fair and transparent staffing practices."
            ],
            [
              "Cost and time",
              "Advertising, agency fees, screening and interviews may make external recruitment more expensive and time-consuming than filling a vacancy internally."
            ],
            [
              "Uncertain performance and adjustment",
              "The organisation has less direct evidence about an outside candidate’s performance and may need to provide induction and time to learn its procedures and culture."
            ],
            [
              "May affect existing employees",
              "Frequent external appointments, especially to senior jobs, can disappoint employees who expected advancement and may weaken their motivation or commitment."
            ]
          ],
          "source": "Section 6.3"
        }
      ]
    },
    {
      "title": "Selection process",
      "sections": [
        {
          "title": "Purpose and sequence of selection",
          "category": "Selection",
          "examPrompt": "Define selection and list the steps in the selection process.",
          "lead": "Selection identifies the candidate most likely to perform the particular job successfully from the applications generated through recruitment.",
          "items": [
            [
              "Preliminary screening",
              "Applications are first checked against basic job requirements so clearly unqualified or unsuitable applicants can be removed. This saves time and focuses assessment on plausible candidates."
            ],
            [
              "Selection tests",
              "Candidates take suitable tests to assess abilities, knowledge, interests or personal characteristics relevant to work. Tests provide structured information but should be used with other evidence."
            ],
            [
              "Employment interview",
              "An interviewer conducts a formal, detailed conversation to explore an applicant’s suitability, experience, communication and responses. Applicants may also use the interview to ask about the job."
            ],
            [
              "Reference and background checks",
              "The employer contacts references or checks relevant background information to verify an applicant’s claims and gain further evidence about past work, conduct or qualifications."
            ],
            [
              "Selection decision",
              "After reviewing the candidates who pass the assessments and checks, the organisation decides who best meets the job requirements. The decision should draw on the evidence gathered across the process."
            ],
            [
              "Medical examination",
              "Where relevant to the job, the selected candidate undergoes a medical assessment to establish fitness for the work. A job offer may follow a satisfactory result."
            ],
            [
              "Job offer",
              "The organisation offers the position to the chosen candidate, usually in writing, stating key terms and a date by which the employee should report."
            ],
            [
              "Contract of employment",
              "Once the offer is accepted, employer and employee complete the required employment documents. These may record pay, work hours, leave, responsibilities, rules, discipline and termination terms."
            ]
          ],
          "source": "Section 6.4"
        },
        {
          "title": "Selection tests",
          "category": "Types of selection tests",
          "examPrompt": "Explain the main selection tests used in employee selection.",
          "lead": "Tests help compare candidates on relevant qualities; the correct test depends on what the job requires.",
          "items": [
            [
              "Aptitude test",
              "An aptitude test measures a person’s potential to learn or develop a particular skill. It indicates capacity for future performance rather than only knowledge already acquired."
            ],
            [
              "Intelligence test",
              "An intelligence test assesses general mental ability, such as comprehension, reasoning and problem-solving. It provides an estimate of a candidate’s ability to understand and deal with new information."
            ],
            [
              "Personality test",
              "A personality test explores individual traits or behavioural tendencies that may affect work, relationships or responses to different situations. Results should be interpreted carefully alongside other selection evidence."
            ],
            [
              "Trade or proficiency test",
              "A trade test examines knowledge and practical skill in the specific work for which a person has applied. It can show whether an applicant can perform a technical or occupational task."
            ],
            [
              "Interest test",
              "An interest test identifies the activities or fields that attract a candidate. It can help assess whether the person’s preferences align with the nature of the job."
            ]
          ],
          "source": "Section 6.4"
        }
      ]
    },
    {
      "title": "Training and development",
      "sections": [
        {
          "title": "Meaning and distinction",
          "category": "Training and development",
          "examPrompt": "Distinguish between training and development.",
          "lead": "Training addresses the ability to perform work; development supports wider and longer-term growth.",
          "items": [
            [
              "Training",
              "Training is a learning process that increases knowledge and skills so an employee can perform a particular job more effectively. It is mainly job-oriented and usually focused on present requirements."
            ],
            [
              "Development",
              "Development provides learning and growth opportunities that help an employee build broader capability and prepare for future roles. It is career-oriented and continues over time."
            ],
            [
              "How they connect",
              "Training can be part of development, but development is wider than training. It includes the employee’s continuing growth, preparation and capacity to take on new responsibilities."
            ]
          ],
          "source": "Section 6.5"
        },
        {
          "title": "Benefits of training and development",
          "category": "Importance of training and development",
          "examPrompt": "Explain the benefits of training to the organisation and employees.",
          "lead": "Training can raise capability and safety while giving employees opportunities to improve performance and future earnings.",
          "items": [
            [
              "Higher productivity and quality",
              "Employees who understand methods and have the required skills can produce more work, improve quality and use materials or equipment more effectively."
            ],
            [
              "Economy in operations",
              "Better methods and fewer mistakes can reduce wastage, rework, supervision needs and operating cost. These gains can improve organisational results."
            ],
            [
              "Better managerial succession",
              "Training and development can prepare employees to take on managerial responsibilities. A ready pool of capable people helps cover vacancies and emergencies."
            ],
            [
              "Fewer accidents",
              "Instruction and practice in correct methods can reduce errors and unsafe conduct, especially where employees use equipment or handle potentially hazardous work."
            ],
            [
              "Lower absenteeism and turnover",
              "Employees who feel more capable and see development opportunities may have better morale and stronger reasons to remain. Training can also reduce absence linked to uncertainty or low confidence."
            ],
            [
              "Adapts to change",
              "Training helps employees learn new technologies, procedures or job requirements, allowing the organisation to respond more effectively when the business environment changes."
            ],
            [
              "Increased employee earnings",
              "Improved performance can make an employee eligible for higher pay, incentives or advancement, increasing earning potential."
            ],
            [
              "Improved confidence and morale",
              "Learning gives employees greater confidence in performing their jobs and can increase satisfaction when they see progress in their own capability."
            ]
          ],
          "source": "Section 6.5"
        },
        {
          "title": "Methods of training",
          "category": "On-the-job and off-the-job training methods",
          "examPrompt": "Distinguish between on-the-job and off-the-job training, and explain the methods.",
          "lead": "On-the-job methods teach while the employee works; off-the-job methods provide learning away from the actual work setting.",
          "items": [
            [
              "On-the-job training",
              "Employees learn while performing actual work in the workplace. They can practise with real tasks and receive guidance as they gain competence."
            ],
            [
              "Apprenticeship training",
              "A trainee works for a prescribed period under an experienced worker or master craftsperson. The method develops practical skill through sustained instruction and supervised practice."
            ],
            [
              "Internship training",
              "An educational institution and a business cooperate in a training programme. Students continue formal study while also working in a firm to gain practical knowledge and skill."
            ],
            [
              "Off-the-job training",
              "Employees learn away from the actual work position, often in a classroom or separate training setting. This can provide a controlled environment for instruction or practice."
            ],
            [
              "Vestibule training",
              "A separate training area is equipped with machinery, materials or conditions similar to the actual workplace. Employees practise on the equipment they will use without learning on the live production floor."
            ],
            [
              "Induction training",
              "A new employee is introduced to the organisation, colleagues, work setting, job and relevant rules. This helps the person settle into the position and may last from hours to several days."
            ]
          ],
          "source": "Section 6.5"
        }
      ]
    }
  ],
  "7": [
    {
      "title": "Directing: concept, features and importance",
      "sections": [
        {
          "title": "Meaning and elements of directing",
          "category": "Concept and elements of directing",
          "examPrompt": "Define directing and name its elements.",
          "lead": "Directing initiates action by guiding and influencing employees as they work toward organisational objectives.",
          "items": [
            [
              "Meaning of directing",
              "Directing is the management function of instructing, guiding, motivating and leading employees so they perform assigned work and contribute to organisational goals."
            ],
            [
              "Supervision as an element",
              "Supervision means overseeing and guiding employees’ efforts and use of resources to ensure that work is performed and targets are pursued."
            ],
            [
              "Motivation as an element",
              "Motivation stimulates people to act and continue their efforts toward desired goals. Managers use incentives and other approaches to encourage employee contribution."
            ],
            [
              "Leadership as an element",
              "Leadership is the process of influencing people so they willingly work toward group and organisational objectives. It depends on the relationship between leader and followers."
            ],
            [
              "Communication as an element",
              "Communication exchanges information and ideas to create shared understanding. It enables managers to give instructions, receive reports and coordinate work."
            ]
          ],
          "source": "Section 7.1"
        },
        {
          "title": "Features and importance of directing",
          "category": "Features and importance of directing",
          "examPrompt": "Explain the features and importance of directing.",
          "lead": "Directing connects plans to employee action and continues throughout the organisation’s work.",
          "items": [
            [
              "Initiates action",
              "Plans and structures do not produce results by themselves. Directing prompts employees to begin the activities needed to achieve the organisation’s objectives."
            ],
            [
              "Occurs at every management level",
              "Managers at all levels direct their immediate subordinates. Senior managers guide lower levels while supervisors give instructions and support closer to the work."
            ],
            [
              "Continuous function",
              "Directing continues as long as the organisation operates. Employees need ongoing instructions, support, motivation and feedback as work and conditions change."
            ],
            [
              "Flows through the hierarchy",
              "Direction generally begins at the top and passes down through management levels. Each manager gives guidance to subordinates and receives direction from a superior."
            ],
            [
              "Guides employees",
              "Instructions and supervision clarify what employees should do and help resolve doubts. Guidance can improve the accuracy and completion of assigned work."
            ],
            [
              "Integrates efforts",
              "Directing aligns individual and team effort with organisational goals. Employees can see how their activities connect to the wider result."
            ],
            [
              "Facilitates change",
              "Clear communication, leadership and motivation can explain why a change is needed, address employee concerns and encourage cooperation during implementation."
            ],
            [
              "Creates stability and balance",
              "Effective direction promotes cooperation and commitment across people, teams and departments. This helps maintain coordinated performance as the organisation changes."
            ]
          ],
          "source": "Section 7.1"
        }
      ]
    },
    {
      "title": "Principles of directing",
      "sections": [
        {
          "title": "Principles for effective direction",
          "category": "Principles of directing",
          "examPrompt": "State and explain principles that make directing effective.",
          "lead": "Directing works best when employees understand the objective, receive coherent instructions and have a chance to contribute.",
          "items": [
            [
              "Harmony of objectives",
              "Managers should connect individual and organisational goals so that employees can see how their work benefits both. Shared purpose encourages people to contribute to common results."
            ],
            [
              "Unity of command",
              "An employee should receive orders from one immediate superior for a particular line of work. Conflicting instructions can produce confusion, delay and difficulty assigning responsibility."
            ],
            [
              "Direct supervision",
              "A manager should maintain appropriate personal contact with employees. Direct interaction helps clarify expectations, understand difficulties and build cooperation."
            ],
            [
              "Appropriate directing technique",
              "The method of direction should suit the employee, task and situation. A new or urgent task may require close instruction, while experienced staff may work effectively with more autonomy."
            ],
            [
              "Use of motivation",
              "Managers should identify employee needs and use suitable incentives to encourage effort. Motivation makes direction more likely to result in willing, sustained work."
            ],
            [
              "Effective communication",
              "Instructions should be clear, complete and understood. Managers should also invite feedback so they can check understanding and correct problems early."
            ],
            [
              "Leadership and influence",
              "A manager should guide by earning cooperation and influencing behaviour toward group goals. Leadership helps employees accept direction and coordinate their efforts."
            ],
            [
              "Follow-through",
              "Managers should check whether directions were understood and carried out, provide feedback and correct problems. Follow-through keeps instructions connected to actual results."
            ]
          ],
          "source": "Section 7.1"
        }
      ]
    },
    {
      "title": "Supervision",
      "sections": [
        {
          "title": "Meaning, role and importance of supervision",
          "category": "Supervision",
          "examPrompt": "Explain supervision as an element of directing and describe the supervisor’s role.",
          "lead": "The supervisor connects management plans with the day-to-day performance of employees.",
          "items": [
            [
              "Meaning as an element",
              "Supervision is the guidance and oversight of employees as they perform work. It includes watching progress, helping staff and ensuring that activities support set targets."
            ],
            [
              "Managerial position",
              "A supervisor occupies a level in the management hierarchy close to operating employees. The position carries responsibility for directing and monitoring their work."
            ],
            [
              "Guides employees",
              "The supervisor explains work methods, clarifies instructions and helps employees resolve practical doubts. This guidance supports correct and timely performance."
            ],
            [
              "Monitors work and targets",
              "By checking progress and output, the supervisor can identify delays, errors or resource problems before they become larger. Monitoring helps keep work aligned with plans."
            ],
            [
              "Ensures resource use",
              "Supervisors oversee employees and available resources to promote their proper use. They can notice waste, equipment problems or mismatches between staffing and workload."
            ],
            [
              "Two-way communication link",
              "The supervisor communicates management instructions to employees and passes employee reports, suggestions and difficulties upward. This makes the supervisor a practical link between levels."
            ],
            [
              "Supports morale and discipline",
              "Regular contact allows supervisors to recognise effort, address misunderstandings and reinforce work standards. Fair treatment can support cooperation and a constructive work climate."
            ]
          ],
          "source": "Section 7.1"
        }
      ]
    },
    {
      "title": "Motivation: concept, process and Maslow’s theory",
      "sections": [
        {
          "title": "Motives, motivation and motivators",
          "category": "Concept and features of motivation",
          "examPrompt": "Define motivation and explain its features.",
          "lead": "Motivation is an internal process through which needs and incentives influence goal-directed behaviour.",
          "items": [
            [
              "Motive",
              "A motive is an inner need or drive that energises behaviour toward a goal. Hunger, security, affiliation and recognition are examples of needs that can prompt action."
            ],
            [
              "Motivation",
              "Motivation is the process of stimulating people to act and continue effort toward desired goals. In an organisation, it aims to encourage employees to contribute effectively."
            ],
            [
              "Motivator",
              "A motivator is an incentive or technique used to influence effort, such as pay, recognition, promotion or responsibility. Its effect depends on whether it matters to the employee."
            ],
            [
              "Internal feeling",
              "Motivation arises within a person from needs, desires or aspirations. A manager can offer incentives, but the employee’s internal response determines whether effort is stirred."
            ],
            [
              "Goal-directed behaviour",
              "Motivation channels behaviour toward a goal or incentive. An employee may direct effort toward better performance when the desired outcome is clear and valued."
            ],
            [
              "Positive or negative",
              "Positive motivation offers rewards such as recognition or promotion. Negative motivation relies on penalties or threats; it can prompt compliance but may harm morale if overused."
            ],
            [
              "Complex and individual",
              "People have different needs, and the same incentive may affect them differently. Managers therefore need to understand the employee and the work situation rather than assume one motivator fits all."
            ]
          ],
          "source": "Section 7.2"
        },
        {
          "title": "Motivation process and Maslow’s hierarchy",
          "category": "Maslow’s Need Hierarchy Theory",
          "examPrompt": "Explain Maslow’s hierarchy of needs and its assumptions.",
          "lead": "Maslow proposes five levels of human need, moving from basic survival toward personal fulfilment.",
          "items": [
            [
              "Need or deficiency starts the process",
              "A physiological or psychological deficiency creates a need. That need can produce a drive or behaviour directed toward reducing the deficiency or reaching a goal."
            ],
            [
              "Physiological needs",
              "Food, water, rest and shelter are basic survival needs. In a workplace, adequate salary can help employees meet these essential requirements."
            ],
            [
              "Safety and security needs",
              "People seek protection from physical or emotional harm and stability in their lives. Job security, a dependable income and retirement plans can address these needs."
            ],
            [
              "Affiliation or belonging needs",
              "People need affection, acceptance, friendship and connection. Positive relationships with colleagues and inclusion in a work group can satisfy these social needs."
            ],
            [
              "Esteem needs",
              "Esteem includes self-respect, autonomy, status, recognition and attention. Responsibility, achievement and acknowledgment at work can support an employee’s sense of worth."
            ],
            [
              "Self-actualisation needs",
              "At the highest level, people seek to use their potential and achieve personal growth and fulfilment. Challenging work, learning and opportunities to accomplish meaningful goals may help."
            ],
            [
              "Needs are hierarchical",
              "Maslow’s model arranges needs from basic to higher-level needs. The theory suggests that people generally focus on more basic needs before higher needs become prominent motivators."
            ],
            [
              "Satisfied needs lose motivating force",
              "Once a need is adequately met, it is less likely to drive behaviour. Managers should consider the next significant need rather than continue offering an incentive that no longer matters."
            ],
            [
              "Implication for managers",
              "Managers should learn which needs are important to employees and match incentives to those needs. A pay increase may address security, while recognition or responsibility may address esteem."
            ]
          ],
          "source": "Section 7.2"
        }
      ]
    },
    {
      "title": "Financial incentives",
      "sections": [
        {
          "title": "Types of financial incentives",
          "category": "Financial incentives",
          "examPrompt": "Explain the main financial incentives used to motivate employees.",
          "lead": "Financial incentives provide direct money or benefits that can be measured in monetary terms.",
          "items": [
            [
              "Pay and allowances",
              "Salary or wages provide the basic monetary reward for work. Allowances may compensate for particular expenses or conditions; regular increments and performance-linked increases can add incentive."
            ],
            [
              "Bonus",
              "A bonus is an additional payment over and above normal wages or salary. It can reward achievement or performance and give employees a financial reason to work toward a target."
            ],
            [
              "Perquisites and fringe benefits",
              "Benefits such as housing, transport, medical support or educational assistance for employees’ children add monetary value beyond basic pay and may improve security and loyalty."
            ],
            [
              "Profit sharing",
              "Employees receive a share of organisational profits. Linking reward to overall results can encourage staff to contribute to improved performance and profitability."
            ],
            [
              "Co-partnership or stock option",
              "Employees are offered company shares, sometimes at a set price below the market price. Ownership can align employee interest with the organisation’s longer-term growth."
            ],
            [
              "Productivity-linked wage incentives",
              "Pay is connected to a productivity measure, such as output or performance. Employees can increase earnings by improving the quantity or efficiency of their work."
            ],
            [
              "Retirement benefits",
              "Provident fund, pension and gratuity provide financial support after retirement. Knowing that future security is being built can also encourage employees during service."
            ]
          ],
          "source": "Section 7.2"
        }
      ]
    },
    {
      "title": "Non-financial incentives",
      "sections": [
        {
          "title": "Types of non-financial incentives",
          "category": "Non-financial incentives",
          "examPrompt": "Explain the non-financial incentives that can motivate employees.",
          "lead": "Non-financial incentives address psychological, social and emotional needs that money alone may not satisfy.",
          "items": [
            [
              "Employee recognition",
              "Congratulating good work, giving certificates or awards, publishing achievements or thanking useful suggestions signals that the organisation values an employee’s contribution."
            ],
            [
              "Job security",
              "Confidence that employment and income will continue can reduce anxiety and help employees focus on work. If security leads to complacency, managers still need clear performance expectations."
            ],
            [
              "Career advancement opportunity",
              "Training, skill development and a fair promotion policy help employees see a route to higher-level work. The prospect of growth can encourage current performance and preparation."
            ],
            [
              "Employee participation",
              "Involving employees in decisions that affect them, through committees or consultation, gives them a voice and can increase ownership of decisions and cooperation with implementation."
            ],
            [
              "Status",
              "A position’s title, authority and standing can meet esteem and social needs. Status should reflect real responsibility and contribution so it supports rather than distorts work."
            ],
            [
              "Job enrichment",
              "Enriched jobs provide greater variety, use of higher-level skills, autonomy and responsibility. Meaningful work and personal growth can make the job itself a source of motivation."
            ],
            [
              "Organisational climate",
              "The organisation’s overall characteristics—such as autonomy, recognition, employee consideration and willingness to take reasonable risks—shape behaviour. A supportive climate can encourage effort and trust."
            ],
            [
              "Employee empowerment",
              "Empowerment gives subordinates greater authority and autonomy within defined limits. Employees may feel their work matters and use their skills more fully when trusted to decide."
            ]
          ],
          "source": "Section 7.2"
        }
      ]
    },
    {
      "title": "Leadership",
      "sections": [
        {
          "title": "Meaning, features and qualities of a leader",
          "category": "Concept of leadership",
          "examPrompt": "Define leadership and identify qualities that support effective leadership.",
          "lead": "Leadership influences behaviour through relationships and encourages people to work voluntarily toward shared goals.",
          "items": [
            [
              "Meaning of leadership",
              "Leadership is the process of influencing people so they willingly strive toward organisational or group objectives. It involves interpersonal influence rather than simply issuing formal instructions."
            ],
            [
              "Ability to influence",
              "A leader can affect the behaviour and direction of other people. This influence helps coordinate actions and bring individual effort toward a shared result."
            ],
            [
              "Brings behavioural change",
              "Leadership aims to shape how followers act, encouraging behaviours that support group performance and organisational goals."
            ],
            [
              "Leader–follower relationship",
              "Leadership depends on interaction between a leader and followers. Maintaining good interpersonal relations helps a leader gain cooperation and motivate contribution."
            ],
            [
              "Continuous process",
              "Leadership is exercised as the group works, not only when a decision is announced. A leader continues to guide, coordinate and respond to people and changing circumstances."
            ],
            [
              "Communication and listening",
              "An effective leader explains goals and expectations clearly and listens to concerns or ideas. Two-way communication builds understanding and helps the leader make better decisions."
            ],
            [
              "Integrity and fairness",
              "Consistency, honesty and fair treatment help followers trust a leader. Trust makes it easier to accept direction and cooperate, especially when decisions are difficult."
            ],
            [
              "Confidence and responsibility",
              "A leader needs confidence to make decisions and willingness to accept responsibility for their consequences. Accountability supports credibility with followers."
            ]
          ],
          "source": "Section 7.3"
        },
        {
          "title": "Leadership styles",
          "category": "Autocratic, democratic and laissez-faire leadership styles",
          "examPrompt": "Compare the three main leadership styles.",
          "lead": "The styles differ chiefly in how the leader uses authority and involves subordinates in decisions.",
          "items": [
            [
              "Autocratic style",
              "The leader makes decisions centrally, sets group policies and expects subordinates to carry out instructions. Communication is often one-way; this can be useful when urgent decisions or close control are needed."
            ],
            [
              "Autocratic limitations",
              "Limited participation may reduce initiative, satisfaction and acceptance of decisions. Employees may depend on the leader and provide less feedback or creative input."
            ],
            [
              "Democratic style",
              "The leader consults subordinates, invites ideas and develops plans or policies with group acceptance. Participation can improve attitudes, cooperation and the information used in decisions."
            ],
            [
              "Democratic limitations",
              "Consultation takes time and may slow a decision when urgency is high or the group cannot reach agreement. The leader still needs to take responsibility for reaching a decision."
            ],
            [
              "Laissez-faire or free-rein style",
              "The leader gives followers substantial freedom to set their own methods and solve work problems, while remaining available to provide support, information and resources."
            ],
            [
              "Laissez-faire limitations",
              "If employees lack skill, clarity or coordination, extensive freedom can produce uncertainty, uneven effort or weak control. The style works best when followers are capable and responsible."
            ]
          ],
          "source": "Section 7.3"
        }
      ]
    },
    {
      "title": "Communication: forms and networks",
      "sections": [
        {
          "title": "Meaning and communication process",
          "category": "Concept of communication",
          "examPrompt": "Define communication and identify its elements.",
          "lead": "Communication creates shared understanding through the movement and interpretation of a message.",
          "items": [
            [
              "Meaning",
              "Communication is the exchange of information, ideas, opinions or feelings between people to create common understanding. A message has not succeeded if the receiver does not understand it."
            ],
            [
              "Sender",
              "The sender is the person who initiates communication and has an idea or information to convey."
            ],
            [
              "Message and encoding",
              "The message is the information or idea being shared. Encoding turns it into words, symbols, gestures or another form that can be sent."
            ],
            [
              "Channel or medium",
              "The channel carries the encoded message to the receiver. It may be oral, written, face-to-face, by telephone or through a digital medium."
            ],
            [
              "Receiver and decoding",
              "The receiver is the person for whom the message is intended. Decoding is the receiver’s process of interpreting the words or symbols and deriving meaning."
            ],
            [
              "Feedback",
              "Feedback is the receiver’s response or other indication that a message was received and understood. It lets the sender check whether communication worked."
            ],
            [
              "Noise",
              "Noise is anything that interferes with a message or its interpretation, such as distractions, unclear language, faulty transmission or misunderstanding."
            ]
          ],
          "source": "Section 7.4"
        },
        {
          "title": "Formal and informal communication",
          "category": "Types of communication",
          "examPrompt": "Distinguish between formal and informal communication.",
          "lead": "Communication may follow official organisational channels or arise through personal contact outside those channels.",
          "items": [
            [
              "Formal communication",
              "Formal communication follows channels established by the organisation structure. It may take place between superior and subordinate, subordinate and superior, or employees at the same level."
            ],
            [
              "Downward communication",
              "Downward communication flows from a superior to subordinates. It conveys instructions, policies, notices, expectations or information needed for work."
            ],
            [
              "Upward communication",
              "Upward communication flows from subordinates to a superior. Applications for leave, progress reports, requests and reports of operating problems are examples."
            ],
            [
              "Horizontal or lateral communication",
              "Horizontal communication occurs between people or departments at similar levels. It helps coordinate related work, such as a production manager discussing delivery schedules with marketing."
            ],
            [
              "Informal communication",
              "Informal communication takes place without following official reporting lines, often through social interaction among employees. It can move quickly but may not be recorded or verified."
            ],
            [
              "Grapevine and its patterns",
              "The informal grapevine can spread a message through different patterns: a person may pass it along a chain, tell many people, share it selectively with a close cluster, or allow it to spread by chance. These patterns can carry news quickly but can also distort it."
            ]
          ],
          "source": "Section 7.4"
        },
        {
          "title": "Communication network patterns",
          "category": "Communication networks",
          "examPrompt": "Explain common communication network patterns and their likely effects.",
          "lead": "Network structure determines who can communicate directly and how information moves through a group.",
          "items": [
            [
              "Chain network",
              "Messages pass sequentially from one person to the next along a line of authority or contact. The pattern preserves order but information may be delayed or altered as it passes through several people."
            ],
            [
              "Wheel network",
              "One central person communicates with each other member, while those members have little direct contact with one another. It supports central control and quick coordination but makes the centre a bottleneck."
            ],
            [
              "Circle network",
              "Each person communicates with nearby members in a ring. Information can move around the group, though it may take longer to reach everyone and members may have limited access to distant colleagues."
            ],
            [
              "All-channel network",
              "All members can communicate directly with one another. This supports participation and rapid exchange in a capable team, but discussion can become difficult to coordinate as the group grows."
            ],
            [
              "Choosing a network",
              "The suitable arrangement depends on task complexity, urgency, group size and need for participation. Routine work may need clear central coordination; complex problem-solving can benefit from wider information sharing."
            ]
          ],
          "source": "Section 7.4"
        }
      ]
    },
    {
      "title": "Barriers to communication and remedies",
      "sections": [
        {
          "title": "Types of barriers",
          "category": "Barriers to effective communication",
          "examPrompt": "Explain barriers that can distort or obstruct communication.",
          "lead": "Barriers can arise from language, perceptions, organisational arrangements or personal attitudes.",
          "items": [
            [
              "Poorly expressed messages",
              "Unclear vocabulary, wrong word choice or missing information can prevent a sender from conveying the intended meaning. A receiver may then act on an incomplete or incorrect instruction."
            ],
            [
              "Faulty translation",
              "When a message is translated between languages, an inaccurate translation can change its meaning. This is especially serious when employees rely on the translated version for work or safety."
            ],
            [
              "Unclarified assumptions",
              "A sender may assume the receiver understands a term, instruction or context that has not been stated. The receiver can interpret the message differently and make an avoidable mistake."
            ],
            [
              "Technical or specialised language",
              "Jargon and unfamiliar terminology can confuse recipients who do not share the sender’s expertise. The communication may be technically correct but fail to produce understanding."
            ],
            [
              "Body language and gestures",
              "Gestures, facial expressions and posture can reinforce, weaken or contradict spoken words. A mismatch can cause the receiver to distrust or misread the intended message."
            ],
            [
              "Words or symbols with several meanings",
              "A word, symbol or phrase may have different meanings for different people. Without context or clarification, the receiver may choose a meaning the sender did not intend."
            ],
            [
              "Psychological barriers",
              "Emotions, prejudice, distrust, inattention or fear can affect how a person sends or interprets information. A recipient may reject or distort a message before considering its content."
            ],
            [
              "Complex structure and long channels",
              "Many organisational levels create more points where a message can be delayed, filtered or changed. Employees may also be uncertain about the correct recipient or reporting route."
            ],
            [
              "Restrictive rules or policy",
              "Excessive procedures or a policy that discourages open communication can prevent useful information from moving upward or across departments."
            ],
            [
              "Poor communication facilities",
              "If meetings, grievance channels, digital systems or other means of communication are unavailable or unreliable, employees may not be able to share information promptly."
            ]
          ],
          "source": "Section 7.4"
        },
        {
          "title": "Measures to overcome barriers",
          "category": "Remedies for communication barriers",
          "examPrompt": "How can managers improve communication and overcome barriers?",
          "lead": "Managers should make messages clear, choose a suitable channel and check that understanding has been achieved.",
          "items": [
            [
              "Plan the message",
              "Before communicating, identify the purpose, receiver and action required. Organising ideas in a logical order reduces omissions and makes the message easier to follow."
            ],
            [
              "Use simple and precise language",
              "Choose words the receiver understands, explain technical terms and avoid ambiguous expressions. Plain language lowers the chance of multiple interpretations."
            ],
            [
              "Select the right channel",
              "Use a channel suitable for the message’s urgency, complexity and need for a record. A sensitive or complicated issue may need a conversation followed by a written summary."
            ],
            [
              "Check understanding and invite feedback",
              "Ask the receiver to restate important instructions or provide a response. Feedback reveals misunderstanding early and gives the sender a chance to clarify."
            ],
            [
              "Listen actively",
              "Give attention to the speaker, allow questions and avoid interrupting or jumping to conclusions. Listening helps identify concerns and improves the accuracy of the exchange."
            ],
            [
              "Use translation and non-verbal cues carefully",
              "Use competent translators where needed and check that translated meaning is accurate. Ensure gestures, tone and written words support rather than contradict the message."
            ],
            [
              "Encourage an open climate",
              "Managers should make it safe for employees to raise problems, ask questions and offer feedback. Open channels reduce filtering and help management learn about work conditions."
            ],
            [
              "Simplify channels and provide facilities",
              "Reduce unnecessary layers or delays, clarify reporting routes, and provide functioning meeting, complaint and communication systems. This makes information easier to transmit and receive."
            ]
          ],
          "source": "Section 7.4"
        }
      ]
    }
  ],
  "8": [
    {
      "title": "Meaning and features of controlling",
      "sections": [
        {
          "title": "Meaning and definition",
          "category": "Meaning of controlling",
          "examPrompt": "Define controlling and explain its central purpose. (2 marks)",
          "lead": "Controlling checks whether work is proceeding according to plan and helps managers correct meaningful departures.",
          "items": [
            [
              "Meaning",
              "Controlling is the managerial process of checking actual activity against planned standards, identifying important differences, finding their causes and acting so that work returns toward organisational objectives. It is not simply watching employees or punishing mistakes; it is a feedback process that guides performance and future planning.",
              "A production manager compares daily output with the plan, investigates a shortfall and adjusts staffing or equipment."
            ],
            [
              "Definition",
              "Managerial control means measuring accomplishment against standards and correcting deviations so objectives can be attained according to plans. The definition contains three linked ideas: a benchmark, evidence about actual results and a response to the gap."
            ],
            [
              "Control as a feedback loop",
              "Plans establish what should happen; measurement reveals what did happen; analysis explains why results differ; action uses that information to improve later performance. Good control therefore informs both immediate operations and the next round of planning.",
              "A late-delivery review may change dispatch procedures and the next month's delivery target."
            ]
          ]
        },
        {
          "title": "Features or characteristics of controlling",
          "category": "Features of controlling",
          "examPrompt": "Explain any four features of controlling. (4 marks)",
          "lead": "For a list question, state the characteristic and then explain what it means in management practice.",
          "items": [
            [
              "Goal-oriented function",
              "Control exists to help the organisation use its resources effectively and efficiently in pursuit of predetermined objectives. A measure that is unrelated to a meaningful objective creates activity without showing whether the organisation is succeeding."
            ],
            [
              "Pervasive function",
              "Managers at top, middle and operating levels all control work within their responsibility. The function is also relevant beyond business, including schools, hospitals and other organised institutions, because each must compare work with objectives."
            ],
            [
              "Backward-looking and forward-looking",
              "Control looks backward when it reviews completed work and identifies deviations. It looks forward when managers use the diagnosis to correct current work, prevent recurrence and improve future plans. Calling it only a post-mortem misses this corrective role."
            ],
            [
              "Continuous function",
              "Control is repeated while the organisation operates. Managers keep reviewing results rather than waiting until the end of the organisation's life or a plan's entire duration; the review interval depends on the task and how quickly action is needed."
            ],
            [
              "Links the management cycle",
              "Control does not merely close management work. Its findings return to planning: managers may retain realistic standards, revise unsuitable ones, or develop new actions in light of actual experience and changed conditions."
            ]
          ]
        }
      ]
    },
    {
      "title": "Importance of controlling",
      "sections": [
        {
          "title": "Why control matters",
          "category": "Importance of controlling",
          "examPrompt": "Explain any five points showing the importance of controlling. (5 marks)",
          "lead": "Each point shows a different organisational benefit: direction, resource use, order, motivation or better standards.",
          "items": [
            [
              "Accomplishes organisational goals",
              "Measuring progress reveals whether departments and employees are moving toward stated objectives. When a gap appears, managers can act before it grows, keeping effort on course and making the plan more likely to be achieved.",
              "If monthly sales trail the target, the firm can investigate stock-outs or ineffective promotion while there is still time to respond."
            ],
            [
              "Uses resources efficiently",
              "Comparing activity with standards can expose waste, spoilage, idle time or unnecessary cost. Corrective action can then improve the use of people, materials, machines and money, so the organisation obtains more useful output from available resources."
            ],
            [
              "Creates order and discipline",
              "Clear expectations and regular review make responsibilities visible and discourage careless or disruptive conduct. Control supports orderly work when standards are communicated fairly and consistently; it should not be treated as surveillance for its own sake."
            ],
            [
              "Improves employee motivation",
              "Employees can perform with greater confidence when they know in advance what is expected and how performance will be assessed. Specific, fair standards and timely feedback help them understand progress and where improvement is needed."
            ],
            [
              "Coordinates efforts",
              "Departmental and individual standards can be aligned with the organisation's larger objectives. This helps prevent one unit's actions from obstructing another's and makes separate contributions add up to common results.",
              "A production schedule and a sales forecast are reviewed together so neither unit commits to an incompatible quantity."
            ],
            [
              "Checks whether standards are accurate",
              "An effective control system can show that a target is unrealistic, poorly measured or no longer suited to current conditions. Managers can review the benchmark instead of repeatedly blaming employees for failing to meet a defective standard."
            ],
            [
              "Signals where management attention is needed",
              "Comparisons and reports reveal areas where results are on track and where a deviation needs diagnosis. This helps managers direct limited time and expertise toward problems that could materially affect objectives."
            ]
          ]
        }
      ]
    },
    {
      "title": "Relationship between planning and controlling",
      "sections": [
        {
          "title": "Interdependence and comparison",
          "category": "Relationship between planning and controlling",
          "examPrompt": "Explain why planning and controlling are described as inseparable or complementary functions. (4 marks)",
          "lead": "Planning provides the benchmark; control provides evidence and feedback that make plans meaningful and improvable.",
          "items": [
            [
              "Planning supplies control standards",
              "A plan states objectives and expected performance. Those targets give managers a basis for judging actual work; without predetermined expectations there is no clear reference point against which performance can be controlled."
            ],
            [
              "Control makes plans meaningful",
              "A plan cannot ensure that events unfold as expected. Control monitors implementation, detects departures and supports corrective action, so planning without control cannot reliably show whether its proposed course is being followed or achieved."
            ],
            [
              "Control improves later planning",
              "The reasons behind actual results give planners evidence about what assumptions, methods and resources worked. Managers can use that learning to retain sound plans, adjust weak ones and set more realistic standards for the next cycle."
            ],
            [
              "Planning is prescriptive; control is evaluative",
              "Planning considers conditions and selects what should be done. Control evaluates what was done and the result obtained. Both functions need each other: prescription needs evaluation, while evaluation needs a prior intention or standard."
            ],
            [
              "Both functions look in more than one direction",
              "Planning is forward-looking because it sets future action, but it also draws on past experience. Control reviews past performance, yet its corrective steps are intended to improve future results. The usual shorthand that planning only looks ahead and control only looks back is incomplete."
            ]
          ]
        }
      ]
    },
    {
      "title": "The controlling process",
      "sections": [
        {
          "title": "Five steps in sequence",
          "category": "Process of controlling",
          "examPrompt": "Describe the steps in the controlling process in their correct order. (5 marks)",
          "lead": "Keep the order intact: set standards, measure, compare, analyse and then take corrective action.",
          "items": [
            [
              "1. Set performance standards",
              "Standards express the results expected from work and should connect to organisational objectives. They may concern quantity, quality, time, cost or another relevant outcome. A useful standard is stated clearly enough for those responsible to understand what counts as acceptable performance.",
              "A workshop sets a target of 250 acceptable units per worker per day and defines the required quality level."
            ],
            [
              "2. Measure actual performance",
              "Managers collect evidence about what has actually happened through reports, records, observation or other suitable measures. Measurement should use information that matches the standard and arrive early enough for a useful response; the timing depends on the activity being controlled.",
              "Daily production records are compared on a consistent per-worker basis with a daily target."
            ],
            [
              "3. Compare actual results with the standard",
              "The manager places measured performance beside the target and identifies the size and direction of any difference. A comparison makes it possible to say whether results meet, exceed or fall below expectations; it should not confuse a numerical difference with its cause.",
              "A result of 205 units against a 250-unit standard is 45 units below target."
            ],
            [
              "4. Analyse deviations",
              "Managers determine which differences matter and investigate why they occurred before choosing a response. Causes may include weak or unrealistic standards, defective materials or methods, unsuitable machinery, inadequate resources, organisational constraints or external conditions. Several causes may operate together.",
              "A shortfall could reflect a machine fault, a change in material quality, insufficient training or an unrealistic target."
            ],
            [
              "5. Take corrective action",
              "When analysis shows an important deviation that can be addressed, managers select action aimed at its cause and check whether the action works. This might mean training, repairing or replacing equipment, modifying a process, adding resources or changing working conditions. If the benchmark itself is no longer reasonable, revise it; no major action is needed for every small difference.",
              "A machine breakdown may call for repair; a skill gap may call for training rather than a new production target."
            ]
          ]
        },
        {
          "title": "How to analyse and respond to deviations",
          "category": "Analysis of deviations and corrective action",
          "examPrompt": "Why should managers analyse a deviation before taking corrective action? Give examples. (3 marks)",
          "lead": "The same shortfall can have different causes, so the remedy should fit the diagnosis.",
          "items": [
            [
              "Separate the gap from its cause",
              "A deviation tells the manager that actual performance differs from the standard; it does not explain why. Acting on the number alone can waste resources or make performance worse. Investigate the process, people, inputs and conditions before selecting a corrective step."
            ],
            [
              "Match correction to the diagnosed cause",
              "If material is defective, change or check the specification; if a machine is broken, repair or replace it; if equipment is obsolete, consider upgrading it; if a process is defective, redesign the method; if workplace conditions impede work, improve those conditions."
            ],
            [
              "Revise a defective standard when necessary",
              "Some gaps persist because an assumption or target no longer fits the task or environment. Where management action cannot reasonably close the gap, review the standard itself. Revision should follow evidence and analysis rather than become a routine way to excuse poor performance."
            ],
            [
              "Follow up after action",
              "Corrective action should be checked against subsequent results. Follow-up tells managers whether the identified cause was accurate and whether the adjustment restored performance; if the gap remains, more diagnosis may be needed."
            ]
          ]
        }
      ]
    },
    {
      "title": "Management by exception and critical point control",
      "sections": [
        {
          "title": "Selecting what deserves attention",
          "category": "Management by exception and critical point control",
          "examPrompt": "Distinguish management by exception from critical point control and state their advantages. (4 marks)",
          "lead": "Both focus attention, but one filters by the size of a deviation while the other selects strategically important areas.",
          "items": [
            [
              "Management by exception",
              "Management by exception, or control by exception, reports deviations that exceed an accepted tolerance instead of escalating every minor variation. Routine differences within the permitted range can be handled at the appropriate operating level, while material departures reach managers who can respond.",
              "If a small variation in postage is within tolerance, it need not displace attention from a major labour-cost overrun."
            ],
            [
              "Critical point control",
              "Critical point control concentrates monitoring on key result areas where failure would materially damage organisational success. Managers cannot examine every activity with equal intensity, so they identify the points where a problem would have the greatest consequences."
            ],
            [
              "How to use the two together",
              "First select important results that warrant close attention; then set a meaningful tolerance for each and escalate a deviation when it crosses that boundary. This combines strategic importance with a practical threshold for action."
            ],
            [
              "Advantage: saves managerial time",
              "Managers can avoid spending their attention on every routine fluctuation and focus on exceptions that may require a decision. This is especially useful where many activities generate more data than senior managers can individually review."
            ],
            [
              "Advantage: improves focus and delegation",
              "Employees can address ordinary matters within their assigned authority while managers concentrate on significant problems. This supports delegation and lets management expertise be used on issues where it adds greater value."
            ],
            [
              "Advantage: supports timely action",
              "When a critical deviation is recognised and reported promptly, managers have a better chance of preventing it from growing into a serious failure. The technique is useful only when critical areas and reporting thresholds are chosen well."
            ]
          ]
        }
      ]
    },
    {
      "title": "Standards, measurement and key result areas",
      "sections": [
        {
          "title": "Choosing evidence that fits the standard",
          "category": "Performance standards and measurement",
          "examPrompt": "Explain how performance should be measured and what is meant by a key result area. (4 marks)",
          "lead": "Measure in a way that matches the standard, gives useful evidence and reaches managers early enough to act.",
          "items": [
            [
              "Performance standard",
              "A performance standard is a predetermined benchmark that states the expected accomplishment. Standards may describe quantity, quality, time, cost or another result. They provide the comparison point for control, so they should be communicated and expressed in terms relevant to the work being assessed."
            ],
            [
              "Quantitative and comparable measures",
              "Where possible, set and measure performance in the same units. A numerical output target can be compared directly with units produced, while a quality standard requires suitable quality evidence. Clear measures make the size of a deviation easier to see and discuss."
            ],
            [
              "Personal observation and reports",
              "A manager may observe work directly or use reports prepared by a supervisor or operating system. The method should be objective and suitable for the activity; for example, production output may be counted while service progress may require observation and records."
            ],
            [
              "Ratios and sample checking",
              "Accounting ratios such as gross profit, net profit or return on investment can help assess financial results at set intervals. In quality control, checking a representative sample may be more practical than inspecting every unit in a large operation; the sample should still provide useful evidence."
            ],
            [
              "Measure during performance where feasible",
              "If information can be collected while the task is underway, problems may be caught before they affect later stages or the final result. For example, checking a component before assembly can prevent a defect from being built into a completed product."
            ],
            [
              "Key result area",
              "A key result area is an area of performance that is critical to organisational success and therefore deserves focused attention. Since it is neither economical nor practical to control every activity equally, managers identify the few results where failure would cause serious consequences."
            ],
            [
              "Match measures to the function",
              "The measure should reflect the work: production may use output, quality and cost; marketing may use sales, selling expense or advertising expenditure; finance may monitor capital, inventory or liquidity; and human resources may track job performance or labour turnover."
            ]
          ]
        }
      ]
    }
  ],
  "11": [
    {
      "title": "Meaning, scope and core features of marketing",
      "sections": [
        {
          "title": "Meaning and scope",
          "category": "Meaning of marketing",
          "examPrompt": "Explain the meaning and scope of marketing. (3 marks)",
          "lead": "Marketing coordinates the offer, value, exchange and customer communication; it is broader than selling a finished product.",
          "items": [
            [
              "Meaning",
              "Marketing is the process through which an organisation understands needs, develops an offer that can satisfy them, makes that offer available and communicates its value so voluntary exchange can occur. It begins before production decisions and continues after purchase through service and customer relationships.",
              "A refrigerator company researches household needs, designs suitable models, sets prices, distributes them and provides repair support."
            ],
            [
              "Scope beyond physical goods",
              "An offer may be a good, service, idea, person, place, organisation or experience. Marketing is therefore relevant to commercial and non-profit organisations alike; a school, hospital or public campaign may use marketing to reach people and support its purpose."
            ],
            [
              "Needs and wants",
              "A need is a felt state of deprivation, such as hunger or a need for safety. A want is the culturally or personally shaped form a person chooses to satisfy that need. Marketers study both: a product should answer an underlying need while fitting the wants of its target customers.",
              "The need is food; the want may be rice and lentils or bread and soup, shaped by preference and culture."
            ],
            [
              "Market offering",
              "A market offering is the complete proposition presented to a buyer: product or service, quality, design, quantity, price, access point and supporting features. It should be designed after studying what likely buyers value, rather than assembled only from what the producer can make."
            ],
            [
              "Customer value",
              "Customers compare the benefits they expect with the price and other sacrifices of obtaining an offer. Marketing seeks to create value that makes the offer preferable to alternatives while allowing the organisation to meet its own objectives. A low price alone is not value if the product fails to solve the customer's problem."
            ],
            [
              "Exchange mechanism",
              "Exchange is the voluntary transfer through which parties obtain something they value by offering something in return, usually money for a product or service. Exchange is central to marketing, but it requires communication, delivery and a genuine willingness to accept the other party's offer."
            ],
            [
              "Conditions for exchange",
              "At least two parties must be involved; each must possess something of value for the other; each must be able to communicate and deliver what is offered; each must be free to accept or reject; and both must be willing to enter the transaction voluntarily. If one condition fails, a meaningful exchange may not occur."
            ]
          ]
        },
        {
          "title": "Marketing is more than selling",
          "category": "Features of marketing",
          "examPrompt": "Why is marketing not merely a post-production selling activity? (3 marks)",
          "lead": "Marketing decisions influence what is produced, for whom, at what value and how customers are supported.",
          "items": [
            [
              "Customer need is the starting point",
              "The marketer identifies the needs and wants of a target group and uses that understanding to shape an appropriate offer. Production and selling decisions then support the value promised to that group, instead of forcing a standard product onto customers regardless of their needs."
            ],
            [
              "Marketing starts before production",
              "Research, planning, product design and decisions about quality, price, brand and packaging can occur before a product is manufactured. These choices affect whether the product fits the intended market, so marketing cannot be reduced to activity that begins only after production ends."
            ],
            [
              "Marketing continues after sale",
              "Distribution, delivery, complaint handling, maintenance, spare parts and other customer support can affect satisfaction after a transaction. These services can encourage repeat purchases and loyalty; a sale is not the only moment at which a firm creates or loses customer value."
            ],
            [
              "Marketing coordinates several functions",
              "A successful offer requires a coherent combination of product, price, place or physical distribution, and promotion. An appealing product may fail if its price is unsuitable, customers cannot find it, or they do not understand what it offers."
            ],
            [
              "Marketing applies outside for-profit firms",
              "Schools, hospitals, social organisations and public causes can use research, communication and service design to connect with the people they serve. Their objective may be education, health or social change rather than profit, but they still need to understand and reach an audience."
            ]
          ]
        }
      ]
    },
    {
      "title": "Marketing management philosophies",
      "sections": [
        {
          "title": "Five philosophies and their case clues",
          "category": "Marketing management philosophies",
          "examPrompt": "Explain the five marketing management philosophies and distinguish their focus. (5 marks)",
          "lead": "Identify what the firm starts with and what it believes will produce success: output, product quality, aggressive sales, customer needs or society's welfare.",
          "items": [
            [
              "Production concept",
              "The firm focuses on large-scale, efficient production and wide availability at an affordable price. It assumes buyers favour goods that can be obtained easily and cheaply. This approach can suit a market with unmet demand, but it risks overlooking changes in customer needs when production capacity becomes the main concern.",
              "A basic-goods producer expands output and distribution because the local market has shortages."
            ],
            [
              "Product concept",
              "The firm emphasises product quality, performance and features, assuming that customers will prefer a superior product. Continuous improvement can be valuable, but product excellence alone does not guarantee success if the firm ignores price, convenience, customer needs or competing solutions; this risk is often described as marketing myopia."
            ],
            [
              "Selling concept",
              "The firm assumes buyers will not purchase enough unless the organisation undertakes strong selling and promotional effort. Its focus is persuading people to buy existing output, often through sales campaigns. This may generate transactions in the short term, but it does not necessarily create lasting satisfaction or repeat business."
            ],
            [
              "Marketing concept",
              "The firm begins with the needs of a chosen target market and coordinates its activities to satisfy those needs better than alternatives. Customer satisfaction is the route to organisational objectives and long-run profit. The question shifts from how to sell what the factory made to what customers need and how to serve them effectively."
            ],
            [
              "Societal marketing concept",
              "The firm seeks to satisfy target customers and meet organisational goals while also protecting consumers' and society's long-term welfare. It considers whether an offer or business practice is socially responsible, rather than treating immediate demand and current profit as the only tests of success.",
              "A food company offers a product customers want while reducing harmful packaging and supporting responsible sourcing."
            ],
            [
              "Fast case distinction",
              "A case about output, economies and availability signals production; superior features signal product; pressure to buy signals selling; research-led satisfaction signals marketing; and customer satisfaction joined with long-term social welfare signals societal marketing. State the clue that supports the label to earn application credit."
            ]
          ]
        }
      ]
    },
    {
      "title": "Functions of marketing",
      "sections": [
        {
          "title": "Research, planning and offer creation",
          "category": "Functions of marketing",
          "examPrompt": "Explain the first six functions performed by marketing. (6 marks)",
          "lead": "Marketing includes analytical work and decisions that build a consistent product offer, not only promotional activity.",
          "items": [
            [
              "1. Gather and analyse market information",
              "The firm collects and interprets information about customer needs, market trends, competitors and opportunities. Analysis helps managers judge whether a market is attractive and whether the organisation has strengths and resources suited to it. It also helps identify threats and weaknesses before important commitments are made.",
              "Customer research may reveal rising demand for mobile payments and whether the firm has the technology to serve it."
            ],
            [
              "2. Develop marketing plans",
              "A marketing plan translates objectives into coordinated decisions about production, product, price, promotion and availability. It identifies actions and resources needed to meet targets such as increasing market share. A target without a plan for supply and communication is unlikely to be achieved consistently."
            ],
            [
              "3. Design and develop products",
              "Product design shapes features, performance and appearance to make an offer useful and attractive to its target customers. Development can improve use, quality or competitive position. The design should respond to customer benefits rather than adding features merely because the producer can manufacture them."
            ],
            [
              "4. Standardise and grade",
              "Standardisation produces goods to predetermined specifications so output is consistent and buyers can rely on a stated level of quality. Grading sorts output into groups based on qualities such as size or quality. Grading is especially useful for agricultural output that varies naturally rather than being manufactured to identical specifications.",
              "Wheat may be graded by quality, while a packaged component is manufactured to one declared specification."
            ],
            [
              "5. Package and label",
              "Packaging designs the container or wrapper that holds and protects the product, while the label presents identifying and product information. The package can support storage, handling and promotion; the label helps customers recognise a product and understand details such as contents, quantity, price, use or warnings."
            ],
            [
              "6. Brand products",
              "Branding names or marks an offer so customers can identify it and distinguish it from competing offers. Branding supports recognition and can contribute to loyalty and perceived value. Firms decide whether to use generic naming, separate brands for different products, or a common name across a product range."
            ]
          ]
        },
        {
          "title": "Price, communication and delivery functions",
          "category": "Functions of marketing",
          "examPrompt": "Explain the remaining important functions of marketing. (6 marks)",
          "lead": "The offer must be priced, communicated, physically available and supported throughout the customer relationship.",
          "items": [
            [
              "7. Set product prices",
              "Pricing determines the amount a buyer gives in exchange for an offer. The marketer considers costs, demand, competition, objectives and regulation, then decides the price, discounts and credit terms. Price affects whether buyers purchase and whether the firm can earn revenue sufficient to meet its objectives."
            ],
            [
              "8. Promote the offer",
              "Promotion informs potential customers about an offer and persuades them to consider or purchase it. Advertising, personal selling, sales promotion and public relations are combined into a promotion mix. The mix depends on the product, market, communication objective and available budget."
            ],
            [
              "9. Manage physical distribution",
              "Physical distribution makes the offer available to target customers by selecting suitable channels and arranging the physical movement of products. It includes order processing, inventory decisions, storage and transportation. Marketing promises lose value if a customer wants to buy but the product is unavailable at the right place or time."
            ],
            [
              "10. Arrange transportation",
              "Transportation moves goods or raw materials from production or storage to a point of sale or use. It creates place utility by making goods physically accessible to geographically separated customers. Mode and route decisions should account for the product, cost and location of the target market."
            ],
            [
              "11. Store or warehouse goods",
              "Warehousing stores and sorts products so a business can maintain a smooth flow when production and demand occur at different times. It can guard against seasonal variation or delays, but extra locations and stock increase cost. The marketer balances availability and service against storage expense."
            ],
            [
              "12. Provide customer support services",
              "After-sales service, complaint handling, maintenance, technical assistance and spare-parts access help customers use a product and resolve difficulties. Good support can increase satisfaction, repeat purchases and brand loyalty, particularly for durable goods and services whose value continues after the purchase."
            ]
          ]
        }
      ]
    },
    {
      "title": "Marketing mix: the four Ps",
      "sections": [
        {
          "title": "Elements and coordination",
          "category": "Elements of the marketing mix",
          "examPrompt": "Explain the four elements of the marketing mix with a decision under each. (4 marks)",
          "lead": "The marketing mix is the coordinated set of tools a firm uses to pursue its objectives in a target market.",
          "items": [
            [
              "Product",
              "Product is a good, service or other offer that provides value and is presented to meet a need or want. Product decisions include the core benefits, quality, features, design, brand, packaging, labelling, warranty and customer services. Customers evaluate the full offer, not only its physical object.",
              "A phone offer includes the device, operating features, warranty, repair access and brand reputation."
            ],
            [
              "Price",
              "Price is the money paid by the buyer or received by the seller in exchange for a product or service. It affects demand, revenue and profit, and includes related decisions such as discounts, credit terms and pricing strategy. A price should fit customer value, costs and the competitive setting."
            ],
            [
              "Place or physical distribution",
              "Place comprises channel and availability decisions that make the product accessible to the target buyer. The firm selects intermediaries and manages order processing, inventory, warehousing and transportation. The objective is to offer the right product where and when customers can obtain it."
            ],
            [
              "Promotion",
              "Promotion communicates a product's availability, features and benefits and persuades customers to consider buying it. The firm chooses a mix of advertising, personal selling, sales promotion and public relations. Effective promotion makes a credible offer understood; it cannot permanently compensate for a product that fails customer needs."
            ],
            [
              "Mix must fit together",
              "The four elements should support one another and the chosen customer group. A premium product with costly features may require a different price, sales channel and communication style from an everyday low-cost offer. Inconsistent decisions can confuse customers or undermine the value promised."
            ]
          ]
        }
      ]
    },
    {
      "title": "Product decisions: brand, package, label, standard and grade",
      "sections": [
        {
          "title": "What a product means to a customer",
          "category": "Product decisions",
          "examPrompt": "Explain why a product is described as a bundle of benefits. (3 marks)",
          "lead": "A customer's product is the value and experience received, including tangible qualities and supporting services.",
          "items": [
            [
              "Tangible and intangible attributes",
              "A product may include physical qualities such as ingredients, materials, size and performance together with intangible features such as reputation, warranty, convenience and service. Customers assess this combination when deciding whether the offer satisfies a need."
            ],
            [
              "Functional benefit",
              "A functional benefit is the practical result the offer provides, such as transport, cleaning, storage or communication. Product planning should make this job clear and deliver it dependably; a customer may reject an attractive brand if its basic function fails."
            ],
            [
              "Psychological and social benefits",
              "An offer may also provide confidence, prestige, enjoyment or a sense of belonging to a group. These benefits help explain why customers compare products with similar practical performance differently. Marketing should understand such benefits without mistaking image alone for useful value.",
              "A motorcycle provides transport and may also convey identity or social status to its owner."
            ],
            [
              "Extended offer",
              "Warranty, complaint handling, spare parts, maintenance and after-sales service extend the offer beyond the physical item. These elements matter especially for durable products because customers may need assistance throughout their period of use. Include them when explaining product decisions in a case."
            ]
          ]
        },
        {
          "title": "Branding and its terms",
          "category": "Branding",
          "examPrompt": "Define branding and distinguish brand, brand name, brand mark and trademark. (4 marks)",
          "lead": "A brand gives an offer a recognisable identity and a way to stand apart from competitors.",
          "items": [
            [
              "Branding",
              "Branding is the process of giving a product a name, sign, symbol or design that helps customers recognise it. A brand can distinguish a seller's offer from competing products and support identification, preference and loyalty."
            ],
            [
              "Brand",
              "A brand is the full identifying identity used for a product or service, which may combine a name, term, sign, symbol, design or other distinguishing features. It helps connect a customer's experience and expectations with a particular seller's offer."
            ],
            [
              "Brand name",
              "The brand name is the spoken or written verbal part that customers can say, read or search. A memorable name makes it easier to request or recommend the offer, though it still needs a product and experience that justify customer trust."
            ],
            [
              "Brand mark",
              "A brand mark is the recognisable but non-verbal part of the brand, such as a symbol, design, lettering or colour arrangement. It helps customers identify the offer visually, including when the name is not the main feature they notice."
            ],
            [
              "Trademark",
              "A trademark is a brand or part of a brand that receives legal protection against unauthorised use. Registration gives the firm the exclusive right to use that protected identity in the relevant jurisdiction, helping defend its distinctiveness."
            ],
            [
              "Brand strategy decision",
              "A firm decides whether products should use generic names or branded names, whether each product receives its own identity, or whether a common name is extended across products. The choice affects recognition and how the reputation of one product may influence another."
            ]
          ]
        },
        {
          "title": "Packaging, labelling, standardisation and grading",
          "category": "Packaging and labelling",
          "examPrompt": "Explain the levels and functions of packaging and distinguish standardisation from grading. (5 marks)",
          "lead": "Packaging protects and presents the product; labelling communicates information; standards and grades signal consistency or category.",
          "items": [
            [
              "Packaging",
              "Packaging is designing and producing the container or wrapper that holds a product. It can protect the product, help with storage and handling, support transport and display, and communicate an identity that attracts customer attention. Packaging decisions therefore have both practical and marketing effects."
            ],
            [
              "Primary package",
              "The primary package directly contains the product. It may remain in use throughout consumption or be discarded when the product is opened. It must suit the product, protect it and make normal handling or use practical.",
              "The tube that directly contains toothpaste is its primary package."
            ],
            [
              "Secondary package",
              "A secondary package adds another layer around one or more primary packages, providing protection or display until the customer is ready to use the product. It can be removed while the primary container remains in use.",
              "A cardboard box around a shaving-cream tube is secondary packaging."
            ],
            [
              "Transportation package",
              "Transportation packaging groups or protects products for storage, identification and movement through distribution. It is designed for handling larger quantities and delivery rather than direct consumer use.",
              "A corrugated carton carrying many retail boxes is a transportation package."
            ],
            [
              "Packaging benefits",
              "Appropriate packaging reduces damage and contamination, supports convenient handling and storage, communicates brand identity and can provide information at the point of purchase. Because buyers may judge quality partly from presentation, design can affect their expectations as well as protect the goods."
            ],
            [
              "Labelling",
              "Labelling designs the tag or graphic attached to or printed on a package. It can identify the brand and product, explain contents or quantity, provide price and maker details, give instructions and warnings, and state dates or standards where required. Clear labels help informed decisions and safer use."
            ],
            [
              "Standardisation",
              "Standardisation means producing goods to predetermined specifications. Consistency reassures buyers about the expected quality or other declared characteristics and reduces the need for each buyer to inspect every unit. It is useful when output can be made to a common specification."
            ],
            [
              "Grading",
              "Grading classifies products into groups based on characteristics such as quality, size or another relevant feature. It is particularly useful when natural variation means products cannot all be made identical, as with agricultural goods. Buyers can choose a grade and sellers can distinguish higher-quality output."
            ]
          ]
        }
      ]
    },
    {
      "title": "Price: meaning, decisions and price determination",
      "sections": [
        {
          "title": "Meaning and decisions",
          "category": "Pricing",
          "examPrompt": "Explain the importance of price and name key pricing decisions. (3 marks)",
          "lead": "Price is the monetary exchange for the offer and affects both customer demand and the firm's revenue.",
          "items": [
            [
              "Meaning of price",
              "Price is the amount of money paid by the buyer, or received by the seller, for a good or service. It represents what customers exchange for the benefits of having or using an offer, and it is the only marketing-mix element that directly generates sales revenue."
            ],
            [
              "Pricing decisions",
              "Managers set pricing objectives, choose a strategy, analyse price factors, set the amount and decide on discounts, trade allowances or credit terms. These decisions need to be coordinated with the product's positioning and distribution and with the value customers believe they will receive."
            ],
            [
              "Penetration pricing",
              "A firm sets a relatively low introductory price to attract a broad customer base and build market share. The strategy may suit an organisation seeking quick adoption, but it should consider whether costs can be covered as volume grows and how customers may react to later price changes."
            ],
            [
              "Skimming pricing",
              "A firm introduces a product at a relatively high price to earn more from buyers willing to pay for novelty, quality or distinctiveness, then may adjust as the market develops. A high price needs a convincing offer and may limit the number of early buyers."
            ]
          ]
        },
        {
          "title": "Factors affecting price determination",
          "category": "Factors affecting price",
          "examPrompt": "Explain any four factors affecting the determination of a product's price. (4 marks)",
          "lead": "A complete case answer names the factor and links it to whether it creates a lower boundary, upper boundary or strategic choice.",
          "items": [
            [
              "1. Product cost",
              "Production, distribution and selling costs establish a lower boundary for a sustainable price. Fixed costs remain broadly unchanged with output in the short run; variable costs move with activity; semi-variable costs combine fixed and variable elements. A firm may temporarily price below full cost when launching or entering a market, but cannot survive indefinitely without covering costs.",
              "Rent is fixed, material used per unit is variable and salary plus sales commission is semi-variable."
            ],
            [
              "2. Utility and demand",
              "The benefits customers receive and their willingness to pay influence the upper price boundary. Under the law of demand, a higher price generally reduces quantity demanded, though the response depends on price elasticity. Inelastic demand can allow a higher price; elastic demand makes buyers more responsive, so a smaller price increase may reduce sales substantially."
            ],
            [
              "3. Competition",
              "The number and strength of alternatives affect how freely a firm can set its price. With limited competition, a seller may have more room toward the upper boundary; in a highly competitive market, customers can switch, placing pressure on the price. Compare rival prices, quality and features, not just a rival's number."
            ],
            [
              "4. Pricing objectives",
              "The intended result shapes the price decision. A short-run profit objective may support a high margin; market-share leadership may favour a lower price to attract buyers; survival amid intense competition may require discounts; and a quality-leadership position may use a higher price to support costly quality or research."
            ],
            [
              "5. Government and legal regulation",
              "Government may regulate prices to protect the public, particularly where a product is essential or market power could permit excessive charges. Managers must consider applicable rules when setting a lawful price; a customer's willingness to pay does not remove the role of regulation."
            ],
            [
              "6. Marketing methods used",
              "Distribution, promotion, packaging, sales effort, credit facilities, delivery and customer service all influence the total offer and its cost. Distinctive service or convenient home delivery may support a higher price, while a low-cost distribution system may support a lower one, if buyers see corresponding value."
            ]
          ]
        }
      ]
    },
    {
      "title": "Place: channels and physical distribution",
      "sections": [
        {
          "title": "Channels of distribution",
          "category": "Channels of distribution",
          "examPrompt": "Distinguish direct and indirect channels and explain common channel levels. (4 marks)",
          "lead": "A channel is the route through which a product passes from its producer to the customer, directly or through intermediaries.",
          "items": [
            [
              "Direct or zero-level channel",
              "The manufacturer sells directly to the customer without a wholesaler, retailer or agent in between. The producer maintains direct contact and control over the selling experience, but must arrange customer reach, sales and delivery itself.",
              "A company sells through its own website, outlets, mail order or sales force."
            ],
            [
              "One-level indirect channel",
              "One intermediary, usually a retailer, stands between the manufacturer and final customer. Retailers can display products and serve local buyers, while the manufacturer avoids managing every retail transaction directly."
            ],
            [
              "Two-level indirect channel",
              "A wholesaler and retailer connect the manufacturer to the consumer. The wholesaler buys or aggregates larger quantities and supplies retailers, helping the producer reach many selling points; this route is common for numerous consumer goods."
            ],
            [
              "Three-level indirect channel",
              "An agent, wholesaler and retailer take part between the manufacturer and consumer. Agents connect producers to wholesalers and can help a manufacturer with a limited product line cover a wide market without building its own network everywhere."
            ],
            [
              "Choosing an appropriate route",
              "Channel length changes reach, control, cost and the producer's contact with customers. A case answer should identify the intermediaries named and explain why the route fits the market; do not call any indirect route direct merely because a producer also helps sell the goods."
            ]
          ]
        },
        {
          "title": "Components of physical distribution",
          "category": "Components of physical distribution",
          "examPrompt": "Explain the components of physical distribution and the service-cost trade-off. (5 marks)",
          "lead": "The physical movement of goods depends on accurate orders, transport, storage, handling and suitable stock levels.",
          "items": [
            [
              "Physical distribution",
              "Physical distribution covers decisions and activities that make goods physically available from the place of production to the place of customer use. It involves channel choices and the movement of products, so a well-designed product cannot earn a sale if it is missing when and where a customer wants it."
            ],
            [
              "Order processing",
              "Order processing receives, checks and fulfils customer requests accurately and quickly. Errors in quantity, specification or timing create dissatisfaction, extra cost and possible loss of goodwill. The process is the operational link between an order being placed and goods being dispatched correctly."
            ],
            [
              "Transportation",
              "Transportation carries goods and raw materials between production, storage and selling locations. It creates place utility and makes completion of a sale possible. The firm considers the nature of the goods, transport cost, distance and location of its target market when choosing a mode and route."
            ],
            [
              "Warehousing",
              "Warehousing stores and sorts products to maintain a steady flow when production or procurement and demand do not occur at the same time. It can protect against seasonal demand and delivery delays, and creates time utility by holding goods until customers need them."
            ],
            [
              "Inventory control",
              "Inventory control determines how much stock should be held and replenished. Higher inventory can improve product availability and customer service, but ties up capital and increases carrying costs. The manager balances the risk of shortages against the cost of excess stock."
            ],
            [
              "Service-cost balance",
              "More warehouses or higher stock can shorten delivery times and improve availability, but raise storage, handling and inventory costs. A sound system compares those costs with the level of customer service the market expects and chooses a level that supports the firm's objectives."
            ]
          ]
        }
      ]
    },
    {
      "title": "Promotion mix and communication tools",
      "sections": [
        {
          "title": "Promotion mix",
          "category": "Promotion mix",
          "examPrompt": "Define promotion mix and name factors that influence its composition. (3 marks)",
          "lead": "The promotion mix combines communication tools to inform customers and persuade them to consider an offer.",
          "items": [
            [
              "Meaning",
              "Promotion uses communication to tell potential customers about a product's availability, features and benefits and to persuade them to buy. The promotion mix is the combination of advertising, personal selling, sales promotion and public relations used to meet communication objectives."
            ],
            [
              "Choose the mix to fit the situation",
              "A firm considers the nature of the market, product, communication objective and available budget. A mass-market everyday product may rely heavily on advertising, while an industrial product with few specialised buyers may require personal selling. The tools can support one another rather than being mutually exclusive."
            ]
          ]
        },
        {
          "title": "Advertising",
          "category": "Features of advertising",
          "examPrompt": "Explain the features, merits and limitations of advertising. (5 marks)",
          "lead": "Advertising is paid, impersonal communication from an identified sponsor, usually delivered through media to a wide audience.",
          "items": [
            [
              "Paid form",
              "The sponsor pays for space, time or another advertising placement. The cost is borne by the organisation seeking to communicate, so advertising is different from unpaid public attention or a salesperson's direct conversation."
            ],
            [
              "Impersonal communication",
              "Advertising does not involve a direct face-to-face exchange with each potential buyer. It can deliver a standard message to many people, but generally creates a one-way communication rather than a dialogue tailored to a particular customer's immediate questions."
            ],
            [
              "Identified sponsor",
              "The audience can identify the business or organisation responsible for the advertisement. This makes the advertiser accountable for the communication and helps viewers connect the message with the product and its source."
            ],
            [
              "Merit: broad reach and speed",
              "Mass media can expose a large audience to a message quickly and repeatedly. This is useful for products aimed at many ultimate consumers and for building awareness or interest across a broad market."
            ],
            [
              "Merit: relatively low cost per person reached",
              "Advertising can require substantial total spending, but the cost divided across a large audience may be low per person. It can be efficient where a consistent message needs to reach many buyers."
            ],
            [
              "Limitation: weak immediate feedback",
              "Because communication is impersonal, the advertiser may not know right away how a particular customer interpreted the message. Research or response measures may be needed to estimate customer reaction and determine whether the campaign worked."
            ],
            [
              "Limitation: less flexible and less persuasive for some buyers",
              "A standard advertisement cannot readily adjust to each customer's needs or objections. It may be less suitable than conversation when a product is complex, the buyer needs advice or a small number of organisational customers must be persuaded."
            ]
          ]
        },
        {
          "title": "Personal selling",
          "category": "Features of personal selling",
          "examPrompt": "Explain personal selling and compare it with advertising. (4 marks)",
          "lead": "Personal selling is an interactive conversation between a salesperson and one or more potential customers.",
          "items": [
            [
              "Meaning and personal form",
              "Personal selling presents a product orally through a sales conversation intended to make a sale. The direct interaction permits the salesperson and buyer to exchange questions, responses and explanations rather than relying only on a standard public message."
            ],
            [
              "Relationship development",
              "A salesperson can learn about a buyer's circumstances, explain relevant features and build a continuing relationship. Trust and service may contribute to future purchases, especially where the product is technical, costly or bought through intermediaries."
            ],
            [
              "Adaptability and immediate feedback",
              "The sales discussion can change in response to the customer's concerns, and the salesperson can observe questions or objections directly. This makes personal selling flexible and informative, although it does not reach as many people as mass advertising in the same time."
            ],
            [
              "Cost, time and reach",
              "A salesperson's time and travel make each contact relatively costly, and a limited sales force reaches fewer people than mass media. Personal selling is therefore more suitable where buyer numbers are limited or advice and negotiation matter."
            ],
            [
              "Distinction from advertising",
              "Advertising sends a largely standard, impersonal message to many people and has limited immediate feedback. Personal selling uses individual dialogue, can be adjusted for the buyer and provides direct feedback, but takes more time and costs more per contact."
            ]
          ]
        },
        {
          "title": "Sales promotion",
          "category": "Sales promotion techniques",
          "examPrompt": "Define sales promotion and explain techniques for consumers, dealers and salespersons. (4 marks)",
          "lead": "Sales promotion uses short-term incentives to encourage an immediate purchase and usually supplements other promotion.",
          "items": [
            [
              "Meaning and purpose",
              "Sales promotion comprises short-term offers intended to stimulate an immediate purchase. It includes activities beyond advertising, personal selling and public relations, and is commonly used to reinforce those tools rather than replace the need to communicate product value."
            ],
            [
              "Consumer techniques",
              "Free samples let buyers try a product; price discounts reduce the immediate outlay; gifts add a temporary extra benefit; and contests invite participation with a possible reward. Each can encourage trial or speed a purchase, but should be tied to a clear campaign objective."
            ],
            [
              "Dealer or trade techniques",
              "Co-operative advertising, dealer discounts, incentives and contests encourage wholesalers or retailers to stock, display or promote the firm's product. These tools target intermediaries rather than the final consumer and can improve the product's presence in retail outlets."
            ],
            [
              "Salesperson techniques",
              "Bonuses, salesperson contests and special offers reward the sales force for particular efforts or results. They can focus selling activity during a campaign, while managers should keep targets realistic and ensure employees continue to represent the product accurately."
            ],
            [
              "Short-term effect and limitation",
              "A promotion can prompt trial, stock movement or an immediate purchase, but the incentive is temporary. If repeated discounts become the only reason customers buy, the firm may weaken normal-price expectations or fail to build lasting preference; pair incentives with a sound offer."
            ]
          ]
        },
        {
          "title": "Public relations",
          "category": "Public relations activities",
          "examPrompt": "Explain the purpose and activities of public relations. (3 marks)",
          "lead": "Public relations manages relationships and goodwill with groups whose views can affect the organisation.",
          "items": [
            [
              "Purpose",
              "Public relations seeks to build or protect the organisation's image and goodwill among the public and relevant groups. It involves communicating with customers, suppliers, dealers, shareholders, government, employees and community or activist groups, not merely publishing product advertisements."
            ],
            [
              "Activities",
              "Activities can include sponsorship of cultural or sporting events, support for social or environmental causes, public communication and work to build a favourable reputation. The marketing team, a specialist public-relations department or an outside agency may manage these programmes."
            ],
            [
              "Handling adverse publicity",
              "When negative publicity threatens trust, public relations helps the organisation respond promptly, explain relevant facts and reduce harm to its image. It can also advise managers on practices that support goodwill and reduce the chance of damaging public reactions."
            ],
            [
              "Importance of stakeholder opinion",
              "Public views can affect a firm's ability to meet its objectives. Suppliers and intermediaries influence delivery and sales, while consumer groups may call for customers to avoid a product or may support regulation. Ongoing relationships help an organisation hear concerns and respond responsibly."
            ]
          ]
        }
      ]
    }
  ],
  "12": [
    {
      "title": "Consumer protection and why it matters",
      "sections": [
        {
          "title": "Meaning and need for protection",
          "category": "Need for consumer protection",
          "examPrompt": "Explain why consumers need protection. (4 marks)",
          "lead": "Consumer protection safeguards buyers from unfair practices and gives them knowledge and a route to seek remedies.",
          "items": [
            [
              "Meaning of consumer protection",
              "Consumer protection means safeguarding consumers from exploitation, unsafe or misleading offers and unfair treatment, while helping them understand their choices and obtain redress when a genuine grievance occurs. It involves responsible business conduct, informed consumer action, public rules and organisations that help protect consumer interests."
            ],
            [
              "Widespread exploitation",
              "Consumers may face defective or unsafe products, adulteration, counterfeit goods, short weights, overcharging, hoarding, black marketing, misleading claims or poor services. An individual customer may not have the information or influence to challenge a seller acting unfairly."
            ],
            [
              "Information imbalance",
              "A seller or manufacturer often knows more about a product's composition, risks, quality and terms than a buyer. Without clear information, a consumer may be unable to compare offers or judge whether a claim is accurate. Disclosure and education help reduce this imbalance."
            ],
            [
              "Unorganised consumers",
              "Consumers are numerous and usually act separately, while a business can coordinate its policies and resources. A single buyer may have limited bargaining power or may consider a small loss not worth pursuing. Consumer associations and collective complaint routes help consumers express shared interests."
            ],
            [
              "Need for awareness and redress",
              "Knowing that a right exists is not enough if people do not know how to assert it or what evidence to keep. Consumer education, complaint mechanisms and suitable remedies give practical meaning to rights and can discourage repeat unfair practices."
            ],
            [
              "Complex and changing markets",
              "A consumer may purchase online, use a technical service or accept detailed terms that are hard to understand. Protection helps people make informed decisions and gives them a way to raise concerns when a product or service does not match its promised standard."
            ]
          ]
        },
        {
          "title": "Importance to consumers and to business",
          "category": "Importance of consumer protection",
          "examPrompt": "Explain the importance of consumer protection from the viewpoints of consumers and business. (6 marks)",
          "lead": "For full credit, separate consumer benefits from the responsibilities and long-term interests of business.",
          "items": [
            [
              "Consumer viewpoint: protection from exploitation",
              "Legal rights and oversight can protect people from defective, unsafe, adulterated or misrepresented products and services. Knowing the remedies available makes it more realistic for a consumer to challenge unfair treatment rather than accept a loss as unavoidable."
            ],
            [
              "Consumer viewpoint: informed choice",
              "Information and education help consumers compare quality, quantity, price, contents, instructions and risks before committing money. A consumer who understands the offer is less likely to be misled and better able to select a product that suits the need."
            ],
            [
              "Consumer viewpoint: confidence and voice",
              "The right to be heard and access to redress lets consumers state a grievance and seek an appropriate remedy. Confidence in a fair process makes markets more trustworthy and encourages people to participate rather than feel powerless."
            ],
            [
              "Business viewpoint: responsibility for social resources",
              "Businesses use labour, materials and other resources drawn from society. This creates a responsibility to provide useful goods and services that consider public interests, not only to make a sale regardless of the consequences for customers."
            ],
            [
              "Business viewpoint: social and moral responsibility",
              "Consumers are an important stakeholder group and business has an ethical duty to avoid exploitation. Supplying safe, correctly described goods at fair terms and treating complaints seriously demonstrates that the firm accepts responsibility for the effects of its conduct."
            ],
            [
              "Business viewpoint: long-term customer relationships",
              "A satisfied customer may buy again, remain loyal and share a positive experience with potential buyers. Serving customers well can therefore support stable long-term profitability more effectively than pursuing short-term gains through unfair practices."
            ],
            [
              "Business viewpoint: avoid government action and reputational harm",
              "Exploitation can trigger official intervention, legal consequences and public criticism, all of which may impair a company's reputation and operations. Voluntary attention to consumer interests can reduce these risks and strengthen trust."
            ],
            [
              "Business viewpoint: feedback improves the offer",
              "Complaints reveal recurring product defects, service failures or communication problems. A firm that listens can use that information to correct processes and improve what it offers, preventing similar dissatisfaction among other customers."
            ]
          ]
        }
      ]
    },
    {
      "title": "Six consumer rights",
      "sections": [
        {
          "title": "Rights and case signals",
          "category": "Consumer rights",
          "examPrompt": "Explain any four consumer rights, with a case clue for each. (4 marks)",
          "lead": "Name the right, state what it protects or allows, and link the right to the harm in the case.",
          "items": [
            [
              "1. Right to safety",
              "Consumers have a right to protection from goods and services hazardous to life or health. This matters where design, ingredients, manufacture or service practices can cause injury or property damage. Relevant quality or safety marks can help buyers assess goods, though the case facts determine the right involved.",
              "An unsafe electrical appliance that overheats raises the right to safety."
            ],
            [
              "2. Right to be informed",
              "Consumers have a right to complete and accurate information about an offer, such as quality, quantity, price, contents, date details, directions for use and risks. Reliable information supports comparison and can prevent a buyer from making a decision based on a false impression.",
              "An omitted ingredient or hidden charge raises the right to be informed."
            ],
            [
              "3. Right to choose",
              "Consumers should have access to a variety of goods or services at competitive prices and freedom to select among them without coercion. A seller should not force a buyer to accept an unwanted product as a condition of obtaining the chosen offer.",
              "A tied sale of an unwanted accessory can interfere with choice."
            ],
            [
              "4. Right to be heard",
              "A consumer's interests and complaint should receive due consideration by a seller's grievance process or an appropriate forum. Businesses can support this right by creating accessible customer-service channels and responding to concerns instead of ignoring them."
            ],
            [
              "5. Right to seek redressal",
              "Consumers may seek a suitable remedy when goods or services are defective, deficient or connected with an unfair trade practice. Depending on the facts and the forum's order, this may include repair, replacement, refund, compensation or another remedy provided in the chapter."
            ],
            [
              "6. Right to consumer education",
              "Consumers have the right to acquire knowledge and skills needed to make informed choices and understand available protections. Education enables people to recognise unfair practices, assess labels and terms, preserve evidence and raise a well-founded complaint."
            ]
          ]
        },
        {
          "title": "Right, responsibility and remedy",
          "category": "Applying consumer rights",
          "examPrompt": "How should a consumer-rights answer be applied to a case? (3 marks)",
          "lead": "Do not list every right mechanically; match the case evidence to the specific protection or remedy.",
          "items": [
            [
              "Identify the harm",
              "First identify what happened: a safety hazard, missing or false information, restricted choice, ignored complaint, unresolved loss or lack of consumer knowledge. The factual harm guides which right is most directly implicated."
            ],
            [
              "Link evidence to the right",
              "State the right and explain the link in one sentence. For instance, a dangerous product concerns safety; hidden product details concern information; and a seller refusing to consider a complaint concerns the right to be heard."
            ],
            [
              "Separate right from responsibility",
              "A right describes protection or entitlement owed to the consumer; a responsibility describes careful conduct expected from the consumer. A buyer's failure to follow instructions may matter to the case, but it does not change the meaning of the six rights."
            ],
            [
              "Choose a relevant remedy",
              "State what the consumer could ask for based on the defect, service failure or unfair practice, such as repair, replacement, refund or compensation. A remedy should address the loss and facts; do not promise that a particular outcome is automatic."
            ]
          ]
        }
      ]
    },
    {
      "title": "Responsibilities of consumers",
      "sections": [
        {
          "title": "Before and during purchase",
          "category": "Consumer responsibilities while purchasing",
          "examPrompt": "Explain four responsibilities a consumer should follow while purchasing goods or services. (4 marks)",
          "lead": "Responsible purchasing combines awareness, careful checking, honest dealing and proof of the transaction.",
          "items": [
            [
              "1. Be aware of available goods and services",
              "A consumer should learn what alternatives exist, compare their features and prices, and consider the seller's reputation before deciding. Research and comparison make it less likely that a buyer will accept an unsuitable or misleading offer simply because it is the first one presented."
            ],
            [
              "2. Look for quality standards where relevant",
              "A buyer should check recognised quality or safety marks suited to the product, such as certification marks mentioned in the course. Such marks help indicate that goods meet stated requirements; they support informed choice but should be read alongside other relevant product information."
            ],
            [
              "3. Read labels and terms carefully",
              "Consumers should examine details such as price, net quantity, contents, manufacturing or expiry information, directions and warnings, and should understand warranties or contract terms before accepting them. Careful reading can reveal limitations or risks that matter to safe and fair use."
            ],
            [
              "4. Ask for a cash memo and retain proof",
              "A buyer should request and preserve a receipt, invoice, warranty and relevant written communication. These records help establish what was purchased, when and from whom, and can support a later complaint or request for a remedy."
            ],
            [
              "5. Be honest in transactions",
              "Consumers should provide accurate details when entering a transaction, including truthful contact or payment information where required. Honest dealing reduces avoidable disputes and helps sellers process an order or service correctly."
            ],
            [
              "6. Use care online",
              "For electronic transactions, consumers should use reputable and secure sites and be cautious about sharing personal or payment information. Awareness of suspicious links and scams can reduce the risk of fraud while still allowing people to use online markets."
            ]
          ]
        },
        {
          "title": "During use and when a problem occurs",
          "category": "Consumer responsibilities while using goods and services",
          "examPrompt": "Explain responsibilities of a consumer after purchase. (4 marks)",
          "lead": "Careful use and prompt, evidence-based action make a complaint more effective and reduce avoidable harm.",
          "items": [
            [
              "1. Understand risks and follow instructions",
              "Consumers should learn about product or service risks, read directions and warnings, and use the offer safely. Failure to follow reasonable safety instructions may create danger and can complicate a later dispute about the cause of damage."
            ],
            [
              "2. Speak up promptly",
              "When a product is defective, unsafe or inconsistent with what was promised, the consumer should raise the concern with the seller or service provider without unnecessary delay. Prompt communication gives the business a chance to respond and preserves a clearer record of the issue."
            ],
            [
              "3. Seek redressal when needed",
              "If a genuine grievance remains unresolved, a consumer should use the appropriate complaint or redressal channel and provide relevant facts and evidence. Consumers should not assume that a small monetary loss is never worth reporting, because patterns of small harms can affect many people."
            ],
            [
              "4. Avoid waste and respect the environment",
              "Responsible consumption includes avoiding needless waste, littering and careless disposal. Consumers can consider how their choices affect shared resources and the environment, not only the immediate price or convenience of an item."
            ],
            [
              "5. Cooperate with a redressal process",
              "A consumer seeking a resolution should provide necessary information, preserve evidence and participate in hearings or proceedings as required. Cooperation helps the forum assess the facts and reach a reasoned decision."
            ],
            [
              "6. Support collective consumer action",
              "Consumers can participate in consumer societies that educate people and safeguard shared interests. Collective organisation can bring attention to recurring problems and help individuals obtain advice or support that they may not have alone."
            ]
          ]
        }
      ]
    },
    {
      "title": "Consumer organisations and NGOs",
      "sections": [
        {
          "title": "Functions in protecting consumers",
          "category": "Role of consumer organisations and NGOs",
          "examPrompt": "Explain the role of consumer organisations and NGOs in protecting consumers. (4 marks)",
          "lead": "Consumer groups help people understand rights, compare products, obtain advice and act collectively against unfair practices.",
          "items": [
            [
              "1. Educate consumers",
              "Organisations spread information about consumer rights, responsibilities, product safety, available remedies and common market problems. Education makes people more capable of checking an offer and raising a clear grievance when necessary."
            ],
            [
              "2. Publish information and periodicals",
              "Consumer groups may issue magazines, reports or other publications about product performance, consumer concerns, laws and reliefs. Publicly available information helps consumers learn from issues that affect many buyers rather than having to investigate each one alone."
            ],
            [
              "3. Conduct comparative product testing",
              "Groups can arrange tests of competing brands in appropriate laboratories and publish their findings. Comparison can reveal differences in quality or performance and give consumers evidence to consider alongside a manufacturer's claims."
            ],
            [
              "4. Advise and assist complainants",
              "Consumer organisations may provide advice, practical help or legal assistance to people seeking a remedy. Support is useful where an individual does not know how to present the facts, what records matter or which route may be appropriate."
            ],
            [
              "5. Organise action against unfair practices",
              "Groups can encourage consumers to speak collectively and take action against exploitative or unfair conduct. A coordinated response can make recurring problems more visible and exert pressure for improved business behaviour."
            ],
            [
              "6. Represent consumer interests",
              "Recognised groups can communicate shared concerns to businesses, public bodies or redressal forums. Their continuing work can help consumers who are individually unorganised to have a more effective voice in the market."
            ]
          ]
        }
      ]
    },
    {
      "title": "Consumer Protection Act 2019: definition and complaints",
      "sections": [
        {
          "title": "Who is a consumer?",
          "category": "Statutory definition of consumer",
          "examPrompt": "State the statutory meaning of consumer and explain the commercial-purpose exclusion and livelihood exception. (4 marks)",
          "lead": "Apply the transaction, consideration, approved-user, purpose and self-employment tests to the facts.",
          "items": [
            [
              "Buyer of goods",
              "A person who buys goods for consideration is a consumer under the supplied chapter's summary of the Consumer Protection Act 2019. Consideration may be paid, promised, partly paid and partly promised, or deferred; it need not always be fully paid at the moment the transaction is made."
            ],
            [
              "Person hiring or availing a service",
              "A person who hires or uses a service for consideration may also be a consumer. The same principle applies to paid, promised, partly paid or deferred consideration, so the answer should identify the service and the relevant exchange rather than assume only physical products qualify."
            ],
            [
              "Approved user or beneficiary",
              "The definition includes a person who uses goods or benefits from a service with the approval of the buyer or the person who hired it. The approved user need not always be the person who personally paid, provided the use or benefit is authorised."
            ],
            [
              "Online and other transactions",
              "The supplied chapter states that the Act applies to offline and online transactions, including electronic means, teleshopping and direct selling. The medium used for the purchase does not by itself remove a qualifying consumer from the definition."
            ],
            [
              "Resale exclusion",
              "A person who obtains goods for resale is generally excluded from the consumer definition in the chapter. The buyer's purpose matters: stock bought to sell onward is different from goods bought for ordinary use or consumption."
            ],
            [
              "Commercial-purpose exclusion",
              "A person obtaining goods for a commercial purpose is generally excluded. Apply this by looking at the purpose and use described in the case rather than treating every purchase connected with work as automatically outside the Act."
            ],
            [
              "Livelihood through self-employment exception",
              "Commercial purpose does not include goods used exclusively by a person to earn a livelihood through self-employment. This exception protects a person using their own equipment to support their livelihood; the facts should establish personal self-employment and livelihood use rather than resale or a larger commercial operation.",
              "A tailor who buys and personally operates one sewing machine to earn a livelihood may rely on this exception; a trader buying machines for resale does not fit it."
            ],
            [
              "Consumer-definition case method",
              "For a case, state whether goods were bought or a service hired for consideration; check whether the claimant is an approved user or beneficiary; identify any resale or commercial purpose; and then test the self-employment livelihood exception if commercial use is suggested. Explain each conclusion from the facts."
            ]
          ]
        },
        {
          "title": "Who may complain and against whom",
          "category": "Eligible complainants under the Consumer Protection Act 2019",
          "examPrompt": "List eligible persons or bodies who may file a consumer complaint. (4 marks)",
          "lead": "The person filing can be the consumer, an eligible representative, an association, government body or a group with the same interest.",
          "items": [
            [
              "Consumer",
              "The consumer affected by the transaction may bring a complaint before the appropriate consumer redressal forum. The complaint should identify the transaction and explain the defect, deficiency, unfair practice or other basis for the grievance."
            ],
            [
              "Recognised consumer association",
              "A voluntary consumer association registered under applicable law may file. Consumer associations can give an individual grievance a route to be heard and can also bring attention to problems affecting consumer interests more broadly."
            ],
            [
              "Central or State Government",
              "The Central Government or a State Government may file a complaint under the list in the supplied chapter. Their inclusion recognises that consumer protection can involve public as well as individual interests."
            ],
            [
              "Central Consumer Protection Authority",
              "The Central Consumer Protection Authority (CCPA), referred to as the Central Authority in the supplied chapter's list, is included among eligible complainants. It is a consumer-protection authority, not one of the three consumer commission levels."
            ],
            [
              "Consumers sharing an interest",
              "Where numerous consumers have the same interest, one or more consumers may file on their behalf as permitted by the chapter. This allows a common problem to be raised without requiring every affected buyer to act separately."
            ],
            [
              "Legal heir or representative",
              "If a consumer dies, a legal heir or legal representative may file as listed in the supplied material. The representative presents the consumer's relevant transaction and grievance to the forum."
            ],
            [
              "Parent or guardian of a minor",
              "Where the consumer is a minor, the parent or legal guardian may file. A minor's inability to bring the matter independently does not remove the possibility of a complaint under the supplied chapter's list."
            ],
            [
              "Opposite party",
              "A complaint may be directed against the seller, manufacturer or dealer responsible for defective goods, or a service provider responsible for a deficiency. Identify the party connected with the alleged failure rather than naming an unrelated business."
            ]
          ]
        }
      ]
    },
    {
      "title": "Consumer redressal machinery, remedies and appeals",
      "sections": [
        {
          "title": "Three-tier commission structure",
          "category": "Consumer redressal commissions",
          "examPrompt": "Describe the three-tier consumer redressal machinery and state the jurisdiction figures printed in the supplied textbook. (4 marks)",
          "lead": "The system has District, State and National Commissions. Use the monetary limits printed in the supplied chapter for this examination.",
          "items": [
            [
              "District Commission",
              "The District Consumer Disputes Redressal Commission is the district-level forum in the three-tier structure. Under the figures printed in the supplied textbook, it entertains complaints where the consideration paid does not exceed ₹1 crore."
            ],
            [
              "State Commission",
              "The State Consumer Disputes Redressal Commission is the state-level forum. The supplied textbook assigns it complaints where the consideration paid exceeds ₹1 crore but does not exceed ₹10 crore."
            ],
            [
              "National Commission",
              "The National Consumer Disputes Redressal Commission is the national-level forum with territorial jurisdiction across the country. Under the supplied textbook figures, it entertains complaints where the consideration paid exceeds ₹10 crore."
            ],
            [
              "Exam-source caveat",
              "The ₹1 crore and ₹10 crore jurisdiction thresholds above are reproduced from the supplied textbook for this exam. They are study-source figures, not current-law guidance; use the numbers your course material prints when answering this paper."
            ]
          ]
        },
        {
          "title": "Mediation, evidence and remedies",
          "category": "Complaint handling and consumer remedies",
          "examPrompt": "Explain how a consumer dispute may be handled and list remedies a commission may order. (5 marks)",
          "lead": "A good answer identifies the grievance, evidence, forum and remedy that fits the proven defect or deficiency.",
          "items": [
            [
              "State the complaint clearly",
              "Identify the consumer and opposite party, describe the product or service and transaction, explain the defect, deficiency or unfair practice, and state what outcome is sought. A clear statement helps the forum understand both the facts and the relief requested."
            ],
            [
              "Preserve evidence",
              "A bill, receipt, warranty, label, advertisement, correspondence, service record, photograph or relevant expert report can support the complaint. Evidence links the claimant to the transaction and helps demonstrate what was promised or how the product or service failed."
            ],
            [
              "Mediation option",
              "The supplied chapter describes consumer mediation cells attached to commissions as an alternative route that can support faster settlement. Where a commission sees elements of settlement acceptable to the parties, it may seek their consent; mediation depends on willing participation rather than forcing a settlement."
            ],
            [
              "Repair or removal of defect",
              "A commission satisfied that goods have a defect or a service has a deficiency may order the responsible party to remove the defect or correct the service failure. This remedy focuses on fixing the underlying problem where correction is appropriate."
            ],
            [
              "Replacement or refund",
              "The commission may order replacement of defective goods with a product free from the defect, or refund of the price paid for goods or service charges. Which relief fits depends on the facts and the order; an answer should identify it as a possible remedy, not an automatic entitlement in every dispute."
            ],
            [
              "Compensation and punitive damages",
              "A commission may award reasonable compensation for loss or injury suffered because of the opposite party's negligence and punitive damages in appropriate circumstances. Compensation responds to harm; punitive damages have a different role and should not be claimed as the ordinary result of every defect."
            ],
            [
              "Stop unfair practices and protect the public",
              "Orders may direct a party to discontinue and not repeat an unfair or restrictive trade practice. The commission may also direct that hazardous goods not be offered or sold, be withdrawn, or that their manufacture or hazardous services cease."
            ],
            [
              "Other appropriate orders",
              "The supplied chapter lists further directions, including corrective communication about a misleading advertisement and costs where appropriate. Relief should match the violation and may protect other consumers as well as the individual complainant."
            ]
          ]
        },
        {
          "title": "Appeal route and source-stated time limits",
          "category": "Consumer commission appeals",
          "examPrompt": "State the appeal chain and time periods printed in the supplied textbook. (3 marks)",
          "lead": "Memorise each destination and connect the time limit to the order being appealed.",
          "items": [
            [
              "District to State",
              "A party dissatisfied with a District Commission order may appeal to the State Commission on grounds of fact or law. The supplied textbook states that this appeal should be filed within 45 days from the date of the District order."
            ],
            [
              "State to National",
              "A party dissatisfied with a State Commission order may take the appeal to the National Commission, the next level in the hierarchy. The supplied study material gives a 30-day period for this step; identify both the destination and the period in an exam answer."
            ],
            [
              "National to Supreme Court",
              "A party dissatisfied with a National Commission order may appeal to the Supreme Court of India. The supplied chapter states a period of 30 days from the National Commission order for this final appeal."
            ],
            [
              "Memory sequence and caveat",
              "Remember District → State (45 days) → National (30 days) → Supreme Court (30 days). The time limits in this section reproduce the supplied textbook for exam revision and are not current-law guidance."
            ]
          ]
        }
      ]
    }
  ]
};
  /* End textbook notes */
  var notesState={chapter:null,mode:"study",topic:0,all:false};
  function chapterTopics(c){
    if(chapterLessons[c.id])return chapterLessons[c.id];
    var groups=(noteTopics[c.id]||[]).map(function(g){return {title:g[0],sections:g[1].map(function(i){return c.sections[i]}).filter(Boolean)}});
    var assigned=[].concat.apply([], (noteTopics[c.id]||[]).map(function(g){return g[1]}));
    c.sections.forEach(function(section,i){if(assigned.indexOf(i)<0)groups.push({title:section.title,sections:[section]})});
    return groups;
  }
  function renderNotes(){
    var c=activeChapter,topics=chapterTopics(c);
    if(notesState.chapter!==c.id)notesState={chapter:c.id,mode:"study",topic:0,all:false};
    var intro='<section class="notes-intro"><div class="notes-intro-top"><div class="eyebrow">CHAPTER '+esc(c.id.padStart(2,"0"))+' · CORE NOTES</div><div class="chapter-pagination"><button class="chapter-pill" id="previous-chapter" type="button" aria-label="Previous chapter">← Previous</button><button class="chapter-pill" id="next-chapter" type="button" aria-label="Next chapter">Next →</button></div></div><h1>'+esc(c.title)+'</h1><p class="deck">'+esc(c.focus)+'</p></section>';
    var tabs='<nav class="notes-modes" aria-label="Chapter resources">'+[["study","Study notes"],["cases","Case clues"],["revision","Quick revision"]].map(function(m){return '<button type="button" data-notes-mode="'+m[0]+'" aria-pressed="'+(notesState.mode===m[0])+'">'+m[1]+'</button>'}).join('')+'</nav>';
    var body='';
    if(notesState.mode==="study"){
      var outline='<nav class="chapter-outline" aria-label="Chapter outline"><div class="outline-heading">Chapter outline <span>'+topics.length+' topics</span></div>'+topics.map(function(t,i){return '<button type="button" data-topic="'+i+'"'+(!notesState.all&&notesState.topic===i?' aria-current="true"':'')+'><span>'+String(i+1).padStart(2,"0")+'</span><span>'+esc(t.title)+'</span></button>'}).join('')+'<button type="button" class="read-all" id="read-all" aria-pressed="'+notesState.all+'">'+(notesState.all?'Return to one topic':'Read whole chapter')+'</button></nav>';
      var selected=notesState.all?topics:[topics[notesState.topic]];
      var articles=selected.map(function(t,j){var n=notesState.all?j:notesState.topic;return '<article class="study-topic" id="study-topic-'+n+'"><header class="topic-heading"><div class="eyebrow">TOPIC '+String(n+1).padStart(2,"0")+' OF '+String(topics.length).padStart(2,"0")+'</div><h2 tabindex="-1" id="topic-title-'+n+'">'+esc(t.title)+'</h2>'+(t.sections.length>1?'<nav class="topic-sections" aria-label="In this topic"><span>In this topic</span>'+t.sections.map(function(section,k){return '<button type="button" data-note-section="note-section-'+n+'-'+k+'">'+esc(section.title)+'</button>'}).join('')+'</nav>':'')+'</header>'+t.sections.map(function(section,k){return renderStudySection(section,n+'-'+k)}).join('')+'</article>'}).join('');
      var picker='<div class="mobile-topic-bar"><label for="topic-picker">Chapter outline</label><select id="topic-picker" aria-label="Choose a topic">'+topics.map(function(t,i){return '<option value="'+i+'"'+(!notesState.all&&notesState.topic===i?' selected':'')+'>'+String(i+1).padStart(2,"0")+' · '+esc(t.title)+'</option>'}).join('')+'<option value="all"'+(notesState.all?' selected':'')+'>Read whole chapter</option></select></div>';
      var footer=notesState.all?'':'<nav class="topic-pagination" aria-label="Topics"><button class="outline-pill" type="button" data-topic="'+(notesState.topic-1)+'" '+(notesState.topic===0?'disabled':'')+'>← Previous topic</button>'+(notesState.topic+1<topics.length?'<button class="dark-pill" type="button" data-topic="'+(notesState.topic+1)+'">Next: '+esc(topics[notesState.topic+1].title)+' →</button>':'<button class="dark-pill" type="button" data-notes-mode="cases">Apply it: case clues →</button>')+'</nav>';
      body='<div class="notes-layout">'+outline+picker+'<div class="notes-reader">'+articles+footer+'</div></div>';
    }else if(notesState.mode==="cases"){
      body='<section class="case-section notes-resource"><div class="section-heading stacked"><h2>Case-study clue finder</h2><p>Underline the action first. Name the concept, then use the case as evidence for your link.</p></div><div class="case-list">'+c.cues.map(function(x){return '<div class="case-row"><span class="case-clue">“'+esc(x[0])+'”</span><span class="case-concept">'+esc(x[1])+'</span></div>'}).join('')+'</div><div class="exam-callout"><span>Answer structure</span><p>Name the concept, point to the case evidence, and explain the link in one clear sentence.</p></div></section>';
    }else{
      body='<div class="notes-resource revision-sections"><section><h2>Chapter essentials</h2><ol class="revision-takeaways">'+c.takeaways.map(function(t){return '<li>'+esc(t)+'</li>'}).join('')+'</ol></section><section class="flow-section"><div class="section-heading"><h2>One-glance flow</h2><span>Recall the order</span></div><div class="flow">'+c.flow.map(function(x,i){return '<div class="flow-step"><div class="flow-step-top"><span class="flow-number">'+String(i+1).padStart(2,"0")+'</span><span class="flow-connector" aria-hidden="true"></span></div><b>'+esc(x[0])+'</b><span class="flow-description">'+esc(x[1])+'</span></div>'}).join('')+'</div></section><section class="compare-section"><h2>'+esc(c.compare.title)+'</h2><div class="compare-scroll"><table class="compare-table"><thead><tr>'+c.compare.heads.map(function(h){return '<th>'+esc(h)+'</th>'}).join('')+'</tr></thead><tbody>'+c.compare.rows.map(function(row){return '<tr>'+row.map(function(cell,i){return '<td'+(i===0?' class="compare-term"':'')+'>'+esc(cell)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div></section></div>';
    }
    return '<div class="page page-notes">'+intro+tabs+body+'</div>';
  }
  function renderStudySection(section,key){
    return '<section class="study-section" id="note-section-'+key+'" tabindex="-1">'+(section.category?'<div class="section-category">'+esc(section.category)+'</div>':'')+'<h3>'+esc(section.title)+'</h3><p class="card-lead">'+noteMarkup(section.lead)+'</p>'+(section.examPrompt?'<p class="exam-question"><span>Typical question</span>'+noteMarkup(section.examPrompt)+'</p>':'')+'<ol class="study-points" start="'+(section.start||1)+'">'+section.items.map(function(item,i){return '<li><div class="point-heading"><span class="point-number" aria-hidden="true">'+String((section.start||1)+i).padStart(2,"0")+'</span><h4>'+esc(item[0])+'</h4></div><p>'+noteMarkup(item[1])+'</p>'+(item[2]?'<div class="study-example"><span>Example / case clue</span><p>'+noteMarkup(item[2])+'</p></div>':'')+'</li>'}).join('')+'</ol>'+(section.source?'<p class="section-source">'+noteMarkup(section.source)+'</p>':'')+'</section>';
  }
  function bindNotes(){
    function refresh(focusTopic){document.getElementById("view").innerHTML=renderNotes();bindNotes();if(focusTopic){var heading=document.getElementById("topic-title-"+notesState.topic);if(heading){heading.focus({preventScroll:true});document.getElementById("study-topic-"+notesState.topic).scrollIntoView({block:"start"})}}}
    document.getElementById("previous-chapter").addEventListener("click",function(){activeChapter=chapters[(chapters.indexOf(activeChapter)+chapters.length-1)%chapters.length];render();window.scrollTo(0,0)});
    document.getElementById("next-chapter").addEventListener("click",function(){activeChapter=chapters[(chapters.indexOf(activeChapter)+1)%chapters.length];render();window.scrollTo(0,0)});
    document.querySelectorAll('[data-notes-mode]').forEach(function(b){b.addEventListener('click',function(){notesState.mode=b.dataset.notesMode;refresh(false);document.querySelector('.notes-modes [aria-pressed="true"]').focus({preventScroll:true})})});
    document.querySelectorAll('[data-topic]').forEach(function(b){b.addEventListener('click',function(){notesState.topic=Number(b.dataset.topic);notesState.all=false;refresh(true)})});
    document.querySelectorAll('[data-note-section]').forEach(function(b){b.addEventListener('click',function(){var section=document.getElementById(b.dataset.noteSection);section.focus({preventScroll:true});section.scrollIntoView({block:'start'})})});
    var picker=document.getElementById('topic-picker');if(picker)picker.addEventListener('change',function(){notesState.all=this.value==='all';if(!notesState.all)notesState.topic=Number(this.value);refresh(!notesState.all)});
    var all=document.getElementById('read-all');if(all)all.addEventListener('click',function(){notesState.all=!notesState.all;refresh(false);document.getElementById('read-all').focus({preventScroll:true})});
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
      document.getElementById("view").innerHTML=renderNotes();bindNotes();
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
