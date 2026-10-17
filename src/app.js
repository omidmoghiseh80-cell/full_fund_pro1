// ==========================================
  // 1) آدرس Worker خودتان را اینجا قرار دهید.
  // هیچ کلید یا Secret در این HTML قرار ندهید.
  // ==========================================
  const IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const API_BASE = IS_LOCAL ? "/api" : "https://robinsood-lead-api.omidmoghiseh80.workers.dev";
  const LEAD_API_ENDPOINT = `${API_BASE}/lead`;

  // UTM ها همراه لید ذخیره می‌شوند تا لیدهای چاوش قابل تفکیک باشند.
  const params = new URLSearchParams(window.location.search);
  const tracking = {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    landing_url: window.location.href,
    referrer: document.referrer || ""
  };

  // Modal logic
  document.querySelectorAll("[data-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.modal).classList.add("open");
      document.body.style.overflow = "hidden";
    });
  });

  function closeModal(modal){
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".modal").forEach(modal => {
    modal.querySelector(".close").addEventListener("click", () => closeModal(modal));
    modal.addEventListener("click", e => {
      if(e.target === modal) closeModal(modal);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach(link=>{
    link.addEventListener("click", ()=>{
      document.querySelectorAll(".modal.open").forEach(closeModal);
    });
  });

  document.addEventListener("keydown", e => {
    if(e.key === "Escape") document.querySelectorAll(".modal.open").forEach(closeModal);
  });

  // Lead form
  function normalizePhone(raw){
    let p = (raw || "").replace(/[^\d+]/g, "");
    if(p.startsWith("+98")) p = "0" + p.slice(3);
    if(p.startsWith("0098")) p = "0" + p.slice(4);
    if(p.startsWith("98") && p.length === 12) p = "0" + p.slice(2);
    return p.replace(/\D/g, "");
  }

  function normalizeDigits(value = ""){
    const fa = "۰۱۲۳۴۵۶۷۸۹";
    const ar = "٠١٢٣٤٥٦٧٨٩";

    return String(value)
      .replace(/[۰-۹]/g, d => String(fa.indexOf(d)))
      .replace(/[٠-٩]/g, d => String(ar.indexOf(d)));
  }

  function isValidIranMobile(phone){
    return /^09\d{9}$/.test(phone);
  }

  function toast(text){
    const el = document.getElementById("toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=>el.classList.remove("show"), 3800);
  }

  document.querySelectorAll(".js-lead-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const message = form.querySelector(".form-message");
      const phoneInput = form.querySelector('input[name="phone"]');
      const honeypot = form.querySelector('input[name="website"]');
      const submit = form.querySelector('button[type="submit"]');

      if(honeypot && honeypot.value){
        return; // bot
      }

      const phone = normalizePhone(phoneInput.value);
      if(!isValidIranMobile(phone)){
        message.className = "form-message err";
        message.textContent = "شماره موبایل معتبر وارد کن؛ مثل 09123456789";
        return;
      }

      submit.disabled = true;
      const oldText = submit.textContent;
      submit.textContent = "در حال ثبت...";

      try{
        const res = await fetch(LEAD_API_ENDPOINT, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            phone,
            ...tracking,
            source_page:"fullfund-pro-landing",
            requested_callback:true
          })
        });

        const data = await res.json().catch(()=>({}));
        if(!res.ok || !data.ok) throw new Error(data.error || "ثبت انجام نشد");

        message.className = "form-message ok";
        message.textContent = "شماره ثبت شد؛ تیم پشتیبانی در اولین فرصت کاری با تو تماس می‌گیرد.";
        form.reset();
        toast("شماره شما با موفقیت ثبت شد.");
      }catch(err){
        message.className = "form-message err";
        message.textContent = "ثبت شماره انجام نشد. لطفاً دوباره تلاش کن.";
      }finally{
        submit.disabled = false;
        submit.textContent = oldText;
      }
    });
  });

// HERO VIDEO — respect reduced-motion accessibility
(() => {
  const video = document.querySelector('.hero-motion-video');
  if (!video) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    if (reduced.matches) {
      video.pause();
      try { video.currentTime = 0; } catch (_) {}
    } else {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
    }
  };
  sync();
  if (reduced.addEventListener) reduced.addEventListener('change', sync);
})();




// Platform test modal
(() => {
  const modal = document.getElementById("platform-modal");
  const openBtn = document.getElementById("open-platform-test");
  if (!modal || !openBtn) return;

  const phoneInput = document.getElementById("platform-phone");
  const closeEls = modal.querySelectorAll("[data-platform-close]");

  const openModal = () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("platform-modal-open");
    setTimeout(() => phoneInput?.focus(), 120);
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("platform-modal-open");
  };

  openBtn.addEventListener("click", openModal);
  closeEls.forEach(el => el.addEventListener("click", closeModal));

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
})();

