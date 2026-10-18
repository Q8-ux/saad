import {createHmac} from 'node:crypto';
import {createEdgeHandler} from './handler.mjs';
declare const Deno:{env:{get(name:string):string|undefined},serve(handler:(request:Request)=>Promise<Response>):unknown};

// Use only server-provided environment secrets. None are returned or sent to a client.
const custom=Deno.env.get('RADAR_SEAL_KEY');
const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const root=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!custom&&!root)throw Error('Server encryption secret is unavailable');
const sealKey=custom||createHmac('sha256',root).update('social-request-radar:provider-credential:v1').digest('base64url');
Deno.serve(createEdgeHandler({sealKey}));
