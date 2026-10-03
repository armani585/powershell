import {STORAGE_KEY, escapeHtml as e, baseLetters, phraseText, readReviews, validateData, matchesSearch, correctOrder, moveOnMap, conjugatedForm, numberWords, PROGRESS_KEY, emptyProgress, readProgress, recordScore, pathSummary} from './learning.mjs';

const main=document.querySelector('main');
const dialog=document.querySelector('#detail');
const body=document.querySelector('#dialog-body');
const notice=document.querySelector('#notice');
let data,words,reviews,writable=true,currentView='scenes',currentScene=null,translationVisible=true,quiz=null,lastOpener=null,sceneFilter='all',sceneQuery='',builder=null,reviewSession=null,topicFilter='all',wordQuery='',routeState=null;
const sprite=(index,extra='')=>`<div class="sprite ${extra}" aria-hidden="true" style="--x:${index%3*50}%;--y:${Math.floor(index/3)*100}%"></div>`;
const sceneSprite=s=>s.imageSheet==='furniture'?furnitureSprite(s.image):s.imageSheet==='countries-colors'?travelColorSprite(s.image):s.imageSheet==='animals'?animalSprite(s.image):s.imageSheet==='vocabulary-scenes'?topicSprite(s.image):sprite(s.image,s.imageSheet==='more-scenes'?'more-scenes':'');
const topicSprite=index=>`<div class="sprite vocabulary-scene" aria-hidden="true" style="--x:${index%2*100}%;--y:${Math.floor(index/2)*100}%"></div>`;
const writtenNote=()=>`<p class="micro">Lecture guidée : ouvrez un mot pour retrouver ses lettres et ses repères écrits.</p>`;

const animalSprite=index=>sprite(index,'animal-image');
const travelColorSprite=index=>`<div class="sprite travel-color-image" aria-hidden="true" style="--x:${index*100}%;--y:0%"></div>`;
const furnitureSprite=index=>sprite(index,'furniture-image');
const topicImage=topic=>topic.imageSheet==='daily-scenes'?sprite(topic.image):topic.imageSheet==='more-scenes'?sprite(topic.image,'more-scenes'):topic.imageSheet==='furniture'?furnitureSprite(topic.image):topic.imageSheet==='countries-colors'?travelColorSprite(topic.image):topic.imageSheet==='animals'?animalSprite(topic.image):topicSprite(topic.image);

function wordVisual(w){
  if(w.furnitureImage!==undefined)return furnitureSprite(w.furnitureImage);
  if(w.countryCode){const src=data.flagImages?.[w.countryCode]||'illustrations/flags/'+w.countryCode+'.svg';return `<img class="country-flag" src="${e(src)}" alt="" width="160" height="120" loading="lazy">`;}
  if(w.colorHex)return `<span class="color-swatch" aria-hidden="true" style="--swatch:${e(w.colorHex)}"></span>`;
  return w.animalImage!==undefined?animalSprite(w.animalImage):'';
}
function colorAgreement(topic){
  if(!topic?.colorPairs)return '';
  return `<section class="color-agreement" aria-labelledby="color-agreement-title"><h2 id="color-agreement-title">Masculin ou féminin ?</h2><p class="micro">La couleur s’accorde avec le nom arabe. Par exemple : bab 7mer (une porte rouge), tabla 7emra (une table rouge). Les couleurs empruntées ont parfois d’autres usages d’accord.</p><div class="color-pairs">${topic.colorPairs.map(pair=>{const m=words.get(pair.masculine),f=words.get(pair.feminine);return `<article>${wordVisual(m)}<strong>${e(m.meaning)}</strong><div><button data-word="${m.id}"><small>Masculin</small><span lang="ar" dir="rtl">${e(m.arabic)}</span><small>${e(m.latin)}</small></button><button data-word="${f.id}"><small>Féminin</small><span lang="ar" dir="rtl">${e(f.arabic)}</span><small>${e(f.latin)}</small></button></div></article>`;}).join('')}</div></section>`;
}

let progress=emptyProgress(),progressWritable=true,topicGroup='all',topicQuery='',activePath=null;
function message(text){notice.textContent=text;notice.hidden=!text;}
function persist(){
  document.querySelector('#review-count').textContent=reviews.size;
  if(!writable)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...reviews]));}
  catch{writable=false;message('Enregistrement impossible. Vos nouveaux mots restent disponibles pour cette séance seulement.');}
}

function persistProgress(){
 if(!progressWritable)return;
 try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}
 catch{progressWritable=false;message('La progression reste disponible pour cette séance ; l’enregistrement sur cet appareil est indisponible.');}
}
function resumeBanner(){
 const last=data.scenes.find(s=>s.id===progress.lastScene);if(!last)return '';
 const count=Object.keys(progress.scores).length;
 return `<section class="resume-banner" aria-label="Reprendre mon apprentissage"><div><span class="eyebrow">Votre dernière situation</span><h2>${e(last.title)}</h2><p>${count} quiz de situation terminé${count>1?'s':''}. La progression est enregistrée dans ce navigateur${progressWritable?'':' pour cette séance seulement'}.</p></div><button class="primary" data-start="${last.id}">Reprendre →</button></section>`;
}
function renderTopicResults(){
 const group=data.topicGroups.find(g=>g.id===topicGroup);
 const visible=data.topics.filter(t=>t.image!==undefined&&(!group||group.topics.includes(t.id))&&matchesSearch(topicQuery,[t.title,t.intro,...t.words.map(id=>words.get(id).meaning)]));
 main.querySelector('#topic-results').textContent=visible.length+' thème'+(visible.length>1?'s':'');
 main.querySelector('#topic-grid').innerHTML=visible.map(t=>`<button class="topic-card" data-topic="${t.id}">${topicImage(t)}<span><strong>${e(t.title)}</strong><small>${t.words.length} fiches à explorer</small></span></button>`).join('')||'<p class="empty no-results">Aucun thème trouvé. Essayez un autre mot ou sélectionnez « Tous les thèmes ».</p>';
}
function renderPaths(){
 main.innerHTML=`<span class="eyebrow">Apprendre avec un objectif</span><h1>Votre prochain<br><em>petit pas.</em></h1><p>Choisissez un parcours, découvrez une situation, puis faites son quiz. Vous pouvez revenir aux mots ou changer de parcours à tout moment.</p><div class="path-grid">${data.learningPaths.map(p=>{const status=pathSummary(p,progress);return `<button class="path-card" data-path="${p.id}">${sceneSprite(p)}<span class="path-card-copy"><strong>${e(p.title)}</strong><span>${e(p.description)}</span><small>${status.completed} / ${status.total} quiz terminés</small><progress value="${status.completed}" max="${status.total}" aria-label="${e(p.title)} : ${status.completed} quiz sur ${status.total}"></progress></span></button>`;}).join('')}</div><p class="micro">Un quiz terminé indique une séance effectuée, pas une maîtrise de la prononciation. Les meilleurs scores sont conservés dans ce navigateur.</p>`;
}
function openPath(id){
 const path=data.learningPaths.find(p=>p.id===id);if(!path)return;activePath=id;currentView='paths';
 document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view==='paths')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 const status=pathSummary(path,progress);
 main.innerHTML=`<button class="back" data-nav="paths">← Tous les parcours</button><span class="eyebrow">${status.completed} / ${status.total} quiz terminés</span><h1>${e(path.title)}</h1><p>${e(path.description)}</p><div class="actions"><button class="primary" data-path-scene="${status.next||path.scenes[0]}" data-path-id="${path.id}">${status.next?'Continuer le parcours':'Revoir le parcours'} →</button></div><ol class="path-lessons">${path.scenes.map((id,i)=>{const s=data.scenes.find(s=>s.id===id),score=progress.scores[id];return `<li><span class="lesson-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><h2>${e(s.title)}</h2><p>${e(s.goal)}</p><span class="lesson-status">${score===undefined?'À découvrir':`Meilleur résultat : ${score} / ${s.phrases.length}${score===s.phrases.length?' · sans erreur':' · à retravailler'}`}</span></div><button class="secondary" data-path-scene="${id}" data-path-id="${path.id}">${score===undefined?'Découvrir':'Revoir'}</button></li>`;}).join('')}</ol>`;
 main.focus();window.scrollTo({top:0,behavior:'instant'});
}
function pathContext(sceneId){
 const path=data.learningPaths.find(p=>p.id===activePath&&p.scenes.includes(sceneId));if(!path)return '';
 return `<div class="path-context"><span>${e(path.title)} · étape ${path.scenes.indexOf(sceneId)+1} / ${path.scenes.length}</span><button class="back" data-path="${path.id}">Voir le parcours</button></div>`;
}
function pathNextAction(sceneId){
 const path=data.learningPaths.find(p=>p.id===activePath&&p.scenes.includes(sceneId));if(!path)return '<button class="secondary" data-nav="paths">Choisir un parcours</button>';
 const next=path.scenes[path.scenes.indexOf(sceneId)+1];
 return next?`<button class="primary" data-path-scene="${next}" data-path-id="${path.id}">Situation suivante →</button>`:`<button class="primary" data-path="${path.id}">Voir mon bilan du parcours</button>`;
}
// Optional synthesis reads the Arabic name of a letter, not an isolated phoneme.
let speechToken=0;
function arabicVoice(){try{return window.speechSynthesis?.getVoices().find(v=>/^ar(?:[-_]|$)/i.test(v.lang))||null;}catch{return null;}}
function letterAudioMarkup(letter){
 const voice=arabicVoice();
 return `<div class="letter-audio"><button class="secondary" data-speak-letter="${letter.id}" ${voice?'':'disabled'}>Écouter le nom de la lettre</button><p class="micro">${voice?'Voix de synthèse arabe du navigateur. Le nom de la lettre se distingue de son son dans un mot ; ce n’est pas un enregistrement marocain.':'Aucune voix arabe disponible dans ce navigateur. Les repères écrits et les formes de la lettre restent accessibles.'}</p><p id="letter-audio-status" class="micro" role="status"></p></div>`;
}
function stopLetterAudio(){speechToken++;try{window.speechSynthesis?.cancel();}catch{}}
function speakLetter(id){
 const letter=data.alphabet.find(l=>l.id===id),voice=arabicVoice();
 if(!letter||!voice||!window.SpeechSynthesisUtterance)return;
 stopLetterAudio();const token=speechToken,status=body.querySelector('#letter-audio-status');
 try{
  const utterance=new SpeechSynthesisUtterance(letter.spokenName);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.8;
  status.textContent='Lecture du nom de la lettre…';
  utterance.onend=()=>{if(token===speechToken&&status.isConnected)status.textContent='Lecture terminée.';};
  utterance.onerror=()=>{if(token===speechToken&&status.isConnected)status.textContent='La lecture est indisponible. Vous pouvez utiliser les repères écrits.';};
  window.speechSynthesis.speak(utterance);
 }catch{if(status)status.textContent='La lecture est indisponible. Vous pouvez utiliser les repères écrits.';}
}
try{window.speechSynthesis?.addEventListener('voiceschanged',()=>{const button=body.querySelector('[data-speak-letter]');if(!dialog.open||!button)return;const l=data?.alphabet.find(l=>l.id===button.dataset.speakLetter);if(l){const focused=button===document.activeElement;body.querySelector('#letter-listening').innerHTML=letterAudioMarkup(l);if(focused)body.querySelector('[data-speak-letter]')?.focus();}});}catch{}

