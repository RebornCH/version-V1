<script>
/**
 * Dragon Chess Engine & UI
 * Production Ready Version
 */

const PIECES = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

class ChessGame {
    constructor() {
        this.board = [];
        this.turn = 'w';
        this.castling = { w: { k: true, q: true }, b: { k: true, q: true } };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.history = [];
        this.positionHistory = {};
        this.isFlipped = false;
        this.showHints = false;
        this.selectedSquare = null;
        this.validMoves = [];
        this.timers = { w: 600, b: 600 };
        this.timerInterval = null;
        this.gameActive = false;
        
        this.initBoard();
        this.renderBoard();
        this.startTimer();
    }

    initBoard() {
        const setup = [
            ['r','n','b','q','k','b','n','r'],
            ['p','p','p','p','p','p','p','p'],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            ['p','p','p','p','p','p','p','p'],
            ['r','n','b','q','k','b','n','r']
        ];

        this.board = setup.map((row, r) => 
            row.map(type => type ? { type, color: r < 2 ? 'b' : 'w', hasMoved: false } : null)
        );
        
        this.turn = 'w';
        this.castling = { w: { k: true, q: true }, b: { k: true, q: true } };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.history = [];
        this.positionHistory = {};
        this.timers = { w: 600, b: 600 };
        this.gameActive = true;
        this.selectedSquare = null;
        this.validMoves = [];
        
        document.getElementById('game-over-modal').style.display = 'none';
        document.getElementById('game-status').textContent = '';
        this.updateTimersDisplay();
        this.recordPosition();
    }

    getPiece(r, c) {
        if (r < 0 || r > 7 || c < 0 || c > 7) return null;
        return this.board[r][c];
    }

