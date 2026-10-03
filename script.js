const levels = {
  1:{words:["طيّب","لطيف","صبور","نشيط","هادئ","مجتهد","متعاون","قدوة"],title:"صِفْ معلّمك بثلاث كلمات",task:"اختر ثلاث كلمات بسيطة تصف معلّمك، ثم كوّن جملة قصيرة بالعربية.",example:"مثال: طيّب، صبور، متعاون. معلّمي طيّب وصبور ومتعاون."},
  2:{words:["صبور","مخلص","متعاون","مبتسم","نافع","مجتهد","متفهّم"],title:"اكتب رسالة قصيرة",task:"اكتب ثلاثة أسطر بالعربية، وابدأها بعبارة: «تعلّمت من معلّمي…».",example:"مثال: تعلّمت من معلّمي كلمات عربية جديدة. أتدرّب على استخدامها كل يوم. أشكره على صبره وتشجيعه."},
  3:{words:["تجربة","موقف","تأثير","تشجيع","ثقة","تطوّر","نجاح"],title:"احكِ موقفًا لا تنساه",task:"اكتب من 80 إلى 100 كلمة بالعربية عن موقف حدث مع معلّمك وترك أثرًا فيك.",example:"فكّر في هذه الأسئلة: ماذا حدث؟ ماذا قال معلّمك؟ ماذا تغيّر بعد ذلك؟"},
  4:{words:["أثر","منهج","توجيه","استقلالية","دافعية","قدوة","تعلّم"],title:"اكتب قصة عن أثر معلّمك",task:"اكتب قصة عربية قصيرة توضّح كيف أثّر معلّمك في طريقة تعلّمك أو تفكيرك.",example:"ابدأ بالموقف، ثم بيّن أثره فيك، واختم بما استفدت منه."}
};


const rtlLanguages = new Set(["ar","fa","ur","he","ps","sd","ug","ckb","dv"]);
const browserLocale = (navigator.languages && navigator.languages[0]) || navigator.language || "ar";
const browserLanguage = browserLocale.toLowerCase().split("-")[0];
const urlParams = new URLSearchParams(location.search);
const proxyLanguage = (urlParams.get("_x_tr_tl") || "").toLowerCase().split("-")[0];
const isTranslateProxy = location.hostname.includes("translate.goog") || location.hostname.includes("translate.google");
const stayArabic = urlParams.get("stay") === "ar";

const languageAliases = {
  "fas":"fa","per":"fa","urd":"ur","pus":"ps","ara":"ar","eng":"en","fra":"fr","fre":"fr",
  "ind":"id","msa":"ms","tur":"tr","rus":"ru","bos":"bs","som":"so","hau":"ha","yor":"yo",
  "swa":"sw","uzb":"uz","kaz":"kk","kir":"ky","tgk":"tg","aze":"az","ben":"bn","hin":"hi",
  "tam":"ta","tel":"te","mal":"ml","sin":"si","tha":"th","vie":"vi","khm":"km","mya":"my",
  "zho":"zh-CN","chi":"zh-CN","kor":"ko","jpn":"ja","por":"pt","spa":"es","deu":"de","ger":"de"
};

function normalizeLanguage(code){
  if(!code) return "ar";
  const clean = String(code).trim().toLowerCase();
  const base = clean.split("-")[0];
  return languageAliases[clean] || languageAliases[base] || clean;
}

function languageName(code){
  try{
    const display = new Intl.DisplayNames([browserLocale], {type:"language"});
    return display.of(code) || code.toUpperCase();
  }catch(e){ return String(code).toUpperCase(); }
}

function countryName(code){
  try{
    const display = new Intl.DisplayNames([browserLocale], {type:"region"});
    return display.of(code) || code;
  }catch(e){ return code; }
}

function setDirection(code){
  const normalized=normalizeLanguage(code);
  document.documentElement.lang=normalized;
  document.documentElement.dir = rtlLanguages.has(normalized.split("-")[0]) ? "rtl" : "ltr";
}

function translationUrl(code){
  const clean = new URL(location.href);
  clean.searchParams.delete("stay");
  clean.searchParams.delete("_x_tr_sl");
  clean.searchParams.delete("_x_tr_tl");
  clean.searchParams.delete("_x_tr_hl");
  return "https://translate.google.com/translate?sl=ar&tl=" + encodeURIComponent(normalizeLanguage(code)) + "&u=" + encodeURIComponent(clean.toString());
}