function navigate(view,focus=true){
  currentView=view;currentScene=null;quiz=null;builder=null;reviewSession=null;
  document.querySelectorAll('[data-view]').forEach(b=>b.toggleAttribute('aria-current',b.dataset.view===view));
  document.querySelectorAll('[aria-current]').forEach(b=>b.setAttribute('aria-current','page'));
  if(view==='paths')renderPaths();else if(view==='reading-guide')renderReadingGuide();else if(view==='expressions')renderExpressions();else if(view==='alphabet')renderAlphabet();else if(view==='reviews')renderReviews();else if(view==='dictionary')renderDictionary();else if(view==='orientation')renderOrientation();else if(view==='conjugation'){conjugationQuiz=null;renderConjugation();}else renderScenes();
  if(focus){main.focus();window.scrollTo({top:0,behavior:'instant'});}
}
function renderScenes(){
  main.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">Le marocain, au quotidien</span><h1>Les mots prennent vie.<br><em>Et vous prenez<br>la parole.</em></h1><p>Un visage, une situation, quelques mots. Explorez le darija à votre rythme, comprenez les lettres et entraînez-vous à retrouver les expressions utiles.</p><div class="actions"><button class="primary" data-start="rencontres">Commencer une rencontre <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button><button class="secondary" data-nav="alphabet">Explorer l’alphabet</button><button class="secondary" data-nav="reading-guide">Comprendre les repères de lecture</button></div></div><div class="hero-visual">${sprite(0)}<div class="visual-note"><b lang="ar" dir="rtl">السلام عليكم</b><span>Une rencontre.<br><strong>Vos premiers mots.</strong></span></div></div></section>
  ${resumeBanner()}<section class="path-intro"><div><span class="eyebrow">Un fil conducteur pour apprendre</span><h2>Un objectif, quelques situations.</h2><p>Six parcours pour avancer dans un ordre simple et retrouver vos résultats.</p></div><button class="primary" data-nav="paths">Choisir mon parcours →</button></section><div class="steps"><div><b>01</b><span><strong>Observer</strong>Une scène pour comprendre.</span></div><div><b>02</b><span><strong>Décortiquer</strong>Des lettres aux groupes de sons.</span></div><div><b>03</b><span><strong>Se souvenir</strong>Un exercice, puis vos révisions.</span></div></div>
  <section class="topic-discovery" aria-labelledby="topics-title"><div class="section-heading"><div><span class="eyebrow">Les mots de votre quotidien</span><h2 id="topics-title">Un thème, plein de découvertes.</h2><p>Explorez le vocabulaire, puis retrouvez-le dans une situation.</p></div><button class="secondary" data-nav="dictionary">Tout le lexique</button></div><div class="scene-tools"><label class="search-label" for="topic-search">Trouver un thème<input id="topic-search" type="search" placeholder="Famille, restaurant, compter…" value="${e(topicQuery)}"></label><div class="filters" aria-label="Familles de thèmes">${[{id:'all',title:'Tous les thèmes'},...data.topicGroups].map(g=>`<button data-topic-group="${g.id}" aria-pressed="${topicGroup===g.id}">${e(g.title)}</button>`).join('')}</div></div><p id="topic-results" class="micro" role="status"></p><div class="topic-grid" id="topic-grid"></div><div class="orientation-banner"><div><span class="eyebrow">Votre premier quartier en darija</span><h3>Tout droit… puis à gauche ?</h3><p>Repérez les lieux et suivez six trajets sur un plan interactif.</p></div><button class="primary" data-nav="orientation">Me repérer dans le quartier →</button></div></section>
  <section class="conjugation-banner"><div><span class="eyebrow">Les expressions qui font la conversation</span><h2>Merci. D’accord.<br>Au revoir.</h2><p>20 expressions, leur contexte et les réponses à connaître.</p></div><button class="primary" data-nav="expressions">Explorer les expressions →</button></section><section class="conjugation-banner"><div><span class="eyebrow">Un verbe, plusieurs façons de parler</span><h2>Je travaille. J’ai travaillé.<br>Je travaillerai.</h2><p>Retrouvez les pronoms, les formes qui changent et les verbes irréguliers.</p></div><button class="primary" data-nav="conjugation">Explorer la conjugaison →</button></section>
  <section aria-labelledby="scenes-title"><div class="section-heading"><div><span class="eyebrow">La vie, tout simplement</span><h2 id="scenes-title">Dans quelle situation êtes-vous ?</h2><p>Choisissez une scène. Chaque mot est une porte d’entrée.</p></div><span class="small">${data.scenes.length} scènes · ${data.scenes.reduce((n,s)=>n+s.phrases.length,0)} expressions</span></div><div class="scene-tools"><label class="search-label" for="scene-search">Trouver une situation ou un mot<input id="scene-search" type="search" placeholder="Taxi, marché, famille, bghit…" value="${e(sceneQuery)}" autocomplete="off"></label><div class="filters" aria-label="Filtrer les situations">${[['all','Tout explorer'],['essentiels','Les essentiels'],['deplacements','Se déplacer'],['achats','Achats'],['sorties','Sorties'],['quotidien','Au quotidien']].map(([id,label])=>`<button data-category="${id}" aria-pressed="${sceneFilter===id}">${label}</button>`).join('')}</div></div><p id="scene-results" class="micro" role="status"></p><div class="scene-grid" id="scene-grid"></div></section>
  <p class="editorial-note">Contenus et transcriptions en cours de relecture. Les illustrations sont générées. Pour apprendre à lire, ouvrez l’alphabet et le guide de lecture.</p>`;
  renderTopicResults();
  renderSceneResults();
}
function renderScene(id,focus=true){
  currentScene=data.scenes.find(s=>s.id===id);quiz=null;builder=null;
  if(!currentScene)return;
  const s=currentScene;
  progress.lastScene=s.id;persistProgress();
  main.innerHTML=`<button class="back" data-nav="scenes">← Toutes les situations</button>${pathContext(s.id)}<section class="scene-top"><div><span class="eyebrow">Regarder · comprendre · retrouver</span><h1>${e(s.title)}</h1><p>${e(s.goal)} Touchez un mot arabe pour explorer sa construction.</p><div class="actions"><button class="primary" data-quiz="${s.id}">M’entraîner · 4 questions</button><button class="secondary" data-build="${s.id}">Construire une phrase</button>${s.dialogue?`<button class="secondary" data-dialogue="${s.id}">Jouer le dialogue</button>`:''}${['directions','reperage','commerces'].includes(s.id)?'<button class="secondary" data-nav="orientation">Pratiquer sur le plan</button>':''}${s.topic?`<button class="secondary" data-topic="${s.topic}">Le vocabulaire du thème</button>`:''}<button class="secondary" data-translations>${translationVisible?'Masquer':'Afficher'} le français</button></div></div>${sceneSprite(s)}</section><section aria-label="Expressions à découvrir" class="phrase-list">${s.phrases.map(p=>`<article class="phrase"><div><div class="arabic-line" lang="ar" dir="rtl">${p.words.map(id=>`<button class="word-button" data-word="${id}" aria-label="Décortiquer ${e(words.get(id).arabic)}">${e(words.get(id).arabic)}</button>`).join('')}</div><p class="latin">${p.words.map(id=>e(words.get(id).latin)).join(' ')}</p></div><p class="phrase-meaning ${translationVisible?'':'hidden-meaning'}">${translationVisible?e(p.meaning):'Traduction masquée'}</p></article>`).join('')}</section>${s.note?`<p class="editorial-note">${e(s.note)}</p>`:''}${writtenNote()}`;
  if(focus){main.focus();window.scrollTo({top:0,behavior:'instant'});}
}

function renderReadingGuide(){
 main.innerHTML=`<button class="back" data-nav="alphabet">← L’alphabet</button><span class="eyebrow">Comprendre avant de mémoriser</span><h1>Les repères de lecture.</h1><p>Des explications pour relier l’écriture, les groupes de sons et le sens. Touchez un exemple pour ouvrir sa fiche.</p><div class="expression-grid">${data.readingGuide.map(g=>`<article class="expression-card"><h2>${e(g.title)}</h2><p>${e(g.text)}</p><div class="actions">${g.words.map(id=>`<button class="secondary" data-word="${id}"><span lang="ar" dir="rtl">${e(words.get(id).arabic)}</span> · ${e(words.get(id).latin)}</button>`).join('')}</div><p class="micro">Référence : M. Quitout, 2001, p. ${g.pages.join(', ')}. Explication reformulée pour ce module.</p></article>`).join('')}</div><p class="editorial-note">Référence consultée : Michel Quitout, Parlons l’arabe dialectal marocain, L’Harmattan, 2001. Le livre et ce module utilisent des conventions différentes. Ces explications ne valent pas validation native de toutes les fiches.</p><button class="primary" data-topic="compter">Explorer les nombres →</button>`;
}

function renderAlphabet(){
  main.innerHTML=`<span class="eyebrow">Lire de droite à gauche</span><h1>Une lettre.<br><em>Un nouveau repère.</em></h1><p class="micro">28 lettres, des formes qui changent selon leur place. Touchez une lettre pour comprendre ses liaisons et son articulation.</p><div class="alphabet-grid" dir="rtl">${data.alphabet.map(l=>`<button class="letter-card" data-letter="${l.id}" aria-label="Lettre ${e(l.name)}"><span class="letter-glyph" lang="ar">${l.letter}</span><span class="letter-name" dir="ltr">${e(l.name)}</span></button>`).join('')}</div><p class="editorial-note">ا د ذ ر ز و ne se lient pas à la lettre suivante, située à leur gauche. Les voyelles brèves sont souvent absentes de l’écriture. Les sons de ث ذ ظ et ق varient selon les mots et les régions ; alphabet arabe et prononciation darija ne se confondent pas.</p><div class="actions"><button class="primary" data-nav="reading-guide">Comprendre les repères de lecture</button></div><h2>Six images pour ancrer les mots</h2><p class="micro">Une porte, une maison, le soleil… Reliez la forme écrite à une image familière.</p><div class="objects">${data.words.filter(w=>w.image!==null).map(w=>`<button class="object-card" data-word="${w.id}" aria-label="Décortiquer ${e(w.meaning)}">${sprite(w.image,'object-image')}<span class="letter-glyph" lang="ar" dir="rtl">${w.arabic}</span><span>${e(w.meaning)}</span></button>`).join('')}</div><div class="editorial-note"><strong>Autres signes utiles</strong><br>ء : hamza, attaque vocalique ; ة : ta marbuta, dont la lecture dépend du contexte ; ّ : shadda, consonne doublée ; َ ِ ُ : signes des voyelles brèves. لا représente deux lettres, lam + alif.</div>`;
}
function renderReviews(){
  main.innerHTML=`<span class="eyebrow">Revenir, sans repartir de zéro</span><h1>Vos mots,<br><em>à votre rythme.</em></h1><p class="micro">Les mots ajoutés et ceux des réponses à revoir restent ici. Gardez ces mots, puis essayez de retrouver leur sens avant de le révéler.</p><div class="actions review-actions"><button class="primary" data-review-session>Ma séance de révision</button><button class="secondary" data-nav="dictionary">Explorer le lexique</button></div>${reviews.size?`<div class="saved-grid">${[...reviews].map(id=>{const w=words.get(id);return `<button class="saved-card" data-word="${id}"><span class="ar" lang="ar" dir="rtl">${w.arabic}</span><strong>${e(w.meaning)}</strong><p class="micro">${e(w.latin)} · ouvrir la fiche</p></button>`;}).join('')}</div>`:'<div class="empty"><h2>Votre collection commence ici.</h2><p>Ouvrez une fiche et choisissez « Garder ce mot ».</p><button class="primary" data-nav="scenes">Explorer une situation</button></div>'}`;
}
function openDialog(html){
  if(!dialog.open)lastOpener=document.activeElement;
  body.innerHTML=html;
  if(!dialog.open)dialog.showModal();
  dialog.scrollTop=0;
  dialog.querySelector('.dialog-close').focus();
}
function openWord(id){
  const w=words.get(id);if(!w)return;
  stopLetterAudio();
  const base=w.formOf?words.get(w.formOf):null;
  const forms=data.words.filter(form=>form.formOf===id);
  const related=base||forms.length?`<section class="word-forms" aria-label="Formes du même mot"><h3>Le mot dans la phrase</h3><div class="actions">${base?`<button class="secondary" data-word="${e(base.id)}">Forme de base : <span lang="ar" dir="rtl">${e(base.arabic)}</span> · ${e(base.latin)}</button>`:''}${forms.map(form=>`<button class="secondary" data-word="${e(form.id)}">${e(form.formLabel)} : <span lang="ar" dir="rtl">${e(form.arabic)}</span> · ${e(form.latin)}</button>`).join('')}</div></section>`:'';
  openDialog(`<div class="word-heading">${wordVisual(w)}<span class="eyebrow">Le mot, pas à pas</span><h2 id="dialog-title" lang="ar" dir="rtl">${e(w.arabic)}</h2><p class="transliteration">${e(w.latin)}</p><p>${e(w.meaning)}</p></div><h3>Du groupe écrit au repère sonore</h3><p class="micro">Suivez les groupes de droite à gauche. Ils ne correspondent pas forcément à des syllabes ni à un son par lettre.</p><div class="chunks" dir="rtl">${w.parts.map((p,i)=>`<button class="chunk" data-part="${i}" data-word-id="${id}" aria-pressed="false" aria-label="Groupe ${e(p.text)}, repère ${e(p.sound)}"><span class="ar" lang="ar">${e(p.text)}</span><span class="sound" dir="ltr">${e(p.sound)}</span></button>`).join('')}</div><p class="sound-guide" id="sound-guide" role="status">Choisissez un groupe pour voir les lettres qui le composent.</p>${w.note?`<p class="editorial-note">${e(w.note)}</p>`:''}${related}<div class="actions"><button class="primary" data-save="${id}">${reviews.has(id)?'Retirer de mes mots':'Garder ce mot'}</button></div>${writtenNote()}<p class="micro">3 = ع · 7 = ح · sh = ش · kh = خ · gh = غ. Ce sont des conventions de lecture, pas des chiffres à prononcer.</p>`);
}
function openLetter(id){
  const l=data.alphabet.find(l=>l.id===id);if(!l)return;
  const examples=data.words.filter(w=>baseLetters(w.arabic).includes(l.letter)).slice(0,5);
  openDialog(`<div class="word-heading"><span class="eyebrow">Comprendre une lettre</span><h2 id="dialog-title" lang="ar">${l.letter}</h2><p class="transliteration">${e(l.name)} · ${e(l.sound)}</p></div><p class="sound-guide">${e(l.note)}</p><div id="letter-listening">${letterAudioMarkup(l)}</div><div class="forms">${[['isolated','Seule'],['initial','Au début'],['medial','Au milieu'],['final','À la fin']].map(([key,label])=>`<div><b lang="ar" dir="rtl" class="${l.forms[key]?'':'missing'}">${l.forms[key]||'—'}</b><span>${label}</span></div>`).join('')}</div><p class="micro">${l.joinsNext?'Cette lettre peut se lier des deux côtés si ses voisines le permettent.':'Pas de forme liée vers la gauche : en début ou au milieu, elle peut garder sa forme isolée ou finale selon la lettre précédente.'}</p><h3>La retrouver dans un mot</h3><div class="letter-examples">${examples.length?examples.map(w=>`<button data-word="${w.id}" lang="ar" dir="rtl">${w.arabic}</button>`).join(''):'<p class="micro">Pas encore d’exemple dans ce petit corpus. La fiche de prononciation reste disponible.</p>'}</div>${writtenNote()}`);
}
function renderSceneResults(){
  const visible=data.scenes.filter(s=>(sceneFilter==='all'||s.category===sceneFilter||(sceneFilter==='essentiels'&&s.essential))&&matchesSearch(sceneQuery,[s.title,s.goal,...s.phrases.flatMap(p=>[p.meaning,...p.words.flatMap(id=>{const w=words.get(id);return [w.arabic,w.latin,w.meaning];})])]));
  main.querySelector('#scene-results').textContent=`${visible.length} situation${visible.length>1?'s':''} trouvée${visible.length>1?'s':''}`;
  main.querySelector('#scene-grid').innerHTML=visible.length?visible.map(s=>`<button class="scene-card" data-start="${s.id}">${sceneSprite(s)}<span class="card-copy"><span class="card-number">SITUATION ${String(data.scenes.indexOf(s)+1).padStart(2,'0')}${s.dialogue?' · DIALOGUE':''}</span><span class="card-title">${e(s.title)}</span><span class="card-description">${e(s.goal)}</span></span></button>`).join(''):'<div class="empty no-results"><h3>Aucune situation trouvée.</h3><p>Essayez un mot plus court ou une autre catégorie.</p><button class="secondary" data-clear-search>Tout afficher</button></div>';
}
function openTopic(id){
  if(id!=='all'&&!data.topics.some(t=>t.id===id))return;
  topicFilter=id;wordQuery='';navigate('dictionary');
}
function renderDictionary(){
  const topic=data.topics.find(t=>t.id===topicFilter);
  main.innerHTML=`<span class="eyebrow">Un mot ouvre une conversation</span><h1>${topic?e(topic.title):'Votre petit<br><em>lexique vivant.</em>'}</h1><p class="micro">${topic?e(topic.intro):'Explorez les mots par thème. Chaque fiche décompose l’écriture et propose un repère de lecture.'}</p><div class="filters topic-filters" aria-label="Thèmes du lexique">${[{id:'all',title:'Tous les mots'},...data.topics].map(t=>`<button data-topic="${t.id}" aria-pressed="${topicFilter===t.id}">${e(t.title)}</button>`).join('')}</div><label class="search-label" for="word-search">Chercher dans ${topic?'ce thème':'le lexique'}<input id="word-search" type="search" placeholder="Maison, bghit, شكرا…" autocomplete="off" value="${e(wordQuery)}"></label>${topic?`<div class="actions topic-actions"><button class="primary" data-topic-review="${topic.id}">Réviser ces mots</button>${(topic.recognitionQuiz||['pays','couleurs'].includes(topic.id))?`<button class="secondary" data-word-quiz="${topic.id}">Reconnaître les mots · 6 questions</button>`:''}${data.scenes.some(s=>s.topic===topic.id||s.id===topic.id)?data.scenes.filter(s=>s.topic===topic.id||s.id===topic.id).map(s=>`<button class="secondary" data-start="${s.id}">${e(s.title)}</button>`).join(''):'<button class="secondary" data-nav="orientation">Pratiquer sur le plan</button>'}</div>`:''}<p class="micro" id="word-results" role="status"></p><div class="saved-grid" id="dictionary-grid"></div>${colorAgreement(topic)}${familyGuide(topic)}${numberExplorer(topic)}`;
  renderWordResults(wordQuery);
}

function familyGuide(topic){
  if(topic?.id!=='famille')return '';
  return `<section class="family-guide"><h2>De quel côté de la famille ?</h2><p>Le darija distingue l’oncle et la tante du côté paternel de ceux du côté maternel.</p><div class="expression-grid">${data.familyGuide.branches.map(b=>`<article class="expression-card"><h3>${e(b.title)}</h3>${b.words.map(id=>`<button class="secondary" data-word="${id}"><span lang="ar" dir="rtl">${e(words.get(id).arabic)}</span> · ${e(words.get(id).meaning)}</button>`).join(' ')}</article>`).join('')}</div><h2>Cousin ou cousine : préciser le lien</h2><p>Weld / bent suivi du proche précise la parenté. Touchez chaque mot pour le décortiquer.</p><div class="expression-grid">${data.familyGuide.cousins.map(p=>`<article class="expression-card">${phraseMarkup(p)}<p>${e(p.meaning)}</p></article>`).join('')}</div><p class="editorial-note">Khuya et khti signifient déjà « mon frère » et « ma sœur ». Ces appellations peuvent aussi s’adresser amicalement à une personne sans lien de parenté : le contexte compte.</p><button class="primary" data-start="famille-parents">Présenter mes parents et mes enfants →</button></section>`;
}


function numberExplorer(topic){
 if(topic?.id!=='compter')return '';
 return `<section class="number-explorer"><h2>Construire un nombre de 0 à 999</h2><p>Après vingt, l’unité précède la dizaine : 23 = trois + et + vingt. Pour les composés en 2, découvrez tnayin.</p><label class="search-label" for="number-input">Choisir un nombre entier<input id="number-input" type="number" min="0" max="999" step="1" value="23"></label><div id="number-reading" aria-live="polite">${phraseMarkup({words:numberWords(23)})}</div><p class="micro">Formes de comptage ; les accords avec les noms et les expressions des prix peuvent différer.</p></section>`;
}

function renderWordResults(query){
  const topic=data.topics.find(t=>t.id===topicFilter);
  const visible=data.words.filter(w=>(!topic||topic.words.includes(w.id))&&matchesSearch(query,[w.arabic,w.latin,w.meaning]));
  main.querySelector('#word-results').textContent=`${visible.length} fiche${visible.length>1?'s':''}`;
  main.querySelector('#dictionary-grid').innerHTML=visible.length?visible.map(w=>`<button class="saved-card ${w.animalImage!==undefined?'animal-card':''}" data-word="${w.id}">${wordVisual(w)}<span class="ar" lang="ar" dir="rtl">${e(w.arabic)}</span><strong>${e(w.meaning)}</strong><p class="micro">${e(w.latin)}</p></button>`).join(''):'<p class="empty no-results">Aucun mot trouvé dans cette sélection. Essayez une autre écriture ou choisissez « Tous les mots ».</p>';
}
const mapHeadings=['le nord ↑','l’est →','le sud ↓','l’ouest ←'];
const mapArrows=['↑','→','↓','←'];
const phraseMarkup=p=>`<div class="arabic-line" lang="ar" dir="rtl">${p.words.map(id=>`<button class="word-button" data-word="${id}">${e(words.get(id).arabic)}</button>`).join('')}</div><p class="latin micro">${p.words.map(id=>e(words.get(id).latin)).join(' ')}</p>`;

let expressionCategory='all',expressionQuery='';
function renderExpressions(){
  main.innerHTML=`<button class="back" data-nav="scenes">← Toutes les situations</button><span class="eyebrow">Parler avec les autres</span><h1>Les expressions,<br><em>dans leur contexte.</em></h1><p>Une formule ne se traduit pas toujours mot à mot. Découvrez son usage, sa réponse et chaque mot qui la compose.</p><div class="actions"><button class="primary" data-start="rencontres">Pratiquer une rencontre</button><button class="secondary" data-start="reperage">Demander de répéter</button></div><div class="scene-tools"><label class="search-label" for="expression-search">Chercher une expression<input id="expression-search" type="search" placeholder="Merci, au revoir, wakha…" value="${e(expressionQuery)}"></label><div class="filters" aria-label="Filtrer les expressions">${['all',...new Set(data.expressions.map(p=>p.category))].map(c=>`<button data-expression-category="${e(c)}" aria-pressed="${expressionCategory===c}">${c==='all'?'Toutes':e(c)}</button>`).join('')}</div></div><p class="micro" id="expression-count" role="status"></p><section id="expression-list" class="expression-grid" aria-label="Expressions courantes"></section>${writtenNote()}`;
  renderExpressionResults();
}
function renderExpressionResults(){
  const visible=data.expressions.filter(p=>(expressionCategory==='all'||p.category===expressionCategory)&&matchesSearch(expressionQuery,[p.meaning,p.usage,p.response,...p.words.flatMap(id=>[words.get(id).arabic,words.get(id).latin])]));
  main.querySelector('#expression-count').textContent=visible.length+' expression'+(visible.length>1?'s':'');
  main.querySelector('#expression-list').innerHTML=visible.map(p=>`<article class="expression-card"><span class="eyebrow">${e(p.category)}</span>${phraseMarkup(p)}<h2>${e(p.meaning)}</h2><p>${e(p.usage)}</p>${p.response?`<p class="editorial-note"><strong>À savoir</strong><br>${e(p.response)}</p>`:''}</article>`).join('')||'<p class="empty">Aucune expression trouvée. Essayez un autre mot ou choisissez « Toutes ».</p>';
}

function renderOrientation(){
  if(!routeState)resetRoute(data.neighborhood.routes[0].id,false);
  const map=data.neighborhood,{route,position,index,feedback,showFrench}=routeState;
  const target=map.places.find(p=>p.word===route.destination),done=index===route.steps.length;
  main.innerHTML=`<button class="back" data-nav="scenes">← Toutes les situations</button><span class="eyebrow">Les directions et les lieux</span><h1>Retrouvez votre chemin.</h1><p class="micro">Un quartier fictif pour s’entraîner. Départ en bas, face au nord. À chaque instruction, avancez d’un carrefour ; pour tourner, pivotez d’abord puis avancez.</p><div class="route-layout"><section class="neighborhood" aria-labelledby="map-title"><div class="map-heading"><h2 id="map-title">Le quartier</h2><span>Nord ↑</span></div><p class="micro">Touchez un lieu pour ouvrir sa fiche. Les bâtiments symbolisent les arrêts aux carrefours.</p><div class="map-grid" aria-label="Plan du quartier, nord en haut">${Array.from({length:map.size*map.size},(_,i)=>{const x=i%map.size,y=Math.floor(i/map.size),place=map.places.find(p=>p.x===x&&p.y===y),here=position.x===x&&position.y===y;return `<div class="map-cell ${here?'you-are-here':''}">${place?`<button class="map-place" data-word="${place.word}" aria-label="${e(place.label)}, ligne ${y+1}, colonne ${x+1}. Ouvrir la fiche"><span lang="ar" dir="rtl">${e(words.get(place.word).arabic)}</span><strong>${e(place.label)}</strong></button>`:'<span class="departure">Départ</span>'}${here?`<span class="map-marker" aria-label="Vous êtes ici, face à ${mapHeadings[position.heading]}">${mapArrows[position.heading]} Vous</span>`:''}</div>`;}).join('')}</div><p id="map-position" class="map-position" role="status">Position : ligne ${position.y+1}, colonne ${position.x+1} · face à ${mapHeadings[position.heading]}.</p><details><summary>Lire le plan en texte</summary><ol>${Array.from({length:map.size},(_,y)=>`<li>Du côté ouest au côté est : ${Array.from({length:map.size},(_,x)=>map.places.find(p=>p.x===x&&p.y===y)?.label||'départ').map(e).join(' · ')}.</li>`).join('')}</ol><p>Les lignes sont listées du nord au sud.</p></details></section><section class="route-panel" aria-labelledby="route-title"><label class="search-label" for="route-select">Choisir un trajet<select id="route-select">${map.routes.map(r=>`<option value="${r.id}" ${r.id===route.id?'selected':''}>${e(map.places.find(p=>p.word===r.destination).label)}</option>`).join('')}</select></label><h2 id="route-title">Destination : ${e(target.label)}</h2><button class="secondary" data-route-french aria-pressed="${showFrench}">${showFrench?'Masquer':'Afficher'} l’aide en français</button><ol class="route-instructions">${route.steps.map((command,i)=>`<li ${i===index?'aria-current="step"':''} class="${i<index?'completed-step':''}"><span class="micro">Étape ${i+1}${i<index?' · faite':''}</span>${phraseMarkup(map.commands[command])}${showFrench?`<p class="micro">${e(map.commands[command].meaning)}</p>`:''}</li>`).join('')}</ol><p class="micro">${done?'Trajet terminé':`Étape ${index+1} sur ${route.steps.length} : choisissez le mouvement correspondant.`}</p><div class="route-controls">${[['left','↰','Tourner à gauche et avancer'],['forward','↑','Avancer tout droit'],['right','↱','Tourner à droite et avancer']].map(([command,arrow,label])=>`<button class="secondary" data-move="${command}" ${done?'disabled':''}><svg class="turn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${command==='forward'?'<path d="M12 21V3m-6 6 6-6 6 6"/>':command==='left'?'<path d="M17 21v-8a6 6 0 0 0-6-6H3m5-5L3 7l5 5"/>':'<path d="M7 21v-8a6 6 0 0 1 6-6h8m-5-5 5 5-5 5"/>'}</svg>${label}</button>`).join('')}</div><p class="route-feedback feedback" role="status">${e(feedback)}</p><div class="actions"><button class="secondary" data-route-reset>Recommencer</button>${done?'<button class="primary" data-route-next>Un autre trajet →</button>':''}</div></section></div><section class="spatial-examples"><div class="section-heading"><div><span class="eyebrow">Décrire où se trouve un lieu</span><h2>Près, à côté, entre…</h2></div><button class="secondary" data-topic="reperes">Tous les repères</button></div><div class="phrase-list">${map.examples.map(p=>`<article class="phrase"><div>${phraseMarkup(p)}</div><p class="phrase-meaning">${e(p.meaning)}</p></article>`).join('')}</div><p class="micro">${e(map.note)} Les consignes sir et dor s’adressent ici à un homme ; les formes siri et dori s’emploient pour une femme.</p></section>${writtenNote()}`;
}
function resetRoute(id,render=true){
  const route=data.neighborhood.routes.find(r=>r.id===id);if(!route)return;
  routeState={route,position:{...data.neighborhood.start},index:0,feedback:'',showFrench:routeState?.showFrench||false};
  if(render)renderOrientation();
}
function followRoute(command){
  if(!routeState||routeState.index>=routeState.route.steps.length)return;
  const expected=routeState.route.steps[routeState.index];
  if(command!==expected){
    routeState.feedback='Regardez de nouveau la consigne : '+data.neighborhood.commands[expected].meaning+' Votre position n’a pas changé. Ces mots sont dans vos révisions.';
    data.neighborhood.commands[expected].words.forEach(id=>reviews.add(id));persist();
  }else{
    const next=moveOnMap(routeState.position,command,data.neighborhood.size);if(!next)return;
    routeState.position=next;routeState.index++;
    routeState.feedback=routeState.index===routeState.route.steps.length?'Vous êtes arrivé ! Le trajet est terminé.':'Bien vu. Vous regardez maintenant vers '+mapHeadings[next.heading]+'.';
  }
  renderOrientation();(main.querySelector('[data-route-next]')||main.querySelector(`[data-move="${command}"]`))?.focus();
}
let dialogueState=null;
function startDialogue(id){
  const scene=data.scenes.find(s=>s.id===id);if(!scene?.dialogue)return;
  dialogueState={scene,shown:1};renderDialogue();main.focus();
}
function renderDialogue(){
  const {scene,shown}=dialogueState;
  main.innerHTML=`<button class="back" data-start="${scene.id}">← Revenir à la situation</button><section class="conversation"><span class="eyebrow">Une conversation, une réplique à la fois</span><h1>${e(scene.title)}</h1><p class="micro">Lisez la réplique. Imaginez la réponse avant de découvrir la suivante. Chaque mot reste consultable.</p><div class="dialogue-turns">${scene.dialogue.slice(0,shown).map((turn,i)=>{const p=scene.phrases.find(p=>p.id===turn.phraseId);return `<article class="dialogue-turn ${turn.speaker!==scene.dialogue[0].speaker?'alternate':''}"><span class="speaker">${e(turn.speaker)}</span><div class="arabic-line" lang="ar" dir="rtl">${p.words.map(id=>`<button class="word-button" data-word="${id}">${e(words.get(id).arabic)}</button>`).join('')}</div><p class="micro">${p.words.map(id=>e(words.get(id).latin)).join(' ')}</p><details><summary>Voir le sens</summary><p>${e(p.meaning)}</p></details></article>`;}).join('')}</div><p class="micro" role="status">${shown} réplique${shown>1?'s':''} sur ${scene.dialogue.length}</p><div class="actions">${shown<scene.dialogue.length?'<button class="primary" data-dialogue-next>Découvrir la suite</button>':`<button class="primary" data-build="${scene.id}">À vous de construire une phrase</button>`}<button class="secondary" data-dialogue="${scene.id}">Recommencer</button></div>${writtenNote()}</section>`;
}
function startBuilder(id){
  const scene=data.scenes.find(s=>s.id===id);if(!scene)return;
  const candidates=scene.phrases.filter(p=>p.words.length>=2);
  if(!candidates.length)return;
  builder={scene,phrases:shuffle(candidates),index:0,picked:[],tiles:[],checked:false,assisted:false,feedback:''};
  prepareBuilder();main.focus();
}
function prepareBuilder(){
  const phrase=builder.phrases[builder.index];
  builder.tiles=shuffle(phrase.words.map((id,index)=>({id,index})));
  builder.picked=[];builder.checked=false;builder.assisted=false;builder.feedback='';renderBuilder();
}
function renderBuilder(){
  const phrase=builder.phrases[builder.index];
  main.innerHTML=`<button class="back" data-start="${builder.scene.id}">← Revenir à la situation</button><section class="quiz"><span class="eyebrow">Construire · ${builder.index+1} / ${builder.phrases.length}</span><h2>« ${e(phrase.meaning)} »</h2><p class="micro">Choisissez les mots dans l’ordre. Le premier se place à droite. Touchez un mot placé pour le retirer.</p><div class="sentence-area" dir="rtl" aria-label="Votre phrase">${builder.picked.length?builder.picked.map((index,i)=>`<button class="word-tile" data-unpick="${i}" ${builder.checked?'disabled':''} lang="ar">${e(words.get(phrase.words[index]).arabic)}</button>`).join(''):'<span class="micro" dir="ltr">Votre phrase apparaîtra ici.</span>'}</div><div class="word-bank" dir="rtl" aria-label="Mots disponibles">${builder.tiles.map(tile=>`<button class="word-tile" data-pick="${tile.index}" lang="ar" ${builder.checked||builder.picked.includes(tile.index)?'disabled':''}>${e(words.get(tile.id).arabic)}</button>`).join('')}</div><div class="actions"><button class="primary" data-check-order ${builder.checked||builder.picked.length!==phrase.words.length?'disabled':''}>Vérifier ma phrase</button><button class="secondary" data-builder-reset>Recommencer la phrase</button><button class="secondary" data-order-help ${builder.checked?'disabled':''}>Voir un indice</button></div><p class="feedback" role="status">${e(builder.feedback)}</p>${builder.checked?`<button class="primary" data-builder-next>${builder.index+1<builder.phrases.length?'Phrase suivante':'Terminer cette séance'}</button>`:''}</section>`;
}
function checkBuilder(){
  const phrase=builder.phrases[builder.index];
  if(builder.checked||builder.picked.length!==phrase.words.length)return;
  if(correctOrder(phrase.words,builder.picked.map(i=>phrase.words[i]))){
    builder.checked=true;builder.feedback=(builder.assisted?'Phrase reconstruite avec un indice. ':'Bien joué, les mots sont dans le bon ordre. ')+phrase.words.map(id=>words.get(id).latin).join(' ');
  }else{
    builder.feedback='Pas encore : retirez les mots à déplacer, puis réessayez. Les mots de cette phrase ont été ajoutés à vos révisions.';
    phrase.words.forEach(id=>reviews.add(id));persist();
  }
  renderBuilder();
}
function startReviewSession(topicId){
  const topic=data.topics.find(t=>t.id===topicId);
  const ids=topic?topic.words:reviews.size?[...reviews]:data.words.filter(w=>w.image!==null).map(w=>w.id);
  reviewSession={queue:shuffle(ids).slice(0,8),repeated:new Set(),revealed:false,studied:new Set(),fallback:!topic&&!reviews.size,topicId:topic?.id||null};
  renderReviewSession();main.focus();
}
function renderReviewSession(){
  const session=reviewSession;
  if(!session.queue.length){main.innerHTML=`<section class="quiz"><span class="eyebrow">Revenir sur ses mots</span><h1>Séance terminée.</h1><p>${session.studied.size} mot${session.studied.size>1?'s':''} revu${session.studied.size>1?'s':''}.</p><p class="micro">Ce bilan reflète votre autoévaluation du sens, pas une mesure de prononciation. Vos mots restent dans la collection.</p><div class="actions"><button class="primary" data-review-session="${session.topicId||''}">Une autre séance</button><button class="secondary" data-nav="reviews">Mes mots</button></div></section>`;return;}
  const w=words.get(session.queue[0]);
  main.innerHTML=`<button class="back" data-nav="reviews">← Quitter la séance</button><section class="quiz review-flashcard"><span class="eyebrow">${session.queue.length} carte${session.queue.length>1?'s':''} restante${session.queue.length>1?'s':''}</span>${session.fallback?'<p class="micro">Pour commencer, voici les six mots illustrés.</p>':''}<h2>Quel est le sens de ce mot ?</h2>${session.revealed?wordVisual(w):''}${w.image!==null&&session.revealed?sprite(w.image,'object-image flashcard-image'):''}<div class="review-arabic" lang="ar" dir="rtl">${e(w.arabic)}</div>${session.revealed?`<div class="revealed-answer"><h3>${e(w.meaning)}</h3><p>${e(w.latin)}</p></div><div class="actions"><button class="primary" data-review-grade="known">Je l’avais retrouvé</button><button class="secondary" data-review-grade="again">À revoir</button><button class="secondary" data-word="${w.id}">Décortiquer</button></div>`:'<p class="micro">Essayez de retrouver le sens avant de regarder.</p><button class="primary" data-reveal-review>Révéler le sens</button>'}</section>`;
}
function gradeReview(grade){
  if(!reviewSession?.revealed)return;
  const id=reviewSession.queue.shift();reviewSession.studied.add(id);
  if(grade==='again'){
    reviews.add(id);persist();
    if(!reviewSession.repeated.has(id)){reviewSession.queue.push(id);reviewSession.repeated.add(id);}
  }
  reviewSession.revealed=false;renderReviewSession();main.querySelector('[data-reveal-review]')?.focus();
}
function shuffle(items){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function startQuiz(id){const scene=data.scenes.find(s=>s.id===id);if(!scene)return;currentScene=scene;quiz={scene,index:0,score:0,answered:false,order:shuffle(scene.phrases)};renderQuiz();main.focus();}
function renderQuiz(){
  if(quiz.index>=quiz.order.length){if(!quiz.saved){progress=recordScore(progress,quiz.scene.id,quiz.score,quiz.order.length);persistProgress();quiz.saved=true;}main.innerHTML=`<section class="quiz"><span class="eyebrow">Une petite séance, un pas de plus</span><h1>Séance terminée.</h1><p>${quiz.score} réponse${quiz.score>1?'s':''} juste${quiz.score>1?'s':''} sur ${quiz.order.length}.</p><p class="micro">Les mots des expressions manquées sont dans « Mes mots ». Ce bilan mesure cet exercice, pas votre prononciation.</p><div class="actions"><button class="primary" data-quiz="${quiz.scene.id}">Recommencer</button><button class="secondary" data-nav="reviews">Retrouver mes mots</button>${pathNextAction(quiz.scene.id)}</div></section>`;return;}
  quiz.answered=false;
  const q=quiz.order[quiz.index];
  main.innerHTML=`<button class="back" data-start="${quiz.scene.id}">← Revenir à la situation</button><section class="quiz"><span class="eyebrow">${e(quiz.scene.title)} · ${quiz.index+1} / ${quiz.order.length}</span><h2>Comment dire :<br>« ${e(q.meaning)} » ?</h2><div class="progress" aria-hidden="true"><span style="width:${quiz.index/quiz.order.length*100}%"></span></div><p class="micro">Choisissez l’expression correspondante.</p><div class="answers">${shuffle(quiz.scene.phrases).map(p=>`<button class="answer" data-answer="${p.id}" lang="ar" dir="rtl">${e(phraseText(p,words))}</button>`).join('')}</div><p class="feedback" role="status"></p><button class="primary" data-next disabled>Continuer →</button></section>`;
}
function answer(id){
  if(!quiz||quiz.answered)return;quiz.answered=true;
  const q=quiz.order[quiz.index],correct=id===q.id;
  if(correct)quiz.score++;else{q.words.forEach(id=>reviews.add(id));persist();}
  main.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;if(b.dataset.answer===q.id)b.classList.add('correct');else if(b.dataset.answer===id)b.classList.add('wrong');});
  main.querySelector('.feedback').textContent=correct?'Oui ! '+q.words.map(id=>words.get(id).latin).join(' ')+' — '+q.meaning:'À revoir : '+q.words.map(id=>words.get(id).latin).join(' ')+' — '+q.meaning+' Les mots ont été ajoutés à vos révisions.';
  main.querySelector('[data-next]').disabled=false;
}
let conjugationVerb='khdem',conjugationTense='present',conjugationNegative=false,conjugationQuiz=null,conjugationDetail=null;
const selectedVerb=()=>data.conjugation.verbs.find(v=>v.id===conjugationVerb);
const selectedTense=()=>data.conjugation.tenses.find(t=>t.id===conjugationTense);
function renderConjugation(){
  const section=data.conjugation,verb=selectedVerb(),tense=selectedTense();
  main.innerHTML=`<span class="eyebrow">Conjuguer, comprendre, réutiliser</span><h1>Du verbe<br><em>à la phrase.</em></h1><p class="micro">Six verbes du quotidien, huit pronoms et trois repères de temps. Choisissez une forme pour comprendre ce qui change.</p><section class="conjugation-controls" aria-label="Choisir une conjugaison"><label class="search-label" for="conjugation-verb">Le verbe<select id="conjugation-verb">${section.verbs.map(v=>`<option value="${v.id}" ${v.id===verb.id?'selected':''}>${e(v.title)} · ${e(v.latin)}</option>`).join('')}</select></label><div class="filters" aria-label="Temps du verbe">${section.tenses.map(t=>`<button data-conjugation-tense="${t.id}" aria-pressed="${t.id===tense.id}">${e(t.title)}</button>`).join('')}</div><div class="filters polarity-controls" aria-label="Affirmation ou négation"><button data-conjugation-negative="false" aria-pressed="${!conjugationNegative}">Affirmatif</button><button data-conjugation-negative="true" aria-pressed="${conjugationNegative}">Négatif · ma…sh</button></div></section><div class="conjugation-layout"><section class="conjugation-board" aria-labelledby="conjugation-title"><div class="section-heading"><div><span class="eyebrow">${e(tense.cue)}</span><h2 id="conjugation-title">${e(verb.title)} · ${e(tense.title.toLowerCase())}</h2><p>${conjugationNegative?'Je ne… · Une négation autour du verbe ou du repère de futur.':'Du pronom à la forme conjuguée.'}</p></div><button class="primary" data-conjugation-quiz>M’entraîner · 6 questions</button></div><table class="conjugation-table"><caption class="micro">Touchez une forme pour explorer sa construction. Les groupes sont des repères grammaticaux, pas des syllabes.</caption><thead><tr><th scope="col">Qui ?</th><th scope="col">La forme et son sens</th></tr></thead><tbody>${section.persons.map(p=>{const f=conjugatedForm(verb,tense.id,p.id,conjugationNegative);return `<tr><th scope="row"><span class="pronoun-ar" lang="ar" dir="rtl">${e(p.arabic)}</span><span class="micro">${e(p.latin)} · ${e(p.meaning)}</span></th><td><button class="conjugation-form" data-conjugation-person="${p.id}" aria-label="Décortiquer ${e(f.meaning)}"><span lang="ar" dir="rtl">${e(f.arabic)}</span><small>${e(f.latin)}</small></button><p class="micro">${e(f.meaning)}</p></td></tr>`;}).join('')}</tbody></table></section><aside class="grammar-notes" aria-labelledby="grammar-title"><span class="eyebrow">Comprendre le mécanisme</span><h2 id="grammar-title">${e(tense.title)}</h2><p>${e(tense.rule)}</p><div class="form-legend">${['aspect','person','stem','ending','future','negative'].map(role=>`<span class="role-${role}">${e(section.roles[role])}</span>`).join('')}</div><h3>Ce verbe a ses particularités.</h3>${verb.notes.map(note=>`<p class="micro">${e(note)}</p>`).join('')}<details><summary>Les pronoms et les variantes</summary>${section.notes.map(note=>`<p>${e(note)}</p>`).join('')}</details>${writtenNote()}</aside></div><section class="imperatives" aria-labelledby="imperative-title"><span class="eyebrow">Une consigne, un conseil</span><h2 id="imperative-title">Pour donner un ordre</h2><p class="micro">La personne à qui vous parlez compte. Ces formes affirmatives s’emploient seules ; elles ne se construisent pas toujours en retirant ka-.</p><div class="imperative-grid">${['nta','nti','ntuma'].map(id=>{const p=section.persons.find(p=>p.id===id),f=verb.imperatives[id];return `<article><span class="micro">${e(p.meaning)}</span><button class="conjugation-form" data-conjugation-imperative="${id}"><span lang="ar" dir="rtl">${e(f.parts.map(p=>p.text).join(''))}</span><small>${e(f.parts.map(p=>p.sound).join(''))}</small></button><p>${e(f.meaning)}</p></article>`;}).join('')}</div></section>`;
}
function openConjugation(person,imperative=false){
  const verb=selectedVerb(),p=data.conjugation.persons.find(p=>p.id===person);if(!p)return;
  const f=imperative?verb.imperatives[person]:conjugatedForm(verb,conjugationTense,person,conjugationNegative);if(!f)return;
  const parts=f.parts,arabic=parts.map(p=>p.text).join(''),latin=parts.map(p=>p.sound).join('');conjugationDetail={parts};
  openDialog(`<div class="word-heading"><span class="eyebrow">${e(verb.title)} · ${imperative?'ordre':e(selectedTense().title)} · ${e(p.latin)}</span><h2 id="dialog-title" lang="ar" dir="rtl">${e(arabic)}</h2><p class="transliteration">${e(latin)}</p><p>${e(f.meaning)}</p></div><h3>Ce qui reste, ce qui change</h3><p class="micro">Ces groupes montrent la construction grammaticale. Les voyelles brèves peuvent varier selon les usages ; le découpage montre les éléments de la forme proposée.</p><div class="conjugation-chunks" dir="rtl">${parts.map((part,index)=>part.role==='space'?'':`<button class="conjugation-chunk role-${part.role}" data-conjugation-part="${index}" aria-pressed="false"><span class="ar" lang="ar">${e(part.text)}</span><span dir="ltr">${e(part.sound)}</span><small dir="ltr">${e(data.conjugation.roles[part.role])}</small></button>`).join('')}</div><p id="conjugation-guide" class="sound-guide" role="status">Touchez un groupe pour lire son rôle et ses lettres.</p>${verb.notes.map(note=>`<p class="micro">${e(note)}</p>`).join('')}${writtenNote()}`);
}
function startConjugationQuiz(){
  conjugationQuiz={verb:selectedVerb(),tense:conjugationTense,negative:conjugationNegative,persons:shuffle(data.conjugation.persons).slice(0,6),index:0,score:0,mistakes:[],answered:false};
  prepareConjugationQuestion();main.focus();
}
function prepareConjugationQuestion(){
  const q=conjugationQuiz;if(q.index>=q.persons.length){renderConjugationQuiz();return;}
  q.answered=false;q.feedback='';
  const correct=conjugatedForm(q.verb,q.tense,q.persons[q.index].id,q.negative);
  const distinct=[...new Map(data.conjugation.persons.map(p=>{const f=conjugatedForm(q.verb,q.tense,p.id,q.negative);return [f.arabic,f];})).values()];
  q.options=shuffle([correct,...shuffle(distinct.filter(f=>f.arabic!==correct.arabic)).slice(0,3)]);
  q.correct=correct;renderConjugationQuiz();
}
function renderConjugationQuiz(){
  const q=conjugationQuiz;
  if(q.index>=q.persons.length){
    main.innerHTML=`<section class="quiz"><span class="eyebrow">Conjugaison · ${e(q.verb.title)}</span><h1>Séance terminée.</h1><p>${q.score} réponse${q.score>1?'s':''} juste${q.score>1?'s':''} sur ${q.persons.length}.</p>${q.mistakes.length?`<h3>Les formes à revoir</h3><div class="conjugation-mistakes">${q.mistakes.map(m=>`<article><b>${e(m.person.latin)} · ${e(m.person.meaning)}</b><span class="ar" lang="ar" dir="rtl">${e(m.form.arabic)}</span><p class="micro">${e(m.form.latin)} · ${e(m.form.meaning)}</p></article>`).join('')}</div>`:'<p>Vous avez retrouvé les six formes de cette séance.</p>'}<p class="micro">Ce bilan mesure le choix de formes dans cet exercice. Les erreurs restent affichées dans ce bilan de séance.</p><div class="actions"><button class="primary" data-conjugation-quiz>Recommencer</button><button class="secondary" data-nav="conjugation">Revoir le tableau</button></div></section>`;return;
  }
  const p=q.persons[q.index],tense=data.conjugation.tenses.find(t=>t.id===q.tense);
  main.innerHTML=`<button class="back" data-nav="conjugation">← Revenir au tableau</button><section class="quiz"><span class="eyebrow">Conjugaison · ${q.index+1} / ${q.persons.length}</span><h2>${e(q.verb.title)}<br>avec ${e(p.latin)} · ${e(p.meaning)}</h2><p class="micro">${e(tense.title)} · forme ${q.negative?'négative':'affirmative'}. Choisissez le verbe conjugué ; le pronom n’est pas à ajouter dans la réponse.</p><div class="answers">${q.options.map((f,i)=>`<button class="answer ${q.answered?(f.arabic===q.correct.arabic?'correct':i===q.chosen?'wrong':''):''}" data-conjugation-answer="${i}" lang="ar" dir="rtl" ${q.answered?'disabled':''}>${e(f.arabic)}</button>`).join('')}</div><p class="feedback" role="status">${e(q.feedback)}</p><div class="actions"><button class="primary" data-conjugation-next ${q.answered?'':'disabled'}>Continuer →</button>${q.answered?`<button class="secondary" data-conjugation-person="${p.id}">Comprendre la bonne forme</button>`:''}</div></section>`;
}
function answerConjugation(index){
  const q=conjugationQuiz;if(!q||q.answered||!q.options[index])return;
  q.answered=true;q.chosen=index;const correct=q.options[index].arabic===q.correct.arabic;
  if(correct)q.score++;else q.mistakes.push({person:q.persons[q.index],form:q.correct});
  q.feedback=(correct?'Oui ! ':'À revoir : ')+q.correct.latin+' — '+q.correct.meaning;
  renderConjugationQuiz();main.querySelector('[data-conjugation-next]').focus();
}

let vocabularyQuiz=null;
function startWordQuiz(topicId){
  const topic=data.topics.find(t=>t.id===topicId);if(!topic)return;
  const ids=topic.colorQuiz||topic.words;
  vocabularyQuiz={topic,ids,questions:shuffle(ids).slice(0,6),index:0,score:0,answered:false,mistakes:[]};
  prepareWordQuestion();main.focus();
}
function prepareWordQuestion(){
  const q=vocabularyQuiz;if(q.index>=q.questions.length){renderWordQuiz();return;}
  q.answered=false;q.feedback='';const id=q.questions[q.index];
  q.options=shuffle([id,...shuffle(q.ids.filter(other=>other!==id&&words.get(other).arabic!==words.get(id).arabic)).slice(0,3)]);
  renderWordQuiz();
}
function renderWordQuiz(){
  const q=vocabularyQuiz;
  if(q.index>=q.questions.length){
    main.innerHTML=`<section class="quiz"><span class="eyebrow">${e(q.topic.title)} · retrouver le mot</span><h1>Séance terminée.</h1><p>${q.score} réponse${q.score>1?'s':''} juste${q.score>1?'s':''} sur ${q.questions.length}.</p>${q.mistakes.length?`<p class="micro">Ces mots ont été ajoutés à vos révisions :</p><div class="letter-examples">${q.mistakes.map(id=>`<button data-word="${id}" lang="ar" dir="rtl">${e(words.get(id).arabic)}</button>`).join('')}</div>`:'<p>Vous avez retrouvé les six mots.</p>'}<div class="actions review-actions"><button class="primary" data-word-quiz="${q.topic.id}">Recommencer</button><button class="secondary" data-topic="${q.topic.id}">Revenir au thème</button></div>${writtenNote()}</section>`;return;
  }
  const w=words.get(q.questions[q.index]);
  main.innerHTML=`<button class="back" data-topic="${q.topic.id}">← Revenir au thème</button><section class="quiz vocabulary-quiz"><span class="eyebrow">${e(q.topic.title)} · ${q.index+1} / ${q.questions.length}</span><h2>Comment dire « ${e(w.meaning)} » ?</h2>${wordVisual(w)}<p class="micro">Choisissez le nom correspondant.${q.topic.id==='couleurs'?' La séance utilise les douze couleurs au masculin.':''}</p><div class="answers">${q.options.map(id=>`<button class="answer ${q.answered?(id===w.id?'correct':id===q.chosen?'wrong':''):''}" data-word-answer="${id}" lang="ar" dir="rtl" ${q.answered?'disabled':''}>${e(words.get(id).arabic)}</button>`).join('')}</div><p class="feedback" role="status">${e(q.feedback)}</p><div class="actions"><button class="primary" data-word-next ${q.answered?'':'disabled'}>Continuer →</button>${q.answered?`<button class="secondary" data-word="${w.id}">Décortiquer le mot</button>`:''}</div></section>`;
}
function answerWordQuiz(id){
  const q=vocabularyQuiz;if(!q||q.answered||!q.options.includes(id))return;
  q.answered=true;q.chosen=id;const w=words.get(q.questions[q.index]),correct=id===w.id;
  if(correct)q.score++;else{q.mistakes.push(w.id);reviews.add(w.id);persist();}
  q.feedback=(correct?'Oui ! ':'À revoir : ')+w.latin+' — '+w.meaning;
  renderWordQuiz();main.querySelector('[data-word-next]').focus();
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled||!data)return;
  if(b.dataset.view){if(b.dataset.view==='dictionary'){topicFilter='all';wordQuery='';}navigate(b.dataset.view);}
  if(b.dataset.nav)navigate(b.dataset.nav);
  if(b.dataset.start)renderScene(b.dataset.start);
  if(b.dataset.conjugationTense){conjugationTense=b.dataset.conjugationTense;renderConjugation();main.querySelector(`[data-conjugation-tense="${conjugationTense}"]`).focus();}
  if(b.dataset.conjugationNegative!==undefined){conjugationNegative=b.dataset.conjugationNegative==='true';renderConjugation();main.querySelector(`[data-conjugation-negative="${b.dataset.conjugationNegative}"]`).focus();}
  if(b.dataset.conjugationPerson)openConjugation(b.dataset.conjugationPerson);
  if(b.dataset.conjugationImperative)openConjugation(b.dataset.conjugationImperative,true);
  if(b.dataset.conjugationPart!==undefined&&conjugationDetail){
    const part=conjugationDetail.parts[Number(b.dataset.conjugationPart)];if(!part)return;
    body.querySelectorAll('[data-conjugation-part]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    const names=baseLetters(part.text).map(letter=>data.alphabet.find(l=>l.letter===letter)?.name||letter);
    body.querySelector('#conjugation-guide').textContent=`${data.conjugation.roles[part.role]} : ${part.sound}. Lettres : ${names.join(' + ')}.`;
  }
  if(b.hasAttribute('data-conjugation-quiz'))startConjugationQuiz();
  if(b.dataset.conjugationAnswer!==undefined)answerConjugation(Number(b.dataset.conjugationAnswer));
  if(b.hasAttribute('data-conjugation-next')&&conjugationQuiz?.answered){conjugationQuiz.index++;prepareConjugationQuestion();(main.querySelector('[data-conjugation-answer]')||main.querySelector('[data-conjugation-quiz]'))?.focus();}

  if(b.hasAttribute('data-translations')){translationVisible=!translationVisible;renderScene(currentScene.id,false);main.querySelector('[data-translations]').focus();}
  if(b.dataset.path)openPath(b.dataset.path);
  if(b.dataset.pathScene){activePath=b.dataset.pathId;renderScene(b.dataset.pathScene);}
  if(b.dataset.topicGroup){topicGroup=b.dataset.topicGroup;main.querySelectorAll('[data-topic-group]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderTopicResults();}
  if(b.dataset.speakLetter)speakLetter(b.dataset.speakLetter);
  if(b.dataset.word)openWord(b.dataset.word);
  if(b.dataset.topic)openTopic(b.dataset.topic);
  if(b.dataset.wordQuiz)startWordQuiz(b.dataset.wordQuiz);
  if(b.dataset.wordAnswer)answerWordQuiz(b.dataset.wordAnswer);
  if(b.hasAttribute('data-word-next')&&vocabularyQuiz?.answered){vocabularyQuiz.index++;prepareWordQuestion();(main.querySelector('[data-word-answer]')||main.querySelector('[data-word-quiz]'))?.focus();}
  if(b.dataset.topicReview)startReviewSession(b.dataset.topicReview);
  if(b.dataset.move)followRoute(b.dataset.move);
  if(b.hasAttribute('data-route-reset')&&routeState){resetRoute(routeState.route.id);main.querySelector('[data-route-reset]').focus();}
  if(b.hasAttribute('data-route-next')&&routeState){const routes=data.neighborhood.routes;resetRoute(routes[(routes.indexOf(routeState.route)+1)%routes.length].id);main.focus();}
  if(b.hasAttribute('data-route-french')&&routeState){routeState.showFrench=!routeState.showFrench;renderOrientation();main.querySelector('[data-route-french]').focus();}
  if(b.dataset.expressionCategory){expressionCategory=b.dataset.expressionCategory;renderExpressions();main.querySelector('[data-expression-category="'+expressionCategory+'"]')?.focus();}
  if(b.dataset.letter)openLetter(b.dataset.letter);
  if(b.dataset.save){const id=b.dataset.save;reviews.has(id)?reviews.delete(id):reviews.add(id);persist();b.textContent=reviews.has(id)?'Retirer de mes mots':'Garder ce mot';if(currentView==='reviews'&&!reviewSession)renderReviews();}
  if(b.dataset.part!==undefined){
    const p=words.get(b.dataset.wordId).parts[Number(b.dataset.part)];
    body.querySelectorAll('[data-part]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    const names=baseLetters(p.text).map(letter=>data.alphabet.find(l=>l.letter===letter)?.name||letter);
    body.querySelector('#sound-guide').textContent=`Lettres : ${names.join(' + ')}. Repère de lecture : ${p.sound}. Les voyelles non écrites et le contexte expliquent certaines différences.`;
  }
  if(b.dataset.quiz)startQuiz(b.dataset.quiz);
  if(b.dataset.answer)answer(b.dataset.answer);
  if(b.hasAttribute('data-next')&&quiz?.answered){quiz.index++;renderQuiz();main.querySelector('[data-answer]')?.focus();}
  if(b.dataset.category){sceneFilter=b.dataset.category;main.querySelectorAll('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderSceneResults();}
  if(b.hasAttribute('data-clear-search')){sceneFilter='all';sceneQuery='';renderScenes();main.querySelector('#scene-search').focus();}
  if(b.dataset.dialogue)startDialogue(b.dataset.dialogue);
  if(b.hasAttribute('data-dialogue-next')&&dialogueState){dialogueState.shown=Math.min(dialogueState.shown+1,dialogueState.scene.dialogue.length);renderDialogue();(main.querySelector('[data-dialogue-next]')||main.querySelector('[data-build]'))?.focus();}
  if(b.dataset.build)startBuilder(b.dataset.build);
  if(b.dataset.pick!==undefined&&builder&&!builder.checked){builder.picked.push(Number(b.dataset.pick));builder.feedback='';renderBuilder();(main.querySelector('[data-pick]:not(:disabled)')||main.querySelector('[data-check-order]'))?.focus();}
  if(b.dataset.unpick!==undefined&&builder&&!builder.checked){builder.picked.splice(Number(b.dataset.unpick),1);builder.feedback='';renderBuilder();main.querySelector('[data-pick]:not(:disabled)')?.focus();}
  if(b.hasAttribute('data-check-order')&&builder){checkBuilder();main.querySelector(builder.checked?'[data-builder-next]':'[data-unpick]')?.focus();}
  if(b.hasAttribute('data-builder-reset')&&builder)prepareBuilder();
  if(b.hasAttribute('data-order-help')&&builder&&!builder.checked){const p=builder.phrases[builder.index];builder.assisted=true;builder.feedback='Premier mot à placer : '+words.get(p.words[0]).arabic+' ('+words.get(p.words[0]).latin+').';renderBuilder();main.querySelector('[data-order-help]')?.focus();}
  if(b.hasAttribute('data-builder-next')&&builder?.checked){builder.index++;if(builder.index<builder.phrases.length)prepareBuilder();else{const id=builder.scene.id;renderScene(id);if(writable)message('Séance de construction terminée. Vous pouvez maintenant retrouver ces expressions dans le quiz.');}}
  if(b.hasAttribute('data-review-session'))startReviewSession(b.dataset.reviewSession);
  if(b.hasAttribute('data-reveal-review')&&reviewSession){reviewSession.revealed=true;renderReviewSession();main.querySelector('[data-review-grade]')?.focus();}
  if(b.dataset.reviewGrade)gradeReview(b.dataset.reviewGrade);
});
document.addEventListener('input',event=>{if(event.target.id==='topic-search'){topicQuery=event.target.value;renderTopicResults();}if(event.target.id==='number-input'){const raw=event.target.value;const ids=raw.trim()?numberWords(Number(raw)):null;main.querySelector('#number-reading').innerHTML=ids?phraseMarkup({words:ids}):'<p>Choisissez un entier entre 0 et 999.</p>';}if(event.target.id==='expression-search'){expressionQuery=event.target.value;renderExpressionResults();}if(event.target.id==='scene-search'){sceneQuery=event.target.value;renderSceneResults();}if(event.target.id==='word-search'){wordQuery=event.target.value;renderWordResults(wordQuery);}});
document.addEventListener('change',event=>{if(event.target.id==='conjugation-verb'){conjugationVerb=event.target.value;renderConjugation();main.querySelector('#conjugation-verb').focus();}if(event.target.id==='route-select'){resetRoute(event.target.value);main.querySelector('#route-select').focus();}});
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();if(data)navigate('scenes');});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{stopLetterAudio();if(lastOpener?.isConnected)lastOpener.focus();else main.focus();});

try{
  const response=await fetch('./content/learning.json');if(!response.ok)throw new Error('contenu indisponible');data=await response.json();
  const errors=validateData(data);if(errors.length)throw new Error(errors.join('; '));
  words=new Map(data.words.map(w=>[w.id,w]));
  let saved;
  try{saved=readReviews(localStorage,new Set(words.keys()));}catch{saved={ids:[],writable:false,message:'Stockage local indisponible. Cette séance reste en mémoire.'};}
  reviews=new Set(saved.ids);writable=saved.writable;
  let savedProgress;try{savedProgress=readProgress(localStorage,data.scenes);}catch{savedProgress={value:emptyProgress(),writable:false,message:'La progression reste en mémoire pour cette séance.'};}
  progress=savedProgress.value;progressWritable=savedProgress.writable;message([saved.message,savedProgress.message].filter(Boolean).join(' '));
  document.querySelector('#review-count').textContent=reviews.size;
  navigate('scenes',false);
}catch(error){main.innerHTML=`<section class="empty"><h1>Les ateliers ne sont pas disponibles.</h1><p>Ouvrez ce module depuis un serveur web, avec son dossier de contenus et ses illustrations.</p><p class="micro">${e(error.message)}</p><button class="primary" onclick="location.reload()">Réessayer</button></section>`;}
