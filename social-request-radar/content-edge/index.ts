import {createHmac} from 'node:crypto';
import {createContentHandler} from './handler.mjs';
declare const Deno:{env:{get(name:string):string|undefined},serve(handler:(request:Request)=>Promise<Response>):unknown};
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const root=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keys.default;
if(!root)throw Error('Server credential unavailable');
const sealKey=createHmac('sha256',root).update('social-request-radar:content:v1').digest('base64url');
Deno.serve(createContentHandler({sealKey,workerOrigin:Deno.env.get('RADAR_CONTENT_WORKER_ORIGIN')||''}));
