import GameLogic from './GameLogic.js';

export default class Room {
    constructor(code, hostId, settings) {
        this.code = code;
        this.hostId = hostId;
        this.settings = {
            bet: settings?.bet || 1000,         // Tiền cược mỗi lá (1k)
            thoiHeo: settings?.thoiHeo || 5,    // Thối 1 Heo = 5 lá
            thoiTuQuy: settings?.thoiTuQuy || 5,
            chatHeo: settings?.chatHeo || 5,   // Bị chặt Heo = 15 lá
            cong: settings?.cong || 15,         // Cóng = 15 lá
            toiTrang: settings?.toiTrang || 20,
            sam: settings?.sam || 20
        };
        this.status = 'WAITING'; // WAITING, SAM_WAITING, PLAYING, ENDED
        this.players = [];
        this.waitingPlayers = [];
        this.removedPlayers = [];
        this.currentTurnId = null;
        this.samPlayerId = null;
        this.lastMove = null;

        this.winnerId = null;
        this.ledger = {};
        this.results = [];

        this.timer = null;
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
            samPlayerId: this.samPlayerId,
            currentTurnId: this.currentTurnId,
            lastMove: this.lastMove,
            ledger: this.ledger,
            results: this.results,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
            })),
            matchPlayes: this.players.map(p => ({
                id: p.id,
                cardCount: p.cards.length,
                isReady: p.isReady,
                skipSam: p.skipSam,
                passTurn: p.passTurn,
                isBao: p.isBao
            }))
        };
    }

    resetMatch() {
        clearInterval(this.timer);

        this.samPlayerId = null
        this.currentTurnId = null
        this.lastMove = null;

        this.players = [...this.players, ...this.waitingPlayers]
        this.waitingPlayers = []
        this.players.forEach(p => {
            p.isReady = false
            p.skipSam = false
            p.passTurn = false
            p.cards = []
            p.isBao = false
        })
    }

    addPlayer(player, io, socket) {
        if (this.players.find(p => p.id === player.id)) return;
        this.players.push({ ...player, status: "ONLINE", cards: [], isReady: true, skipSam: false, passTurn: false, isBao: false });
        if (this.ledger[player.id] === undefined) {
            this.ledger[player.id] = 0;
        }
        socket.join(this.code);
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
    }

    addWaitingPlayer(player, io, socket) {
        if (this.waitingPlayers.find(p => p.id === player.id)) return;
        this.waitingPlayers.push({ ...player, status: "ONLINE", cards: [], isReady: true, skipSam: false, passTurn: false, isBao: false });
        if (this.ledger[player.id] === undefined) {
            this.ledger[player.id] = 0;
        }
        socket.join(this.code);
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
    }

    removePlayer(playerId, io, socket) {
        const player = this.players.find(p => p.id == playerId)
        if (player) {
            const playerIndex = this.players.findIndex(p => p.id == playerId)
            if (playerIndex >= 0) {
                this.players.slice(playerIndex, 1)
            }
            if (this.ledger[player.id] != 0 && !this.removedPlayers.find(p => p.id == playerId)) {
                this.removedPlayers.push(player)
            }
        }
        const waitingPlayerIndex = this.waitingPlayers.findIndex(p => p.id == playerId)
        if (waitingPlayerIndex >= 0) {
            this.waitingPlayers.slice(waitingPlayerIndex, 1)
        }
        socket.leave(this.code);
        io.to(this.code).emit("NOTIFICATION", { message: `${socket.playerName} vừa rời khởi phòng` })
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
    }

    handleReady(playerId, io, socket) {
        if (this.status !== 'ENDED') return;

        const player = this.players.find(p => p.id == playerId)
        if (player) {
            player.isReady = true
            io.to(player.socketId).emit('UPDATE_HAND', []);
        }
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());

        // NẾU TẤT CẢ ĐÃ BẤM CHƠI TIẾP -> TỰ ĐỘNG CHIA BÀI!
        if (this.players.every(p => p.isReady)) {
            this.startDeal(io, socket);
        }
    }

    startDeal(io, socket) {
        this.players = this.players.filter(p => p.status == "ONLINE")
        if (this.players.length <= 1) {
            io.to(this.code).emit('NOTIFICATION', { message: `Chờ thêm người chơi`, type: 'loading' });
            this.status = 'WAITING';
            return
        }

        this.players.forEach(p => p.isReady = false)

        if (this.winnerId && this.players.find(p => p.id == this.winnerId)) {
            // Nếu người thắng vẫn còn trong phòng thì cho đi trước. Nếu họ đã thoát game, tự động chuyển cái cho Chủ phòng (index 0)
            this.currentTurnId = this.winnerId
        } else {
            // Nếu là ván đầu tiên của phòng -> Chủ phòng đi trước
            this.currentTurnId = this.players[0].id;
        }

        const deck = this.generateDeck();

        this.players.forEach(p => {
            p.cards = deck.splice(0, 10);
            io.to(p.socketId).emit('GAME_DEAL_CARDS', p.cards);
        });

        // --- MÁY QUÉT TỚI TRẮNG ĐA LỚP ---
        let bestToiTrang = null;

        // Quét theo đúng vòng đánh: Bắt đầu từ người cầm cái (currentTurn)
        const startIndex = this.players.findIndex(p => p.id == this.currentTurnId);
        for (let i = 0; i < this.players.length; i++) {
            const idx = (startIndex + i) % this.players.length;
            const player = this.players[idx];
            const winResult = GameLogic.checkToiTrang(player?.cards);

            if (winResult) {
                // Nếu chưa tìm được ai, hoặc tìm được người có ĐỘ ƯU TIÊN CAO HƠN
                // (Lưu ý: Chỉ dùng dấu > chứ không dùng >=. Vì nếu ưu tiên bằng nhau, người ngồi gần vòng cái hơn đã được gán trước đó sẽ giữ quyền thắng)
                if (!bestToiTrang || winResult.priority > bestToiTrang.priority) {
                    bestToiTrang = {
                        player: player,
                        type: winResult.type,
                        priority: winResult.priority
                    };
                }
            }
        }

        // Nếu có người Tới Trắng (người mạnh nhất) -> Thu tiền luôn, kết thúc ván
        if (bestToiTrang) {
            this.handleToiTrang(bestToiTrang.player, bestToiTrang.type, io);
            return;
        }

        // Bắt đầu trận đấu bình thường
        this.status = 'SAM_WAITING';
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

                this.startTurn(io, socket);
            }
        }, 1000);
    }

    handleToiTrang(winner, type, io) {
        this.status = 'ENDED';
        const { bet, toiTrang } = this.settings;

        const matchResults = [];
        let totalWinnerMoney = 0;

        // Phạt tất cả những người còn lại
        this.players.forEach(p => {
            if (p.id === winner.id) return;

            const penaltyMoney = toiTrang * bet; // Phạt cứng 20 lá (không tính thêm Heo)
            totalWinnerMoney += penaltyMoney;
            this.ledger[p.id] -= penaltyMoney;

            matchResults.push({
                id: p.id,
                name: p.name,
                cardCount: 10,
                cards: p.cards,
                moneyChange: -penaltyMoney,
                totalScore: this.ledger[p.id],
                detail: `Đền Tới Trắng (-${toiTrang} lá)`,
                isWinner: false
            });
        });

        // Cộng tiền cho người Tới Trắng
        this.ledger[winner.id] += totalWinnerMoney;

        matchResults.unshift({
            id: winner.id,
            name: winner.name,
            cardCount: 0,
            cards: winner.cards, // Lật bài Tới Trắng cho cả làng chiêm ngưỡng
            moneyChange: totalWinnerMoney,
            totalScore: this.ledger[winner.id],
            detail: `TỚI TRẮNG (${type})`,
            isWinner: true
        });

        // Chuyển cái cho người thắng ở ván sau
        this.winnerId = winner.id;
        this.results = matchResults;

        this.resetMatch()
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
    }

    handleSam(playerId, io, socket) {
        if (this.status !== 'SAM_WAITING') return;
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        clearInterval(this.timer);
        this.status = 'PLAYING'; // Server chuyển sang trạng thái chơi
        this.samPlayerId = player.id
        this.currentTurnId = player.id

        io.to(this.code).emit('SAM_CONFIRMED', { playerId });

        // THÊM DÒNG NÀY: Đồng bộ trạng thái mới về cho tất cả Client
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());

        this.startTurn(io, socket);
    }

    handleSkipSam(playerId, io, socket) {
        if (this.status !== 'SAM_WAITING') return;
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        player.skipSam = true
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());

        // Nếu TẤT CẢ mọi người đều đã bấm bỏ qua -> Bắt đầu đánh luôn
        if (this.players.every(p => p.skipSam)) {
            clearInterval(this.timer);
            this.status = 'PLAYING';
            io.to(this.code).emit('SAM_ENDED', { msg: 'Tất cả bỏ qua Xin Sâm, bắt đầu đánh!' });
            io.to(this.code).emit('NOTIFICATION', { message: 'Bắt đầu đánh!', type: 'loading' });
            io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
            this.startTurn(io, socket);
        }
    }

    // 1. HÀM BẮT ĐẦU LƯỢT ĐÁNH (CÓ ĐẾM NGƯỢC)
    // 1. HÀM BẮT ĐẦU LƯỢT ĐÁNH (CẬP NHẬT AUTO-PLAY)
    startTurn(io, socket) {
        clearInterval(this.timer); // Xóa đồng hồ cũ nếu có

        const currentPlayer = this.players.find(p => p.id == this.currentTurnId);
        let timeLeft = currentPlayer.status == "ONLINE" ? 30 : 10; // 20 giây cho mỗi lượt đánh

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
                    this.handlePlayCards(currentPlayer.id, [smallestCard], io, socket);

                } else {
                    // TRƯỜNG HỢP 2: Đang nối vòng (Đã có người đánh trước đó)
                    // Tự động ép Bỏ Lượt
                    this.handlePass(currentPlayer.id, io, socket);
                }
            }
        }, 1000);
    }

    handlePlayCards(playerId, playedCards, io, socket) {
        if (this.status !== 'PLAYING') return;

        const currentPlayer = this.players.find(p => p.id == this.currentTurnId);
        if (!currentPlayer || currentPlayer.id !== playerId) return;

        // --- BẮT ĐẦU CHẶN ĐÁNH BÀI LÁO Ở ĐÂY ---
        const lastCards = this.lastMove ? this.lastMove.cards : null;
        const isValid = GameLogic.canPlay(lastCards, playedCards);

        if (!isValid) {
            // Nếu không hợp lệ, bắn thông báo lỗi thẳng mặt người đánh và TỪ CHỐI hàm này
            io.to(currentPlayer.socketId).emit('NOTIFICATION', { message: 'Bài đánh ra không hợp lệ!', type: 'error' });
            return;
        }
        // --- KẾT THÚC CHẶN ---

        // 1. Trừ bài trên tay của người chơi trên Server
        currentPlayer.cards = currentPlayer.cards.filter(c =>
            !playedCards.find(pc => pc.rank === c.rank && pc.suit === c.suit)
        );

        if (this.samPlayerId && playerId !== this.samPlayerId) {
            this.handleKetThucSam(this.samPlayerId, playerId, false, io);
            return;
        }

        // --- LOGIC: TỨ QUÝ CHẶT HEO ---
        const newCombo = GameLogic.getCombo(playedCards);
        const lastCombo = this.lastMove ? GameLogic.getCombo(this.lastMove.cards) : null;

        if (lastCombo && lastCombo.type === 'SINGLE' && lastCombo.highestRank === 15 && newCombo.type === 'QUAD') {
            const victimId = this.lastMove.playerId;
            const penalty = this.settings.chatHeo * this.settings.bet;

            // Trừ tiền nạn nhân, cộng tiền cho người chặt ngay lập tức trong Sổ nợ
            this.ledger[victimId] -= penalty;
            this.ledger[playerId] += penalty;

            // Phát loa thông báo cho cả phòng biết
            io.to(this.code).emit('NOTIFICATION', {
                message: `BỤP! ${currentPlayer.name} vừa CHẶT HEO của ${this.players.find(p => p.id === victimId)?.name}!`,
                type: 'success'
            });
        }

        // 2. Cập nhật bài trên bàn
        this.lastMove = {
            playerId: playerId,
            cards: playedCards
        };

        // 3. Cập nhật bài trên tay cho Client (UPDATE_HAND)
        io.to(currentPlayer.socketId).emit('UPDATE_HAND', currentPlayer.cards);

        if (currentPlayer.cards.length === 1) {
            currentPlayer.isBao = true
            socket.to(this.code).emit('NOTIFICATION', { message: `${currentPlayer.name} BAO`, type: 'success' });
            io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
        }

        // 3. KIỂM TRA THẮNG CUỘC & TÍNH TIỀN (THEO LUẬT LÀNG)
        if (currentPlayer.cards.length === 0) {
            if (this.samPlayerId && playerId === this.samPlayerId) {
                // Người báo Sâm đã đánh hết bài an toàn
                this.handleKetThucSam(this.samPlayerId, null, true, io);
                return;
            }

            // THẮNG BÌNH THƯỜNG
            clearInterval(this.timer);
            this.status = 'ENDED';

            const { bet, thoiHeo, thoiTuQuy, cong } = this.settings;
            const matchResults = [];
            let totalWinnerMoney = 0;

            // Tính tiền phạt cho từng người thua
            this.players.forEach(p => {
                if (p.id === playerId) return;

                const penaltyCards = p.cards.length;
                const isCong = penaltyCards === 10;
                const heoCount = p.cards.filter(c => c.rank === 15).length;
                const rankCounts = {};
                p.cards.forEach(c => rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1);
                const quadCount = Object.values(rankCounts).filter(count => count === 4).length;

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

                if (quadCount > 0) {
                    penaltyMoney += (quadCount * thoiTuQuy) * bet;
                    detailMsg.push(`Thối ${quadCount} Tứ Quý (-${quadCount * thoiTuQuy} lá)`);
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

            this.winnerId = playerId;
            this.results = matchResults;

            this.resetMatch()
            io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
            return;
        }

        this.nextTurn(io, socket);
    }

    // 2. HÀM XỬ LÝ BỎ LƯỢT
    handlePass(playerId, io, socket) {
        if (this.status !== 'PLAYING') return;

        const currentPlayer = this.players.find(p => p.id == this.currentTurnId)
        if (!currentPlayer || currentPlayer.id !== playerId) return;

        // THÊM DÒNG NÀY: Nếu trên bàn chưa có bài (Mở vòng) thì không cho bỏ lượt!
        if (!this.lastMove) {
            io.to(currentPlayer.socketId).emit('NOTIFICATION', { message: 'Bạn là người mở vòng, bắt buộc phải đánh!', type: 'error' });
            return;
        }

        currentPlayer.passTurn = true
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
        this.nextTurn(io, socket);
    }

    nextTurn(io, socket) {
        // LOGIC MỚI: Nếu số người bỏ lượt = Tổng số người - 1 => Khép vòng!
        let currentTurnIndex = this.players.findIndex(p => p.id == this.currentTurnId)
        if (this.players.filter(p => !p.passTurn).length <= 1) {
            this.players.forEach(p => p.passTurn = false)

            // Tìm người vừa đánh lá bài cuối cùng (lastMove) để trao quyền mở vòng mới
            let winnerTurn = this.players.find(p => p.id == this.lastMove?.playerId)
            // Trả lượt về cho người thắng vòng
            if (winnerTurn) {
                this.currentTurnId = winnerTurn.id;
            } else {
                // Đề phòng người thắng vòng vừa thoát game, chuyển cho người kế tiếp
                this.currentTurnId = this.players[(currentTurnIndex + 1) % this.players.length];
            }
            this.lastMove = null; // Xóa sạch bài giữa bàn

            io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
            this.startTurn(io, socket);
            return; // Dừng hàm tại đây, không chạy xuống dưới nữa
        }

        // NẾU CHƯA KHÉP VÒNG: Tìm người tiếp theo chưa bỏ lượt
        let nextIndex = (currentTurnIndex + 1) % this.players.length;
        while (this.players[nextIndex].passTurn) {
            nextIndex = (nextIndex + 1) % this.players.length;
        }

        this.currentTurnId = this.players[nextIndex].id;
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());

        this.startTurn(io, socket);
    }

    handleKetThucSam(samPlayerId, blockerId, isSuccess, io) {
        this.status = 'ENDED';
        clearInterval(this.timer);

        const { bet, sam } = this.settings;
        const samPlayer = this.players.find(p => p.id === samPlayerId);
        const matchResults = [];

        const penaltyMoney = sam * bet; // Phạt cứng 20 lá
        let totalMoneyExchange = 0;

        this.players.forEach(p => {
            if (p.id === samPlayerId) return;

            if (isSuccess) {
                // THẮNG SÂM: Những người khác bị trừ tiền
                this.ledger[p.id] -= penaltyMoney;
                totalMoneyExchange += penaltyMoney;
                matchResults.push({
                    id: p.id,
                    name: p.name,
                    cardCount: p.cards.length,
                    cards: p.cards,
                    moneyChange: -penaltyMoney,
                    totalScore: this.ledger[p.id],
                    detail: `Đền Sâm (-${sam} lá)`,
                    isWinner: false
                });
            } else {
                // ĐỀN SÂM: Những người khác được cộng tiền
                this.ledger[p.id] += penaltyMoney;
                totalMoneyExchange += penaltyMoney;
                const isBlocker = p.id === blockerId;
                matchResults.push({
                    id: p.id,
                    name: p.name,
                    cardCount: p.cards.length,
                    cards: p.cards,
                    moneyChange: penaltyMoney,
                    totalScore: this.ledger[p.id],
                    detail: isBlocker ? `BẮT SÂM (+${sam} lá)` : `Được đền Sâm (+${sam} lá)`,
                    isWinner: isBlocker // Người chặn được vinh danh là Winner
                });
            }
        });

        // Cập nhật sổ nợ cho người báo Sâm
        if (isSuccess) {
            this.ledger[samPlayerId] += totalMoneyExchange;
        } else {
            this.ledger[samPlayerId] -= totalMoneyExchange;
        }

        this.removedPlayers.forEach(p => {
            matchResults.push({
                id: p.id,
                name: p.name,
                cardCount: 0,
                cards: 0,
                moneyChange: 0,
                totalScore: this.ledger[p.id],
                detail:  `Đã rời phòng`,
                isWinner: false
            });
        })

        // Thêm người báo Sâm vào bảng kết quả
        matchResults.unshift({
            id: samPlayerId,
            name: samPlayer.name,
            cardCount: samPlayer.cards.length,
            cards: samPlayer.cards,
            moneyChange: isSuccess ? totalMoneyExchange : -totalMoneyExchange,
            totalScore: this.ledger[samPlayerId],
            detail: isSuccess ? 'THẮNG SÂM' : 'BỊ BẮT SÂM (ĐỀN LÀNG)',
            isWinner: isSuccess
        });

        this.winnerId = isSuccess ? samPlayerId : blockerId;
        this.results = matchResults;

        this.resetMatch()
        io.to(this.code).emit('ROOM_UPDATE', this.getSafeRoomData());
    }
}