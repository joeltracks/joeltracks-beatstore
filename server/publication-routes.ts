import type { Hono } from 'hono';
import type { Bindings } from './app.ts';
import type { SellerGuard } from './upload-routes.ts';
import { validId, UploadError } from './uploads.ts';
import { createPublicationRepository,createPublicationStorage,type PublicationDependencies } from './publications.ts';
import {dashboardConfigured,dashboardRepository} from './dashboard-routes.ts';
import type {DashboardDependencies} from './dashboard.ts';

export function publicationRepository(env:Bindings,d:PublicationDependencies){return d.publicationRepository||createPublicationRepository(env.SUPABASE_URL!,env.SUPABASE_SECRET_KEY!);}
function publicationStorage(env:Bindings,d:PublicationDependencies){return d.publicationStorage||createPublicationStorage('1b4bc53beb85cda4d8618ee8a695585f',env.R2_ACCESS_KEY_ID!,env.R2_SECRET_ACCESS_KEY!);}
export function publicationConfigured(env:Bindings,d:PublicationDependencies){return Boolean(d.publicationRepository||env.SUPABASE_URL&&env.SUPABASE_SECRET_KEY);}
function storageConfigured(env:Bindings,d:PublicationDependencies){return Boolean(d.publicationStorage||env.R2_ACCESS_KEY_ID&&env.R2_SECRET_ACCESS_KEY);}

export function registerPublicCatalogRoutes(app:Hono<{Bindings:Bindings}>,d:PublicationDependencies&DashboardDependencies){
  app.get('/api/catalog',async c=>{
    c.header('Cache-Control','no-store');
    const beats=publicationConfigured(c.env,d)?await publicationRepository(c.env,d).catalog():[];
    const settings=dashboardConfigured(c.env,d)?await dashboardRepository(c.env,d).settings():null;
    return c.json({beats,settings,state:beats.length?'ready':'awaiting-publication',checkoutAvailable:false});
  });
  app.on(['GET','HEAD'],'/api/media/:beatId/:version/:kind',async c=>{
    c.header('Cache-Control','private, no-store');c.header('Referrer-Policy','no-referrer');
    const {beatId,version,kind}=c.req.param();
    if(!validId(beatId)||!validId(version)||!['preview','artwork'].includes(kind)||!publicationConfigured(c.env,d))return c.json({error:'Media not found.'},404);
    const media=await publicationRepository(c.env,d).media(beatId,version,kind);
    // No arbitrary object-key route, attachment selection, WAVs, stems or agreements.
    if(!media||!/^beats\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(media.key)||
      !(kind==='preview'?media.contentType==='audio/mpeg':['image/jpeg','image/png','image/webp'].includes(media.contentType)))return c.json({error:'Media not found.'},404);
    if(c.req.method==='HEAD'){
      c.header('Content-Type',media.contentType);c.header('Content-Length',String(media.size));c.header('Accept-Ranges','bytes');
      return c.newResponse(null,200);
    }
    if(!storageConfigured(c.env,d))return c.json({error:'Preview storage is temporarily unavailable.'},503);
    return c.redirect(await publicationStorage(c.env,d).sign(media),302);
  });
}
export function registerSellerPublicationRoutes(app:Hono<{Bindings:Bindings}>,guard:SellerGuard,d:PublicationDependencies){
  for(const action of ['publish','unpublish'] as const){
    app.post('/api/seller/beats/:beatId/'+action,c=>guard(c,async hash=>{
      const id=c.req.param('beatId');if(!validId(id))return c.json({error:'Beat not found.'},404);
      if(!publicationConfigured(c.env,d))return c.json({error:'Storefront publishing is not configured.'},503);
      try{
        const db=publicationRepository(c.env,d);
        if(action==='unpublish')return c.json(await db.unpublish(hash,id));
        if(!storageConfigured(c.env,d))return c.json({error:'Preview storage is not configured.'},503);
        const candidate=await db.candidate(hash,id),duration=await publicationStorage(c.env,d).inspect(candidate);
        // SQL rechecks identity/session, verified file IDs and the exact draft snapshot.
        return c.json(await db.publish(hash,id,candidate.snapshot,duration,candidate.previousVersion));
      }catch(error){if(error instanceof UploadError)return c.json({error:error.message},error.status as 400);throw error;}
    }));
  }
}
