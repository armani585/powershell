import { request } from 'node:http';

// Official Sprites Tasks API: bounded activity only while AI is working.
// The management socket is never exposed through an application endpoint.
export function createSpriteHold({enabled=false, requestImpl=request, name=`cv-studio-ai-${process.pid}`}={}) {
  let users=0, acquisition=Promise.resolve(), release=Promise.resolve();
  function update(expire) {
    return new Promise((resolve,reject)=>{
      const payload=JSON.stringify({expire});
      const req=requestImpl({socketPath:'/.sprite/api.sock',hostname:'sprite',path:'/v1/tasks/'+encodeURIComponent(name),method:'PUT',
        headers:{Host:'sprite',...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})}},res=>{
        res.resume();
        res.on('end',()=>{
          if(res.statusCode>=200&&res.statusCode<300)resolve();
          else reject(Error('Sprite activity hold unavailable'));
        });
        res.on('error',reject);
      });
      req.setTimeout(3000,()=>req.destroy(Error('Sprite activity hold timed out')));
      req.on('error',reject);req.end(payload);
    });
  }
  async function run(work) {
    if(!enabled)return work();
    if(++users===1)acquisition=release.catch(()=>{}).then(()=>update('7m'));
    try {
      try {await acquisition;} catch {
        throw Object.assign(Error('Le serveur ne peut pas maintenir le moteur actif. Votre CV est conservé ; réessayez dans quelques instants.'),{status:503});
      }
      return await work();
    } finally {
      if(--users===0) {
        // Immediate deletion can suspend the VM before the HTTP result is sent.
        // A short, non-renewed grace period lets the result reach the browser.
        release=acquisition.catch(()=>{}).then(()=>update('15s'));
        // A failed shortening cannot change a successful result; the hold expires.
        await release.catch(()=>{console.warn('Sprite activity hold will expire automatically');});
      }
    }
  }
  return {run};
}
