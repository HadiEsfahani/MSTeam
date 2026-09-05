/* ===== MSTeam — دفتر اندیکاتور =====
 * عملکردها: نمایش جدول، جستجوی زنده، افزودن نامه، حذف نامه
 * ذخیره‌سازی: localStorage (بدون هیچ وابستگی خارجی)
 */
(function () {
  "use strict";

  var STORAGE_KEY = "msteam_letters";

  // ---------- دریافت عناصر صفحه ----------
  var tableBody = document.getElementById("tableBody");
  var searchInput = document.getElementById("searchInput");
  var addForm = document.getElementById("addForm");
  var emptyMsg = document.getElementById("emptyMsg");

  var fields = {
    number: document.getElementById("f-number"),
    date: document.getElementById("f-date"),
    title: document.getElementById("f-title"),
    recipient: document.getElementById("f-recipient"),
    reg: document.getElementById("f-reg")
  };

  // ---------- ذخیره‌سازی ----------

  // خواندن داده‌ها؛ اگر خالی بود، چند ردیف نمونه اولیه ایجاد می‌شود
  function loadLetters() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* داده خراب — ادامه با داده نمونه */ }
    var seed = [
      { number: "۱۴۰۳/۱۲۰", date: "2024-06-01", title: "ابلاغ بخشنامه اداری", recipient: "واحد منابع انسانی", reg: "1001" },
      { number: "۱۴۰۳/۱۲۱", date: "2024-06-03", title: "درخواست خرید تجهیزات", recipient: "مدیریت تدارکات", reg: "1002" },
      { number: "۱۴۰۳/۱۲۲", date: "2024-06-07", title: "گزارش عملکرد ماهانه", recipient: "هیئت مدیره", reg: "1003" },
      { number: "۱۴۰۳/۱۲۳", date: "2024-06-10", title: "دعوت به جلسه هماهنگی", recipient: "سرپرستان واحدها", reg: "1004" }
    ];
    saveLetters(seed);
    return seed;
  }

  function saveLetters(letters) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
  }

  var letters = loadLetters();

  // ---------- نمایش ----------

  // رندر لیست داده‌شده در جدول
  function render(list) {
    tableBody.innerHTML = "";
    if (!list.length) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    list.forEach(function (item, index) {
      var tr = document.createElement("tr");

      // ردیف (شماره ترتیبی — بر اساس لیست فعلی به‌روزرسانی می‌شود)
      var tdRow = document.createElement("td");
      tdRow.className = "col-rownum";
      tdRow.textContent = index + 1;
      tr.appendChild(tdRow);

      // ستون‌های داده
      ["number", "date", "title", "recipient", "reg"].forEach(function (key) {
        var td = document.createElement("td");
        td.textContent = item[key];
        tr.appendChild(td);
      });

      // دکمه حذف
      var tdAction = document.createElement("td");
      tdAction.className = "col-action";
      var delBtn = document.createElement("button");
      delBtn.className = "btn-del";
      delBtn.textContent = "×";
      delBtn.title = "حذف";
      delBtn.setAttribute("aria-label", "حذف نامه " + item.number);
      delBtn.addEventListener("click", function () { deleteLetter(item); });
      tdAction.appendChild(delBtn);
      tr.appendChild(tdAction);

      tableBody.appendChild(tr);
    });
  }

  // ---------- جستجوی زنده ----------

  function filterLetters() {
    var q = searchInput.value.trim().toLowerCase();
    if (!q) { render(letters); return; }
    var filtered = letters.filter(function (l) {
      return [l.number, l.date, l.title, l.recipient, l.reg]
        .some(function (v) { return String(v).toLowerCase().indexOf(q) !== -1; });
    });
    render(filtered);
  }

  // ---------- افزودن ----------

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var letter = {
      number: fields.number.value.trim(),
      date: fields.date.value,
      title: fields.title.value.trim(),
      recipient: fields.recipient.value.trim(),
      reg: fields.reg.value.trim()
    };
    letters.push(letter);
    saveLetters(letters);
    addForm.reset();
    fields.number.focus();
    // اگر جستجویی فعال باشد ردیف جدید پنهان می‌شود؛ جستجو را پاک می‌کنیم
    searchInput.value = "";
    render(letters);
  });

  // ---------- حذف ----------

  function deleteLetter(item) {
    letters = letters.filter(function (l) { return l !== item; });
    saveLetters(letters);
    filterLetters(); // حفظ فیلتر جستجو پس از حذف
  }

  // ---------- رویدادها و شروع ----------

  searchInput.addEventListener("keyup", filterLetters);
  searchInput.addEventListener("input", filterLetters);

  render(letters);
})();
