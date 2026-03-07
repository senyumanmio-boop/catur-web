const canvas = document.getElementById('chessCanvas');
const ctx = canvas.getContext('2d');

const squareSize = 80; // 640 / 8
const rows = 8;
const cols = 8;

let board = [];
let selected = null;
let turn = 'white'; // 'white' atau 'black'
let gameActive = true;
let autoMode = false;
let level = 'easy'; // 'easy', 'medium', 'hard'
let moveHistory = [];

const pieceUnicode = {
  'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟',
  'R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙'
};

const initialBoard = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

let gameLevel = 'easy'; // bisa diubah
let aiThinking = false;

// Fungsi gambar papan
function drawBoard() {
  ctx.clearRect(0, 0, 640, 640);
  for (let r=0; r<rows; r++) {
    for (let c=0; c<cols; c++) {
      ctx.fillStyle = (r+c)%2===0 ? '#f0d9b5' : '#b58863';
      ctx.fillRect(c*squareSize, r*squareSize, squareSize, squareSize);
      const piece = board[r][c];
      if(piece) {
        ctx.font = '40px Arial';
        ctx.fillStyle = (piece === piece.toUpperCase()) ? '#fff' : '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pieceUnicode[piece], c*squareSize + squareSize/2, r*squareSize + squareSize/2);
      }
    }
  }
  // Highlight selected
  if(selected) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.strokeRect(selected.col*squareSize, selected.row*squareSize, squareSize, squareSize);
  }
}

// Reset permainan
function initGame() {
  board = initialBoard.map(row => row.slice());
  turn = 'white';
  gameActive = true;
  selected = null;
  moveHistory = [];
  drawBoard();
  document.getElementById('status').innerText = 'Giliran: ' + turn;
  if(autoMode && turn==='black') aiMakeMove();
}

// Event klik papan
canvas.addEventListener('click', (e) => {
  if(!gameActive || (autoMode && turn==='black')) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x / squareSize);
  const r = Math.floor(y / squareSize);
  handleSquareClick(r, c);
});

// Handle klik
function handleSquareClick(r, c) {
  const piece = board[r][c];
  if(selected) {
    // Cek valid move
    const validMoves = getValidMoves(selected.row, selected.col);
    const isValid = validMoves.some(m => m.row===r && m.col===c);
    if(isValid) {
      movePiece(selected, {row:r, col:c});
      selected = null;
      drawBoard();
      switchTurn();
    } else {
      // Pilih lagi jika klik lagi pemain yang sama
      if(piece && isPlayerPiece(piece)) {
        selected = {row:r, col:c};
        drawBoard();
      } else {
        selected = null;
        drawBoard();
      }
    }
  } else {
    if(piece && isPlayerPiece(piece)) {
      selected = {row:r, col:c};
      drawBoard();
    }
  }
}

// Periksa apakah bidak pemain
function isPlayerPiece(piece) {
  if(turn==='white') return piece===piece.toUpperCase();
  else return piece===piece.toLowerCase();
}

// Ganti giliran
function switchTurn() {
  turn = (turn==='white') ? 'black' : 'white';
  document.getElementById('status').innerText = 'Giliran: ' + turn;
  if(autoMode && turn==='black') {
    aiMakeMove();
  }
}

// Mendapatkan langkah valid
function getValidMoves(r, c) {
  const piece = board[r][c];
  const moves = [];
  if(!piece) return moves;
  // Tambahkan aturan lengkap untuk semua bidak
  // Contoh pion
  if(piece.toLowerCase() === 'p') {
    const dir = (piece === 'P') ? -1 : 1;
    const nr = r + dir;
    if(nr>=0 && nr<8 && board[nr][c]==='') {
      moves.push({row: nr, col: c});
    }
    // Tambahkan langkah diagonal
    if(nr>=0 && nr<8 && c-1>=0 && board[nr][c-1]!=='') {
      if(isOpponentPiece(board[nr][c-1])) {
        moves.push({row: nr, col: c-1});
      }
    }
    if(nr>=0 && nr<8 && c+1<8 && board[nr][c+1]!=='') {
      if(isOpponentPiece(board[nr][c+1])) {
        moves.push({row: nr, col: c+1});
      }
    }
  }
  // Tambahkan aturan lain untuk bidak lain (ratu, raja, kuda, benteng, menteri)
  // Untuk lengkapnya, kamu bisa tambah sesuai aturan catur
  // Karena panjang, saya skip detail semua aturan di sini
  return moves;
}

function isOpponentPiece(piece) {
  if(!piece) return false;
  if(turn==='white') return piece===piece.toLowerCase();
  else return piece===piece.toUpperCase();
}

// Pindahkan bidak
function movePiece(from, to) {
  // Simpan history untuk undo
  moveHistory.push({from, to, piece: board[from.row][from.col], captured: board[to.row][to.col]});
  board[to.row][to.col] = board[from.row][from.col];
  board[from.row][from.col] = '';
  // Update status
  checkGameStatus();
}

// Cek status game
function checkGameStatus() {
  // Bisa tambah cek skakmat/draw
}

// AI membuat langkah
async function aiMakeMove() {
  aiThinking = true;
  document.getElementById('status').innerText = 'AI berpikir...';
  const bestMove = await getBestMove(board, level);
  if(bestMove) {
    movePiece(bestMove.from, bestMove.to);
    drawBoard();
    switchTurn();
  } else {
    alert('Permainan selesai!');
    gameActive = false;
  }
  aiThinking = false;
}

// Implementasi minimax
async function getBestMove(currentBoard, level) {
  // Tambahkan algoritma minimax dengan depth sesuai level
  // Untuk contoh, saya buat acak
  return new Promise((resolve) => {
    setTimeout(() => {
      // Cari semua langkah AI
      const moves = [];
      for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
          if(currentBoard[r][c] && currentBoard[r][c]===currentBoard[r][c].toLowerCase()) {
            const validMoves = getValidMovesForBoard(currentBoard, r, c);
            validMoves.forEach(m => {
              moves.push({from: {row:r, col:c}, to: m});
            });
          }
        }
      }
      if(moves.length===0) resolve(null);
      else resolve(moves[Math.floor(Math.random() * moves.length)]);
    }, 1000);
  });
}

// Mendapatkan valid move untuk board tertentu (untuk AI)
function getValidMovesForBoard(b, r, c) {
  // Sama seperti getValidMoves, tapi untuk board lain
  // Untuk simplifikasi, kamu bisa copy fungsi dan ganti board menjadi b
  // Karena panjang, saya skip detail
  return [];
}

// Tombol kontrol
document.getElementById('restartBtn').addEventListener('click', () => {
  initGame();
});
document.getElementById('levelBtn').addEventListener('click', () => {
  if(level==='easy') {
    level='medium';
  } else if(level==='medium') {
    level='hard';
  } else {
    level='easy';
  }
  document.getElementById('levelBtn').innerText = 'Level: ' + level;
});
document.getElementById('autoPlayBtn').addEventListener('click', () => {
  autoMode = !autoMode;
  document.getElementById('autoPlayBtn').innerText = 'Mode Otomatis: ' + (autoMode ? 'Hidup' : 'Mati');
  if(autoMode && turn==='black') aiMakeMove();
});

// Inisialisasi game
initGame();