function chooseCountryLanguage(apiLanguages){
  const langs = String(apiLanguages || "")
    .split(",")
    .map(normalizeLanguage)
    .filter(Boolean);
  if(!langs.length) return browserLanguage;

  const browserBase = normalizeLanguage(browserLanguage).split("-")[0];
  const matching = langs.find(lang => normalizeLanguage(lang).split("-")[0] === browserBase);
  return matching || langs[0];
}

async function detectStudentCountry(){
  try{
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 3500);
    const response = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
      headers: {"Accept":"application/json"}
    });
    clearTimeout(timer);
    if(!response.ok) throw new Error("country detection failed");
    const data = await response.json();
    return {
      code: data.country_code || data.country || "",
      name: data.country_name || "",
      languages: data.languages || ""
    };
  }catch(e){
    return null;
  }
}

async function configureLanguageExperience(){
  const button = document.getElementById("languageButton");
  const status = document.getElementById("languageStatus");
  const notice = document.getElementById("languageNotice");
  const noticeText = document.getElementById("languageNoticeText");
  const countryInput = document.querySelector('input[name="country"]');

  if(isTranslateProxy){
    const target = normalizeLanguage(proxyLanguage || browserLanguage);
    setDirection(target);
    status.textContent = languageName(target);
    notice.hidden = false;
    noticeText.textContent = "هذه الواجهة مترجمة آليًا لمساعدتك. وتبقى الأنشطة والأمثلة التدريبية باللغة العربية.";
    button.addEventListener("click",()=>{ location.href = location.origin + location.pathname + "?stay=ar"; });
    return;
  }

  const detected = null;
  const target = normalizeLanguage(browserLanguage);

  // Country is supplied by the student; a campus IP does not identify nationality.

  setDirection("ar");
  status.textContent = detected
    ? (detected.code + " · " + languageName(target))
    : languageName(target);

  if(detected){
    notice.hidden = false;
    noticeText.textContent =
      "البلد المقدّر من موقع الاتصال: " +
      (detected.name || countryName(detected.code)) +
      " — لغة الواجهة المساندة: " + languageName(target) + ".";
  }else if(browserLanguage !== "ar"){
    notice.hidden = false;
    noticeText.textContent =
      "اللغة المقترحة لترجمة الواجهة: " + languageName(target) + ". اضغط زر اللغة لعرض الترجمة.";
  }

  if(target === "ar"){
    button.addEventListener("click",()=>{ notice.hidden = !notice.hidden; });
    return;
  }

  button.addEventListener("click",()=>{ location.href = translationUrl(target); });

  // Translation starts only when the student presses the language button.
  // Do not navigate away while a student is composing a contribution.
}
configureLanguageExperience();

function renderLevel(n){
  const data=levels[n];
  document.querySelectorAll(".level-tab").forEach(b=>b.classList.toggle("active",b.dataset.level===String(n)));
  document.getElementById("levelWords").innerHTML=data.words.map(w=>`<span>${w}</span>`).join("");
  document.getElementById("levelTitle").textContent=data.title;
  document.getElementById("levelTask").textContent=data.task;
  document.getElementById("levelExample").textContent=data.example;
}
document.querySelectorAll(".level-tab").forEach(b=>b.addEventListener("click",()=>renderLevel(b.dataset.level)));
renderLevel(1);

const messageField=document.getElementById("messageField");
const count=document.getElementById("charCount");
messageField.addEventListener("input",()=>count.textContent=messageField.value.length);
document.querySelectorAll("[data-prompt]").forEach(btn=>btn.addEventListener("click",()=>{
  messageField.value=btn.dataset.prompt;
  count.textContent=messageField.value.length;
  document.getElementById("participate").scrollIntoView({behavior:"smooth"});
  setTimeout(()=>messageField.focus(),400);
}));

const wordForm=document.getElementById("threeWordsForm");
wordForm.addEventListener("submit",e=>{
  e.preventDefault();
  const input=document.getElementById("threeWords");
  const words=input.value.split(/[،,]/).map(x=>x.trim()).filter(Boolean).slice(0,3);
  if(!words.length)return;
  const cloud=document.getElementById("wordCloud");
  words.forEach((w,i)=>{
    const el=document.createElement(i===0?"b":"span"); el.textContent=w; cloud.appendChild(el);
  });
  input.value="";
});

