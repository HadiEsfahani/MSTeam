/* ===== MSTeam — دفتر اندیکاتور (نسخه بازنویسی‌شده) =====
 * عملکردها: نمایش جدول، جستجوی زنده (با نرمال‌سازی ارقام)،
 * افزودن نامه، حذف با تأیید (مودال)، ویرایش با تأیید (مودال)
 * تاریخ به‌صورت رشته شمسی (مثلاً "1405/06/14") ذخیره می‌شود.
 * ذخیره‌سازی: localStorage با کلید msteam_letters
 */
(function () {
  "use strict";

  var JC = window.JalaliCalendar;
  var STORAGE_KEY = "msteam_letters";
  var ID_KEY = "msteam_letters_nextid";

  var toPersianDigits = JC.toPersianDigits;
  var normalizeDigits = JC.normalizeDigits;

  // ---------- عناصر صفحه ----------
  var tableBody = document.getElementById("tableBody");
  var searchInput = document.getElementById("searchInput");
  var searchColumn = document.getElementById("searchColumn");
  var addForm = document.getElementById("addForm");
  var emptyMsg = document.getElementById("emptyMsg");
  var addBtn = addForm.querySelector("button[type=submit]");

  var fields = {
    number: document.getElementById("f-number"),
    date: document.getElementById("f-date"),
    title: document.getElementById("f-title"),
    recipient: document.getElementById("f-recipient"),
    reg: document.getElementById("f-reg")
  };

  // ---------- مودال تأیید ----------
  var modal = document.getElementById("confirm-modal");
  var modalMsg = document.getElementById("confirm-msg");
  var modalOk = document.getElementById("confirm-ok");
  var modalCancel = document.getElementById("confirm-cancel");
  var pendingConfirm = null;

  /**
   * نمایش مودال تأیید.
   * opts = { message, okLabel, okClass, onConfirm }
   */
  function showConfirm(opts) {
    pendingConfirm = opts;
    modalMsg.textContent = opts.message;
    modalOk.textContent = opts.okLabel || "تأیید";
    modalOk.className = opts.okClass || "btn-modal-primary";
    modal.classList.remove("hidden");
    modalOk.focus();
  }

  function hideConfirm() {
    modal.classList.add("hidden");
    pendingConfirm = null;
  }

  modalOk.addEventListener("click", function () {
    var fn = pendingConfirm && pendingConfirm.onConfirm;
    hideConfirm();
    if (typeof fn === "function") fn();
  });
  modalCancel.addEventListener("click", hideConfirm);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) hideConfirm(); // کلیک روی پس‌زمینه = انصراف
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) hideConfirm();
  });

  // ---------- ذخیره‌سازی ----------

  function loadLetters() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) { /* داده خراب — ادامه با داده نمونه */ }
    var seed = [
      { id: nextId(), number: "1403/120", date: "1403/03/12", title: "ابلاغ بخشنامه اداری", recipient: "واحد منابع انسانی", reg: "1001" },
      { id: nextId(), number: "1403/121", date: "1403/03/14", title: "درخواست خرید تجهیزات", recipient: "مدیریت تدارکات", reg: "1002" },
      { id: nextId(), number: "1403/122", date: "1403/03/15", title: "گزارش عملکرد ماهانه", recipient: "هیئت مدیره", reg: "1003" }
    ];
    saveLetters(seed);
    return seed;
  }

  function saveLetters(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function nextId() {
    var n = parseInt(localStorage.getItem(ID_KEY) || "1", 10) || 1;
    localStorage.setItem(ID_KEY, String(n + 1));
    return n;
  }

  var letters = loadLetters();

  // ---------- نمایش ----------

  function render(list) {
    tableBody.innerHTML = "";
    if (!list.length) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    list.forEach(function (item, index) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-id", item.id);

      // ردیف — ارقام فارسی
      var tdRow = document.createElement("td");
      tdRow.className = "col-rownum";
      tdRow.textContent = toPersianDigits(index + 1);
      tr.appendChild(tdRow);

      // شماره نامه
      var tdNumber = document.createElement("td");
      tdNumber.className = "col-number";
      tdNumber.textContent = toPersianDigits(item.number);
      tr.appendChild(tdNumber);

      // تاریخ شمسی
      var tdDate = document.createElement("td");
      tdDate.className = "col-date";
      tdDate.textContent = toPersianDigits(item.date);
      tr.appendChild(tdDate);

      // عنوان و گیرنده (متن — بدون تغییر رقم)
      var tdTitle = document.createElement("td");
      tdTitle.className = "col-title";
      tdTitle.textContent = item.title;
      tr.appendChild(tdTitle);

      var tdRecipient = document.createElement("td");
      tdRecipient.className = "col-recipient";
      tdRecipient.textContent = item.recipient;
      tr.appendChild(tdRecipient);

      // شماره ثبت
      var tdReg = document.createElement("td");
      tdReg.className = "col-reg";
      tdReg.textContent = toPersianDigits(item.reg);
      tr.appendChild(tdReg);

      // عملیات: حذف + ویرایش
      var tdAction = document.createElement("td");
      tdAction.className = "col-action";

      var editBtn = document.createElement("button");
      editBtn.className = "btn-edit";
      editBtn.type = "button";
      editBtn.textContent = "ویرایش";
      editBtn.title = "اصلاح نامه";
      editBtn.setAttribute("aria-label", "ویرایش نامه " + item.number);
      editBtn.addEventListener("click", function () { startEdit(item); });
      tdAction.appendChild(editBtn);

      var delBtn = document.createElement("button");
      delBtn.className = "btn-del";
      delBtn.type = "button";
      delBtn.textContent = "×";
      delBtn.title = "حذف";
      delBtn.setAttribute("aria-label", "حذف نامه " + item.number);
      delBtn.addEventListener("click", function () {
        showConfirm({
          message: "آیا از حذف این نامه اطمینان دارید؟",
          okLabel: "بله، حذف شود",
          okClass: "btn-modal-danger",
          onConfirm: function () { deleteLetter(item.id); }
        });
      });
      tdAction.appendChild(delBtn);

      tr.appendChild(tdAction);
      tableBody.appendChild(tr);
    });
  }

  // ---------- جستجوی زنده ----------

  function matchesQuery(l, q) {
    // نرمال‌سازی ارقام فارسی/عربی به لاتین قبل از مقایسه —
    // بنابراین جستجوی «1405» با «۱۴۰۵» نیز مطابقت دارد
    var col = searchColumn.value;
    if (col === "all") {
      return [l.number, l.date, l.title, l.recipient, l.reg].some(function (v) {
        return normalizeDigits(v).toLowerCase().indexOf(q) !== -1;
      });
    }
    return normalizeDigits(l[col]).toLowerCase().indexOf(q) !== -1;
  }

  function filterLetters() {
    var q = normalizeDigits(searchInput.value).trim().toLowerCase();
    if (!q) { render(letters); return; }
    var filtered = letters.filter(function (l) { return matchesQuery(l, q); });
    render(filtered);
  }

  // ---------- افزودن (بدون تأیید) ----------

  function clearForm() {
    addForm.reset();
    delete addForm.dataset.editId;
    addBtn.textContent = "افزودن";
    addForm.classList.remove("editing");
    fields.date.placeholder = "انتخاب تاریخ (شمسی)";
  }

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      number: fields.number.value.trim(),
      date: normalizeDigits(fields.date.value).trim(), // ذخیره با ارقام لاتین
      title: fields.title.value.trim(),
      recipient: fields.recipient.value.trim(),
      reg: fields.reg.value.trim()
    };
    if (!data.number || !data.date || !data.title || !data.recipient || !data.reg) return;

    if (addForm.dataset.editId) {
      // حالت ویرایش: ابتدا تأیید بگیر
      var editId = addForm.dataset.editId;
      showConfirm({
        message: "آیا از اعمال این اصلاحات اطمینان دارید؟",
        okLabel: "بله، اعمال شود",
        okClass: "btn-modal-primary",
        onConfirm: function () { applyEdit(editId, data); }
      });
      return;
    }

    // افزودن: بدون تأیید
    data.id = nextId();
    letters.push(data);
    saveLetters(letters);
    clearForm();
    searchInput.value = "";
    render(letters);
    fields.number.focus();
  });

  // ---------- ویرایش ----------

  function startEdit(item) {
    addForm.dataset.editId = String(item.id);
    fields.number.value = item.number;
    fields.date.value = toPersianDigits(item.date); // نمایش فارسی در فرم
    fields.title.value = item.title;
    fields.recipient.value = item.recipient;
    fields.reg.value = item.reg;
    addBtn.textContent = "ثبت اصلاحات";
    addForm.classList.add("editing");
    fields.date.placeholder = "تاریخ فعلی: " + toPersianDigits(item.date);
    addForm.scrollIntoView({ behavior: "smooth", block: "center" });
    fields.number.focus();
  }

  function applyEdit(id, data) {
    var idx = letters.findIndex(function (l) { return String(l.id) === String(id); });
    if (idx === -1) { clearForm(); return; }
    data.id = letters[idx].id;
    letters[idx] = data;
    saveLetters(letters);
    clearForm();
    render(filterLettersActive() ? filterAndGet() : letters);
    fields.number.focus();
  }

  function filterLettersActive() {
    return normalizeDigits(searchInput.value).trim() !== "";
  }

  function filterAndGet() {
    var q = normalizeDigits(searchInput.value).trim().toLowerCase();
    return letters.filter(function (l) { return matchesQuery(l, q); });
  }

  // ---------- حذف (پس از تأیید) ----------

  function deleteLetter(id) {
    letters = letters.filter(function (l) { return String(l.id) !== String(id); });
    saveLetters(letters);
    if (filterLettersActive()) render(filterAndGet());
    else render(letters);
  }

  // ---------- رویدادها و شروع ----------

  searchInput.addEventListener("input", filterLetters);
  searchInput.addEventListener("keyup", filterLetters);
  searchColumn.addEventListener("change", filterLetters);

  // تقویم شمسی را به فیلد تاریخ وصل کن
  JC.attachJalaliDatepicker(fields.date);

  render(letters);
})();
