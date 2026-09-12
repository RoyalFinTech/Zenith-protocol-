import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import dashboardRoutes from './routes/dashboard.js';
import walletRoutes from './routes/wallet.js';
import transactionRoutes from './routes/transactions.js';
import adminRoutes from './routes/admin.js';
import mutationRoutes from './routes/mutations.js';
import { env } from './config.js';
import { healthcheck } from './db.js';
import { HttpError } from './utils/http.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const app=express();
const authRateLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
const verifyRateLimiter = new RateLimiterMemory({ points: 5, duration: 60 });
const limitAuth = (limiter: RateLimiterMemory) => async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  try { await limiter.consume(req.ip ?? 'unknown'); next(); }
  catch { next(new HttpError(429, 'Too many authentication attempts; please try again shortly')); }
};
app.disable('x-powered-by');
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:(origin,cb)=>{if(!origin||env.corsOrigins.includes(origin))return cb(null,true);return cb(new Error('CORS origin denied'));},credentials:false}));
app.use(express.json({limit:'1mb'}));
app.get('/health',async(_req,res,next)=>{try{res.json({ok:await healthcheck(),service:'zenit-api',timestamp:new Date().toISOString()})}catch(e){next(e)}});
app.get('/config/public',(req,res)=>res.json({chainId:env.chainId,chainName:env.chainName,primaryAsset:env.primaryAsset,appOrigin:env.appOrigin,walletConnectProjectId:env.walletConnectProjectId,metadata:{name:env.walletConnectMetadataName,description:env.walletConnectMetadataDescription,url:env.walletConnectMetadataUrl,icons:env.walletConnectMetadataIcon?[env.walletConnectMetadataIcon]:[]}}));
app.use('/api/auth/nonce', limitAuth(authRateLimiter));
app.use('/api/auth/verify', limitAuth(verifyRateLimiter));
app.use('/api/auth',authRoutes); app.use('/api/me',meRoutes); app.use('/api/dashboard',dashboardRoutes); app.use('/api/wallets',walletRoutes); app.use('/api/transactions',transactionRoutes); app.use('/api/admin',adminRoutes); app.use('/api',mutationRoutes);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const frontend=path.resolve(__dirname,'../../frontend');
app.use(express.static(frontend));
app.get('/',(_req,res)=>res.sendFile(path.join(frontend,'zenit-protocol.html')));
app.use((_req,_res,next)=>next(new HttpError(404,'Route not found')));
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{const status=err instanceof HttpError?err.status:500;res.status(status).json({error:status===500?'Internal server error':(err as Error).message, ...(err instanceof HttpError&&err.details?{details:err.details}: {})})});
app.listen(env.port,()=>console.log(`Zenit API listening on ${env.port}`));