// Platform test — secure OTP via Cloudflare Worker
(() => {
  const OTP_SEND_ENDPOINT = `${API_BASE}/otp/send`;
  const OTP_VERIFY_ENDPOINT = `${API_BASE}/otp/verify`;

  const sendBtn = document.getElementById("send-platform-code");
  const verifyBtn = null;
  const resendBtn = document.getElementById("resend-platform-code");
  const phoneInput = document.getElementById("platform-phone");
  const codeBoxesWrap = document.getElementById("platform-code-boxes");
  const codeInputs = codeBoxesWrap ? Array.from(codeBoxesWrap.querySelectorAll(".platform-code-box")) : [];
  const phoneStep = document.getElementById("platform-step-phone");
  const codeStep = document.getElementById("platform-step-code");
  const msg = document.getElementById("platform-message");
  const timerEl = document.getElementById("platform-otp-timer");
  const maskedPhoneEl = document.getElementById("platform-otp-phone");

  if (!sendBtn || !phoneInput || codeInputs.length !== 5 || !msg) return;

  let activePhone = "";
  let expiryAt = 0;
  let resendAt = 0;
  let timerHandle = null;

  const setMessage = (text, type = "") => {
    msg.className = `form-message${type ? " " + type : ""}`;
    msg.textContent = text;
  };

  const setBusy = (button, busy, busyText, normalText) => {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
  };

  const maskPhone = (phone) =>
    phone.length === 11 ? `${phone.slice(0, 4)}••••${phone.slice(-3)}` : phone;

  const formatSeconds = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const stopTimer = () => {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  };

  const updateTimer = () => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((expiryAt - now) / 1000));
    const resendRemaining = Math.max(0, Math.ceil((resendAt - now) / 1000));

    if (timerEl) timerEl.textContent = formatSeconds(remaining);

    if (resendBtn) {
      resendBtn.disabled = resendRemaining > 0;
      resendBtn.textContent =
        resendRemaining > 0 ? `ارسال مجدد کد (${resendRemaining})` : "ارسال مجدد کد";
    }

    if (remaining <= 0) {
      stopTimer();
      autoVerifyLocked = true;
      setMessage("اعتبار کد به پایان رسیده است. کد جدید دریافت کنید.", "err");
    }
  };

  const startTimer = (expiresIn = 180, resendAfter = 300) => {
    stopTimer();
    expiryAt = Date.now() + expiresIn * 1000;
    resendAt = Date.now() + resendAfter * 1000;
    autoVerifyLocked = false;
    updateTimer();
    timerHandle = setInterval(updateTimer, 1000);
  };

  async function requestOtp(isResend = false) {
    const phone = normalizePhone(phoneInput.value);

    if (!isValidIranMobile(phone)) {
      setMessage("شماره موبایل معتبر وارد کنید.", "err");
      phoneInput.focus();
      return;
    }

    activePhone = phone;
    const button = isResend ? resendBtn : sendBtn;
    setBusy(button, true, "در حال ارسال...", isResend ? "ارسال مجدد کد" : "دریافت کد تایید");
    setMessage("");

    try {
      const response = await fetch(OTP_SEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });

      let data = {};
      try { data = await response.json(); } catch (_) {}

      if (!response.ok || !data.ok) {
        const error = data.error || "unknown";
        if (error === "otp_cooldown") {
          setMessage("ارسال مجدد کد هر ۵ دقیقه امکان‌پذیر است.", "err");
        } else if (error === "too_many_requests") {
          setMessage("تعداد درخواست‌ها زیاد شده است. کمی بعد دوباره تلاش کنید.", "err");
        } else if (error === "invalid_phone") {
          setMessage("شماره موبایل معتبر وارد کنید.", "err");
        } else if (error === "sms_send_failed") {
          setMessage("ارسال پیامک انجام نشد. دوباره تلاش کنید.", "err");
        } else {
          setMessage("در ارسال کد مشکلی پیش آمد. دوباره تلاش کنید.", "err");
        }
        return;
      }

      phoneStep.style.display = "none";
      codeStep.style.display = "block";
      codeInputs.forEach(input => input.value = "");
      codeInputs[0].focus();

      if (maskedPhoneEl) {
        maskedPhoneEl.innerHTML = `کد برای <bdi class="platform-masked-phone" dir="ltr">${data.maskedPhone || maskPhone(phone)}</bdi> ارسال شد`;
      }

      setMessage("کد تایید ارسال شد.", "ok");
      startTimer(Number(data.expiresIn || 180), Number(data.resendAfter || 300));

    } catch (error) {
      console.error("OTP send error:", error);
      setMessage("ارتباط با سرویس تایید برقرار نشد. دوباره تلاش کنید.", "err");
    } finally {
      if (button === sendBtn) setBusy(sendBtn, false, "", "دریافت کد تایید");
    }
  }

  sendBtn.addEventListener("click", () => requestOtp(false));

  if (resendBtn) {
    resendBtn.addEventListener("click", () => {
      if (resendBtn.disabled) return;
      phoneInput.value = activePhone;
      requestOtp(true);
    });
  }

  phoneInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      requestOtp(false);
    }
  });

  const getOtpCode = () =>
    codeInputs.map(input => normalizeDigits(input.value).replace(/\D/g, "")).join("");

  let autoVerifyLocked = false;

  const triggerAutoVerifyIfComplete = () => {
    const code = getOtpCode();
    if (/^\d{5}$/.test(code) && !autoVerifyLocked) {
      autoVerifyLocked = true;
      setTimeout(() => verifyOtp(), 80);
    }
  };

  codeInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      const digits = normalizeDigits(input.value).replace(/\D/g, "");

      // Handles normal typing and OTP autofill/paste into a box.
      if (digits.length > 1) {
        const values = digits.slice(0, 5).split("");
        values.forEach((digit, i) => {
          if (codeInputs[i]) codeInputs[i].value = digit;
        });
        const target = Math.min(values.length, 5) - 1;
        codeInputs[Math.max(target, 0)].focus();
        triggerAutoVerifyIfComplete();
        return;
      }

      input.value = digits.slice(-1);

      if (input.value && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }

      triggerAutoVerifyIfComplete();
    });

    input.addEventListener("keydown", event => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        codeInputs[index - 1].focus();
        codeInputs[index - 1].select();
      }

      if (event.key === "ArrowLeft" && index > 0) {
        codeInputs[index - 1].focus();
      }

      if (event.key === "ArrowRight" && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        triggerAutoVerifyIfComplete();
      }
    });

    input.addEventListener("paste", event => {
      const text = normalizeDigits(event.clipboardData?.getData("text") || "")
        .replace(/\D/g, "")
        .slice(0, 5);

      if (!text) return;

      event.preventDefault();
      codeInputs.forEach((box, i) => box.value = text[i] || "");
      codeInputs[Math.min(text.length, 5) - 1]?.focus();
      triggerAutoVerifyIfComplete();
    });
  });

  const verifyOtp = async () => {
    const code = getOtpCode();

    if (!activePhone || !isValidIranMobile(activePhone)) {
      setMessage("شماره موبایل مشخص نیست. دوباره کد دریافت کنید.", "err");
      return;
    }

    if (!/^\d{5}$/.test(code)) {
      setMessage("کد ۵ رقمی تایید را کامل وارد کنید.", "err");
      codeInputs.find(input => !input.value)?.focus() || codeInputs[0].focus();
      return;
    }

    if (Date.now() >= expiryAt) {
      setMessage("اعتبار کد به پایان رسیده است. کد جدید دریافت کنید.", "err");
      return;
    }
    setMessage("");

    try {
      const response = await fetch(OTP_VERIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: activePhone, code })
      });

      let data = {};
      try { data = await response.json(); } catch (_) {}

      if (!response.ok || !data.ok || !data.verified) {
        const error = data.error || "unknown";

        if (error === "otp_expired") {
          stopTimer();
          if (timerEl) timerEl.textContent = "00:00";
          setMessage("اعتبار کد به پایان رسیده است. کد جدید دریافت کنید.", "err");
        } else if (error === "too_many_attempts") {
          stopTimer();
          setMessage("تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد جدید دریافت کنید.", "err");
        } else if (error === "otp_invalid" || error === "invalid_otp_format") {
          const suffix = Number.isFinite(Number(data.attemptsRemaining))
            ? ` (${data.attemptsRemaining} تلاش باقی مانده)`
            : "";
          setMessage(`کد واردشده معتبر نیست${suffix}.`, "err");
          codeInputs.forEach(input => {
            input.value = "";
          });
          codeInputs[0].focus();
          autoVerifyLocked = false;
        } else if (error === "lead_storage_failed") {
          setMessage("تایید انجام شد اما ثبت دسترسی کامل نشد. دوباره تلاش کنید.", "err");
        } else {
          setMessage("تایید کد انجام نشد. دوباره تلاش کنید.", "err");
        }
        autoVerifyLocked = false;
        return;
      }

      stopTimer();
      setMessage("تایید شد؛ در حال ورود به پلتفرم...", "ok");

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setMessage("تایید انجام شد اما لینک ورود دریافت نشد.", "err");
      }

    } catch (error) {
      autoVerifyLocked = false;
      console.error("OTP verify error:", error);
      setMessage("ارتباط با سرویس تایید برقرار نشد. دوباره تلاش کنید.", "err");
    } finally {
      // Verification is automatic; no visible verify button.
    }
  };
})();

