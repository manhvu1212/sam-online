import GameLogic from './GameLogic.js';
import Dealer from './Dealer.js';

export default class Room {
    constructor(code, hostId, settings) {
        this.code = code;
        this.hostId = hostId;
        this.settings = {
            bet: settings?.bet || 1000,         // Tiền cược mỗi lá (1k)
            thoiHeo: settings?.thoiHeo || 5,    // Thối 1 Heo = 5 lá
            chatHeo: settings?.chatHeo || 15,   // Bị chặt Heo = 15 lá
            cong: settings?.cong || 15,         // Cóng = 15 lá
        };
        this.players = [];
        this.status = 'WAITING'; // WAITING, SAM_WAITING, PLAYING, ENDED
        this.currentTurn = 0;
        this.lastMove = null;
        this.samPlayer = null;
        this.passPlayers = new Set();
        this.timer = null;
        this.passSamPlayers = new Set();
        this.ledger = {};
    }

    addPlayer(player) {
        if (this.players.length >= 5 || this.players.find(p => p.id === player.id)) return false;
        this.players.push({ ...player, cards: [], isBao: false });
        return true;
    }

    startDeal(io) {
        this.status = 'SAM_WAITING';
        this.passSamPlayers.clear();
        const deck = this.generateDeck();

        this.players.forEach(p => {
            p.cards = deck.splice(0, 10);
            p.isBao = false;
            io.to(p.socketId).emit('GAME_DEAL_CARDS', p.cards);
        });

        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());

