(function(){
  "use strict";
  const status = document.getElementById("certificateStatus");
  const sheet = document.getElementById("certificateSheet");
  const printButton = document.getElementById("printCertificate");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let ready = false;

  function showError(message){
    ready = false;
    printButton.disabled = true;
    sheet.hidden = true;
    status.hidden = false;
    status.dataset.state = "error";
    status.textContent = message;
  }

  function setText(id,value){
    document.getElementById(id).textContent = value;
  }

  function participationDate(value){
    if(typeof value !== "string" || !value.trim()) throw new Error("INVALID_DATE");
    const date = new Date(value);
    if(!Number.isFinite(date.getTime())) throw new Error("INVALID_DATE");
    return new Intl.DateTimeFormat("ar-SA",{
      calendar:"gregory",year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Riyadh"
    }).format(date);
  }

  async function loadCertificate(){
    const query = new URLSearchParams(window.location.search);
    const id = query.get("id") || "";
    if(!uuidPattern.test(id)){
      showError("رابط الشهادة غير مكتمل أو غير صالح. عد إلى المبادرة وافتح رابط شهادة مشاركتك.");
      return;
    }

    const db = window.TeacherImpactDB;
    if(!db || typeof db.isConfigured !== "function" || !db.isConfigured() || typeof db.getApproved !== "function"){
      showError("خدمة الشهادات غير جاهزة حاليًا. احتفظ بالرابط وحاول لاحقًا.");
      return;
    }

    try{
      const record = await db.getApproved(id);
      if(!record || record.status !== "approved" || typeof record.id !== "string" || record.id.toLowerCase() !== id.toLowerCase()){
        showError("لا توجد شهادة متاحة لهذا الرابط. تتاح الشهادة بعد اعتماد المشاركة.");
        return;
      }
      const student = typeof record.student_name === "string" && record.student_name.trim()
        ? record.student_name.trim() : "طالب في المعهد";
      const country = typeof record.country === "string" ? record.country.trim() : "";
      const level = typeof record.level === "string" ? record.level.trim() : "";
      if(!country || !level) throw new Error("INCOMPLETE_RECORD");
      const date = participationDate(record.created_at);
      setText("certificateStudent",student);
      setText("certificateCountry",country);
      setText("certificateLevel",level);
      setText("certificateDate",date);
      setText("certificateReference",record.id.toLowerCase());
      status.hidden = true;
      sheet.hidden = false;
      ready = true;
      printButton.disabled = false;
    }catch(error){
      showError("تعذر تحميل الشهادة الآن. احتفظ بالرابط وحاول مرة أخرى لاحقًا.");
    }
  }

  printButton.addEventListener("click",function(){
    if(ready && !sheet.hidden) window.print();
  });
  loadCertificate();
})();
