(() => {
  const AVATAR_IMAGES = [
    "/assets/avatar-mishal.webp?v=5",
    "/assets/avatar-turki.webp?v=5",
    "/assets/avatar-bunasser.webp?v=5",
    "/assets/avatar-dahim.webp?v=5"
  ];
  const $ = id => document.getElementById(id);

  function isEnglish() {
    return document.documentElement.lang === "en";
  }

  async function api(url, options = {}) {
    const request = {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    };
    const response = await fetch(url, request);
    const data = await response.json().catch(() => ({
      ok: false,
      error: isEnglish() ? "The server returned an unreadable response." : "تعذر قراءة رد الخادم."
    }));
    if (!response.ok) throw new Error(data.error || (isEnglish() ? "Something went wrong." : "حدث خطأ غير متوقع."));
    return data;
  }

  function showMessage(text = "", success = false) {
    const element = $("authMessage");
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("success", success);
  }

  function setBusy(form, busy) {
    form.querySelectorAll("button,input").forEach(element => {
      element.disabled = busy;
    });
    form.setAttribute("aria-busy", String(busy));
  }

  function setUser(user) {
    window.jackUser = user || null;
    $("authGate")?.classList.toggle("hidden", Boolean(user));
    $("accountBar")?.classList.toggle("hidden", !user);
    if (!user) {
      window.dispatchEvent(new CustomEvent("jack:user", { detail: null }));
      return;
    }

    const image = AVATAR_IMAGES[user.avatarIndex] || AVATAR_IMAGES[0];
    const accountAvatar = $("accountAvatar");
    if (accountAvatar) accountAvatar.src = image;
    if ($("accountName")) $("accountName").textContent = user.username;
    if ($("accountLevel")) {
      $("accountLevel").textContent = isEnglish() ? `Level ${user.level}` : `المستوى ${user.level}`;
    }
    if ($("accountStats")) {
      $("accountStats").innerHTML = [
        `<span>🏆 ${Number(user.wins) || 0}</span>`,
        `<span>🎮 ${Number(user.gamesPlayed) || 0}</span>`,
        `<span>XP ${Number(user.xp) || 0}</span>`
      ].join("");
    }
    if ($("playerName")) {
      $("playerName").value = user.username;
      $("playerName").readOnly = true;
    }
    window.dispatchEvent(new CustomEvent("jack:user", { detail: user }));
  }

  async function boot() {
    try {
      const status = await api("/api/auth/status");
      if (!status.ready) {
        showMessage(isEnglish()
          ? "Account service is not connected yet."
          : "خدمة الحسابات غير مربوطة حالياً.");
        setUser(null);
        return;
      }
      const data = await api("/api/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  document.querySelectorAll(".auth-tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll(".auth-form").forEach(form => {
        form.classList.toggle("active", form.id === button.dataset.target);
      });
      showMessage();
    });
  });

  $("registerForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    showMessage(isEnglish() ? "Creating your account..." : "جاري إنشاء حسابك...", true);
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: $("regUsername").value,
          email: $("regEmail").value,
          password: $("regPassword").value
        })
      });
      setUser(data.user);
      location.reload();
    } catch (error) {
      showMessage(error.message);
      setBusy(form, false);
    }
  });

  $("loginForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    showMessage(isEnglish() ? "Signing you in..." : "جاري تسجيل الدخول...", true);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          login: $("loginId").value,
          password: $("loginPassword").value
        })
      });
      setUser(data.user);
      location.reload();
    } catch (error) {
      showMessage(error.message);
      setBusy(form, false);
    }
  });

  $("logoutBtn")?.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    location.reload();
  });

  window.jackApi = api;
  window.refreshJackProfile = async () => {
    try {
      const data = await api("/api/me");
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  };
  window.saveJackAvatar = async avatarIndex => {
    try {
      const data = await api("/api/me/avatar", {
        method: "PATCH",
        body: JSON.stringify({ avatarIndex })
      });
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  };
  window.loadJackLeaderboard = async () => {
    const data = await api("/api/leaderboard");
    return data.players || [];
  };

  boot();
})();
