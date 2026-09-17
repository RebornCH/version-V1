// Chess Online Client - Chinese Dragon Style
// Socket.IO Client for Multiplayer Chess

let socket = null;
let currentRoom = null;
let playerColor = null;
let selectedTimeControl = 5;
let isSearchingMatch = false;
let gameState = null;
let chessGame = null;
let opponentTimerInterval = null;
let playerTimerInterval = null;

// Initialize Socket.IO connection
function connectToServer() {
    const serverUrl = window.location.origin;
    socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showError('ขาดการเชื่อมต่อจากเซิร์ฟเวอร์');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    });

    // Room events
    socket.on('roomCreated', handleRoomCreated);
    socket.on('waitingForPlayer', handleWaitingForPlayer);
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('gameStart', handleGameStart);
    socket.on('matchFound', handleMatchFound);
    socket.on('searchingMatch', handleSearchingMatch);
    socket.on('searchCancelled', handleSearchCancelled);
    socket.on('opponentMove', handleOpponentMove);
    socket.on('gameOver', handleGameOver);
    socket.on('drawOffer', handleDrawOffer);
    socket.on('drawDeclined', handleDrawDeclined);
    socket.on('error', handleError);
}

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.menu-screen, .game-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Cancel any ongoing search when leaving screens
    if (isSearchingMatch && screenId !== 'quickMatchScreen') {
        cancelQuickMatch();
    }
}

// Time Control Selection
document.querySelectorAll('.time-option').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active class from siblings
        this.parentElement.querySelectorAll('.time-option').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const time = parseInt(this.dataset.time);
        selectedTimeControl = time;
        
        // Update display if in searching status
        const timeDisplay = document.getElementById('selectedTimeDisplay');
        if (timeDisplay) {
            const increment = time === 15 ? 10 : 0;
            timeDisplay.textContent = `${time}+${increment}`;
        }
    });
});

// Quick Match Functions
function startQuickMatch() {
    if (!socket || !socket.connected) {
        showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณารีเฟรชหน้าเว็บ');
        return;
    }

    isSearchingMatch = true;
    document.getElementById('startQuickMatchBtn').style.display = 'none';
    document.getElementById('searchingStatus').style.display = 'block';
    
    const timeOption = document.querySelector('#quickMatchScreen .time-option.active');
    const time = parseInt(timeOption.dataset.time);
    const increment = time === 15 ? 10 : 0;
    document.getElementById('selectedTimeDisplay').textContent = `${time}+${increment}`;
    
    socket.emit('quickMatch', { timeControl: time });
}

function cancelQuickMatch() {
    if (socket && socket.connected) {
        socket.emit('cancelQuickMatch');
    }
    isSearchingMatch = false;
    document.getElementById('startQuickMatchBtn').style.display = 'block';
    document.getElementById('searchingStatus').style.display = 'none';
}

function handleSearchingMatch(data) {
    console.log('Searching for match...');
}

function handleSearchCancelled(data) {
    isSearchingMatch = false;
    document.getElementById('startQuickMatchBtn').style.display = 'block';
    document.getElementById('searchingStatus').style.display = 'none';
}

function handleMatchFound(data) {
    isSearchingMatch = false;
    currentRoom = data.roomId;
    playerColor = data.yourColor;
    
    // Update match found screen
    document.getElementById('matchYourColor').textContent = playerColor === 'white' ? '⚪' : '⚫';
    document.getElementById('matchOpponentColor').textContent = playerColor === 'white' ? '⚫' : '⚪';
    
    const increment = data.timeControl === 15 ? 10 : 0;
    document.getElementById('matchTimeControl').textContent = `${data.timeControl}+${increment}`;
    
    showScreen('matchFoundScreen');
    
    // Game will start automatically after short delay
}

// Create Room Functions
function createRoom() {
    if (!socket || !socket.connected) {
        showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณารีเฟรชหน้าเว็บ');
        return;
    }

    socket.emit('createRoom', { timeControl: selectedTimeControl });
}

function handleRoomCreated(data) {
    currentRoom = data.roomId;
    playerColor = data.yourColor;
    
    document.getElementById('roomCodeDisplay').textContent = data.roomId;
    
    showScreen('roomCreatedScreen');
}

function copyRoomCode() {
    const roomCode = document.getElementById('roomCodeDisplay').textContent;
    navigator.clipboard.writeText(roomCode).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ คัดลอกแล้ว!';
        btn.classList.add('copy-success');
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copy-success');
        }, 2000);
    }).catch(err => {
        showError('ไม่สามารถคัดลอกโค้ดได้ กรุณาลองอีกครั้ง');
    });
}

