// Chess Game UI Controller
let game = null;
let selectedSquare = null;
let validMoves = [];
let isFlipped = false;
let soundEnabled = true;
let timers = { white: 600, black: 600 };
let timerInterval = null;
let pendingPromotion = null;

// Unicode chess pieces
const pieces = {
    white: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    black: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

// Initialize game
function initGame() {
    game = new ChessGame();
    selectedSquare = null;
    validMoves = [];
    isFlipped = false;
    timers = { white: 600, black: 600 };
    
    // Load settings from localStorage
    loadSettings();
    
    renderBoard();
    updateStatus();
    updateTimers();
    clearMoveHistory();
    clearCapturedPieces();
    startTimer();
}

// Render the chessboard
function renderBoard() {
    const boardElement = document.getElementById('chessboard');
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const displayRow = isFlipped ? 7 - row : row;
            const displayCol = isFlipped ? 7 - col : col;
            
            const square = document.createElement('div');
            square.className = `square ${(displayRow + displayCol) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = displayRow;
            square.dataset.col = displayCol;
            square.onclick = () => handleSquareClick(displayRow, displayCol);
            
            const piece = game.getPiece(displayRow, displayCol);
            if (piece) {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'piece';
                pieceElement.textContent = pieces[piece.color][piece.type];
                square.appendChild(pieceElement);
            }
            
            // Highlight selected square
            if (selectedSquare && selectedSquare.row === displayRow && selectedSquare.col === displayCol) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves
            const isValidMove = validMoves.some(move => 
                move.to.row === displayRow && move.to.col === displayCol
            );
            
            if (isValidMove) {
                const targetPiece = game.getPiece(displayRow, displayCol);
                if (targetPiece) {
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }
            
            // Highlight last move
            if (game.moveHistory.length > 0) {
                const lastMove = game.moveHistory[game.moveHistory.length - 1].move;
                if ((lastMove.from.row === displayRow && lastMove.from.col === displayCol) ||
                    (lastMove.to.row === displayRow && lastMove.to.col === displayCol)) {
                    square.classList.add('last-move');
                }
            }
            
            // Highlight check
            if (piece && piece.type === 'k' && piece.color === game.currentPlayer) {
                if (game.isInCheck(piece.color)) {
                    square.classList.add('check');
                }
            }
            
            boardElement.appendChild(square);
        }
    }
}

// Handle square click
function handleSquareClick(row, col) {
    if (game.gameOver) return;
    
    const piece = game.getPiece(row, col);
    
    // If a square is already selected
    if (selectedSquare) {
        const move = validMoves.find(m => m.to.row === row && m.to.col === col);
        
        if (move) {
            // Check for pawn promotion
            const movingPiece = game.getPiece(selectedSquare.row, selectedSquare.col);
            if (movingPiece.type === 'p' && (row === 0 || row === 7)) {
                pendingPromotion = move;
                showPromotionModal();
                return;
            }
            
            makeMove(move);
        } else if (piece && piece.color === game.currentPlayer) {
            // Select a different piece
            selectedSquare = { row, col };
            validMoves = game.getPossibleMoves(row, col);
            renderBoard();
        } else {
            // Deselect
            selectedSquare = null;
            validMoves = [];
            renderBoard();
        }
    } else {
        // Select a piece
        if (piece && piece.color === game.currentPlayer) {
            selectedSquare = { row, col };
            validMoves = game.getPossibleMoves(row, col);
            renderBoard();
        }
    }
}

// Make a move
function makeMove(move) {
    const capturedPiece = game.getPiece(move.to.row, move.to.col);
    
    game.makeMove(move);
    
    // Update captured pieces display
    if (capturedPiece) {
        addCapturedPiece(capturedPiece);
    }
    
    // Play sound
    if (soundEnabled) {
        playMoveSound(capturedPiece !== null);
    }
    
    selectedSquare = null;
    validMoves = [];
    
    renderBoard();
    updateStatus();
    updateMoveHistory();
    
    // Check game over
    if (game.gameOver) {
        endGame();
    }
}

// Show promotion modal
function showPromotionModal() {
    const modal = document.getElementById('promotion-modal');
    modal.classList.add('show');
}

// Promote pawn
function promote(type) {
    if (pendingPromotion) {
        const capturedPiece = game.getPiece(pendingPromotion.to.row, pendingPromotion.to.col);
        game.makeMove(pendingPromotion, type);
        
        if (capturedPiece) {
            addCapturedPiece(capturedPiece);
        }
        
        if (soundEnabled) {
            playMoveSound(capturedPiece !== null);
        }
        
        pendingPromotion = null;
        document.getElementById('promotion-modal').classList.remove('show');
        
        selectedSquare = null;
        validMoves = [];
        
        renderBoard();
        updateStatus();
        updateMoveHistory();
        
        if (game.gameOver) {
            endGame();
        }
    }
}

// Update game status
function updateStatus() {
    const statusText = document.getElementById('status-text');
    const player1Info = document.getElementById('player1-info');
    const player2Info = document.getElementById('player2-info');
    
    const playerColor = game.currentPlayer === 'white' ? 'ขาว' : 'ดำ';
    const inCheck = game.isInCheck(game.currentPlayer);
    
    let status = `ตาของผู้เล่น: ${playerColor}`;
    if (inCheck) {
        status += ' (เช็ค!)';
    }
    
    statusText.textContent = status;
    
    // Update active player highlight
    if (game.currentPlayer === 'white') {
        player1Info.classList.add('active');
        player2Info.classList.remove('active');
    } else {
        player1Info.classList.remove('active');
        player2Info.classList.add('active');
    }
}

// Update move history
function updateMoveHistory() {
    const moveList = document.getElementById('move-list');
    moveList.innerHTML = '';
    
    for (let i = 0; i < game.moveHistory.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = formatMove(game.moveHistory[i]);
        const blackMove = game.moveHistory[i + 1] ? formatMove(game.moveHistory[i + 1]) : '';
        
        const moveItem = document.createElement('div');
        moveItem.className = 'move-item';
        moveItem.textContent = `${moveNum}. ${whiteMove} ${blackMove}`;
        moveList.appendChild(moveItem);
    }
    
    moveList.scrollTop = moveList.scrollHeight;
}

// Format move for display
function formatMove(record) {
    const move = record.move;
    const piece = record.piece;
    const files = 'abcdefgh';
    const ranks = '87654321';
    
    let notation = '';
    
    if (move.castling === 'kingSide') return 'O-O';
    if (move.castling === 'queenSide') return 'O-O-O';
    
    if (piece.type !== 'p') {
        notation += piece.type.toUpperCase();
    }
    
    if (record.captured || move.enPassant) {
        if (piece.type === 'p') {
            notation += files[move.from.col];
        }
        notation += 'x';
    }
    
    notation += files[move.to.col] + ranks[move.to.row];
    
    if (move.promotion) {
        notation += '=' + move.promotion.toUpperCase();
    }
    
    return notation;
}

// Clear move history display
function clearMoveHistory() {
    document.getElementById('move-list').innerHTML = '';
}

// Add captured piece to display
function addCapturedPiece(piece) {
    const containerId = piece.color === 'white' ? 'captured-by-black' : 'captured-by-white';
    const container = document.getElementById(containerId);
    
    const pieceSpan = document.createElement('span');
    pieceSpan.textContent = pieces[piece.color][piece.type];
    container.appendChild(pieceSpan);
}

// Clear captured pieces display
function clearCapturedPieces() {
    document.getElementById('captured-by-white').innerHTML = '';
    document.getElementById('captured-by-black').innerHTML = '';
}

// Timer functions
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (game.gameOver) return;
        
        timers[game.currentPlayer]--;
        updateTimers();
        
        if (timers[game.currentPlayer] <= 0) {
            endGameByTimeout();
        }
    }, 1000);
}

function updateTimers() {
    const whiteTimer = document.getElementById('timer-white');
    const blackTimer = document.getElementById('timer-black');
    
    whiteTimer.textContent = formatTime(timers.white);
    blackTimer.textContent = formatTime(timers.black);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function endGameByTimeout() {
    clearInterval(timerInterval);
    const winner = game.currentPlayer === 'white' ? 'ดำ' : 'ขาว';
    showGameOver(`หมดเวลา! ผู้ชนะคือ: ${winner}`);
}

function endGame() {
    clearInterval(timerInterval);
    
    const state = game.checkGameState();
    
    if (state.status === 'checkmate') {
        const winner = state.winner === 'white' ? 'ขาว' : 'ดำ';
        showGameOver(`เช็คเมท! ผู้ชนะคือ: ${winner}`);
    } else if (state.status === 'stalemate') {
        showGameOver('เสมอ (Stalemate)');
    } else if (state.status === 'fifty-move-rule') {
        showGameOver('เสมอ (กฎ 50 ตาเดิน)');
    } else if (state.status === 'insufficient-material') {
        showGameOver('เสมอ (ชิ้นส่วนไม่เพียงพอ)');
    } else if (state.status === 'threefold-repetition') {
        showGameOver('เสมอ (ตำแหน่งซ้ำ 3 ครั้ง)');
    }
}

function showGameOver(message) {
    document.getElementById('game-over-title').textContent = 'เกมจบ!';
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over-modal').classList.add('show');
}

function closeGameOverModal() {
    document.getElementById('game-over-modal').classList.remove('show');
}

// New game
function newGame() {
    closeGameOverModal();
    document.getElementById('promotion-modal').classList.remove('show');
    initGame();
}

// Undo move
function undoMove() {
    if (game.moveHistory.length === 0 || game.gameOver) return;
    
    game.undoMove();
    selectedSquare = null;
    validMoves = [];
    
    renderBoard();
    updateStatus();
    updateMoveHistory();
    
    // Recalculate captured pieces
    recalculateCapturedPieces();
}

function recalculateCapturedPieces() {
    clearCapturedPieces();
    
    const initialPieces = {
        white: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
        black: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 }
    };
    
    const currentPieces = {
        white: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
        black: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 }
    };
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = game.getPiece(row, col);
            if (piece) {
                currentPieces[piece.color][piece.type]++;
            }
        }
    }
    
    for (const color of ['white', 'black']) {
        const containerId = color === 'white' ? 'captured-by-black' : 'captured-by-white';
        const container = document.getElementById(containerId);
        
        for (const type of ['p', 'r', 'n', 'b', 'q']) {
            const capturedCount = initialPieces[color][type] - currentPieces[color][type];
            for (let i = 0; i < capturedCount; i++) {
                const pieceSpan = document.createElement('span');
                pieceSpan.textContent = pieces[color][type];
                container.appendChild(pieceSpan);
            }
        }
    }
}

// Flip board
function flipBoard() {
    isFlipped = !isFlipped;
    renderBoard();
}

// Show hint
function showHint() {
    if (!selectedSquare && validMoves.length === 0) {
        // Find first piece with valid moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.getPiece(row, col);
                if (piece && piece.color === game.currentPlayer) {
                    const moves = game.getPossibleMoves(row, col);
                    if (moves.length > 0) {
                        selectedSquare = { row, col };
                        validMoves = moves;
                        renderBoard();
                        
                        // Highlight first valid move
                        setTimeout(() => {
                            const squares = document.querySelectorAll('.square');
                            squares.forEach(sq => {
                                const r = parseInt(sq.dataset.row);
                                const c = parseInt(sq.dataset.col);
                                if (r === moves[0].to.row && c === moves[0].to.col) {
                                    sq.classList.add('hint-square');
                                    setTimeout(() => sq.classList.remove('hint-square'), 2000);
                                }
                            });
                        }, 100);
                        return;
                    }
                }
            }
        }
    } else if (validMoves.length > 0) {
        // Highlight first valid move
        const squares = document.querySelectorAll('.square');
        squares.forEach(sq => {
            const r = parseInt(sq.dataset.row);
            const c = parseInt(sq.dataset.col);
            if (r === validMoves[0].to.row && c === validMoves[0].to.col) {
                sq.classList.add('hint-square');
                setTimeout(() => sq.classList.remove('hint-square'), 2000);
            }
        });
    }
}

// Sound effects
function playMoveSound(isCapture) {
    // Simple beep using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (isCapture) {
        oscillator.frequency.value = 600;
    } else {
        oscillator.frequency.value = 400;
    }
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('sound-btn');
    btn.textContent = soundEnabled ? '🔊 เสียง: เปิด' : '🔇 เสียง: ปิด';
}

// Settings
function openSettings() {
    document.getElementById('settings-modal').classList.add('show');
    
    // Load current settings
    document.getElementById('time-control').value = Math.floor(timers.white / 60);
    document.getElementById('player1-name-input').value = document.getElementById('player1-name').textContent.replace(' (ขาว)', '');
    document.getElementById('player2-name-input').value = document.getElementById('player2-name').textContent.replace(' (ดำ)', '');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('show');
}

function saveSettings() {
    const timeControl = parseInt(document.getElementById('time-control').value) * 60;
    const player1Name = document.getElementById('player1-name-input').value;
    const player2Name = document.getElementById('player2-name-input').value;
    const theme = document.getElementById('theme-select').value;
    
    timers = { white: timeControl, black: timeControl };
    document.getElementById('player1-name').textContent = player1Name + ' (ขาว)';
    document.getElementById('player2-name').textContent = player2Name + ' (ดำ)';
    
    // Apply theme
    document.body.className = theme !== 'classic' ? `theme-${theme}` : '';
    
    // Save to localStorage
    localStorage.setItem('chess-settings', JSON.stringify({
        timeControl,
        player1Name,
        player2Name,
        theme
    }));
    
    closeSettings();
    updateTimers();
}

function loadSettings() {
    const settings = localStorage.getItem('chess-settings');
    if (settings) {
        const parsed = JSON.parse(settings);
        timers = { white: parsed.timeControl, black: parsed.timeControl };
        document.getElementById('player1-name').textContent = parsed.player1Name + ' (ขาว)';
        document.getElementById('player2-name').textContent = parsed.player2Name + ' (ดำ)';
        
        if (parsed.theme && parsed.theme !== 'classic') {
            document.body.className = `theme-${parsed.theme}`;
        }
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'n':
                e.preventDefault();
                newGame();
                break;
            case 'z':
                e.preventDefault();
                undoMove();
                break;
            case 'f':
                e.preventDefault();
                flipBoard();
                break;
            case 'h':
                e.preventDefault();
                showHint();
                break;
        }
    }
    
    // Escape to deselect
    if (e.key === 'Escape') {
        selectedSquare = null;
        validMoves = [];
        renderBoard();
    }
});

// Initialize on page load
window.onload = initGame;
