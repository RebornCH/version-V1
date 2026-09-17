// Chess Game Logic
class ChessGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.kings = { white: null, black: null };
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        
        this.initializeBoard();
    }

    initializeBoard() {
        // สร้างกระดานว่าง 8x8
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // ตั้งค่าชิ้นส่วนหมากรุก
        const initialSetup = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = initialSetup[row][col];
                if (piece) {
                    this.board[row][col] = {
                        type: piece.toLowerCase(),
                        color: piece === piece.toUpperCase() ? 'white' : 'black',
                        hasMoved: false
                    };
                    
                    if (piece.toLowerCase() === 'k') {
                        this.kings[piece === 'K' ? 'white' : 'black'] = { row, col };
                    }
                }
            }
        }
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isOpponent(piece1, piece2) {
        if (!piece1 || !piece2) return false;
        return piece1.color !== piece2.color;
    }

    getPossibleMoves(row, col, checkSafety = true) {
        const piece = this.getPiece(row, col);
        if (!piece) return [];

        let moves = [];
        
        switch (piece.type) {
            case 'p':
                moves = this.getPawnMoves(row, col, piece);
                break;
            case 'r':
                moves = this.getRookMoves(row, col, piece);
                break;
            case 'n':
                moves = this.getKnightMoves(row, col, piece);
                break;
            case 'b':
                moves = this.getBishopMoves(row, col, piece);
                break;
            case 'q':
                moves = this.getQueenMoves(row, col, piece);
                break;
            case 'k':
                moves = this.getKingMoves(row, col, piece, checkSafety);
                break;
        }

        if (checkSafety) {
            // กรองการเดินที่ทำให้ King ถูกเช็ค
            moves = moves.filter(move => {
                const testGame = this.cloneGame();
                testGame.makeMoveInternal(move);
                return !testGame.isInCheck(piece.color);
            });
        }

        return moves;
    }

    getPawnMoves(row, col, piece) {
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // เดินไปข้างหน้า 1 ช่อง
        if (!this.getPiece(row + direction, col)) {
            moves.push({ from: { row, col }, to: { row: row + direction, col } });
            
            // เดินไปข้างหน้า 2 ช่อง (ถ้ายังไม่เคยเดิน)
            if (row === startRow && !this.getPiece(row + 2 * direction, col)) {
                moves.push({ from: { row, col }, to: { row: row + 2 * direction, col } });
            }
        }

        // กินแนวทแยง
        const captureOffsets = [-1, 1];
        for (const offset of captureOffsets) {
            const targetRow = row + direction;
            const targetCol = col + offset;
            const targetPiece = this.getPiece(targetRow, targetCol);
            
            if (targetPiece && this.isOpponent(piece, targetPiece)) {
                moves.push({ from: { row, col }, to: { row: targetRow, col: targetCol } });
            }
            
            // En passant
            if (this.enPassantTarget && 
                this.enPassantTarget.row === targetRow && 
                this.enPassantTarget.col === targetCol) {
                moves.push({ 
                    from: { row, col }, 
                    to: { row: targetRow, col: targetCol },
                    enPassant: true
                });
            }
        }

        return moves;
    }

    getRookMoves(row, col, piece) {
        return this.getSlidingMoves(row, col, piece, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
    }

    getBishopMoves(row, col, piece) {
        return this.getSlidingMoves(row, col, piece, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    }

    getQueenMoves(row, col, piece) {
        return this.getSlidingMoves(row, col, piece, [
            [0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]);
    }

    getSlidingMoves(row, col, piece, directions) {
        const moves = [];
        
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const targetPiece = this.getPiece(r, c);
                
                if (!targetPiece) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                } else {
                    if (this.isOpponent(piece, targetPiece)) {
                        moves.push({ from: { row, col }, to: { row: r, col: c } });
                    }
                    break;
                }
                
                r += dr;
                c += dc;
            }
        }
        
        return moves;
    }

    getKnightMoves(row, col, piece) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;
            
            if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const targetPiece = this.getPiece(r, c);
                if (!targetPiece || this.isOpponent(piece, targetPiece)) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                }
            }
        }
        
        return moves;
    }

    getKingMoves(row, col, piece, checkSafety = true) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;
            
            if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const targetPiece = this.getPiece(r, c);
                if (!targetPiece || this.isOpponent(piece, targetPiece)) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                }
            }
        }
        
        // Castling
        if (checkSafety && !piece.hasMoved && !this.isInCheck(piece.color)) {
            const rights = this.castlingRights[piece.color];
            const kingRow = piece.color === 'white' ? 7 : 0;
            
            // King-side castling
            if (rights.kingSide) {
                const rook = this.getPiece(kingRow, 7);
                if (rook && rook.type === 'r' && !rook.hasMoved) {
                    if (!this.getPiece(kingRow, 5) && !this.getPiece(kingRow, 6)) {
                        if (!this.isSquareAttacked(kingRow, 5, piece.color) &&
                            !this.isSquareAttacked(kingRow, 6, piece.color)) {
                            moves.push({ 
                                from: { row, col }, 
                                to: { row: kingRow, col: 6 },
                                castling: 'kingSide'
                            });
                        }
                    }
                }
            }
            
            // Queen-side castling
            if (rights.queenSide) {
                const rook = this.getPiece(kingRow, 0);
                if (rook && rook.type === 'r' && !rook.hasMoved) {
                    if (!this.getPiece(kingRow, 1) && !this.getPiece(kingRow, 2) && !this.getPiece(kingRow, 3)) {
                        if (!this.isSquareAttacked(kingRow, 2, piece.color) &&
                            !this.isSquareAttacked(kingRow, 3, piece.color)) {
                            moves.push({ 
                                from: { row, col }, 
                                to: { row: kingRow, col: 2 },
                                castling: 'queenSide'
                            });
                        }
                    }
                }
            }
        }
        
        return moves;
    }

    isSquareAttacked(row, col, byColor) {
        const opponentColor = byColor === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPiece(r, c);
                if (piece && piece.color === opponentColor) {
                    const moves = this.getPossibleMoves(r, c, false);
                    if (moves.some(move => move.to.row === row && move.to.col === col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    isInCheck(color) {
        const king = this.kings[color];
        if (!king) return false;
        return this.isSquareAttacked(king.row, king.col, color);
    }

    makeMoveInternal(move) {
        const piece = this.getPiece(move.from.row, move.from.col);
        const capturedPiece = this.getPiece(move.to.row, move.to.col);
        
        // ย้ายชิ้นส่วน
        this.board[move.to.row][move.to.col] = piece;
        this.board[move.from.row][move.from.col] = null;
        piece.hasMoved = true;
        
        // อัพเดทตำแหน่ง King
        if (piece.type === 'k') {
            this.kings[piece.color] = { row: move.to.row, col: move.to.col };
        }
        
        // En passant capture
        if (move.enPassant) {
            const capturedPawnRow = move.from.row;
            const capturedPawn = this.board[capturedPawnRow][move.to.col];
            this.board[capturedPawnRow][move.to.col] = null;
        }
        
        // Castling
        if (move.castling) {
            const kingRow = move.to.row;
            if (move.castling === 'kingSide') {
                const rook = this.board[kingRow][7];
                this.board[kingRow][5] = rook;
                this.board[kingRow][7] = null;
                rook.hasMoved = true;
            } else if (move.castling === 'queenSide') {
                const rook = this.board[kingRow][0];
                this.board[kingRow][3] = rook;
                this.board[kingRow][0] = null;
                rook.hasMoved = true;
            }
        }
        
        // อัพเดท en passant target
        if (piece.type === 'p' && Math.abs(move.to.row - move.from.row) === 2) {
            this.enPassantTarget = {
                row: (move.from.row + move.to.row) / 2,
                col: move.from.col
            };
        } else {
            this.enPassantTarget = null;
        }
        
        return capturedPiece;
    }

    makeMove(move, promotionType = 'q') {
        const piece = this.getPiece(move.from.row, move.from.col);
        const capturedPiece = this.makeMoveInternal(move);
        
        // Promotion
        if (piece.type === 'p' && (move.to.row === 0 || move.to.row === 7)) {
            piece.type = promotionType;
        }
        
        // บันทึกประวัติการเดิน
        this.moveHistory.push({
            move,
            piece: { ...piece },
            captured: capturedPiece ? { ...capturedPiece } : null,
            fen: this.getFEN()
        });
        
        // สลับผู้เล่น
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // ตรวจสอบเกมจบ
        this.checkGameState();
        
        return true;
    }

    cloneGame() {
        const clone = new ChessGame();
        clone.board = this.board.map(row => row.map(piece => piece ? { ...piece } : null));
        clone.currentPlayer = this.currentPlayer;
        clone.kings = { ...this.kings };
        clone.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
        clone.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        clone.moveHistory = [...this.moveHistory];
        clone.capturedPieces = {
            white: [...this.capturedPieces.white],
            black: [...this.capturedPieces.black]
        };
        return clone;
    }

    checkGameState() {
        const hasLegalMoves = this.hasLegalMoves();
        const inCheck = this.isInCheck(this.currentPlayer);
        
        if (!hasLegalMoves) {
            this.gameOver = true;
            if (inCheck) {
                // Checkmate
                const winner = this.currentPlayer === 'white' ? 'black' : 'white';
                return { status: 'checkmate', winner };
            } else {
                // Stalemate
                return { status: 'stalemate' };
            }
        }
        
        // ตรวจสอบเงื่อนไขการเสมออื่นๆ
        if (this.halfMoveClock >= 100) {
            this.gameOver = true;
            return { status: 'fifty-move-rule' };
        }
        
        if (this.isInsufficientMaterial()) {
            this.gameOver = true;
            return { status: 'insufficient-material' };
        }
        
        if (this.isThreefoldRepetition()) {
            this.gameOver = true;
            return { status: 'threefold-repetition' };
        }
        
        return { status: 'ongoing', inCheck };
    }

    hasLegalMoves() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.color === this.currentPlayer) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    isInsufficientMaterial() {
        const pieces = {
            white: { kings: 0, queens: 0, rooks: 0, bishops: 0, knights: 0, pawns: 0 },
            black: { kings: 0, queens: 0, rooks: 0, bishops: 0, knights: 0, pawns: 0 }
        };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece) {
                    pieces[piece.color][piece.type + 's']++;
                }
            }
        }
        
        // King vs King
        if (pieces.white.queens + pieces.white.rooks + pieces.white.bishops + 
            pieces.white.knights + pieces.white.pawns === 0 &&
            pieces.black.queens + pieces.black.rooks + pieces.black.bishops + 
            pieces.black.knights + pieces.black.pawns === 0) {
            return true;
        }
        
        // King + Bishop vs King หรือ King + Knight vs King
        if (pieces.white.queens + pieces.white.rooks + pieces.white.pawns === 0 &&
            pieces.black.queens + pieces.black.rooks + pieces.black.pawns === 0) {
            const whiteMinor = pieces.white.bishops + pieces.white.knights;
            const blackMinor = pieces.black.bishops + pieces.black.knights;
            if (whiteMinor <= 1 && blackMinor === 0) return true;
            if (blackMinor <= 1 && whiteMinor === 0) return true;
        }
        
        return false;
    }

    isThreefoldRepetition() {
        const fenCounts = {};
        for (const record of this.moveHistory) {
            const fen = record.fen;
            fenCounts[fen] = (fenCounts[fen] || 0) + 1;
            if (fenCounts[fen] >= 3) return true;
        }
        return false;
    }

    getFEN() {
        let fen = '';
        
        // Piece placement
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    const symbol = piece.type === 'p' ? '' : piece.type;
                    fen += piece.color === 'white' ? symbol.toUpperCase() : symbol;
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) fen += emptyCount;
            if (row < 7) fen += '/';
        }
        
        fen += ' ' + (this.currentPlayer === 'white' ? 'w' : 'b');
        
        // Castling availability
        let castling = '';
        if (this.castlingRights.white.kingSide) castling += 'K';
        if (this.castlingRights.white.queenSide) castling += 'Q';
        if (this.castlingRights.black.kingSide) castling += 'k';
        if (this.castlingRights.black.queenSide) castling += 'q';
        fen += ' ' + (castling || '-');
        
        // En passant target
        if (this.enPassantTarget) {
            const files = 'abcdefgh';
            const ranks = '87654321';
            fen += ' ' + files[this.enPassantTarget.col] + ranks[this.enPassantTarget.row];
        } else {
            fen += ' -';
        }
        
        fen += ' ' + this.halfMoveClock + ' ' + this.fullMoveNumber;
        
        return fen;
    }

    undoMove() {
        if (this.moveHistory.length === 0) return false;
        
        const lastMove = this.moveHistory.pop();
        const piece = this.getPiece(lastMove.move.to.row, lastMove.move.to.col);
        
        // ย้อนกลับการย้าย
        this.board[lastMove.move.from.row][lastMove.move.from.col] = lastMove.piece;
        this.board[lastMove.move.to.row][lastMove.move.to.col] = null;
        
        // คืนค่าชิ้นส่วนที่ถูกกิน
        if (lastMove.captured) {
            this.board[lastMove.move.to.row][lastMove.move.to.col] = lastMove.captured;
        }
        
        // ย้อนกลับ en passant
        if (lastMove.move.enPassant) {
            const capturedPawnColor = lastMove.piece.color === 'white' ? 'black' : 'white';
            const pawnRow = lastMove.move.from.row;
            this.board[pawnRow][lastMove.move.to.col] = {
                type: 'p',
                color: capturedPawnColor,
                hasMoved: true
            };
        }
        
        // ย้อนกลับ castling
        if (lastMove.move.castling) {
            const kingRow = lastMove.move.to.row;
            if (lastMove.move.castling === 'kingSide') {
                const rook = this.board[kingRow][5];
                this.board[kingRow][7] = rook;
                this.board[kingRow][5] = null;
            } else {
                const rook = this.board[kingRow][3];
                this.board[kingRow][0] = rook;
                this.board[kingRow][3] = null;
            }
        }
        
        // อัพเดท King position
        if (lastMove.piece.type === 'k') {
            this.kings[lastMove.piece.color] = { 
                row: lastMove.move.from.row, 
                col: lastMove.move.from.col 
            };
        }
        
        // สลับผู้เล่นกลับ
        this.currentPlayer = lastMove.piece.color;
        this.gameOver = false;
        
        return true;
    }
}

// Export สำหรับใช้งานใน browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessGame;
}
