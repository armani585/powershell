// Editorial rules: concrete action + object + existing scope/result. Never add
// achievements. Group only within one job, preserving each original clause.
const nominal = [
 ['la gestion des ', 'Gérer les '], ['la gestion de la ', 'Gérer la '], ['la gestion du ', 'Gérer le '],
 ['le suivi des ', 'Suivre les '], ['le suivi de la ', 'Suivre la '], ['le suivi du ', 'Suivre le '],
 ['la préparation des ', 'Préparer les '], ['la préparation de la ', 'Préparer la '], ['la préparation du ', 'Préparer le '],
 ['la vérification des ', 'Vérifier les '], ['la vérification de la ', 'Vérifier la '], ['la vérification du ', 'Vérifier le '],
 ['la rédaction des ', 'Rédiger les '], ['la rédaction de la ', 'Rédiger la '], ['la rédaction du ', 'Rédiger le '],
 ['la coordination des ', 'Coordonner les '], ['la planification des ', 'Planifier les '],
 ['l’organisation des ', 'Organiser les '], ['l’organisation de la ', 'Organiser la '], ['l’organisation du ', 'Organiser le '],
 ['le classement des ', 'Classer les '], ['la mise à jour des ', 'Mettre à jour les '],
];
const conjugated = [['prépare','Préparer'],['vérifie','Vérifier'],['rédige','Rédiger'],['organise','Organiser'],['coordonne','Coordonner'],['planifie','Planifier'],['classe','Classer'],['gère','Gérer'],['participe','Participer'],['contribue','Contribuer'],['assiste','Assister'],['accueille','Accueillir'],['conseille','Conseiller'],['analyse','Analyser'],['contrôle','Contrôler'],['forme','Former'],['réalise','Réaliser']];
export function conciseFrench(source) {
 let value=source.trim().replace(/'/g,'’');
 // Only anchored, explicit paraphrases. Do not strip qualifications such as
 // participation, under supervision, frequency, negation, or responsibility.
 for(const [from,to] of nominal) {
  for(const prefix of ['Je suis en charge de ','Je m’occupe de ','Je fais ','J’assure ','Assurer ','']) {
   const start=prefix+from;
   if(value.toLocaleLowerCase('fr').startsWith(start.toLocaleLowerCase('fr'))) return to+value.slice(start.length);
  }
  const bare=from.replace(/^(la |le |l’)/,'');
  if(value.toLocaleLowerCase('fr').startsWith(bare)) return to+value.slice(bare.length);
 }
 if(/^Je suis (les |le |la |l’)/.test(value)) return value.replace(/^Je suis /,'Suivre ');
 for(const [from,to] of conjugated) {
  const start='Je '+from+' ';
  if(value.toLocaleLowerCase('fr').startsWith(start.toLocaleLowerCase('fr'))) return to+' '+value.slice(start.length);
 }
 return source;
}
const splitAction = text => /^(Gérer|Suivre|Préparer|Vérifier|Rédiger|Organiser|Coordonner|Planifier|Classer|Accueillir|Conseiller|Analyser|Contrôler|Former|Mettre à jour) (.+)$/u.exec(text.replace(/[.!]\s*$/,''));
const words = text => text.trim().split(/\s+/).length;
// Exact shared action or exact shared object, not guessed semantic equivalence.
// Sentences containing further clauses are left alone to avoid scope ambiguity.
export function groupBullets(bullets) {
 const groups=[];
 for(let index=0;index<bullets.length;index++) {
  const text=bullets[index], action=splitAction(text);
  const simple=action && !/[,;:!?\n]|\b(et|ou|avec|sans|sous|pour|afin|dont|selon|including|and|or)\b/i.test(action[2]);
  let grouped=false;
  if(simple) for(const group of groups) {
   if(group.indices.length!==1 || !group.simple)continue;
   let merged;
   if(group.action[1]===action[1] && group.action[2]!==action[2]) merged=group.action[1]+' '+group.action[2]+' et '+action[2]+'.';
   else if(group.action[2]===action[2] && group.action[1]!==action[1]) merged=group.action[1]+' et '+action[1].toLocaleLowerCase('fr')+' '+action[2]+'.';
   if(merged && words(merged)<=30 && merged.length<=1000) {
    group.text=merged;group.indices.push(index);grouped=true;break;
   }
  }
  if(!grouped)groups.push({text,indices:[index],action,simple});
 }
 return groups.map(({text,indices})=>({text,indices}));
}
export function compactResume(source) {
 const resume=structuredClone(source);let shortened=0,grouped=0;const groups=[];
 if(resume.language==='fr') {
  for(const key of ['experiences','education']) resume[key].forEach((entry,index)=>{
   const text=entry.bullets.map(b=>{const next=conciseFrench(b);if(next!==b)shortened++;return next;});
   const result=groupBullets(text);grouped+=text.length-result.length;
   entry.bullets=result.map(g=>g.text);
   if(result.some(g=>g.indices.length>1))groups.push({section:key,index,groups:result});
  });
 }
 return {resume,shortened,grouped,groups,notes:[`${shortened} phrase(s) raccourcie(s) ; ${grouped} regroupement(s) de missions proches au sein du même poste.`, 'Toutes les expériences, formations, missions, coordonnées, dates et compétences sont conservées. Aucun résultat ajouté.']};
}