function escapeHTML(str=""){
  return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
async function renderWall(){
  const wall=document.getElementById("wallGrid");
  const status=document.getElementById("wallStatus");
  status.textContent="جارٍ تحميل المشاركات المعتمدة…";
  try{
    const stories=await TeacherImpactDB.listApproved();
    wall.innerHTML=stories.filter(s=>s.status==="approved").map(s=>`
      <article class="wall-card">
        <span class="flag">${escapeHTML(s.country)}</span>
        <blockquote>“${escapeHTML(s.message)}”</blockquote>
        <footer>${escapeHTML(s.student_name||"طالب في المعهد")} · ${escapeHTML(s.level)}</footer>
        ${/^[0-9a-f-]{36}$/i.test(s.id||"") ? '<a class="btn btn-ghost" href="certificate.html?id='+encodeURIComponent(s.id)+'">شهادة المشاركة</a>' : ""}
      </article>`).join("");
    status.textContent=stories.length ? "" : "لا توجد مشاركات معتمدة حتى الآن.";
  }catch(error){
    wall.replaceChildren();
    status.textContent=TeacherImpactDB.isConfigured()
      ? "تعذر تحميل المشاركات. اضغط «تحديث المشاركات» للمحاولة مرة أخرى."
      : "سيُتاح جدار الأثر عند تفعيل استقبال المشاركات.";
  }
}
document.getElementById("wallRetry").addEventListener("click",renderWall);
renderWall();

let submitting=false;
let lastAttempt=null;
document.getElementById("impactForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(submitting)return;
  const form=e.currentTarget;
  const status=document.getElementById("formStatus");
  if(!form.reportValidity())return;
  const fd=new FormData(form);
  const story={
    student_name:String(fd.get("student")||"").trim(),
    country:String(fd.get("country")||"").trim(),
    level:String(fd.get("level")||"").trim(),
    teacher_name:String(fd.get("teacher")||"").trim(),
    message:String(fd.get("message")||"").trim()
  };
  if(!story.country||!story.level||!story.message){
    status.textContent="يرجى إدخال الدولة، واختيار المستوى، وكتابة الرسالة.";return;
  }
  const fingerprint=JSON.stringify(story);
  if(!lastAttempt||lastAttempt.fingerprint!==fingerprint){
    lastAttempt={fingerprint,id:crypto.randomUUID()};
  }
  const submissionId=lastAttempt.id;
  const submit=form.querySelector('button[type="submit"]');
  submitting=true;
  submit.disabled=true;
  form.setAttribute("aria-busy","true");
  status.textContent="جارٍ إرسال المشاركة…";
  try{
    await TeacherImpactDB.submit({...story,id:submissionId});
    lastAttempt=null;
    form.reset();count.textContent="0";
    status.textContent="حُفظت مشاركتك بنجاح، واعتمدت تلقائيًا. يمكنك الآن طباعة شهادة المشاركة.";
    const certificateLink=document.createElement("a");
    certificateLink.href="certificate.html?id="+encodeURIComponent(submissionId);
    certificateLink.textContent=" افتح شهادة المشاركة واحتفظ برابطها.";
    status.appendChild(certificateLink);
    renderWall();
  }catch(error){
    status.textContent=TeacherImpactDB.isConfigured()
      ? "تعذر تأكيد استلام مشاركتك. احتفظ بنسخة من نصّك، ثم حاول لاحقًا."
      : "لم تُفعّل خدمة استقبال المشاركات بعد. احتفظ بنسخة من نصّك، ثم حاول لاحقًا.";
  }finally{
    submitting=false;submit.disabled=false;form.removeAttribute("aria-busy");
  }
});

const menuButton=document.getElementById("menuButton");
const mobileNavWrap=document.getElementById("mobileNavWrap");
if(menuButton && mobileNavWrap){
  const closeMobileMenu=()=>{
    mobileNavWrap.classList.remove("open");
    mobileNavWrap.inert=true;
    mobileNavWrap.setAttribute("aria-hidden","true");
    menuButton.setAttribute("aria-expanded","false");
    menuButton.setAttribute("aria-label","فتح القائمة");
  };
  menuButton.addEventListener("click",()=>{
    const open=!mobileNavWrap.classList.contains("open");
    mobileNavWrap.classList.toggle("open",open);
    mobileNavWrap.inert=!open;
    mobileNavWrap.setAttribute("aria-hidden",String(!open));
    menuButton.setAttribute("aria-expanded",String(open));
    menuButton.setAttribute("aria-label",open?"إغلاق القائمة":"فتح القائمة");
  });
  mobileNavWrap.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMobileMenu));
  window.addEventListener("resize",()=>{
    if(window.innerWidth>=1100) closeMobileMenu();
  });
}
