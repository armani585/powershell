export const STORAGE_KEY = 'darija-enrichment-review-v1';
export const PROGRESS_KEY = 'darija-enrichment-progress-v1';
export const emptyProgress = () => ({version:1,lastScene:null,scores:{}});
export function readProgress(storage, scenes) {
  try {
    const raw=storage.getItem(PROGRESS_KEY);
    if(raw===null)return {value:emptyProgress(),writable:true,message:''};
    const value=JSON.parse(raw);
    if(!value||value.version!==1||!value.scores||Array.isArray(value.scores)||typeof value.scores!=='object'||!(value.lastScene===null||typeof value.lastScene==='string'))throw new Error('invalid');
    const allowed=new Map(scenes.map(s=>[s.id,s.phrases.length]));
    const scores={};
    for(const [id,score] of Object.entries(value.scores)){
      if(!allowed.has(id))continue;
      if(!Number.isInteger(score)||score<0||score>allowed.get(id))throw new Error('invalid score');
      scores[id]=score;
    }
    return {value:{version:1,lastScene:allowed.has(value.lastScene)?value.lastScene:null,scores},writable:true,message:''};
  }catch{
    return {value:emptyProgress(),writable:false,message:'Votre progression enregistrée est indisponible. Elle ne sera pas écrasée ; vous pouvez continuer cette séance.'};
  }
}
export function recordScore(progress,id,score,total){
  if(!Number.isInteger(score)||score<0||score>total)return progress;
  return {...progress,lastScene:id,scores:{...progress.scores,[id]:Math.max(progress.scores[id]??0,score)}};
}
export function pathSummary(path,progress){
  const completed=path.scenes.filter(id=>Object.hasOwn(progress.scores,id)).length;
  return {completed,total:path.scenes.length,next:path.scenes.find(id=>!Object.hasOwn(progress.scores,id))||null};
}
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const baseLetters = (text) => [...text.normalize('NFD')].filter(c => /\p{Letter}/u.test(c));
export const phraseText = (phrase, words) => phrase.words.map(id => words.get(id).arabic).join(' ');
export const normalizeSearch = value => String(value).normalize('NFD').replace(/\p{Mark}/gu,'').replace(/[أإآ]/g,'ا').toLowerCase().trim();
export const matchesSearch = (query, values) => normalizeSearch(query).split(/\s+/).filter(Boolean).every(term=>normalizeSearch(values.join(' ')).includes(term));
export const correctOrder = (expected, actual) => expected.length===actual.length && expected.every((id,index)=>id===actual[index]);
export function conjugatedForm(verb, tense, person, negative=false) {
  const form=verb?.forms?.[tense]?.[person];if(!form)return null;
  let parts=form.parts.map(p=>({...p}));
  if(negative){
    const first=[{text:'ما',sound:'ma',role:'negative'},{text:' ',sound:' ',role:'space'}];
    const ending={text:'ش',sound:'-sh',role:'negative'};
    parts=tense==='future'?[...first,parts[0],ending,...parts.slice(1)]:[...first,...parts,ending];
  }
  return {parts,arabic:parts.map(p=>p.text).join(''),latin:parts.map(p=>p.sound).join(''),meaning:negative?form.negativeMeaning:form.meaning};
}

