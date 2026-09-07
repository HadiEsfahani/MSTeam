/* ===== jalali-calendar.js — تبدیل و تقویم شمسی (بدون وابستگی خارجی) =====
 * شامل:
 *  - gregorian_to_jalali(gy,gm,gd) و jalali_to_gregorian(jy,jm,jd)
 *    (الگوریتم استاندارد چرخه ۳۳ ساله — بر پایه jalaali-js / Borkowski، مالکیت عمومی)
 *  - getTodayJalali()
 *  - toPersianDigits() / normalizeDigits()
 *  - attachJalaliDatepicker(input) — تقویم بازشو سبک با تم تیره
 */
(function (global) {
  "use strict";

  /* ---------- تبدیل تاریخ (الگوریتم jalaali-js) ---------- */

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy) {
    var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
      1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    var bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump, leap, n, i;

    if (jy < jp || jy >= breaks[bl - 1]) throw new Error("سال جلالی خارج از محدوده: " + jy);

    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;

    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    var march = 20 + leapJ - leapG;

    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;

    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
      + div(153 * mod(gm + 9, 12) + 2, 5)
      + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy), jdn1f = g2d(gy, 3, r.march),
      k, jm, jd;
    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { jy: jy, jm: jm, jd: jd }; }
      k -= 186;
    } else {
      jy -= 1; k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30); jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  function d2g(jdn) {
    var j, i, gd, gm, gy;
    j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    i = div(mod(j, 1461), 4) * 5 + 308;
    gd = div(mod(i, 153), 5) + 1;
    gm = mod(div(i, 153), 12) + 1;
    gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function gregorian_to_jalali(gy, gm, gd) {
    var j = d2j(g2d(gy, gm, gd));
    return [j.jy, j.jm, j.jd];
  }

  function jalali_to_gregorian(jy, jm, jd) {
    var g = d2g(j2d(jy, jm, jd));
    return [g.gy, g.gm, g.gd];
  }

  function isLeapJalaliYear(jy) {
    return jalCal(jy).leap === 0;
  }

  function jalaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeapJalaliYear(jy) ? 30 : 29;
  }

  function getTodayJalali() {
    var now = new Date();
    var j = gregorian_to_jalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { jy: j[0], jm: j[1], jd: j[2] };
  }

  /* ---------- ارقام فارسی ---------- */

  var FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  function toPersianDigits(input) {
    return String(input == null ? "" : input).replace(/[0-9]/g, function (d) {
      return FA_DIGITS[+d];
    });
  }

  function normalizeDigits(input) {
    return String(input == null ? "" : input)
      .replace(/[۰-۹]/g, function (d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); });
  }

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  /* قالب استاندارد تاریخ ذخیره‌سازی/نمایش: 1405/06/14 (یا با ارقام فارسی) */
  function formatJalali(jy, jm, jd, persianDigits) {
    var s = jy + "/" + pad2(jm) + "/" + pad2(jd);
    return persianDigits ? toPersianDigits(s) : s;
  }

  /* ---------- تقویم بازشو ---------- */

  var MONTH_NAMES = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  var WEEK_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // شنبه تا جمعه

  var activePopup = null;
  var activeInput = null;

  function closePopup() {
    if (activePopup && activePopup.parentNode) activePopup.parentNode.removeChild(activePopup);
    activePopup = null;
    activeInput = null;
    document.removeEventListener("mousedown", onDocMouseDown, true);
    document.removeEventListener("keydown", onDocKeyDown, true);
  }

  function onDocMouseDown(e) {
    if (activePopup && !activePopup.contains(e.target) && e.target !== activeInput) closePopup();
  }

  function onDocKeyDown(e) {
    if (e.key === "Escape") closePopup();
  }

  function attachJalaliDatepicker(input) {
    if (!input) return;

    function open() {
      if (activePopup && activeInput === input) { closePopup(); return; }
      closePopup();

      var today = getTodayJalali();
      // مقدار اولیه نمایش: اگر ورودی تاریخ معتبر شمسی دارد از آن شروع کن
      var view = { jy: today.jy, jm: today.jm };
      var m = normalizeDigits(input.value).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (m) {
        view.jy = +m[1];
        view.jm = +m[2];
      }

      var popup = document.createElement("div");
      popup.className = "jcal-popup";
      popup.setAttribute("dir", "rtl");

      // سربرگ: ماه و سال + دکمه‌های قبلی/بعدی
      var header = document.createElement("div");
      header.className = "jcal-header";

      var prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "jcal-nav";
      prevBtn.textContent = "‹"; // ماه بعد در RTL
      prevBtn.setAttribute("aria-label", "ماه بعد");

      var nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "jcal-nav";
      nextBtn.textContent = "›"; // ماه قبل در RTL
      nextBtn.setAttribute("aria-label", "ماه قبل");

      var title = document.createElement("span");
      title.className = "jcal-title";

      header.appendChild(prevBtn);
      header.appendChild(title);
      header.appendChild(nextBtn);
      popup.appendChild(header);

      // شبکه روزها
      var grid = document.createElement("div");
      grid.className = "jcal-grid";
      popup.appendChild(grid);

      function renderGrid() {
        title.textContent = MONTH_NAMES[view.jm - 1] + " " + toPersianDigits(view.jy);
        grid.innerHTML = "";

        WEEK_DAYS.forEach(function (w) {
          var wd = document.createElement("span");
          wd.className = "jcal-weekday";
          wd.textContent = w;
          grid.appendChild(wd);
        });

        var todayJ = getTodayJalali();
        var firstG = jalali_to_gregorian(view.jy, view.jm, 1);
        var firstDate = new Date(firstG[0], firstG[1] - 1, firstG[2]);
        var offset = firstDate.getDay(); // یکشنبه=0 … شنبه=6
        var shanbehOffset = (offset + 1) % 7; // شنبه اول هفته
        var i;
        for (i = 0; i < shanbehOffset; i += 1) {
          var blank = document.createElement("span");
          blank.className = "jcal-day jcal-blank";
          grid.appendChild(blank);
        }

        var len = jalaliMonthLength(view.jy, view.jm);
        for (i = 1; i <= len; i += 1) {
          (function (day) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "jcal-day";
            btn.textContent = toPersianDigits(day);
            if (todayJ.jy === view.jy && todayJ.jm === view.jm && todayJ.jd === day) {
              btn.classList.add("jcal-today");
            }
            // علامت‌گذاری روز انتخاب‌شده فعلی
            var cur = normalizeDigits(input.value).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
            if (cur && +cur[1] === view.jy && +cur[2] === view.jm && +cur[3] === day) {
              btn.classList.add("jcal-selected");
            }
            btn.addEventListener("click", function (ev) {
              ev.stopPropagation();
              input.value = formatJalali(view.jy, view.jm, day, true); // ۱۴۰۵/۰۶/۱۴
              closePopup();
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
            });
            grid.appendChild(btn);
          })(i);
        }
      }

      function nav(delta) {
        view.jm += delta;
        if (view.jm > 12) { view.jm = 1; view.jy += 1; }
        if (view.jm < 1) { view.jm = 12; view.jy -= 1; }
        renderGrid();
      }

      prevBtn.addEventListener("click", function (e) { e.stopPropagation(); nav(1); });
      nextBtn.addEventListener("click", function (e) { e.stopPropagation(); nav(-1); });

      renderGrid();

      // موقعیت‌دهی زیر ورودی
      popup.style.position = "absolute";
      popup.style.visibility = "hidden";
      document.body.appendChild(popup);
      var rect = input.getBoundingClientRect();
      var scrollX = window.scrollX || window.pageXOffset;
      var scrollY = window.scrollY || window.pageYOffset;
      var top = rect.bottom + scrollY + 6;
      var left = rect.left + scrollX;
      // جلوگیری از خروج از صفحه
      var pw = popup.offsetWidth || 260;
      if (left + pw > scrollX + document.documentElement.clientWidth) {
        left = scrollX + document.documentElement.clientWidth - pw - 8;
      }
      popup.style.top = top + "px";
      popup.style.left = left + "px";
      popup.style.visibility = "visible";

      activePopup = popup;
      activeInput = input;
      document.addEventListener("mousedown", onDocMouseDown, true);
      document.addEventListener("keydown", onDocKeyDown, true);
    }

    input.addEventListener("focus", open);
    input.addEventListener("click", open);
    // جلوگیری از تایپ دستی (فقط تقویم)
    input.addEventListener("keydown", function (e) { e.preventDefault(); });
  }

  /* ---------- انتشار در فضای سراسری ---------- */

  global.JalaliCalendar = {
    gregorian_to_jalali: gregorian_to_jalali,
    jalali_to_gregorian: jalali_to_gregorian,
    getTodayJalali: getTodayJalali,
    isLeapJalaliYear: isLeapJalaliYear,
    jalaliMonthLength: jalaliMonthLength,
    toPersianDigits: toPersianDigits,
    normalizeDigits: normalizeDigits,
    formatJalali: formatJalali,
    attachJalaliDatepicker: attachJalaliDatepicker,
    MONTH_NAMES: MONTH_NAMES,
    WEEK_DAYS: WEEK_DAYS
  };
})(window);
