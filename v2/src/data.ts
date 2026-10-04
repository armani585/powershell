export type Entry={id:string;fr:string;latin:string;ar:string;aliases?:string[];note?:string;scene:string};
export type Scene={id:string;title:string;subtitle:string;emoji:string;level:string;words:string[]};
export const entries:Entry[]=[
{id:"salam",fr:"Bonjour / salut",latin:"salam",ar:"سلام",aliases:["salut","bonjour"],note:"Salutation très courante.",scene:"meet"},
{id:"labas",fr:"Ça va ?",latin:"labas?",ar:"لاباس؟",aliases:["comment ça va","ca va"],scene:"meet"},
{id:"hamdullah",fr:"Ça va, Dieu merci",latin:"l-hamdullah",ar:"الحمد لله",aliases:["hamdullah"],scene:"meet"},
{id:"smiti",fr:"Je m'appelle…",latin:"smiti…",ar:"سميتي…",aliases:["nom","je m appelle"],scene:"meet"},
{id:"nta",fr:"Et toi ? (masc.)",latin:"u nta?",ar:"و نتا؟",aliases:["toi"],scene:"meet"},
{id:"nti",fr:"Et toi ? (fém.)",latin:"u nti?",ar:"و نتي؟",aliases:["toi"],scene:"meet"},
{id:"bslama",fr:"Au revoir",latin:"bslama",ar:"بسلامة",aliases:["au revoir"],scene:"meet"},
{id:"shukran",fr:"Merci",latin:"shukran",ar:"شكرا",aliases:["merci","choukran"],scene:"cafe"},
{id:"bghit",fr:"Je voudrais / je veux",latin:"bghit",ar:"بغيت",aliases:["je veux","voudrais"],scene:"cafe"},
{id:"atay",fr:"Thé",latin:"atay",ar:"أتاي",aliases:["the","thé"],scene:"cafe"},
{id:"qahwa",fr:"Café",latin:"qahwa",ar:"قهوة",aliases:["cafe","kahwa"],scene:"cafe"},
{id:"bla-sukkar",fr:"Sans sucre",latin:"bla sukkar",ar:"بلا سكر",aliases:["sans sucre"],scene:"cafe"},
{id:"bshhal",fr:"Combien ça coûte ?",latin:"bshhal?",ar:"بشحال؟",aliases:["combien","prix","chhal","bchhal","shhal"],scene:"market"},
{id:"ghali",fr:"Cher",latin:"ghali",ar:"غالي",aliases:["cher"],scene:"market"},
{id:"rkhis",fr:"Bon marché / pas cher",latin:"rkhis",ar:"رخيص",aliases:["pas cher","bon marche"],scene:"market"},
{id:"fin",fr:"Où ?",latin:"fin?",ar:"فين؟",aliases:["ou","où"],scene:"direction"},
{id:"nishan",fr:"Tout droit",latin:"nishan",ar:"نيشان",aliases:["tout droit"],scene:"direction"},
{id:"limn",fr:"À droite",latin:"l-ymin",ar:"ليمين",aliases:["droite"],scene:"direction"},
{id:"lisr",fr:"À gauche",latin:"l-ysr",ar:"ليسر",aliases:["gauche"],scene:"direction"},
{id:"taxi",fr:"Taxi",latin:"taxi",ar:"طاكسي",aliases:["taxi"],scene:"taxi"},
{id:"hbes",fr:"Arrêtez ici",latin:"hbes hna",ar:"حبس هنا",aliases:["arretez ici","stop"],scene:"taxi"},
{id:"hna",fr:"Ici",latin:"hna",ar:"هنا",aliases:["ici"],scene:"taxi"},
{id:"hotel",fr:"Hôtel",latin:"otel",ar:"أوطيل",aliases:["hotel","hôtel"],scene:"hotel"},
{id:"bit",fr:"Chambre",latin:"bit",ar:"بيت",aliases:["chambre"],scene:"hotel"},
{id:"kayn",fr:"Il y a / disponible",latin:"kayn",ar:"كاين",aliases:["disponible","il y a"],scene:"hotel"},
{id:"makla",fr:"Nourriture / repas",latin:"makla",ar:"ماكلة",aliases:["repas","nourriture"],scene:"food"},
{id:"djaj",fr:"Poulet",latin:"djaj",ar:"دجاج",aliases:["poulet"],scene:"food"},
{id:"ma",fr:"Eau",latin:"l-ma",ar:"الما",aliases:["eau"],scene:"food"},
{id:"lyum",fr:"Aujourd'hui",latin:"l-yum",ar:"اليوم",aliases:["aujourd hui","aujourdhui"],scene:"time"},
{id:"ghdda",fr:"Demain",latin:"ghdda",ar:"غدا",aliases:["demain"],scene:"time"}
];
export const scenes:Scene[]=[
{id:"meet",title:"Faire connaissance",subtitle:"Saluer, se présenter et prendre congé.",emoji:"👋",level:"Débutant",words:["salam","labas","hamdullah","smiti","nta","nti","bslama"]},
{id:"cafe",title:"Commander au café",subtitle:"Demander une boisson et préciser le sucre.",emoji:"🍵",level:"Débutant",words:["bghit","atay","qahwa","bla-sukkar","shukran"]},
{id:"market",title:"Acheter au marché",subtitle:"Demander le prix et réagir simplement.",emoji:"🧺",level:"Débutant",words:["bshhal","ghali","rkhis","shukran"]},
{id:"direction",title:"Retrouver son chemin",subtitle:"Demander où se trouve un lieu.",emoji:"🧭",level:"Débutant",words:["fin","nishan","limn","lisr"]},
{id:"taxi",title:"Prendre un taxi",subtitle:"Indiquer où aller et demander l'arrêt.",emoji:"🚕",level:"Débutant",words:["taxi","hna","hbes","bshhal"]},
{id:"hotel",title:"À l'hôtel",subtitle:"Demander une chambre et vérifier la disponibilité.",emoji:"🛎️",level:"Débutant",words:["hotel","bit","kayn","bshhal"]},
{id:"food",title:"Choisir son repas",subtitle:"Commander simplement à manger et à boire.",emoji:"🍲",level:"Débutant",words:["makla","djaj","ma","bghit"]},
{id:"time",title:"Fixer un rendez-vous",subtitle:"Distinguer aujourd'hui et demain.",emoji:"📅",level:"Débutant",words:["lyum","ghdda","fin"]}
];