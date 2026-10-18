import {createRadarServer} from './api.mjs';
const server=createRadarServer({sealKey:process.env.RADAR_SEAL_KEY,allowedOrigin:process.env.RADAR_ALLOWED_ORIGIN||'https://q8-ux.github.io'});
server.listen(Number(process.env.PORT)||10000,'0.0.0.0',()=>console.log('Social request radar API is ready'));
process.on('SIGTERM',()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),10000).unref();});