function shareViaLink() {
    const roomCode = document.getElementById('roomCodeDisplay').textContent;
    const shareUrl = `${window.location.origin}?room=${roomCode}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'เล่นหมากรุกด้วยกัน!',
            text: `มาร่วมเล่นหมากรุกกับฉัน! รหัสห้อง: ${roomCode}`,
            url: shareUrl
        }).catch(console.error);
    } else {
        // Fallback: copy link
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('คัดลอกลิงก์แล้ว: ' + shareUrl);
        });
    }
}

function leaveRoom() {
    if (currentRoom && socket && socket.connected) {
        socket.emit('leaveRoom', { roomId: currentRoom });
    }
    
    currentRoom = null;
    playerColor = null;
    showScreen('mainMenu');
}

// Join Room Functions
function joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    const colorSelect = document.getElementById('playerColorSelect');
    const playerColor = colorSelect.value;
    
    if (!roomCode || roomCode.length < 6) {
        showError('กรุณากรอกรหัสห้องให้ถูกต้อง');
        return;
    }
    
    if (!socket || !socket.connected) {
        showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    socket.emit('joinRoom', { roomId: roomCode, playerColor: playerColor });
}

function handleWaitingForPlayer(data) {
    currentRoom = data.roomId;
    playerColor = data.yourColor;
    
    document.getElementById('joinedRoomCode').textContent = data.roomId;
    
    const indicator = document.getElementById('joinedColorIndicator');
    indicator.textContent = playerColor === 'white' ? '⚪ ขาว' : '⚫ ดำ';
    indicator.className = `color-indicator ${playerColor}`;
    
    showScreen('waitingForPlayerScreen');
}

function handlePlayerJoined(data) {
    // Host sees that a player has joined
    console.log('Player joined:', data);
}

// Game Start
function handleGameStart(data) {
    currentRoom = data.roomId;
    
    // Find player's color
    const player = data.players.find(p => p.id === socket.id);
    playerColor = player ? player.color : 'white';
    
    // Setup game UI
    document.getElementById('gameRoomCode').textContent = `Room: ${data.roomId}`;
    
    const opponent = data.players.find(p => p.id !== socket.id);
    if (opponent) {
        document.getElementById('opponentName').textContent = opponent.name;
    }
    
    document.getElementById('playerName').textContent = 'คุณ';
    
    // Initialize chess game
    initOnlineChessGame(data.timeControl);
    
    showScreen('gameScreen');
}

// Initialize Online Chess Game
function initOnlineChessGame(timeControl) {
    // Create new ChessGame instance or reset existing one
    const boardEl = document.getElementById('chessBoard');
    boardEl.innerHTML = '';
    
    chessGame = new ChessGame();
    chessGame.initBoard();
    chessGame.timeControl = timeControl;
    chessGame.increment = timeControl === 15 ? 10 : 0;
    chessGame.isOnline = true;
    chessGame.playerColor = playerColor;
    
    // Set initial times
    chessGame.whiteTime = timeControl * 60;
    chessGame.blackTime = timeControl * 60;
    
    // Render board
    chessGame.renderBoard();
    
    // Flip board if playing black
    if (playerColor === 'black') {
        chessGame.flipBoard();
    }
    
    // Start timers
    startTimers(timeControl);
    
    gameState = chessGame.getGameState();
}

function startTimers(timeControl) {
    clearInterval(opponentTimerInterval);
    clearInterval(playerTimerInterval);
    
    const updateTimeDisplay = () => {
        const whiteTime = chessGame.whiteTime;
        const blackTime = chessGame.blackTime;
        
        const whiteMinutes = Math.floor(whiteTime / 60);
        const whiteSeconds = whiteTime % 60;
        const blackMinutes = Math.floor(blackTime / 60);
        const blackSeconds = blackTime % 60;
        
        const whiteDisplay = `${whiteMinutes}:${whiteSeconds.toString().padStart(2, '0')}`;
        const blackDisplay = `${blackMinutes}:${blackSeconds.toString().padStart(2, '0')}`;
        
        if (playerColor === 'white') {
            document.getElementById('playerTimer').textContent = whiteDisplay;
            document.getElementById('opponentTimer').textContent = blackDisplay;
        } else {
            document.getElementById('playerTimer').textContent = blackDisplay;
            document.getElementById('opponentTimer').textContent = whiteDisplay;
        }
        
        // Low time warning
        if (whiteTime <= 30) {
            document.getElementById('playerTimer').classList.add('low-time');
        } else {
            document.getElementById('playerTimer').classList.remove('low-time');
        }
        
        if (blackTime <= 30) {
            document.getElementById('opponentTimer').classList.add('low-time');
        } else {
            document.getElementById('opponentTimer').classList.remove('low-time');
        }
    };
    
    // Update every second
    opponentTimerInterval = setInterval(() => {
        if (chessGame.turn === 'black' && chessGame.gameState !== 'ended') {
            if (playerColor === 'white') {
                chessGame.blackTime = Math.max(0, chessGame.blackTime - 1);
            } else {
                chessGame.whiteTime = Math.max(0, chessGame.whiteTime - 1);
            }
            updateTimeDisplay();
            
            // Check timeout
            if ((playerColor === 'white' && chessGame.blackTime === 0) ||
                (playerColor === 'black' && chessGame.whiteTime === 0)) {
                handleTimeout();
            }
        }
    }, 1000);
    
    playerTimerInterval = setInterval(() => {
        if (chessGame.turn === 'white' && chessGame.gameState !== 'ended') {
            if (playerColor === 'white') {
                chessGame.whiteTime = Math.max(0, chessGame.whiteTime - 1);
            } else {
                chessGame.blackTime = Math.max(0, chessGame.blackTime - 1);
            }
            updateTimeDisplay();
            
            // Check timeout
            if ((playerColor === 'white' && chessGame.whiteTime === 0) ||
                (playerColor === 'black' && chessGame.blackTime === 0)) {
                handleTimeout();
            }
        }
    }, 1000);
    
    updateTimeDisplay();
}

function handleTimeout() {
    const winner = playerColor === 'white' ? 'black' : 'white';
    
    if (socket && socket.connected && currentRoom) {
        socket.emit('timeout', { roomId: currentRoom, winner: winner });
    }
    
    showGameOver('timeout', winner, `หมดเวลา! ${winner === 'white' ? 'White' : 'Black'} ชนะ`);
}

// Handle Opponent Move
function handleOpponentMove(data) {
    if (!chessGame) return;
    
    const move = data.move;
    gameState = data.gameState;
    
    // Apply move to local board
    chessGame.applyMove(move.from, move.to);
    
    // Update turn
    chessGame.turn = data.turn;
    
    // Re-render board
    chessGame.renderBoard();
    
    // Update captured pieces
    updateCapturedPieces();
    
    // Check game state
    if (gameState.status === 'checkmate') {
        showGameOver('checkmate', chessGame.turn === 'white' ? 'black' : 'white', 'เช็คเมท!');
    } else if (gameState.status === 'stalemate') {
        showGameOver('stalemate', null, 'เสมอ - สตาเลเมท!');
    } else if (gameState.status === 'draw') {
        showGameOver('draw', null, 'เสมอ!');
    } else if (gameState.status === 'check') {
        document.getElementById('gameStatus').textContent = 'เช็ค!';
    }
}

// Make Move
function makeMove(fromR, fromC, toR, toC) {
    if (!chessGame || !currentRoom || !socket) return false;
    
    const move = {
        from: { r: fromR, c: fromC },
        to: { r: toR, c: toC }
    };
    
    // Validate and execute move locally first
    const valid = chessGame.makeMove(fromR, fromC, toR, toC);
    
    if (valid) {
        gameState = chessGame.getGameState();
        
        // Send move to server
        socket.emit('makeMove', {
            roomId: currentRoom,
            move: move,
            gameState: gameState
        });
        
        // Re-render board
        chessGame.renderBoard();
        
        // Update captured pieces
        updateCapturedPieces();
        
        // Check game state
        if (gameState.status === 'checkmate') {
            showGameOver('checkmate', gameState.winner, 'เช็คเมท!');
        } else if (gameState.status === 'stalemate') {
            showGameOver('stalemate', null, 'เสมอ - สตาเลเมท!');
        } else if (gameState.status === 'draw') {
            showGameOver('draw', null, 'เสมอ!');
        } else if (gameState.status === 'check') {
            document.getElementById('gameStatus').textContent = 'เช็ค!';
        }
        
        return true;
    }
    
    return false;
}

// Update Captured Pieces Display
function updateCapturedPieces() {
    if (!chessGame) return;
    
    const playerCapturedEl = document.getElementById('playerCaptured');
    const opponentCapturedEl = document.getElementById('opponentCaptured');
    
    let playerCaptured = '';
    let opponentCaptured = '';
    
    chessGame.capturedPieces.forEach(piece => {
        const pieceChar = getPieceChar(piece.type, piece.color);
        if (piece.color === playerColor) {
            opponentCaptured += pieceChar;
        } else {
            playerCaptured += pieceChar;
        }
    });
    
    playerCapturedEl.textContent = playerCaptured;
    opponentCapturedEl.textContent = opponentCaptured;
}

function getPieceChar(type, color) {
    const pieces = {
        'k': '♚',
        'q': '♛',
        'r': '♜',
        'b': '♝',
        'n': '♞',
        'p': '♟'
    };
    return pieces[type] || '';
}

// Game Actions
function offerDraw() {
    if (!currentRoom || !socket) return;
    
    if (confirm('คุณต้องการเสนอเสมอหรือไม่?')) {
        socket.emit('offerDraw', { roomId: currentRoom });
    }
}

function acceptDraw() {
    if (!currentRoom || !socket) return;
    
    socket.emit('acceptDraw', { roomId: currentRoom });
    document.getElementById('drawOfferModal').style.display = 'none';
}

function declineDraw() {
    if (!currentRoom || !socket) return;
    
    socket.emit('declineDraw', { roomId: currentRoom });
    document.getElementById('drawOfferModal').style.display = 'none';
}

function handleDrawOffer(data) {
    document.getElementById('drawOfferModal').style.display = 'flex';
}

function handleDrawDeclined(data) {
    alert('คู่แข่งปฏิเสธการเสนอเสมอ');
    document.getElementById('drawOfferModal').style.display = 'none';
}

function resign() {
    if (!currentRoom || !socket) return;
    
    if (confirm('คุณแน่ใจว่าต้องการยอมแพ้หรือไม่?')) {
        socket.emit('resign', { roomId: currentRoom });
        showGameOver('resign', playerColor === 'white' ? 'black' : 'white', 'คุณยอมแพ้แล้ว');
    }
}

function handleGameOver(data) {
    showGameOver(data.reason, data.winner, data.message);
}

function showGameOver(reason, winner, message) {
    // Stop timers
    clearInterval(opponentTimerInterval);
    clearInterval(playerTimerInterval);
    
    // Update modal
    document.getElementById('gameOverTitle').textContent = reason === 'draw' ? 'เสมอ!' : 'เกมจบแล้ว!';
    document.getElementById('gameOverMessage').textContent = message;
    
    // Show rematch button for private rooms
    const rematchBtn = document.getElementById('rematchBtn');
    if (currentRoom && reason !== 'disconnect') {
        rematchBtn.style.display = 'block';
    } else {
        rematchBtn.style.display = 'none';
    }
    
    document.getElementById('gameOverModal').style.display = 'flex';
}

function rematch() {
    if (!currentRoom) return;
    
    // For now, just restart the game
    // In a full implementation, you'd send a rematch request to opponent
    document.getElementById('gameOverModal').style.display = 'none';
    initOnlineChessGame(chessGame.timeControl);
}

function leaveGame() {
    if (confirm('คุณแน่ใจว่าต้องการออกจากเกมหรือไม่? การออกกลางคันจะถือว่าแพ้')) {
        if (currentRoom && socket) {
            socket.emit('resign', { roomId: currentRoom });
        }
        showScreen('mainMenu');
    }
}

// Error Handling
function handleError(data) {
    showError(data.message);
}

function showError(message) {
    alert('❌ ข้อผิดพลาด: ' + message);
}

// Local Game Functions
function startLocalGame() {
    showScreen('localGameScreen');
    
    // Initialize local chess game
    setTimeout(() => {
        const boardEl = document.getElementById('localChessBoard');
        boardEl.innerHTML = '';
        
        chessGame = new ChessGame();
        chessGame.initBoard();
        chessGame.isOnline = false;
        chessGame.renderBoard();
        
        // Override makeMove for local play
        const originalHandleSquareClick = chessGame.handleSquareClick.bind(chessGame);
        chessGame.handleSquareClick = function(r, c) {
            const result = originalHandleSquareClick(r, c);
            if (result && this.selectedSquare === null) {
                // Move was made, check game state
                const state = this.getGameState();
                const statusEl = document.getElementById('localGameStatus');
                
                if (state.status === 'checkmate') {
                    statusEl.textContent = `เช็คเมท! ${this.turn === 'white' ? 'ดำ' : 'ขาว'} ชนะ!`;
                } else if (state.status === 'stalemate') {
                    statusEl.textContent = 'เสมอ - สตาเลเมท!';
                } else if (state.status === 'draw') {
                    statusEl.textContent = 'เสมอ!';
                } else if (state.status === 'check') {
                    statusEl.textContent = 'เช็ค!';
                } else {
                    statusEl.textContent = `${this.turn === 'white' ? 'ขาว' : 'ดำ'} เดินหมาก`;
                }
            }
        };
        
        document.getElementById('localGameStatus').textContent = 'ขาวเดินหมาก';
    }, 100);
}

function resetLocalGame() {
    startLocalGame();
}

// Handle URL parameters for joining rooms
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    
    if (roomCode) {
        document.getElementById('roomCodeInput').value = roomCode.toUpperCase();
        showScreen('joinRoomScreen');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    connectToServer();
    handleUrlParams();
    
    // Override chess.js makeMove to work with online mode
    const originalMakeMove = ChessGame.prototype.makeMove;
    ChessGame.prototype.makeMove = function(fromR, fromC, toR, toC) {
        if (this.isOnline) {
            return makeMove(fromR, fromC, toR, toC);
        } else {
            return originalMakeMove.call(this, fromR, fromC, toR, toC);
        }
    };
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (currentRoom && socket) {
        socket.emit('leaveRoom', { roomId: currentRoom });
    }
});
