const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const movesDisclosure = document.getElementById('movesDisclosure');
const movesCountEl = document.getElementById('movesCount');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('gameStatus');
const aiLevelLabel = document.getElementById('aiLevelLabel');
const toastEl = document.getElementById('toast');
const hintButton = document.getElementById('hintButton');
const hintCounter = document.getElementById('hintCounter');
const resumeButton = document.getElementById('resumeGame');
const SAVED_GAME_KEY = 'ai_chess_saved_game_v1';
const shareButton=document.getElementById('shareGame'),shareModal=document.getElementById('shareModal'),sharePreview=document.getElementById('sharePreview');

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SYMBOLS = {
  P:'♙', N:'♘', B:'♗', R:'♖', Q:'♕', K:'♔',
  p:'♟', n:'♞', b:'♝', r:'♜', q:'♛', k:'♚'
};
const files = ['a','b','c','d','e','f','g','h'];
let fen = START_FEN;
let selected = null;
let legalMoves = [];
let movePairs = [];
let moveHistory = [];
let lastMove = null;
let hintMove = null;
let hintsUsed = 0;
const MAX_HINTS = 3;
let locked = false;
let gameGeneration = 0;
let pendingMoveController = null;
let pendingLegalController = null;

function toast(text){
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(()=>toastEl.classList.remove('show'), 1700);
}

function inviteData(){
 const code=window.multiplayerGame?.room_code||'';
 const url=new URL(location.origin+location.pathname);if(code)url.searchParams.set('room',code);
 return {title:t('inviteTitle'),text:code?t('inviteRoomText',{code}):t('inviteText'),url:url.toString()};
}
function prepareShareFallback(data){
 const full=data.text+'\n'+data.url,encoded=encodeURIComponent(full);
 sharePreview.textContent=full;
 document.getElementById('shareWhatsApp').href='https://wa.me/?text='+encoded;
 document.getElementById('shareSms').href='sms:?&body='+encoded;
 document.getElementById('shareEmail').href='mailto:?subject='+encodeURIComponent(data.title)+'&body='+encoded;
 shareModal.hidden=false;document.body.classList.add('modal-open');
}
function closeShare(){shareModal.hidden=true;document.body.classList.remove('modal-open')}
async function shareGame(){
 const data=inviteData();chessSound.play('transition');
 if(navigator.share){try{await navigator.share(data);return}catch(err){if(err.name==='AbortError')return}}
 prepareShareFallback(data);
}
shareButton.addEventListener('click',shareGame);
document.getElementById('closeShare').addEventListener('click',closeShare);
document.querySelector('[data-close-share]').addEventListener('click',closeShare);
document.getElementById('copyInvite').addEventListener('click',async()=>{const d=inviteData();try{await navigator.clipboard.writeText(d.text+'\n'+d.url);toast(t('linkCopied'));closeShare()}catch(_){toast(t('copyFailed'))}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeShare()});

function parseFenPieces(fenString){
  const placement = fenString.split(' ')[0];
  const rows = placement.split('/');
  const map = {};
  rows.forEach((row, rowIndex)=>{
    let fileIndex = 0;
    for(const ch of row){
      if(/\d/.test(ch)){ fileIndex += Number(ch); continue; }
      const square = files[fileIndex] + (8-rowIndex);
      map[square] = ch;
      fileIndex += 1;
    }
  });
  return map;
}

function currentTurn(){ return fen.split(' ')[1] === 'w' ? 'white' : 'black'; }
function savedGame(){try{return JSON.parse(localStorage.getItem(SAVED_GAME_KEY)||'null')}catch(_){return null}}
function refreshResumeButton(){resumeButton.hidden=!savedGame()||Boolean(window.multiplayerGame)}
function saveCurrentGame(){
 if(window.multiplayerGame||!moveHistory.length)return;
 localStorage.setItem(SAVED_GAME_KEY,JSON.stringify({fen,moveHistory,movePairs,lastMove,level:levelEl.value,savedAt:Date.now()}));
 refreshResumeButton();
}
function clearSavedGame(){localStorage.removeItem(SAVED_GAME_KEY);refreshResumeButton()}
function resumePreviousGame(){
 const saved=savedGame();if(!saved)return;
 try{
   fen=saved.fen;moveHistory=Array.isArray(saved.moveHistory)?saved.moveHistory:[];movePairs=Array.isArray(saved.movePairs)?saved.movePairs:[];lastMove=Array.isArray(saved.lastMove)?saved.lastMove:null;
   if(saved.level&&levelEl.querySelector(`option[value="${saved.level}"]`))levelEl.value=saved.level;
   aiLevelLabel.textContent=levelEl.options[levelEl.selectedIndex].text;selected=null;legalMoves=[];hintMove=null;locked=false;
   renderMoves();renderBoard();updateHintAvailability();refreshResumeButton();statusEl.textContent=t('gameResumed');toast(t('gameResumed'));chessSound.play('transition');
 }catch(_){clearSavedGame();toast(t('savedGameInvalid'))}
}

