(() => {
  const cfg = window.SHATRANJ_CONFIG || {};
  const statusAuth = document.getElementById('authStatus');
  const statusLobby = document.getElementById('lobbyStatus');
  const turnStatus = document.getElementById('turnStatus');
  const authView = document.getElementById('authView');
  const lobbyView = document.getElementById('lobbyView');
  const gameView = document.getElementById('gameView');
  const boardEl = document.getElementById('board');
  const playersEl = document.getElementById('players');
  const startBtn = document.getElementById('startBtn');

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    statusAuth.textContent = 'إعدادات الاتصال غير مكتملة.';
    statusAuth.className = 'status bad';
    return;
  }

  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  const chess = new Chess();
  const glyphs = { p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',P:'♙',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔' };
  let user = null, profile = null, room = null, seat = null, selected = null, lastMove = null, channel = null;
  let authReady = null;

  const setStatus = (el, text, good = false, bad = false) => {
    el.textContent = text;
    el.className = 'status ' + (good ? 'ok' : bad ? 'bad' : '');
  };

  function show(view) {
    [authView, lobbyView, gameView].forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
  }

  function getPlayerCode() {
    let code = localStorage.getItem('shatranj_player_code');
    if (!/^P\d{6}$/.test(code || '')) {
      code = 'P' + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('shatranj_player_code', code);
    }
    return code;
  }

  async function ensureProfile() {
    const code = getPlayerCode();
    profile = { username: code, rating: 1200 };
    document.getElementById('userName').textContent = `${code} (1200)`;
    try {
      const { data: existing, error: readError } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (readError) throw readError;
      if (existing) {
        profile = existing;
        if (existing.username !== code) {
          const { data } = await db.from('profiles').update({ username: code }).eq('id', user.id).select().maybeSingle();
          if (data) profile = data;
        }
      } else {
        const { data, error } = await db.from('profiles').insert({ id: user.id, username: code, rating: 1200 }).select().maybeSingle();
        if (error) throw error;
        if (data) profile = data;
      }
    } catch (e) {
      console.warn('Profile sync skipped:', e);
    }
    document.getElementById('userName').textContent = `${profile.username || code} (${profile.rating || 1200})`;
  }

  async function automaticLogin() {
    const code = getPlayerCode();
    document.getElementById('userName').textContent = `${code} (1200)`;
    show(lobbyView);
    setStatus(statusLobby, 'جاري تجهيز الاتصال تلقائيًا…');

    try {
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      let session = sessionData?.session || null;
      if (!session) {
        const { data, error } = await db.auth.signInAnonymously({ options: { data: { player_code: code } } });
        if (error) throw error;
        session = data?.session || null;
      }
      if (!session?.user) throw new Error('لم يتم إنشاء جلسة تلقائية.');
      user = session.user;
      await ensureProfile();
      setStatus(statusLobby, `تم الدخول تلقائيًا برقم ${code}`, true);
      return user;
    } catch (e) {
      console.error(e);
      setStatus(statusLobby, 'تعذر الاتصال التلقائي. تأكد من تفعيل Anonymous Sign-ins في Supabase.', false, true);
      throw e;
    }
  }

  async function requireUser() {
    if (user) return user;
    if (!authReady) authReady = automaticLogin();
    return authReady;
  }

  document.getElementById('logoutBtn').onclick = async () => {
    await cleanupChannel();
    try { await db.auth.signOut(); } catch (_) {}
    localStorage.removeItem('shatranj_player_code');
    user = profile = room = null;
    authReady = automaticLogin();
    await authReady.catch(() => {});
  };

  function makeCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

  document.getElementById('createRoomBtn').onclick = async () => {
    try {
      await requireUser();
      setStatus(statusLobby, 'جاري إنشاء الغرفة…');
      const code = makeCode();
      const { data: created, error } = await db.from('rooms').insert({ code, host_id: user.id }).select().single();
      if (error) throw error;
      const { error: joinError } = await db.from('room_players').insert({ room_code: code, user_id: user.id, seat: 'white', ready: true });
      if (joinError) throw joinError;
      await enterRoom(created, 'white');
    } catch (e) { setStatus(statusLobby, String(e?.message || e), false, true); }
  };

  document.getElementById('joinRoomBtn').onclick = async () => {
    try {
      await requireUser();
      const code = document.getElementById('joinCode').value.trim().toUpperCase();
      if (code.length !== 6) throw new Error('أدخل رمز الغرفة المكوّن من 6 خانات.');
      setStatus(statusLobby, 'جاري الانضمام…');
      const { data: found, error } = await db.from('rooms').select('*').eq('code', code).single();
      if (error || !found) throw new Error('الغرفة غير موجودة.');
      if (found.status === 'finished') throw new Error('هذه الغرفة منتهية.');
      const { data: existing } = await db.from('room_players').select('*').eq('room_code', code).eq('user_id', user.id).maybeSingle();
      if (!existing) {
        const { count } = await db.from('room_players').select('*', { count: 'exact', head: true }).eq('room_code', code);
        if ((count || 0) >= 2) throw new Error('الغرفة ممتلئة.');
        const { error: joinError } = await db.from('room_players').insert({ room_code: code, user_id: user.id, seat: 'black', ready: true });
        if (joinError) throw joinError;
        seat = 'black';
      } else seat = existing.seat;
      await enterRoom(found, seat);
    } catch (e) { setStatus(statusLobby, String(e?.message || e), false, true); }
  };

  async function enterRoom(roomData, mySeat) {
    room = roomData; seat = mySeat; chess.reset(); selected = null; lastMove = null;
    document.getElementById('roomCode').textContent = room.code;
    show(gameView); await loadMoves(); await refreshRoom(); await subscribeRoom(); renderBoard();
  }

  async function loadMoves() {
    const { data, error } = await db.from('game_moves').select('*').eq('room_code', room.code).order('move_number');
    if (error) throw error;
    chess.reset();
    for (const row of data || []) {
      const mv = row.move;
      chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
      lastMove = [mv.from, mv.to];
    }
  }

  async function refreshRoom() {
    const { data: roomData } = await db.from('rooms').select('*').eq('code', room.code).single();
    if (roomData) room = roomData;
    const { data: members } = await db.from('room_players').select('seat,ready,user_id,profiles(username,rating)').eq('room_code', room.code).order('seat', { ascending: false });
    playersEl.innerHTML = (members || []).map(p => `<div class="player"><strong>${p.seat === 'white' ? '⚪ الأبيض' : '⚫ الأسود'}</strong><br>${p.profiles?.username || 'لاعب'} <span class="small">(${p.profiles?.rating || 1200})</span></div>`).join('');
    const isHost = room.host_id === user.id;
    startBtn.classList.toggle('hidden', !(isHost && room.status === 'waiting' && (members || []).length === 2));
    updateTurnText((members || []).length);
  }

  function updateTurnText(playerCount = 2) {
    if (playerCount < 2) return setStatus(turnStatus, 'في انتظار اللاعب الثاني…');
    if (room.status === 'waiting') return setStatus(turnStatus, 'اللاعبان جاهزان. صاحب الغرفة يبدأ المباراة.');
    if (room.status === 'finished' || chess.game_over()) return setStatus(turnStatus, gameResultText(), true);
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    setStatus(turnStatus, turn === seat ? 'دورك الآن.' : 'دور الخصم الآن.', turn === seat);
  }

  startBtn.onclick = async () => {
    const { error } = await db.from('rooms').update({ status: 'playing', started_at: new Date().toISOString(), current_turn: 'white' }).eq('code', room.code);
    if (error) return setStatus(turnStatus, error.message, false, true);
    await refreshRoom();
  };

  document.getElementById('leaveBtn').onclick = async () => { await cleanupChannel(); room = null; show(lobbyView); };

  async function subscribeRoom() {
    await cleanupChannel();
    channel = db.channel(`room-${room.code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_code=eq.${room.code}` }, refreshRoom)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${room.code}` }, payload => { room = payload.new; refreshRoom(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `room_code=eq.${room.code}` }, async () => { await loadMoves(); renderBoard(); updateTurnText(); })
      .subscribe();
  }

  async function cleanupChannel() { if (channel) { await db.removeChannel(channel); channel = null; } }

  function renderBoard() {
    boardEl.innerHTML = '';
    const board = chess.board();
    const ranks = seat === 'black' ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
    const files = seat === 'black' ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
    for (const r of ranks) for (const f of files) {
      const square = 'abcdefgh'[f] + (r + 1);
      const piece = board[7-r][f];
      const el = document.createElement('div');
      el.className = `sq ${(r+f)%2 ? 'dark' : 'light'}`;
      if (selected === square) el.classList.add('sel');
      if (lastMove?.includes(square)) el.classList.add('last');
      if (piece) el.textContent = glyphs[piece.color === 'w' ? piece.type.toUpperCase() : piece.type];
      el.onclick = () => handleSquare(square, piece);
      boardEl.appendChild(el);
    }
  }

  async function handleSquare(square, piece) {
    if (!room || room.status !== 'playing') return;
    const myColor = seat === 'white' ? 'w' : 'b';
    if (chess.turn() !== myColor) return setStatus(turnStatus, 'انتظر دور الخصم.');
    if (!selected) { if (!piece || piece.color !== myColor) return; selected = square; return renderBoard(); }
    if (piece && piece.color === myColor) { selected = square; return renderBoard(); }
    const move = chess.move({ from: selected, to: square, promotion: 'q' });
    if (!move) { selected = null; renderBoard(); return setStatus(turnStatus, 'نقلة غير قانونية.'); }
    const from = selected; selected = null;
    const payload = { from, to: square, promotion: move.promotion || null, san: move.san };
    const { error } = await db.from('game_moves').insert({ room_code: room.code, user_id: user.id, move_number: chess.history().length, move: payload });
    if (error) { await loadMoves(); renderBoard(); return setStatus(turnStatus, error.message, false, true); }
    lastMove = [from, square]; renderBoard();
    if (chess.game_over()) await finishGame(); else updateTurnText();
  }

  function gameResultText() {
    if (chess.in_draw()) return 'انتهت المباراة بالتعادل.';
    if (chess.in_checkmate()) return chess.turn() === 'w' ? 'فاز الأسود بكش مات.' : 'فاز الأبيض بكش مات.';
    return 'انتهت المباراة.';
  }

  async function finishGame() {
    if (room.host_id !== user.id) return updateTurnText();
    const winnerSeat = chess.in_draw() ? null : (chess.turn() === 'w' ? 'black' : 'white');
    const { data: members } = await db.from('room_players').select('user_id,seat').eq('room_code', room.code);
    const winner = members?.find(m => m.seat === winnerSeat)?.user_id || null;
    await db.from('rooms').update({ status: 'finished', finished_at: new Date().toISOString(), winner_id: winner }).eq('code', room.code);
    const white = members?.find(m => m.seat === 'white')?.user_id || null;
    const black = members?.find(m => m.seat === 'black')?.user_id || null;
    await db.from('matches').insert({ room_code: room.code, white_player_id: white, black_player_id: black, winner_id: winner, result: winnerSeat || 'draw', moves: chess.history({ verbose: true }) });
    updateTurnText();
  }

  db.auth.onAuthStateChange((_event, session) => { if (session?.user) user = session.user; });
  authReady = automaticLogin();
  authReady.catch(() => {});
})();