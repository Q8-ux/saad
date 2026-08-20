const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('gameStatus');
const aiLevelLabel = document.getElementById('aiLevelLabel');
const toastEl = document.getElementById('toast');

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
let lastMove = null;
let locked = false;

function toast(text){
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(()=>toastEl.classList.remove('show'), 1700);
}

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
  if(locked || currentTurn() !== 'white') return;

  if(selected && legalMoves.includes(square)){
    await playMove(selected, square);
    return;
  }

  const isWhitePiece = piece && piece === piece.toUpperCase();
  if(!isWhitePiece){ selected=null; legalMoves=[]; renderBoard(); return; }

  selected = square;
  const response = await fetch('/api/legal', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fen, square})
  });
  if(!response.ok){ toast('تعذر قراءة النقلات'); return; }
  const data = await response.json();
  legalMoves = data.moves;
  renderBoard();
}

async function playMove(from, to){
  locked = true;
  statusEl.textContent = 'الذكاء الاصطناعي يفكر…';
  const previousFen = fen;
  try{
    const response = await fetch('/api/move', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fen, from_square:from, to_square:to, promotion:'q', level:levelEl.value})
    });
    const data = await response.json();
    if(!response.ok) throw new Error(data.detail || 'Illegal move');

    fen = data.fen;
    lastMove = [from,to];
    movePairs.push({white:data.player_san, black:data.ai_san || ''});
    selected = null; legalMoves = [];
    renderMoves(); renderBoard();

    if(data.status === 'game_over'){
      if(data.winner === 'white') statusEl.textContent = 'كش مات — فزت بالمباراة';
      else if(data.winner === 'black') statusEl.textContent = 'كش مات — فاز الذكاء الاصطناعي';
      else statusEl.textContent = 'انتهت المباراة بالتعادل';
    }else{
      statusEl.textContent = data.check ? 'كش — دورك' : 'دورك — الأبيض';
    }
  }catch(err){
    fen = previousFen;
    toast('النقلة غير متاحة');
    statusEl.textContent = 'دورك — الأبيض';
  }finally{
    locked = false;
  }
}

function renderMoves(){
  if(!movePairs.length){ movesEl.innerHTML='<div class="empty-state">ابدأ المباراة وستظهر النقلات هنا.</div>'; return; }
  movesEl.innerHTML = movePairs.map((m,i)=>`
    <div class="move-row"><span class="n">${i+1}</span><span class="move-pill">${m.white}</span><span class="move-pill">${m.black || '…'}</span></div>
  `).join('');
  movesEl.scrollTop = movesEl.scrollHeight;
}

function resetGame(){
  fen=START_FEN; selected=null; legalMoves=[]; movePairs=[]; lastMove=null; locked=false;
  statusEl.textContent='دورك — الأبيض';
  renderMoves(); renderBoard();
}

document.getElementById('newGame').addEventListener('click', resetGame);
levelEl.addEventListener('change', ()=>{
  aiLevelLabel.textContent = levelEl.options[levelEl.selectedIndex].text;
  toast(`المستوى: ${aiLevelLabel.textContent}`);
});

resetGame();
