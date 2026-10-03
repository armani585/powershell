import {readFile,writeFile,mkdir,cp,rm,readdir} from 'node:fs/promises';
import {validateData} from '../learning.mjs';
const root=new URL('../',import.meta.url);
const destination=new URL('dist/site/',root);
const data=JSON.parse(await readFile(new URL('content/learning.json',root),'utf8'));
const errors=validateData(data);
if(errors.length)throw new Error('Contenu invalide : '+errors.join('; '));
// Publish only the explicit runtime allowlist, never the source tree or research.
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
for(const name of ['index.html','styles.css','app.mjs','learning.mjs','favicon.svg']){
 await cp(new URL(name,root),new URL(name,destination));
}
await mkdir(new URL('content/',destination));
await cp(new URL('content/learning.json',root),new URL('content/learning.json',destination));
await cp(new URL('illustrations/',root),new URL('illustrations/',destination),{recursive:true});
await mkdir(new URL('licenses/',destination));
await cp(new URL('docs/FLAGS-LICENSE.txt',root),new URL('licenses/flags.txt',destination));
await writeFile(new URL('.nojekyll',destination),'');
await writeFile(new URL('release.json',destination),JSON.stringify({site:'Darija — pas à pas',version:'1.0.0',contentVersion:data.version,words:data.words.length,scenes:data.scenes.length},null,2)+'\n');
const html=await readFile(new URL('index.html',destination),'utf8');
if(!html.includes('src="app.mjs"')||!html.includes('href="styles.css"'))throw new Error('Entrée HTML incomplète');
const illustrations=await readdir(new URL('illustrations/',destination));
if(illustrations.some(name=>name.endsWith('.png')))throw new Error('Illustration PNG non optimisée dans la livraison');
console.log('Site indépendant construit : dist/site (ressources relatives, aucun service serveur requis).');