    generateMoves(r, c, checkCheck = true) {
        const piece = this.getPiece(r, c);
        if (!piece) return [];
        
        const moves = [];
        const directions = {
            'r': [[0,1], [0,-1], [1,0], [-1,0]],
            'b': [[1,1], [1,-1], [-1,1], [-1,-1]],
            'q': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
            'n': [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]],
            'k': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]
        };

        const addMove = (tr, tc) => {
            if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
            const target = this.board[tr][tc];
            if (!target) {
                moves.push({ r: tr, c: tc });
                return true;
            }
            if (target.color !== piece.color) {
                moves.push({ r: tr, c: tc, capture: true });
            }
            return false;
        };

        // Sliding pieces
        if (['r', 'b', 'q'].includes(piece.type)) {
            directions[piece.type].forEach(([dr, dc]) => {
                let nr = r + dr, nc = c + dc;
                while (addMove(nr, nc)) {
                    if (this.board[nr][nc]) break;
                    nr += dr; nc += dc;
                }
            });
        }

        // Knight & King
        if (['n', 'k'].includes(piece.type)) {
            directions[piece.type].forEach(([dr, dc]) => addMove(r + dr, c + dc));
        }

        // Pawn
        if (piece.type === 'p') {
            const dir = piece.color === 'w' ? -1 : 1;
            const startRow = piece.color === 'w' ? 6 : 1;
            
            // Move forward
            if (!this.getPiece(r + dir, c)) {
                moves.push({ r: r + dir, c: c });
                if (r === startRow && !this.getPiece(r + dir * 2, c)) {
                    moves.push({ r: r + dir * 2, c: c });
                }
            }
            // Capture
            [[dir, 1], [dir, -1]].forEach(([dr, dc]) => {
                const tr = r + dr, tc = c + dc;
                const target = this.getPiece(tr, tc);
                if (target && target.color !== piece.color) {
                    moves.push({ r: tr, c: tc, capture: true });
                }
                // En Passant
                if (this.enPassantTarget && this.enPassantTarget.r === tr && this.enPassantTarget.c === tc) {
                    moves.push({ r: tr, c: tc, enPassant: true });
                }
            });
        }

        // Castling
        if (piece.type === 'k' && !piece.hasMoved && checkCheck && !this.isInCheck(piece.color)) {
            const row = piece.color === 'w' ? 7 : 0;
            const rights = this.castling[piece.color];
            
            // Kingside
            if (rights.k && !this.getPiece(row, 5) && !this.getPiece(row, 6)) {
                if (!this.isSquareAttacked(row, 5, piece.color) && !this.isSquareAttacked(row, 6, piece.color)) {
                    moves.push({ r: row, c: 6, castling: 'k' });
                }
            }
            // Queenside
            if (rights.q && !this.getPiece(row, 1) && !this.getPiece(row, 2) && !this.getPiece(row, 3)) {
                if (!this.isSquareAttacked(row, 2, piece.color) && !this.isSquareAttacked(row, 3, piece.color)) {
                    moves.push({ r: row, c: 2, castling: 'q' });
                }
            }
        }

        if (checkCheck) {
            return moves.filter(m => {
                const tempGame = this.clone();
                tempGame.executeMove(r, c, m, true);
                return !tempGame.isInCheck(piece.color);
            });
        }
        return moves;
    }

    isSquareAttacked(r, c, myColor) {
        const opponent = myColor === 'w' ? 'b' : 'w';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const p = this.board[i][j];
                if (p && p.color === opponent) {
                    const moves = this.generateMoves(i, j, false);
                    if (moves.some(m => m.r === r && m.c === c)) return true;
                }
            }
        }
        return false;
    }

    isInCheck(color) {
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p && p.type === 'k' && p.color === color) {
                    kingPos = { r, c };
                    break;
                }
            }
        }
        return kingPos ? this.isSquareAttacked(kingPos.r, kingPos.c, color) : false;
    }

    clone() {
        const newGame = new ChessGame();
        newGame.board = this.board.map(row => row.map(p => p ? { ...p } : null));
        newGame.turn = this.turn;
        newGame.castling = JSON.parse(JSON.stringify(this.castling));
        newGame.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        newGame.halfMoveClock = this.halfMoveClock;
        newGame.fullMoveNumber = this.fullMoveNumber;
        return newGame;
    }

    executeMove(fromR, fromC, move, real = false) {
        const piece = this.board[fromR][fromC];
        const target = this.board[move.r][move.c];
        
        // Update board
        this.board[move.r][move.c] = piece;
        this.board[fromR][fromC] = null;
        piece.hasMoved = true;

        // Special moves
        if (move.enPassant) {
            const dir = piece.color === 'w' ? 1 : -1;
            this.board[move.r + dir][move.c] = null;
        }
        
        if (move.castling) {
            const row = piece.color === 'w' ? 7 : 0;
            if (move.castling === 'k') {
                const rook = this.board[row][7];
                this.board[row][5] = rook;
                this.board[row][7] = null;
                rook.hasMoved = true;
            } else {
                const rook = this.board[row][0];
                this.board[row][3] = rook;
                this.board[row][0] = null;
                rook.hasMoved = true;
            }
        }

        // Promotion (auto-queen for simulation, handled by UI for real)
        if (piece.type === 'p' && (move.r === 0 || move.r === 7)) {
            if (!real) piece.type = 'q';
        }

        // Update state
        if (real) {
            this.enPassantTarget = (piece.type === 'p' && Math.abs(move.r - fromR) === 2) 
                ? { r: (fromR + move.r) / 2, c: fromC } : null;
                
            if (target || piece.type === 'p' || move.enPassant) {
                this.halfMoveClock = 0;
            } else {
                this.halfMoveClock++;
            }

            if (this.turn === 'b') this.fullMoveNumber++;
            
            // Update castling rights
            if (piece.type === 'k') {
                this.castling[piece.color].k = false;
                this.castling[piece.color].q = false;
            }
            if (piece.type === 'r') {
                if (fromC === 0) this.castling[piece.color].q = false;
                if (fromC === 7) this.castling[piece.color].k = false;
            }
            // If rook is captured
            if (target && target.type === 'r') {
                if (move.c === 0) this.castling[target.color].q = false;
                if (move.c === 7) this.castling[target.color].k = false;
            }
        }

        this.turn = this.turn === 'w' ? 'b' : 'w';
    }

    makeMove(fromR, fromC, toR, toC, promotionType = 'q') {
        if (!this.gameActive) return;
        
        const moves = this.generateMoves(fromR, fromC);
        const move = moves.find(m => m.r === toR && m.c === toC);
        
        if (!move) {
            this.selectedSquare = null;
            this.validMoves = [];
            this.renderBoard();
            return;
        }

        const piece = this.board[fromR][fromC];
        
        // Handle Promotion
        if (piece.type === 'p' && (toR === 0 || toR === 7)) {
            if (promotionType === 'pending') {
                this.showPromotionModal(fromR, fromC, toR, toC);
                return;
            }
            piece.type = promotionType;
        }

        // Save history for undo
        const fen = this.toFEN();
        const captured = this.board[toR][toC] ? this.board[toR][toC].type : (move.enPassant ? 'p' : null);
        
        this.history.push({
            fen: fen,
            from: { r: fromR, c: fromC },
            to: { r: toR, c: toC },
            piece: piece.type,
            captured: captured,
            timers: { ...this.timers }
        });

        this.executeMove(fromR, fromC, move, true);
        this.recordPosition();
        this.checkGameState();
        this.updateUI();
        this.renderBoard();
    }

    showPromotionModal(fromR, fromC, toR, toC) {
        const modal = document.getElementById('promotion-modal');
        const container = document.getElementById('promotion-options');
        container.innerHTML = '';
        
        const options = ['q', 'r', 'b', 'n'];
        const color = this.turn;
        
        options.forEach(type => {
            const div = document.createElement('div');
            div.className = 'promo-piece ' + (color === 'w' ? 'white' : 'black');
            div.textContent = PIECES[color][type];
            div.onclick = () => {
                modal.style.display = 'none';
                this.makeMove(fromR, fromC, toR, toC, type);
            };
            container.appendChild(div);
        });
        
        modal.style.display = 'flex';
    }

    recordPosition() {
        const key = this.toFEN().split(' ').slice(0, 4).join(' ');
        this.positionHistory[key] = (this.positionHistory[key] || 0) + 1;
    }

    checkGameState() {
        let hasMoves = false;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] && this.board[r][c].color === this.turn) {
                    if (this.generateMoves(r, c).length > 0) {
                        hasMoves = true;
                        break;
                    }
                }
            }
            if (hasMoves) break;
        }

        const inCheck = this.isInCheck(this.turn);
        const statusEl = document.getElementById('game-status');

        if (!hasMoves) {
            this.gameActive = false;
            clearInterval(this.timerInterval);
            const modal = document.getElementById('game-over-modal');
            const title = document.getElementById('game-over-title');
            const reason = document.getElementById('game-over-reason');
            
            modal.style.display = 'flex';
            if (inCheck) {
                title.textContent = `เช็คเมท! ${this.turn === 'w' ? 'ดำ' : 'ขาว'} ชนะ`;
                reason.textContent = 'King ถูกโจมตีและไม่มีทางหนี';
            } else {
                title.textContent = 'เสมอ (Stalemate)';
                reason.textContent = 'King ไม่ถูกโจมตีแต่ไม่มีตาเดิน';
            }
        } else if (inCheck) {
            statusEl.textContent = 'CHECK! (รุก)';
        } else {
            statusEl.textContent = '';
        }

        // Draw conditions
        if (this.halfMoveClock >= 100) {
            this.endGame('เสมอ (กฎ 50 ตาเดิน)');
        } else if (this.positionHistory[this.toFEN().split(' ').slice(0, 4).join(' ')] >= 3) {
            this.endGame('เสมอ (ตำแหน่งซ้ำ 3 ครั้ง)');
        }
    }

    endGame(reason) {
        this.gameActive = false;
        clearInterval(this.timerInterval);
        const modal = document.getElementById('game-over-modal');
        document.getElementById('game-over-title').textContent = 'จบเกม';
        document.getElementById('game-over-reason').textContent = reason;
        modal.style.display = 'flex';
    }

    undo() {
        if (this.history.length === 0 || !this.gameActive) return;
        
        const last = this.history.pop();
        this.loadFEN(last.fen);
        this.timers = last.timers;
        this.updateTimersDisplay();
        this.updateUI();
        this.renderBoard();
        this.gameActive = true;
        document.getElementById('game-over-modal').style.display = 'none';
        document.getElementById('game-status').textContent = '';
        
        clearInterval(this.timerInterval);
        this.startTimer();
    }

    toFEN() {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p) empty++;
                else {
                    if (empty > 0) { fen += empty; empty = 0; }
                    const char = p.type === 'n' ? 'n' : p.type.toUpperCase();
                    fen += p.color === 'w' ? char : char.toLowerCase();
                }
            }
            if (empty > 0) fen += empty;
            if (r < 7) fen += '/';
        }
        
        fen += ' ' + (this.turn === 'w' ? 'w' : 'b');
        
        let castling = '';
        if (this.castling.w.k) castling += 'K';
        if (this.castling.w.q) castling += 'Q';
        if (this.castling.b.k) castling += 'k';
        if (this.castling.b.q) castling += 'q';
        fen += ' ' + (castling || '-');
        
        fen += ' ' + (this.enPassantTarget ? 
            String.fromCharCode('a'.charCodeAt(0) + this.enPassantTarget.c) + (8 - this.enPassantTarget.r) : '-');
        
        fen += ' ' + this.halfMoveClock + ' ' + this.fullMoveNumber;
        return fen;
    }

    loadFEN(fen) {
        const parts = fen.split(' ');
        const rows = parts[0].split('/');
        this.board = [];
        
        rows.forEach(row => {
            const boardRow = [];
            for (let char of row) {
                if (/\d/.test(char)) {
                    for (let i = 0; i < parseInt(char); i++) boardRow.push(null);
                } else {
                    const color = char === char.toUpperCase() ? 'w' : 'b';
                    const type = char.toLowerCase();
                    boardRow.push({ type, color, hasMoved: true });
                }
            }
            this.board.push(boardRow);
        });
        
        this.turn = parts[1];
        this.castling = { w: { k: false, q: false }, b: { k: false, q: false } };
        if (parts[2] !== '-') {
            if (parts[2].includes('K')) this.castling.w.k = true;
            if (parts[2].includes('Q')) this.castling.w.q = true;
            if (parts[2].includes('k')) this.castling.b.k = true;
            if (parts[2].includes('q')) this.castling.b.q = true;
        }
        
        if (parts[3] !== '-') {
            const col = parts[3].charCodeAt(0) - 'a'.charCodeAt(0);
            const row = 8 - parseInt(parts[3][1]);
            this.enPassantTarget = { r: row, c: col };
        } else {
            this.enPassantTarget = null;
        }
        
        this.halfMoveClock = parseInt(parts[4]);
        this.fullMoveNumber = parseInt(parts[5]);
        this.positionHistory = {};
        this.recordPosition();
    }

    flipBoard() {
        this.isFlipped = !this.isFlipped;
        this.renderBoard();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.gameActive) return;
            this.timers[this.turn]--;
            this.updateTimersDisplay();
            
            if (this.timers[this.turn] <= 0) {
                this.gameActive = false;
                clearInterval(this.timerInterval);
                const winner = this.turn === 'w' ? 'ดำ' : 'ขาว';
                const modal = document.getElementById('game-over-modal');
                document.getElementById('game-over-title').textContent = `หมดเวลา! ${winner} ชนะ`;
                document.getElementById('game-over-reason').textContent = 'ผู้เล่นฝ่ายตรงข้ามหมดเวลา';
                modal.style.display = 'flex';
            }
        }, 1000);
    }

    updateTimersDisplay() {
        const format = t => {
            const m = Math.floor(t / 60);
            const s = t % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
        };
        document.getElementById('timer-white').textContent = format(this.timers.w);
        document.getElementById('timer-black').textContent = format(this.timers.b);
        document.getElementById('timer-white').classList.toggle('active', this.turn === 'w' && this.gameActive);
        document.getElementById('timer-black').classList.toggle('active', this.turn === 'b' && this.gameActive);
    }

    updateUI() {
        const turnText = this.turn === 'w' ? 'ขาว' : 'ดำ';
        document.getElementById('turn-display').textContent = `ตาเดิน: ${turnText}`;
        document.getElementById('turn-display').style.color = this.turn === 'w' ? '#fff' : '#aaa';

        const historyEl = document.getElementById('history');
        historyEl.innerHTML = '';
        this.history.forEach((h, i) => {
            if (i % 2 === 0) {
                const num = Math.floor(i / 2) + 1;
                const div = document.createElement('div');
                div.className = 'history-item';
                div.textContent = `${num}.`;
                historyEl.appendChild(div);
            }
            const div = document.createElement('div');
            div.className = 'history-item';
            const pieceChar = h.piece.toUpperCase();
            const cols = 'abcdefgh';
            const rows = '87654321';
            div.textContent = `${pieceChar}${cols[h.to.c]}${rows[h.to.r]}`;
            historyEl.appendChild(div);
        });
        historyEl.scrollTop = historyEl.scrollHeight;

        const wCap = document.getElementById('captured-white');
        const bCap = document.getElementById('captured-black');
        wCap.innerHTML = '';
        bCap.innerHTML = '';
        
        const initialCounts = { p:8, r:2, n:2, b:2, q:1, k:1 };
        const currentCounts = { w: {}, b: {} };
        
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                const p = this.board[r][c];
                if(p) {
                    currentCounts[p.color][p.type] = (currentCounts[p.color][p.type] || 0) + 1;
                }
            }
        }
        
        ['w', 'b'].forEach(color => {
            const container = color === 'w' ? bCap : wCap;
            const targetColor = color === 'w' ? 'b' : 'w';
            for (let type in initialCounts) {
                const missing = initialCounts[type] - (currentCounts[targetColor][type] || 0);
                for(let i=0; i<missing; i++) {
                    const span = document.createElement('span');
                    span.textContent = PIECES[targetColor][type];
                    span.style.fontSize = '1.2rem';
                    container.appendChild(span);
                }
            }
        });
    }

    handleSquareClick(r, c) {
        if (!this.gameActive) return;

        const piece = this.getPiece(r, c);
        if (piece && piece.color === this.turn) {
            this.selectedSquare = { r, c };
            this.validMoves = this.generateMoves(r, c);
            this.renderBoard();
            return;
        }

        if (this.selectedSquare) {
            const move = this.validMoves.find(m => m.r === r && m.c === c);
            if (move) {
                this.makeMove(this.selectedSquare.r, this.selectedSquare.c, r, c, 'pending');
            } else {
                this.selectedSquare = null;
                this.validMoves = [];
                this.renderBoard();
            }
        }
    }

    renderBoard() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        
        const rows = this.isFlipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
        const cols = this.isFlipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

        rows.forEach(r => {
            cols.forEach(c => {
                const square = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                
                if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
                    square.classList.add('selected');
                }
                
                const lastMove = this.history.length > 0 ? this.history[this.history.length-1] : null;
                if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
                    square.classList.add('last-move');
                }

                const piece = this.board[r][c];
                if (piece) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
                    pieceEl.textContent = PIECES[piece.color][piece.type];
                    square.appendChild(pieceEl);
                    
                    if (piece.type === 'k' && this.isInCheck(piece.color)) {
                        square.classList.add('check');
                    }
                }

                if (this.showHints && this.selectedSquare && this.validMoves.some(m => m.r === r && m.c === c)) {
                    square.classList.add('valid-hint');
                }

                square.onclick = () => this.handleSquareClick(r, c);
                boardEl.appendChild(square);
            });
        });
    }

    newGame() {
        clearInterval(this.timerInterval);
        this.initBoard();
        this.renderBoard();
        this.updateUI();
        this.startTimer();
    }
}

// Initialize Game
const game = new ChessGame();

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); game.newGame(); }
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); game.undo(); }
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); game.flipBoard(); }
});

</script>
</body>
</html>
