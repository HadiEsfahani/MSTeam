/* ===== login.js =====
 * بررسی نام کاربری/رمز عبور از طریق Supabase (تابع verify_admin_login).
 * نام کاربری و رمز عبور در کد ذخیره نمی‌شوند؛ فقط داخل دیتابیس Supabase
 * به‌صورت هش‌شده نگهداری می‌شوند. بعد از ورود موفق، وضعیت ورود در همان
 * مرورگر/سیستم ذخیره می‌شود تا دفعات بعد نیازی به ورود دوباره نباشد.
 */
(function () {
  "use strict";

  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error("Supabase تنظیم نشده است. فایل supabase-config.js را بررسی کنید.");
  }
  var db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  var form = document.getElementById("loginForm");
  var card = document.getElementById("loginCard");
  var userInput = document.getElementById("username");
  var passInput = document.getElementById("password");
  var errorBox = document.getElementById("loginError");
  var submitBtn = form.querySelector(".login-btn");
  var submitLabel = submitBtn.querySelector("span");

  // اگر کاربر قبلاً در همین سیستم وارد شده، مستقیم به صفحه اصلی برو
  if (localStorage.getItem("mst_auth") === "1") {
    window.location.replace("index.html");
    return;
  }

  function showError(message) {
    errorBox.textContent = message || "نام کاربری یا رمز عبور اشتباه است.";
    errorBox.hidden = false;
    card.classList.remove("shake");
    void card.offsetWidth; // ری‌فلو برای اجرای دوباره‌ی انیمیشن
    card.classList.add("shake");
    passInput.value = "";
    passInput.focus();
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitLabel.textContent = isLoading ? "در حال بررسی…" : "ورود";
  }

  // تشخیص علت رایج خطا و نمایش پیام قابل‌فهم‌تر برای دیباگ
  function messageForError(err) {
    var raw = (err && (err.message || err.hint || err.details)) || "";
    console.error("Supabase RPC error:", err);

    if (/schema cache|Could not find the function|does not exist|PGRST20[24]/i.test(raw)) {
      return "تابع ورود روی پایگاه داده پیدا نشد. اسکریپت supabase-setup.sql (بخش «ورود») را در SQL Editor پروژه اجرا کنید.";
    }
    if (/permission denied/i.test(raw)) {
      return "دسترسی اجرای تابع ورود داده نشده. دستور grant execute در supabase-setup.sql را دوباره اجرا کنید.";
    }
    if (/Failed to fetch|NetworkError|network/i.test(raw)) {
      return "اتصال به Supabase برقرار نشد. اینترنت یا آدرس/کلید داخل supabase-config.js را بررسی کنید.";
    }
    return "خطا در اتصال به پایگاه داده" + (raw ? (": " + raw) : ".");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var u = userInput.value.trim();
    var p = passInput.value;
    if (!u || !p) return;

    setLoading(true);

    db.rpc("verify_admin_login", { p_username: u, p_password: p })
      .then(function (res) {
        setLoading(false);
        if (res.error) {
          showError(messageForError(res.error));
          return;
        }
        if (res.data === true) {
          // فقط یک نشانه‌ی محلی از «وارد شده» ذخیره می‌شود؛
          // خود نام کاربری/رمز عبور هیچ‌جا در مرورگر نگه‌داری نمی‌شود.
          localStorage.setItem("mst_auth", "1");
          window.location.href = "index.html";
        } else {
          showError();
        }
      })
      .catch(function (err) {
        setLoading(false);
        showError(messageForError(err));
      });
  });

  [userInput, passInput].forEach(function (el) {
    el.addEventListener("input", function () {
      if (!errorBox.hidden) errorBox.hidden = true;
    });
  });

  userInput.focus();
})();
