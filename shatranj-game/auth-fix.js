(() => {
  const cfg = window.SHATRANJ_CONFIG || {};
  const status = document.getElementById('authStatus');
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');
  if (!status || !signupBtn || !loginBtn || !window.supabase) return;

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const showStatus = (message, ok = false) => {
    status.textContent = message;
    status.className = `status ${ok ? 'ok' : 'bad'}`;
  };

  const friendlyError = (error) => {
    const message = String(error?.message || error || 'حدث خطأ غير معروف.');
    if (/already registered|already been registered|user already exists/i.test(message)) return 'هذا البريد مسجل مسبقًا. استخدم تسجيل الدخول.';
    if (/invalid email/i.test(message)) return 'صيغة البريد الإلكتروني غير صحيحة.';
    if (/password/i.test(message) && /6|weak|short/i.test(message)) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
    if (/email rate limit|rate limit/i.test(message)) return 'تم تجاوز عدد المحاولات مؤقتًا. انتظر قليلًا ثم أعد المحاولة.';
    if (/signup.*disabled|signups.*disabled/i.test(message)) return 'إنشاء الحسابات غير مفعّل في إعدادات Supabase.';
    if (/failed to fetch|network/i.test(message)) return 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.';
    return message;
  };

  async function ensureProfile(authUser, username) {
    if (!authUser) return;
    const cleanName = username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'لاعب';
    const { error } = await client.from('profiles').upsert({
      id: authUser.id,
      username: cleanName,
      rating: 1200
    }, { onConflict: 'id' });
    if (error && !/row-level security|permission denied/i.test(error.message || '')) throw error;
  }

  signupBtn.onclick = async () => {
    const username = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    if (username.length < 2) return showStatus('اكتب اسم لاعب من حرفين على الأقل.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return showStatus('أدخل بريدًا إلكترونيًا صحيحًا.');
    if (password.length < 6) return showStatus('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');

    signupBtn.disabled = true;
    signupBtn.textContent = 'جاري إنشاء الحساب…';
    showStatus('جاري إنشاء الحساب…', true);

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;

      if (data.session && data.user) {
        await ensureProfile(data.user, username);
        showStatus('تم إنشاء الحساب وتسجيل الدخول بنجاح. يتم فتح اللعبة الآن…', true);
        setTimeout(() => window.location.reload(), 700);
      } else {
        showStatus('تم إنشاء الحساب. افتح رسالة التأكيد في بريدك الإلكتروني، ثم ارجع وسجّل الدخول.', true);
      }
    } catch (error) {
      console.error('Signup error:', error);
      showStatus(friendlyError(error));
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = 'إنشاء الحساب';
    }
  };

  loginBtn.onclick = async () => {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return showStatus('أدخل البريد الإلكتروني وكلمة المرور.');

    loginBtn.disabled = true;
    loginBtn.textContent = 'جاري الدخول…';
    showStatus('جاري تسجيل الدخول…', true);

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await ensureProfile(data.user);
      showStatus('تم تسجيل الدخول بنجاح. يتم فتح اللعبة…', true);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Login error:', error);
      const raw = String(error?.message || '');
      if (/email not confirmed/i.test(raw)) showStatus('يجب تأكيد البريد الإلكتروني أولًا من الرسالة المرسلة إليك.');
      else if (/invalid login credentials/i.test(raw)) showStatus('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      else showStatus(friendlyError(error));
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'دخول';
    }
  };
})();