/* Supabase REST client: no external script dependency. */
(function(root){
  "use strict";
  function config(){
    const c=root.TEACHER_IMPACT_SUPABASE||{};
    if(!c.projectUrl||!c.anonKey)throw new Error("NOT_CONFIGURED");
    const url=new URL(c.projectUrl);
    if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash)throw new Error("INVALID_CONFIG");
    // Reject secret keys and legacy service-role JWTs before any request.
    if(c.anonKey.startsWith("sb_secret_"))throw new Error("INVALID_CONFIG");
    if(c.anonKey.split(".").length===3){
      const payload=JSON.parse(atob(c.anonKey.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
      if(payload.role!=="anon")throw new Error("INVALID_CONFIG");
    }
    return {url:url.origin,key:c.anonKey};
  }
  async function request(path,options={}){
    const c=config();
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(c.url+"/rest/v1/teacher_impact_submissions"+path,{
        ...options,signal:controller.signal,
        headers:{apikey:c.key,Authorization:"Bearer "+c.key,"Content-Type":"application/json",...options.headers}
      });
      if(!response.ok)throw new Error("REQUEST_FAILED");
      return options.method==="POST" ? undefined : await response.json();
    }finally{clearTimeout(timer);}
  }
  root.TeacherImpactDB=Object.freeze({
    isConfigured(){try{config();return true;}catch(e){return false;}},
    listApproved(){return request("?select=student_name,country,level,teacher_name,message,created_at,status&status=eq.approved&order=created_at.desc,id.desc&limit=20");},
    submit(story){
      const limits={student_name:40,country:40,level:40,teacher_name:40,message:280};
      const data={};
      for(const [field,max] of Object.entries(limits)){
        data[field]=String(story[field]||"").trim();
        if(data[field].length>max)throw new Error("INVALID_INPUT");
      }
      if(!data.country||!data.level||!data.message)throw new Error("INVALID_INPUT");
      return request("",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(data)});
    }
  });
})(window);

