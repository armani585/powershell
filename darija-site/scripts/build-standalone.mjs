import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
let html=await readFile(new URL('index.html',root),'utf8');
let css=await readFile(new URL('styles.css',root),'utf8');
for(const name of ['daily-scenes.webp','alphabet-objects.webp','more-scenes.webp','vocabulary-scenes.webp','animals.webp','countries-colors.webp','furniture.webp']){
  const base64=(await readFile(new URL('illustrations/'+name,root))).toString('base64');
  css=css.replaceAll('illustrations/'+name,'data:image/webp;base64,'+base64);
}
const learning=JSON.parse(await readFile(new URL('content/learning.json',root),'utf8'));
learning.flagImages={};
for(const word of learning.words.filter(w=>w.countryCode)){
  if(!/^[a-z]{2}$/.test(word.countryCode))throw new Error('Invalid flag code');
  const svg=await readFile(new URL('illustrations/flags/'+word.countryCode+'.svg',root));
  learning.flagImages[word.countryCode]='data:image/svg+xml;base64,'+svg.toString('base64');
}
const data=JSON.stringify(learning);
const flagLicense=await readFile(new URL('docs/FLAGS-LICENSE.txt',root),'utf8');
const core=(await readFile(new URL('learning.mjs',root),'utf8')).replaceAll('export ','')+'\nconst e=escapeHtml;';
let app=(await readFile(new URL('app.mjs',root),'utf8')).replace(/^import[^\n]+\n/,'');
const original="const response=await fetch('./content/learning.json');if(!response.ok)throw new Error('contenu indisponible');data=await response.json();";
if(!app.includes(original))throw new Error('Startup changed: update the standalone builder.');
app=app.replace(original,"data=JSON.parse(document.querySelector('#learning-data').textContent);");
const favicon=await readFile(new URL('favicon.svg',root));
html=html.replace('href="favicon.svg"', 'href="data:image/svg+xml;base64,'+favicon.toString('base64')+'"');
html=html.replace('<link rel="stylesheet" href="styles.css">',`<style>${css}</style>`)
  .replace('</body>',`<template id="flag-license">${flagLicense.replaceAll('&','&amp;').replaceAll('<','&lt;')}</template></body>`)
  .replace('<script type="module" src="app.mjs"></script>',`<script type="application/json" id="learning-data">${data.replaceAll('<','\\u003c')}</script><script type="module">${core}\n${app}</script>`);
await mkdir(new URL('dist/',root),{recursive:true});
await writeFile(new URL('dist/atelier-autonome.html',root),html);
console.log('Standalone HTML built; no server, dependencies or external image requests required.');
