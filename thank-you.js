(() => {
  "use strict";

  const form = document.getElementById("thankForm");
  const editor = document.getElementById("thankEditor");
  const student = document.getElementById("thankStudentInput");
  const teacher = document.getElementById("thankTeacherInput");
  const fixedText = "معلّمي الفاضل،\n\nشكرًا لك على علمك وعطائك وصبرك. أسهمتَ في تعلّمي اللغة العربية، وشجّعتني على التقدّم، وتركتَ أثرًا طيّبًا في نفسي.\n\nأسأل الله أن يجزيك خيرًا، وأن يبارك في علمك وعملك.";
  const status = document.getElementById("thankStatus");
  const sheet = document.getElementById("thankSheet");
  const actions = document.getElementById("thankActions");
  const printButton = document.getElementById("printThankYou");
  const editButton = document.getElementById("editThankYou");
  let prepared = null;

  const values = () => ({
    student: student.value.trim(),
    teacher: teacher.value.trim()
  });
  const fingerprint = value => JSON.stringify(value);

  function invalidate() {
    prepared = null;
    printButton.disabled = true;
    sheet.hidden = true;
    actions.hidden = true;
    editor.hidden = false;
    document.body.classList.remove("thank-ready");
  }

  form.addEventListener("input", event => {
    event.target.setCustomValidity?.("");
    if (prepared) {
      invalidate();
      status.textContent = "تغيّرت البيانات. اضغط «معاينة الرسالة» لتحديثها قبل الطباعة.";
    } else {
      status.textContent = "";
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    student.setCustomValidity(student.value.trim() ? "" : "يرجى كتابة اسم الطالب.");
    teacher.setCustomValidity(teacher.value.trim() ? "" : "يرجى كتابة اسم المعلّم.");
    if (!form.reportValidity()) return;
    const draft = values();
    if (draft.student.length > 40 || draft.teacher.length > 40) {
      invalidate();
      status.textContent = "اكتب اسم الطالب واسم المعلّم، على ألّا يتجاوز كل اسم 40 حرفًا.";
      return;
    }

    // Names remain private in this page and are never interpreted as HTML.
    document.getElementById("thankStudent").textContent = draft.student;
    document.getElementById("thankTeacher").textContent = draft.teacher;
    document.getElementById("thankMessage").textContent = fixedText;
    document.getElementById("thankDate").textContent = new Intl.DateTimeFormat("ar-SA", {
      calendar: "gregory", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Riyadh"
    }).format(new Date());
    prepared = fingerprint(draft);
    editor.hidden = true;
    sheet.hidden = false;
    actions.hidden = false;
    printButton.disabled = false;
    document.body.classList.add("thank-ready");
    status.textContent = "رسالتك جاهزة. يمكنك طباعتها أو حفظها بصيغة PDF من نافذة الطباعة.";
    sheet.focus({ preventScroll: true });
    sheet.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });

  editButton.addEventListener("click", () => {
    invalidate();
    status.textContent = "عدّل الاسمين، ثم اضغط «معاينة الرسالة».";
    student.focus();
  });

  const isCurrent = () => prepared !== null && prepared === fingerprint(values());
  printButton.addEventListener("click", () => {
    if (!isCurrent()) {
      invalidate();
      status.textContent = "اضغط «معاينة الرسالة» قبل الطباعة.";
      return;
    }
    window.print();
  });
  window.addEventListener("beforeprint", () => {
    if (!isCurrent()) invalidate();
  });
  document.getElementById("thankFixedText").textContent = fixedText;
})();