export function validateConjugation(section) {
  const errors=[];if(!section)return errors;
  const expected=['ana','nta','nti','huwa','hiya','7na','ntuma','huma'];
  if(section.persons.length!==8||expected.some(id=>!section.persons.some(p=>p.id===id)))errors.push('Invalid conjugation pronouns');
  if(section.nativeReviewed!==false||section.audio!==null)errors.push('Unverified conjugation audio/review');
  const ids=new Set(),roles=new Set(Object.keys(section.roles));
  const validParts=parts=>Array.isArray(parts)&&parts.length>0&&parts.every(p=>typeof p.text==='string'&&p.text.length>0&&typeof p.sound==='string'&&p.sound.length>0&&roles.has(p.role));
  for(const verb of section.verbs){
    if(ids.has(verb.id))errors.push('Duplicate conjugation verb '+verb.id);ids.add(verb.id);
    if(verb.nativeReviewed!==false||verb.audio!==null)errors.push('Unverified conjugation verb '+verb.id);
    if(!validParts(verb.baseParts)||verb.baseParts.map(p=>p.text).join('')!==verb.arabic||verb.baseParts.map(p=>p.sound).join('')!==verb.latin)errors.push('Invalid verb base '+verb.id);
    for(const tense of ['present','past','future'])for(const person of expected){
      const form=verb.forms?.[tense]?.[person];
      if(!form||!validParts(form.parts)||!form.meaning||!form.negativeMeaning){errors.push('Invalid conjugation form '+verb.id+'/'+tense+'/'+person);continue;}
      if(tense==='present'&&(form.parts[0].role!=='aspect'||form.parts[0].text!=='ك'))errors.push('Invalid present marker '+verb.id+'/'+person);
      if(tense==='future'&&(form.parts[0].role!=='future'||form.parts[0].text!=='غادي'||form.parts[1]?.role!=='space'))errors.push('Invalid future marker '+verb.id+'/'+person);
    }
    for(const person of ['nta','nti','ntuma'])if(!validParts(verb.imperatives?.[person]?.parts)||!verb.imperatives[person].meaning)errors.push('Invalid imperative '+verb.id+'/'+person);
  }
  return errors;
}
// Heading: north=0, east=1, south=2, west=3. A turn also advances one block.
export function moveOnMap(position, command, size) {
  const turns={forward:0,right:1,left:-1};
  if(!Object.hasOwn(turns,command))return null;
  const heading=(position.heading+turns[command]+4)%4;
  const [dx,dy]=[[0,-1],[1,0],[0,1],[-1,0]][heading];
  const x=position.x+dx,y=position.y+dy;
  return x<0||y<0||x>=size||y>=size?null:{x,y,heading};
}
export function readReviews(storage, allowed) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return {ids:[], writable:true, message:''};
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(x => typeof x === 'string')) throw new Error('invalid');
    return {ids:[...new Set(value)].filter(id => allowed.has(id)), writable:true, message:''};
  } catch {
    return {ids:[], writable:false, message:'Vos mots enregistrés sont indisponibles. Cette séance reste en mémoire ; les anciennes données ne seront pas écrasées.'};
  }
}
export function validateData(data) {
  const errors=[];
  if(data.alphabet.length!==28)errors.push('Expected 28 letters');
  if(new Set(data.alphabet.map(x=>x.letter)).size!==28)errors.push('Duplicate letters');
  const ids=new Set();
  for(const word of data.words){
    if(ids.has(word.id))errors.push('Duplicate word '+word.id);ids.add(word.id);
    if(word.parts.map(x=>x.text).join('')!==word.arabic)errors.push('Written segments: '+word.id);
    if(word.parts.map(x=>x.sound).join('')!==word.latin)errors.push('Reading segments: '+word.id);
    if(word.audio!==null||word.nativeReviewed!==false)errors.push('Unverified audio/review claim: '+word.id);
    if(word.countryCode!==undefined&&!/^[a-z]{2}$/.test(word.countryCode))errors.push('Invalid country flag '+word.id);
    if(word.colorHex!==undefined&&!/^#[0-9a-f]{6}$/i.test(word.colorHex))errors.push('Invalid color swatch '+word.id);
  }
  const expressionIds=new Set();
  const wordsById=new Map(data.words.map(word=>[word.id,word]));
  for(const word of data.words){
    if(word.formOf===undefined&&word.formKind===undefined&&word.formLabel===undefined)continue;
    const base=wordsById.get(word.formOf);
    if(!base||base.id===word.id||base.formOf||!['definite','plural','prepositional'].includes(word.formKind)||!word.formLabel){
      errors.push('Invalid contextual form '+word.id);continue;
    }
    if(word.formKind==='definite'&&(word.arabic!=='ال'+base.arabic||word.parts[0]?.text!=='ال'))errors.push('Invalid definite form '+word.id);
  }
  for(const expression of data.expressions||[]){
    if(expressionIds.has(expression.id))errors.push('Duplicate expression '+expression.id);expressionIds.add(expression.id);
    if(!expression.words?.length||!expression.meaning||!expression.usage||!expression.category)errors.push('Incomplete expression '+expression.id);
    for(const id of expression.words||[])if(!ids.has(id))errors.push('Unknown expression word '+id);
    if(expression.audio!==null||expression.nativeReviewed!==false)errors.push('Unverified expression '+expression.id);
  }
  const phraseIds=new Set();
  const sceneIds=new Set(data.scenes.map(s=>s.id));
  const pathIds=new Set();
  for(const path of data.learningPaths||[]){
    if(pathIds.has(path.id)||!path.scenes?.length||new Set(path.scenes).size!==path.scenes.length)errors.push('Invalid learning path '+path.id);
    pathIds.add(path.id);
    for(const id of path.scenes||[])if(!sceneIds.has(id))errors.push('Unknown path scene '+id);
  }
  for(const scene of data.scenes){
    if(scene.phrases.length<3)errors.push('Insufficient quiz choices '+scene.id);
    for(const phrase of scene.phrases){
      if(phraseIds.has(phrase.id))errors.push('Duplicate phrase '+phrase.id);phraseIds.add(phrase.id);
      for(const id of phrase.words)if(!ids.has(id))errors.push('Unknown word '+id);
    }
    if(scene.dialogue){
      const localIds=new Set(scene.phrases.map(p=>p.id));
      for(const turn of scene.dialogue)if(!turn.speaker||!localIds.has(turn.phraseId))errors.push('Invalid dialogue '+scene.id);
    }
  }
  const topicIds=new Set();
  for(const topic of data.topics||[]){
    if(topicIds.has(topic.id))errors.push('Duplicate topic '+topic.id);topicIds.add(topic.id);
    if(!topic.words.length||new Set(topic.words).size!==topic.words.length)errors.push('Invalid topic '+topic.id);
    for(const id of topic.words)if(!ids.has(id))errors.push('Unknown topic word '+id);
    for(const pair of topic.colorPairs||[])if(!topic.words.includes(pair.masculine)||!topic.words.includes(pair.feminine))errors.push('Invalid color pair '+topic.id);
    for(const id of topic.colorQuiz||[])if(!topic.words.includes(id)||!data.words.find(w=>w.id===id)?.colorHex)errors.push('Invalid color quiz '+id);
  }
  const groupedTopics=new Set(),groupIds=new Set();
  for(const group of data.topicGroups||[]){
    if(groupIds.has(group.id)||!group.topics?.length)errors.push('Invalid topic group '+group.id);
    groupIds.add(group.id);
    for(const id of group.topics||[]){
      if(!topicIds.has(id)||groupedTopics.has(id))errors.push('Invalid grouped topic '+id);
      groupedTopics.add(id);
    }
  }
  if(data.topicGroups&&groupedTopics.size!==topicIds.size)errors.push('Incomplete topic groups');
  if(data.familyGuide){
    for(const branch of data.familyGuide.branches||[])for(const id of branch.words||[])if(!ids.has(id))errors.push('Unknown family word '+id);
    for(const phrase of data.familyGuide.cousins||[])for(const id of phrase.words||[])if(!ids.has(id))errors.push('Unknown family word '+id);
  }
  for(const g of data.readingGuide||[]){
    if(!g.title||!g.text||!g.pages?.length)errors.push('Invalid reading guide '+g.id);
    for(const id of g.words||[])if(!ids.has(id))errors.push('Unknown reading guide word '+id);
  }
  const map=data.neighborhood;
  if(map){
    const occupied=new Set();
    for(const place of map.places){
      const key=place.x+','+place.y;
      if(occupied.has(key)||place.x<0||place.y<0||place.x>=map.size||place.y>=map.size||!ids.has(place.word))errors.push('Invalid map place '+place.word);
      occupied.add(key);
    }
    for(const phrase of [...Object.values(map.commands),...map.examples])for(const id of phrase.words)if(!ids.has(id))errors.push('Unknown map word '+id);
    for(const route of map.routes){
      let position=map.start;
      for(const command of route.steps)position=position&&map.commands[command]?moveOnMap(position,command,map.size):null;
      const target=map.places.find(p=>p.word===route.destination);
      if(!route.steps.length||!position||!target||position.x!==target.x||position.y!==target.y)errors.push('Invalid route '+route.id);
    }
  }
  return [...errors,...validateConjugation(data.conjugation)];
}

export function numberWords(n){
 if(!Number.isInteger(n)||n<0||n>999)return null;
 if(n>=100){const hundreds=n-n%100;return n%100?['num-'+hundreds,'w-and',...numberWords(n%100)]:['num-'+hundreds];}
 if(n===2)return ['jooj'];
 if(n<=20||n%10===0)return ['num-'+n];
 const unit=n%10;return [unit===2?'num-two-compound':'num-'+unit,'w-and','num-'+(n-unit)];
}
