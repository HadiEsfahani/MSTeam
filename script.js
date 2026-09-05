/* ===== MSTeam — دفتر اندیکاتور (نسخه متصل به Supabase) =====
 * عملکردها: نمایش جدول، جستجوی زنده روی ستون انتخابی (با نرمال‌سازی ارقام)،
 * افزودن نامه، حذف با تأیید (مودال)، ویرایش با تأیید (مودال)
 * تاریخ به‌صورت رشته شمسی (مثلاً "1405/06/14") ذخیره می‌شود.
 * ذخیره‌سازی: جدول letters در Supabase — یکسان برای همه‌ی کاربران/کامپیوترها
 */
(function () {
  "use strict";

  var JC = window.JalaliCalendar;
  var toPersianDigits = JC.toPersianDigits;
  var normalizeDigits = JC.normalizeDigits;

  var TABLE = "letters";

  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY ||
      window.SUPABASE_URL.indexOf("YOUR-PROJECT-REF") !== -1) {
    console.error("Supabase تنظیم نشده است. فایل supabase-config.js را با اطلاعات پروژه خود پر کنید.");
  }
  var db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

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
    if (e.target === modal) hideConfirm();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) hideConfirm();
  });

  // ---------- دسترسی به Supabase ----------

  var letters = []; // کش محلی از آخرین داده‌های سرور
  var sortMode = "date"; // "date" (پیش‌فرض: جدید به قدیم) یا "number" (بزرگ به کوچیک)

  // مقایسه طبیعی رشته‌ها (تکه‌های عددی به‌صورت عدد مقایسه می‌شوند، نه رشته‌ای)
  // خروجی برای مرتب‌سازی نزولی (بزرگ به کوچیک) طراحی شده است
  function compareNaturalDesc(aStr, bStr) {
    var a = normalizeDigits(aStr || "");
    var b = normalizeDigits(bStr || "");
    var ta = a.match(/\d+|\D+/g) || [];
    var tb = b.match(/\d+|\D+/g) || [];
    var len = Math.max(ta.length, tb.length);
    for (var i = 0; i < len; i += 1) {
      var pa = ta[i] || "";
      var pb = tb[i] || "";
      var na = /^\d+$/.test(pa) ? parseInt(pa, 10) : null;
      var nb = /^\d+$/.test(pb) ? parseInt(pb, 10) : null;
      var cmp;
      if (na !== null && nb !== null) cmp = na - nb;
      else cmp = pa < pb ? -1 : pa > pb ? 1 : 0;
      if (cmp !== 0) return -cmp; // نزولی
    }
    return 0;
  }

  function sortLetters(list) {
    var arr = list.slice();
    if (sortMode === "number") {
      arr.sort(function (a, b) { return compareNaturalDesc(a.number, b.number); });
    } else {
      // تاریخ شمسی به‌صورت رشته با صفر ابتدایی ذخیره می‌شود (مثل 1405/06/14)
      // پس مقایسه رشته‌ای همان ترتیب زمانی را می‌دهد
      arr.sort(function (a, b) {
        var da = normalizeDigits(a.date || "");
        var db = normalizeDigits(b.date || "");
        if (da === db) return 0;
        return da < db ? 1 : -1; // جدید به قدیم
      });
    }
    return arr;
  }

  function updateSortIndicators() {
    document.querySelectorAll(".sort-arrow").forEach(function (el) {
      el.textContent = el.getAttribute("data-arrow") === sortMode ? "▾" : "";
    });
  }

  async function fetchLetters() {
    var res = await db.from(TABLE).select("*").order("id", { ascending: true });
    if (res.error) {
      console.error(res.error);
      emptyMsg.hidden = false;
      emptyMsg.textContent = "خطا در اتصال به پایگاه داده. اطلاعات supabase-config.js را بررسی کنید.";
      return [];
    }
    return res.data || [];
  }

  async function insertLetter(data) {
    var res = await db.from(TABLE).insert(data).select().single();
    if (res.error) {
      console.error(res.error);
      alert("خطا در افزودن نامه به پایگاه داده.");
      return null;
    }
    return res.data;
  }

  async function updateLetterRow(id, data) {
    var res = await db.from(TABLE).update(data).eq("id", id);
    if (res.error) {
      console.error(res.error);
      alert("خطا در ثبت اصلاحات.");
      return false;
    }
    return true;
  }

  async function deleteLetterRow(id) {
    var res = await db.from(TABLE).delete().eq("id", id);
    if (res.error) {
      console.error(res.error);
      alert("خطا در حذف نامه.");
      return false;
    }
    return true;
  }

  // ---------- نمایش ----------

  function currentView() {
    var q = normalizeDigits(searchInput.value).trim().toLowerCase();
    var list = q ? letters.filter(function (l) { return matchesQuery(l, q); }) : letters.slice();
    return sortLetters(list);
  }

  function render(list) {
    tableBody.innerHTML = "";
    if (!list.length) {
      emptyMsg.hidden = false;
      emptyMsg.textContent = "موردی یافت نشد.";
      return;
    }
    emptyMsg.hidden = true;

    list.forEach(function (item, index) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-id", item.id);

      var tdRow = document.createElement("td");
      tdRow.className = "col-rownum";
      tdRow.textContent = toPersianDigits(index + 1);
      tr.appendChild(tdRow);

      var tdNumber = document.createElement("td");
      tdNumber.className = "col-number";
      tdNumber.textContent = toPersianDigits(item.number);
      tr.appendChild(tdNumber);

      var tdDate = document.createElement("td");
      tdDate.className = "col-date";
      tdDate.textContent = toPersianDigits(item.date);
      tr.appendChild(tdDate);

      var tdTitle = document.createElement("td");
      tdTitle.className = "col-title";
      tdTitle.textContent = item.title;
      tr.appendChild(tdTitle);

      var tdRecipient = document.createElement("td");
      tdRecipient.className = "col-recipient";
      tdRecipient.textContent = item.recipient;
      tr.appendChild(tdRecipient);

      var tdReg = document.createElement("td");
      tdReg.className = "col-reg";
      tdReg.textContent = toPersianDigits(item.reg);
      tr.appendChild(tdReg);

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

  async function refresh() {
    letters = await fetchLetters();
    render(currentView());
  }

  // ---------- جستجوی زنده (روی ستون انتخابی یا همه ستون‌ها) ----------

  function matchesQuery(l, q) {
    var col = searchColumn.value;
    if (col === "all") {
      return [l.number, l.date, l.title, l.recipient, l.reg].some(function (v) {
        return normalizeDigits(v).toLowerCase().indexOf(q) !== -1;
      });
    }
    return normalizeDigits(l[col]).toLowerCase().indexOf(q) !== -1;
  }

  function filterLetters() {
    render(currentView());
  }

  // ---------- افزودن / ویرایش ----------

  function clearForm() {
    addForm.reset();
    delete addForm.dataset.editId;
    addBtn.textContent = "افزودن";
    addForm.classList.remove("editing");
    fields.date.placeholder = "انتخاب تاریخ";
  }

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      number: fields.number.value.trim(),
      date: normalizeDigits(fields.date.value).trim(),
      title: fields.title.value.trim(),
      recipient: fields.recipient.value.trim(),
      reg: fields.reg.value.trim()
    };
    if (!data.number || !data.date || !data.title || !data.recipient || !data.reg) return;

    if (addForm.dataset.editId) {
      var editId = addForm.dataset.editId;
      showConfirm({
        message: "آیا از اعمال این اصلاحات اطمینان دارید؟",
        okLabel: "بله، اعمال شود",
        okClass: "btn-modal-primary",
        onConfirm: function () { applyEdit(editId, data); }
      });
      return;
    }

    addBtn.disabled = true;
    insertLetter(data).then(function (inserted) {
      addBtn.disabled = false;
      if (!inserted) return;
      clearForm();
      searchInput.value = "";
      refresh();
      fields.number.focus();
    });
  });

  function startEdit(item) {
    addForm.dataset.editId = String(item.id);
    fields.number.value = item.number;
    fields.date.value = toPersianDigits(item.date);
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
    updateLetterRow(id, data).then(function (ok) {
      if (!ok) return;
      clearForm();
      refresh();
      fields.number.focus();
    });
  }

  // ---------- حذف ----------

  function deleteLetter(id) {
    deleteLetterRow(id).then(function (ok) {
      if (!ok) return;
      refresh();
    });
  }

  // ---------- رویدادها و شروع ----------

  searchInput.addEventListener("input", filterLetters);
  searchInput.addEventListener("keyup", filterLetters);
  searchColumn.addEventListener("change", filterLetters);

  document.querySelectorAll("thead th.sortable").forEach(function (th) {
    th.addEventListener("click", function () {
      var mode = th.getAttribute("data-sort");
      if (sortMode === mode) return;
      sortMode = mode;
      updateSortIndicators();
      render(currentView());
    });
  });
  updateSortIndicators();

  JC.attachJalaliDatepicker(fields.date);

  // ---------- ساعت و تاریخ زنده به وقت تهران ----------

  var clockDateEl = document.getElementById("clockDate");
  var clockTimeEl = document.getElementById("clockTime");

  function updateHeaderClock() {
    if (!clockDateEl || !clockTimeEl) return;
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());

    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });

    var j = JC.gregorian_to_jalali(+map.year, +map.month, +map.day);
    clockDateEl.textContent = toPersianDigits(j[2]) + " " + JC.MONTH_NAMES[j[1] - 1] + " " + toPersianDigits(j[0]);
    clockTimeEl.textContent = "ساعت: " + toPersianDigits(map.hour) + ":" + toPersianDigits(map.minute);
  }

  updateHeaderClock();
  setInterval(updateHeaderClock, 15000);

  emptyMsg.hidden = false;
  emptyMsg.textContent = "در حال بارگذاری…";
  refresh();

  // به‌روزرسانی زنده: وقتی کاربر دیگری نامه‌ای اضافه/ویرایش/حذف کند، همه صفحات باز به‌طور خودکار به‌روز می‌شوند
  db.channel("letters-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, function () {
      refresh();
    })
    .subscribe();
})();
