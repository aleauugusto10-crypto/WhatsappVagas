"use strict";(()=>{var e={};e.id=71,e.ids=[71],e.modules={145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},1309:e=>{e.exports=import("@supabase/supabase-js")},6249:(e,r)=>{Object.defineProperty(r,"l",{enumerable:!0,get:function(){return function e(r,t){return t in r?r[t]:"then"in r&&"function"==typeof r.then?r.then(r=>e(r,t)):"function"==typeof r&&"default"===t?r:void 0}}})},2159:(e,r,t)=>{t.a(e,async(e,i)=>{try{t.r(r),t.d(r,{config:()=>p,default:()=>c,routeModule:()=>l});var a=t(1802),s=t(7153),n=t(6249),o=t(7625),u=e([o]);o=(u.then?(await u)():u)[0];let c=(0,n.l)(o,"default"),p=(0,n.l)(o,"config"),l=new a.PagesAPIRouteModule({definition:{kind:s.x.PAGES_API,page:"/api/shopping/search",pathname:"/api/shopping/search",bundlePath:"",filename:""},userland:o});i()}catch(e){i(e)}})},7625:(e,r,t)=>{t.a(e,async(e,i)=>{try{t.r(r),t.d(r,{default:()=>o});var a=t(3802),s=e([a]);function n(e=""){return String(e||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}async function o(e,r){try{let t=n(e.query.q||""),{data:i,error:s}=await a.O.from("profiles_pages").select(`
        id,
        user_id,
        slug,
        nome,
        servico,
        cidade,
        estado,
        descricao,
        whatsapp,
        logo_url,
        hero_image_url,
        about_image_url,
        is_active,
        is_preview,
        preview_expires_at,
        subscription_expires_at,
        store_items,
        created_at,
        business_hours,
delivery_enabled,
pickup_enabled,
home_service_enabled,
free_delivery,
delivery_fee

      `).eq("is_active",!0).order("created_at",{ascending:!1}).limit(80);if(s)return console.error("Erro shopping search:",s),r.status(500).json({error:"Erro ao buscar shopping."});let o=i||[];return o=o.filter(e=>{let r=!0!==e.is_preview||!e.preview_expires_at||new Date(e.preview_expires_at)>new Date,t=!e.subscription_expires_at||new Date(e.subscription_expires_at)>new Date;return r&&t}),t.length>=2&&(o=o.filter(e=>n(`
          ${e.nome||""}
          ${e.servico||""}
          ${e.cidade||""}
          ${e.estado||""}
          ${e.descricao||""}
          ${e.slug||""}
          ${JSON.stringify(e.store_items||"")}
        `).includes(t))),r.status(200).json(o)}catch(e){return console.error("Erro geral shopping search:",e),r.status(500).json({error:"Erro interno."})}}a=(s.then?(await s)():s)[0],i()}catch(e){i(e)}})},3802:(e,r,t)=>{t.a(e,async(e,i)=>{try{t.d(r,{O:()=>n});var a=t(1309),s=e([a]);a=(s.then?(await s)():s)[0];let n=(0,a.createClient)("https://ptbokznkrrvznyqfrogg.supabase.co","sb_publishable_VRix_dbTn8g9u0O9UDECgQ_FTkZeL4l");i()}catch(e){i(e)}})},7153:(e,r)=>{var t;Object.defineProperty(r,"x",{enumerable:!0,get:function(){return t}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(t||(t={}))},1802:(e,r,t)=>{e.exports=t(145)}};var r=require("../../../webpack-api-runtime.js");r.C(e);var t=r(r.s=2159);module.exports=t})();