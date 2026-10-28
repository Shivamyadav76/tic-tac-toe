// Web Audio API Synthesizer (Zero External Audio Files Needed)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
  clickX: () => playTone(540, 'triangle', 0.08, 0.15),
  clickO: () => playTone(360, 'sine', 0.08, 0.15),
  win: () => {
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => playTone(f, 'square', 0.25, 0.1), i * 90);
    });
  },
  draw: () => {
    [320, 290, 260].forEach((f, i) => {
      setTimeout(() => playTone(f, 'sawtooth', 0.2, 0.08), i * 80);
    });
  }
};

// Game State
const cells = document.querySelectorAll('.cell');
const statusBanner = document.getElementById('status');
const cardX = document.getElementById('card-x');
const cardO = document.getElementById('card-o');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreTiesEl = document.getElementById('score-ties');
const modeButtons = document.querySelectorAll('.mode-btn');

let currentMode = 'pvp'; // 'pvp', 'ai-easy', 'ai-hard'
let board = Array(9).fill("");
let turn = 'X';
let active = true;
let scores = { X: 0, O: 0, ties: 0 };

const winCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function init() {
  cells.forEach(c => c.addEventListener('click', handleCellClick));
  document.getElementById('btn-restart').addEventListener('click', resetBoard);
  document.getElementById('btn-reset-score').addEventListener('click', resetScores);

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      document.getElementById('o-label').textContent = currentMode === 'pvp' ? 'PLAYER O' : 'BOT (O)';
      resetBoard();
    });
  });

  updateTurnUI();
}

function handleCellClick(e) {
  const idx = parseInt(e.target.dataset.index);
  if (board[idx] !== "" || !active) return;

  makeMove(idx, turn);

  if (active && currentMode !== 'pvp' && turn === 'O') {
    active = false; // Lock user input during bot thinking
    setTimeout(botTurn, 320);
  }
}

function makeMove(idx, player) {
  board[idx] = player;
  const cell = cells[idx];
  cell.textContent = player;
  cell.classList.add(player.toLowerCase());

  if (player === 'X') sounds.clickX();
  else sounds.clickO();

  const winCombo = checkWin(board, player);
  if (winCombo) {
    endGame(player, winCombo);
    return;
  }

  if (board.every(val => val !== "")) {
    endGame('Draw');
    return;
  }

  turn = turn === 'X' ? 'O' : 'X';
  updateTurnUI();
}

function botTurn() {
  let moveIdx;
  if (currentMode === 'ai-easy') {
    const emptyIndices = board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
    moveIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  } else {
    moveIdx = getBestMoveMinimax();
  }

  active = true;
  makeMove(moveIdx, 'O');
}

// Minimax algorithm for unbeatable master bot
function getBestMoveMinimax() {
  function minimax(newBoard, player) {
    const availSpots = newBoard.map((v, i) => v === "" ? i : null).filter(v => v !== null);

    if (checkWin(newBoard, 'X')) return { score: -10 };
    if (checkWin(newBoard, 'O')) return { score: 10 };
    if (availSpots.length === 0) return { score: 0 };

    const moves = [];
    for (let i = 0; i < availSpots.length; i++) {
      const move = {};
      move.index = availSpots[i];
      newBoard[availSpots[i]] = player;

      if (player === 'O') {
        const result = minimax(newBoard, 'X');
        move.score = result.score;
      } else {
        const result = minimax(newBoard, 'O');
        move.score = result.score;
      }

      newBoard[availSpots[i]] = "";
      moves.push(move);
    }

    let bestMove;
    if (player === 'O') {
      let bestScore = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }
    return moves[bestMove];
  }

  return minimax(board, 'O').index;
}

function checkWin(b, player) {
  return winCombos.find(c => b[c[0]] === player && b[c[1]] === player && b[c[2]] === player) || null;
}

function endGame(winner, combo = null) {
  active = false;
  if (winner === 'Draw') {
    statusBanner.textContent = "It's a Draw!";
    scores.ties++;
    scoreTiesEl.textContent = scores.ties;
    sounds.draw();
  } else {
    statusBanner.textContent = `${winner === 'O' && currentMode !== 'pvp' ? 'Bot' : 'Player ' + winner} Wins!`;
    scores[winner]++;
    if (winner === 'X') scoreXEl.textContent = scores.X;
    else scoreOEl.textContent = scores.O;

    combo.forEach(idx => cells[idx].classList.add('winner'));
    sounds.win();

    if (typeof confetti === 'function') {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }
  }
}

function updateTurnUI() {
  statusBanner.textContent = `Turn: Player ${turn}`;
  if (turn === 'X') {
    cardX.classList.add('active-turn');
    cardO.classList.remove('active-turn');
  } else {
    cardO.classList.add('active-turn');
    cardX.classList.remove('active-turn');
  }
}

function resetBoard() {
  board = Array(9).fill("");
  active = true;
  turn = 'X';
  cells.forEach(c => {
    c.textContent = "";
    c.className = 'cell';
  });
  updateTurnUI();
}

function resetScores() {
  scores = { X: 0, O: 0, ties: 0 };
  scoreXEl.textContent = '0';
  scoreOEl.textContent = '0';
  scoreTiesEl.textContent = '0';
  resetBoard();
}

init();