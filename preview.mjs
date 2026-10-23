// Local QA only. Never used by the production start command.
import {PGlite} from '@electric-sql/pglite';
import {createApp,migrate} from './server.mjs';
if(process.env.NODE_ENV==='production')throw new Error('Preview cannot run in production.');
const db=new PGlite();await migrate(db);
createApp(db,{origin:'http://terminal.local:4173',intakeEnabled:false}).listen(Number(process.env.PORT||4173),'0.0.0.0');
