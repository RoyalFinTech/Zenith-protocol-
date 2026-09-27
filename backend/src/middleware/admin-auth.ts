import type {NextFunction,Request,Response} from 'express';
import {getBearer,HttpError} from '../utils/http.js';
import {requireAdminSession} from '../services/admin-auth.js';
declare global { namespace Express { interface Request { admin?: {id:string;email:string} } } }
export async function requireAdminPortal(req:Request,_res:Response,next:NextFunction){
  try{
    const token=getBearer(req);
    if(!token) throw new HttpError(401,'Admin authentication required');
    req.admin=await requireAdminSession(token);
    next();
  }catch(e){next(e instanceof HttpError?e:new HttpError(503,'Admin authentication service temporarily unavailable'))}
}