function renderBoard(){
  const pieces = parseFenPieces(fen);
  boardEl.innerHTML = '';
  for(let rank=8; rank>=1; rank--){
    for(let fileIndex=0; fileIndex<8; fileIndex++){
      const sq = files[fileIndex] + rank;
      const square = document.createElement('button');
      square.type = 'button';
      square.className = `square ${((8-rank)+fileIndex)%2===0?'light':'dark'}`;
      square.dataset.square = sq;
      if(selected === sq) square.classList.add('selected');
      if(legalMoves.includes(sq)) square.classList.add(pieces[sq] ? 'capture' : 'legal');
      if(lastMove && lastMove.includes(sq)) square.classList.add('last');
      if(hintMove?.from === sq) square.classList.add('hint-from');
      if(hintMove?.to === sq) square.classList.add('hint-to');

      const piece = pieces[sq];
      if(piece){
        const span = document.createElement('span');
        span.className = `piece ${piece === piece.toUpperCase() ? 'white':'black'}`;
        span.textContent = SYMBOLS[piece];
        square.appendChild(span);
      }

      if(rank===1){
        const c=document.createElement('span'); c.className='coord file'; c.textContent=files[fileIndex]; square.appendChild(c);
      }
      if(fileIndex===0){
        const c=document.createElement('span'); c.className='coord rank'; c.textContent=rank; square.appendChild(c);
      }

      square.addEventListener('click', ()=>onSquareClick(sq, piece));
      boardEl.appendChild(square);
    }
  }
}

async function onSquareClick(square, piece){
  hintMove=null;
  if(locked || (window.multiplayerGame ? !window.multiplayerCanMove() : currentTurn() !== 'white')) return;

  if(selected && legalMoves.includes(square)){
    await playMove(selected, square);
    return;
  }

  const isPlayablePiece = window.multiplayerGame ? window.multiplayerOwnsPiece(piece) : piece && piece === piece.toUpperCase();
  if(!isPlayablePiece){ selected=null; legalMoves=[]; renderBoard(); return; }

  selected = square;
  pendingLegalController?.abort();
  const controller = new AbortController();
  pendingLegalController = controller;
  const generation = gameGeneration;
  try {
    const response = await fetch('/api/legal', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fen, square}),
      signal:controller.signal
    });
    if(generation !== gameGeneration) return;
    if(!response.ok){ toast(t('legalError')); return; }
    const data = await response.json();
    if(generation !== gameGeneration) return;
    legalMoves = data.moves;
    renderBoard();
  } catch(err) {
    if(err.name !== 'AbortError' && generation === gameGeneration) toast(t('legalError'));
  } finally {
    if(pendingLegalController === controller) pendingLegalController = null;
  }
}

async function playMove(from, to){
  if(window.multiplayerGame){ await window.multiplayerMove(from,to); return; }
  const generation = gameGeneration;
  const controller = new AbortController();
  pendingMoveController = controller;
  locked = true;
  statusEl.textContent = t('aiThinking');
  const previousFen = fen;
  try{
    const response = await fetch('/api/move', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        fen,
        from_square:from,
        to_square:to,
        promotion:'q',
        level:levelEl.value,
        move_history:moveHistory
      }),
      signal:controller.signal
    });
    const data = await response.json();
    if(generation !== gameGeneration) return;
    if(!response.ok) throw new Error(data.detail || 'Illegal move');

    hintMove=null;
    fen = data.fen;
    moveHistory = data.move_history;
    lastMove = data.ai_move ? [data.ai_move.slice(0,2), data.ai_move.slice(2,4)] : [from,to];
    movePairs.push({white:data.player_san, black:data.ai_san || ''});
    const wasCapture=(data.player_san||'').includes('x')||(data.ai_san||'').includes('x');
    chessSound.play(wasCapture?'capture':'move');
    selected = null; legalMoves = [];
    renderMoves(); renderBoard(); updateHintAvailability();
    saveCurrentGame();

    if(data.status === 'game_over'){
      clearSavedGame();
      if(data.winner === 'white'){ statusEl.textContent=t('youWon'); chessSound.play('win'); }
      else if(data.winner === 'black'){ statusEl.textContent=t('aiWon'); chessSound.play('loss'); }
      else { statusEl.textContent=t('draw'); chessSound.play('draw'); }
    }else{
      statusEl.textContent=data.check?t('checkTurn'):t('yourWhiteTurn');
      if(data.check)chessSound.play('check');
    }
  }catch(err){
    if(err.name === 'AbortError' || generation !== gameGeneration) return;
    fen = previousFen;
    toast(t('illegalMove'));
    statusEl.textContent = t('yourWhiteTurn');
  }finally{
    if(pendingMoveController === controller) pendingMoveController = null;
    if(generation === gameGeneration) locked = false;
  }
}

