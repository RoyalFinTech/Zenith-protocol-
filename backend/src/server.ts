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
import packageRoutes from './routes/packages.js';
import { env } from './config.js';
import { healthcheck } from './db.js';
import { HttpError } from './utils/http.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const app=express();
app.set('trust proxy', 1);
const authRateLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
const verifyRateLimiter = new RateLimiterMemory({ points: 5, duration: 60 });
const registrationRateLimiter = new RateLimiterMemory({ points: 6, duration: 60 });
const availabilityRateLimiter = new RateLimiterMemory({ points: 30, duration: 60 });
const limitAuth = (limiter: RateLimiterMemory) => async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  try { await limiter.consume(req.ip ?? 'unknown'); next(); }
  catch { next(new HttpError(429, 'Too many authentication attempts; please try again shortly')); }
};
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy:{policy:'cross-origin'},
  contentSecurityPolicy:{
    directives:{
      scriptSrc:["'self'", "'unsafe-inline'"],
      imgSrc:["'self'", 'data:', 'blob:', 'https:'],
      connectSrc:["'self'", 'https:', 'wss:'],
      frameSrc:["'self'", 'https:']
    }
  }
}));
app.use(cors({origin:(origin,cb)=>{if(!origin||env.corsOrigins.includes(origin))return cb(null,true);return cb(new Error('CORS origin denied'));},credentials:false,methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));
app.use(express.json({limit:'1mb'}));
app.use((req,_res,next)=>{ if(req.path.startsWith('/api/auth/')) { const body=req.body ?? {}; if(typeof body==='object') { if(typeof body.signature==='string' && body.signature.length>500) return next(new HttpError(400,'Invalid signature')); if(typeof body.address==='string' && body.address.length>64) return next(new HttpError(400,'Invalid address')); } } next(); });
app.get('/health',async(_req,res,next)=>{try{res.json({ok:await healthcheck(),service:'zenit-api',timestamp:new Date().toISOString()})}catch(e){next(e)}});
app.get('/config/public',(_req,res)=>res.json({chainId:env.chainId,chainName:env.chainName,primaryAsset:env.primaryAsset,appOrigin:env.appOrigin,walletConnectProjectId:env.walletConnectProjectId,usdtContractAddress:env.usdtContractAddress,paymentReceiverAddress:env.paymentReceiverAddress || null,metadata:{name:env.walletConnectMetadataName,description:env.walletConnectMetadataDescription,url:env.appOrigin,icons:[`${env.appOrigin.replace(/\\/$/,'')}/zenit-logo.svg`]}}));
app.use('/api/auth/register/request', limitAuth(registrationRateLimiter));
app.use('/api/auth/register/check', limitAuth(availabilityRateLimiter));
app.use('/api/auth/nonce', limitAuth(authRateLimiter));
app.use('/api/auth/verify', limitAuth(verifyRateLimiter));
app.use('/api/auth',authRoutes); app.use('/api/me',meRoutes); app.use('/api/dashboard',dashboardRoutes); app.use('/api/wallets',walletRoutes); app.use('/api/transactions',transactionRoutes); app.use('/api/admin',adminRoutes); app.use('/api/packages',packageRoutes); app.use('/api',mutationRoutes);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const frontend=path.resolve(__dirname,'../frontend-dist');
app.use(express.static(frontend,{index:'index.html',fallthrough:true}));
app.use((req,res,next)=>{if(req.path.startsWith('/api/')||req.path==='/health'||req.path==='/config/public')return next(new HttpError(404,'Route not found'));const index=path.join(frontend,'index.html');res.sendFile(index,err=>err?next(new HttpError(404,'Frontend build not found; run npm run build')):undefined);});
app.use((_req,_res,next)=>next(new HttpError(404,'Route not found')));
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{const status=err instanceof HttpError?err.status:500;res.status(status).json({error:status===500?'Internal server error':(err as Error).message, ...(err instanceof HttpError&&err.details?{details:err.details}: {})})});

// Render requires the public HTTP server to listen on 0.0.0.0 and the injected PORT.
// Keeping the host explicit also makes local/container behavior deterministic.
app.listen(env.port, '0.0.0.0',()=>console.log(`Zenit API listening on 0.0.0.0:${env.port}`));