        let timeLeft = 45; // Test nhanh thì bạn có thể sửa thành 5s hoặc 10s
        io.to(this.code).emit('SAM_TIMER', timeLeft);
        this.timer = setInterval(() => {
            timeLeft--;
            io.to(this.code).emit('SAM_TIMER', timeLeft);
            if (timeLeft <= 0) {
                clearInterval(this.timer);
                this.status = 'PLAYING'; // Hết giờ, bắt đầu đánh bình thường
                io.to(this.code).emit('SAM_ENDED', { msg: 'Hết thời gian xin Sâm' });

                // THÊM DÒNG NÀY: Đồng bộ trạng thái PLAYING về Client
                io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());

                this.startTurn(io);
            }
        }, 1000);
    }

    handleSam(playerId, io) {
        if (this.status !== 'SAM_WAITING') return;
        clearInterval(this.timer);
        this.samPlayer = playerId;
        this.status = 'PLAYING'; // Server chuyển sang trạng thái chơi
        this.currentTurn = this.players.findIndex(p => p.id === playerId);

        io.to(this.code).emit('SAM_CONFIRMED', { playerId });

        // THÊM DÒNG NÀY: Đồng bộ trạng thái mới về cho tất cả Client
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());

        this.startTurn(io);
    }

    handleSkipSam(playerId, io) {
        if (this.status !== 'SAM_WAITING') return;

        this.passSamPlayers.add(playerId);

        // Nếu TẤT CẢ mọi người đều đã bấm bỏ qua -> Bắt đầu đánh luôn
        if (this.passSamPlayers.size >= this.players.length) {
            clearInterval(this.timer);
            this.status = 'PLAYING';
            io.to(this.code).emit('SAM_ENDED', { msg: 'Tất cả bỏ qua Xin Sâm, bắt đầu đánh!' });
            io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
            this.startTurn(io);
        }
    }

    // 1. HÀM BẮT ĐẦU LƯỢT ĐÁNH (CÓ ĐẾM NGƯỢC)
    // 1. HÀM BẮT ĐẦU LƯỢT ĐÁNH (CẬP NHẬT AUTO-PLAY)
    startTurn(io) {
        clearInterval(this.timer); // Xóa đồng hồ cũ nếu có

        const currentPlayer = this.players[this.currentTurn];
        let timeLeft = 20; // 20 giây cho mỗi lượt đánh

        // Báo cho Client biết đến lượt ai và thời gian bao nhiêu
        io.to(this.code).emit('TURN_UPDATE', {
            playerId: currentPlayer.id,
            timeout: timeLeft
        });

        // Bắt đầu đếm ngược thời gian đánh bài
        this.timer = setInterval(() => {
            timeLeft--;
            io.to(this.code).emit('SAM_TIMER', timeLeft);

            if (timeLeft <= 0) {
                clearInterval(this.timer);

                // --- LOGIC MỚI: KIỂM TRA QUYỀN MỞ VÒNG ---
                if (!this.lastMove) {
                    // TRƯỜNG HỢP 1: Bắt đầu vòng mới (trên bàn đang trống)
                    // Không được phép bỏ lượt. Ép hệ thống tự đánh lá bài NHỎ NHẤT trên tay.
                    const smallestCard = currentPlayer.cards.reduce((min, card) => card.rank < min.rank ? card : min, currentPlayer.cards[0]);

                    // Giả lập hành động tự động ném lá bài nhỏ nhất ra bàn
                    this.handlePlayCards(currentPlayer.id, [smallestCard], io);

                } else {
                    // TRƯỜNG HỢP 2: Đang nối vòng (Đã có người đánh trước đó)
                    // Tự động ép Bỏ Lượt
                    this.handlePass(currentPlayer.id, io);
                }
            }
        }, 1000);
    }

    handlePlayCards(playerId, playedCards, io) {
        if (this.status !== 'PLAYING') return;

        const currentPlayer = this.players[this.currentTurn];
        if (!currentPlayer || currentPlayer.id !== playerId) return;

        // --- BẮT ĐẦU CHẶN ĐÁNH BÀI LÁO Ở ĐÂY ---
        const lastCards = this.lastMove ? this.lastMove.cards : null;
        const isValid = GameLogic.canPlay(lastCards, playedCards);

        if (!isValid) {
            // Nếu không hợp lệ, bắn thông báo lỗi thẳng mặt người đánh và TỪ CHỐI hàm này
            io.to(currentPlayer.socketId).emit('ERROR', 'Bài đánh ra không hợp lệ hoặc không đủ lớn!');
            return;
        }
        // --- KẾT THÚC CHẶN ---

        // 1. Trừ bài trên tay của người chơi trên Server
        currentPlayer.cards = currentPlayer.cards.filter(c =>
            !playedCards.find(pc => pc.rank === c.rank && pc.suit === c.suit)
        );

        // 2. Cập nhật bài trên bàn (Đã thêm logic xịn vào lastMove)
        const comboInfo = GameLogic.getCombo(playedCards);
        this.lastMove = {
            playerId: playerId,
            cards: playedCards,
            type: comboInfo ? comboInfo.type : 'BỘ BÀI'
        };

        // 3. Cập nhật bài trên tay cho Client (UPDATE_HAND)
        io.to(currentPlayer.socketId).emit('UPDATE_HAND', currentPlayer.cards);

        // 3. KIỂM TRA THẮNG CUỘC & TÍNH TIỀN (THEO LUẬT LÀNG)
        if (currentPlayer.cards.length === 0) {
            clearInterval(this.timer);
            this.status = 'ENDED';

            const { bet, thoiHeo, cong } = this.settings;
            const matchResults = [];
            let totalWinnerMoney = 0;

            // Tính tiền phạt cho từng người thua
            this.players.forEach(p => {
                if (p.id === playerId) return;

                const penaltyCards = p.cards.length;
                const isCong = penaltyCards === 10;
                const heoCount = p.cards.filter(c => c.rank === 15).length;

                let penaltyMoney = 0;
                let detailMsg = [];

                // Áp dụng số lá phạt từ Settings
                if (isCong) {
                    penaltyMoney += cong * bet;
                    detailMsg.push(`Cóng (-${cong} lá)`);
                } else {
                    penaltyMoney += penaltyCards * bet;
                    detailMsg.push(`-${penaltyCards} lá`);
                }

                if (heoCount > 0) {
                    penaltyMoney += (heoCount * thoiHeo) * bet;
                    detailMsg.push(`Thối ${heoCount} Heo (-${heoCount * thoiHeo} lá)`);
                }

                totalWinnerMoney += penaltyMoney;

                // Trừ tiền vào Sổ nợ của phòng
                this.ledger[p.id] -= penaltyMoney;

                matchResults.push({
                    id: p.id,
                    name: p.name,
                    cardCount: penaltyCards,
                    moneyChange: -penaltyMoney,
                    cards: p.cards,
                    totalScore: this.ledger[p.id], // Lấy tổng nợ gửi về Client
                    detail: detailMsg.join(', '),
                    isWinner: false
                });
            });

            // Cộng tiền cho người thắng vào Sổ nợ
            this.ledger[currentPlayer.id] += totalWinnerMoney;

            matchResults.unshift({
                id: currentPlayer.id,
                name: currentPlayer.name,
                cardCount: 0,
                cards: [],
                moneyChange: totalWinnerMoney,
                totalScore: this.ledger[currentPlayer.id],
                detail: 'Hết Bài',
                isWinner: true
            });

            this.currentTurn = this.players.findIndex(p => p.id === playerId);

            // Gửi kết quả ván đấu kèm Tổng kết sổ nợ
            io.to(this.code).emit('GAME_OVER', { results: matchResults });
            io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
            return;
        }

        this.nextTurn(io);
    }

    // 2. HÀM XỬ LÝ BỎ LƯỢT
    handlePass(playerId, io) {
        if (this.status !== 'PLAYING') return;

        const currentPlayer = this.players[this.currentTurn];
        if (!currentPlayer || currentPlayer.id !== playerId) return;

        // THÊM DÒNG NÀY: Nếu trên bàn chưa có bài (Mở vòng) thì không cho bỏ lượt!
        if (!this.lastMove) {
            io.to(currentPlayer.socketId).emit('ERROR', 'Bạn là người mở vòng, bắt buộc phải đánh!');
            return;
        }

        this.passPlayers.add(playerId);
        this.nextTurn(io);
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
    }

    nextTurn(io) {
        // LOGIC MỚI: Nếu số người bỏ lượt = Tổng số người - 1 => Khép vòng!
        if (this.passPlayers.size >= this.players.length - 1) {
            this.passPlayers.clear(); // Xóa lịch sử bỏ lượt

            // Tìm người vừa đánh lá bài cuối cùng (lastMove) để trao quyền mở vòng mới
            let winnerIndex = -1;
            if (this.lastMove) {
                winnerIndex = this.players.findIndex(p => p.id === this.lastMove.playerId);
            }

            this.lastMove = null; // Xóa sạch bài giữa bàn

            // Trả lượt về cho người thắng vòng
            if (winnerIndex !== -1) {
                this.currentTurn = winnerIndex;
            } else {
                // Đề phòng người thắng vòng vừa thoát game, chuyển cho người kế tiếp
                this.currentTurn = (this.currentTurn + 1) % this.players.length;
            }

            io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
            this.startTurn(io);
            return; // Dừng hàm tại đây, không chạy xuống dưới nữa
        }

        // NẾU CHƯA KHÉP VÒNG: Tìm người tiếp theo chưa bỏ lượt
        let nextIndex = (this.currentTurn + 1) % this.players.length;
        while (this.passPlayers.has(this.players[nextIndex].id)) {
            nextIndex = (nextIndex + 1) % this.players.length;
        }

        this.currentTurn = nextIndex;
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
        this.startTurn(io);
    }

    generateDeck() {
        const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        const suits = ['heart', 'diamond', 'club', 'spade'];
        let deck = [];
        ranks.forEach(r => suits.forEach(s => deck.push({ rank: r, suit: s })));
        return deck.sort(() => Math.random() - 0.5);
    }

    getSafeRoomData() {
        return {
            code: this.code,
            hostId: this.hostId,
            settings: this.settings,
            status: this.status,
            currentTurn: this.players[this.currentTurn]?.id,
            lastMove: this.lastMove, // Cần gửi thêm lastMove để client biết bài trên bàn
            passPlayers: Array.from(this.passPlayers), // CHUYỂN SET THÀNH ARRAY Ở ĐÂY
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                avatar_seed: p.avatar_seed,
                cardCount: p.cards.length,
                isBao: p.isBao
            }))
        };
    }
}