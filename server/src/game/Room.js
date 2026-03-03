import SamLogic from './SamLogic.js';
import Dealer from './Dealer.js';

export default class Room {
    constructor(code, hostId, settings) {
        this.code = code;
        this.hostId = hostId;
        this.settings = { bet: settings.bet || 1000, penalty: settings.penalty || 5 };
        this.players = [];
        this.status = 'WAITING'; // WAITING, SAM_WAITING, PLAYING, ENDED
        this.currentTurn = 0;
        this.lastMove = null;
        this.samPlayer = null;
        this.passPlayers = new Set();
        this.timer = null;
        this.passSamPlayers = new Set();
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

    startTurn(io) {
        io.to(this.code).emit('TURN_UPDATE', { playerId: this.players[this.currentTurn].id, timeout: 20 });
    }

    nextTurn(io) {
        this.currentTurn = (this.currentTurn + 1) % this.players.length;
        const nextPlayer = this.players[this.currentTurn];

        if (this.passPlayers.has(nextPlayer.id) || nextPlayer.cards.length === 0) {
            if (this.passPlayers.size >= this.players.filter(p => p.cards.length > 0).length - 1) {
                this.lastMove = null;
                this.passPlayers.clear();
                io.to(this.code).emit('ROUND_RESET', { msg: 'Vòng mới!' });
                // Lượt thuộc về người vừa đánh lá cuối cùng của vòng trước
            } else {
                return this.nextTurn(io);
            }
        }
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
            players: this.players.map(p => ({ id: p.id, name: p.name, avatar_seed: p.avatar_seed, cardCount: p.cards.length, isBao: p.isBao }))
        };
    }
}