function renderMoves(){
  const moveCount=moveHistory.length||movePairs.reduce((count,move)=>count+(move.white?1:0)+(move.black?1:0),0);
  movesCountEl.textContent=String(moveCount);
  movesDisclosure.setAttribute('aria-label',`${t('moveHistory')}: ${moveCount}`);
  if(!movePairs.length){ movesEl.innerHTML=`<div class="empty-state">${t('emptyMoves')}</div>`; return; }
  movesEl.innerHTML = movePairs.map((m,i)=>`
    <div class="move-row"><span class="n">${i+1}</span><span class="move-pill">${m.white}</span><span class="move-pill">${m.black || '…'}</span></div>
  `).join('');
  movesEl.scrollTop = movesEl.scrollHeight;
}

function updateHintAvailability(){
  const enabled=['beginner','easy'].includes(levelEl.value)&&!window.multiplayerGame;
  hintButton.hidden=!enabled;
  hintCounter.hidden=!enabled;
  hintButton.disabled=hintsUsed>=MAX_HINTS||locked;
  hintCounter.textContent=enabled?t('hintsRemaining',{count:Math.max(0,MAX_HINTS-hintsUsed)}):'';
}

async function requestHint(){
  if(!['beginner','easy'].includes(levelEl.value)||window.multiplayerGame||locked)return;
  if(hintsUsed>=MAX_HINTS){toast(t('noHintsLeft'));return;}
  hintButton.disabled=true;hintButton.textContent=t('findingHint');
  try{
    const response=await fetch('/api/hint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fen,move_history:moveHistory})});
    const data=await response.json();if(!response.ok)throw new Error(data.detail||'hint error');
    hintsUsed+=1;hintMove={from:data.from_square,to:data.to_square};selected=data.from_square;legalMoves=[data.to_square];
    renderBoard();chessSound.play('check');toast(t(data.capture?'hintCapture':'hintMove',{from:data.from_square,to:data.to_square}));
  }catch(_){toast(t('hintUnavailable'));}
  finally{hintButton.textContent=t('getHint');updateHintAvailability();}
}

function resetGame(playSound=true,clearPrevious=true){
  gameGeneration += 1;
  pendingMoveController?.abort();
  pendingLegalController?.abort();
  pendingMoveController = null;
  pendingLegalController = null;
  fen=START_FEN; selected=null; legalMoves=[]; movePairs=[]; moveHistory=[]; lastMove=null; hintMove=null; hintsUsed=0; locked=false;
  statusEl.textContent=t('yourWhiteTurn');
  renderMoves(); renderBoard(); updateHintAvailability();
  if(clearPrevious)clearSavedGame();else refreshResumeButton();
  if(playSound)chessSound.play('challenge');
}

resumeButton.addEventListener('click',resumePreviousGame);
hintButton.addEventListener('click',requestHint);
document.getElementById('newGame').addEventListener('click',()=>resetGame(true));
levelEl.addEventListener('change', ()=>{
  aiLevelLabel.textContent = levelEl.options[levelEl.selectedIndex].text;
  hintsUsed=0; hintMove=null; selected=null; legalMoves=[]; renderBoard(); updateHintAvailability();
  toast(t('levelToast',{level:aiLevelLabel.textContent}));
});

resetGame(false,false);

window.addEventListener('languagechange',()=>{ aiLevelLabel.textContent=levelEl.options[levelEl.selectedIndex].text; hintButton.textContent=t('getHint'); resumeButton.textContent=t('resumeGame'); updateHintAvailability(); refreshResumeButton(); renderMoves(); if(!window.multiplayerGame && !locked) statusEl.textContent=t('yourWhiteTurn'); });
