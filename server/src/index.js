import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import db from './models/db.js';
import Room from './game/Room.js';
import SamLogic from './game/SamLogic.js';
import Dealer from './game/Dealer.js';
import Scoring from './game/Scoring.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = {}; // RAM Cache cho các phòng đang chạy

io.on('connection', (socket) => {

    // 1. Xác thực Player cố định
    socket.on('AUTH', ({ playerId, name }) => {
        let id = playerId || uuidv4();
        let user = db.prepare('SELECT * FROM players WHERE id = ?').get(id);

        if (!user) {
            const avatar = name || `User_${id.substring(0, 4)}`;
            db.prepare('INSERT INTO players (id, name, avatar_seed) VALUES (?, ?, ?)').run(id, avatar, avatar);
            user = { id, name: avatar, balance: 100000 };
        }
        socket.playerId = user.id;
        socket.emit('AUTH_SUCCESS', user);
    });

    // Lắng nghe yêu cầu đổi tên từ Client
    socket.on('UPDATE_NAME', (newName) => {
        if (!newName || newName.trim() === '' || !socket.playerId) return;

        // Cập nhật tên và avatar vào SQLite
        db.prepare('UPDATE players SET name = ?, avatar_seed = ? WHERE id = ?')
            .run(newName.trim(), newName.trim(), socket.playerId);

        // Lấy lại thông tin mới nhất và gửi về cho Client để update UI ngay lập tức
        const updatedUser = db.prepare('SELECT * FROM players WHERE id = ?').get(socket.playerId);
        socket.emit('AUTH_SUCCESS', updatedUser);
    });

    // 2. Tạo phòng
    socket.on('CREATE_ROOM', (settings) => {
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        rooms[code] = new Room(code, socket.playerId, settings);
        socket.emit('ROOM_CREATED', code);
    });

    // 3. Vào phòng
    socket.on('JOIN_ROOM', (code) => {
        const room = rooms[code];
        if (!room) return socket.emit('ERROR', 'Phòng không tồn tại');

        const user = db.prepare('SELECT * FROM players WHERE id = ?').get(socket.playerId);
        if (room.addPlayer({ ...user, socketId: socket.id })) {
            socket.join(code);
            io.to(code).emit('ROOM_UPDATE', room.getSafeRoomData());
        }
    });

    // 4. Chia bài (Chủ phòng bấm)
    socket.on('START_GAME', (code) => {
        const room = rooms[code];
        if (room && room.hostId === socket.playerId && room.players.length >= 2) {
            room.startDeal(io);
        }
    });

    // 5. Xin Sâm
    socket.on('REQUEST_SAM', (code) => {
        if (rooms[code]) rooms[code].handleSam(socket.playerId, io);
    });

    // 5.1 Bỏ qua Xin Sâm
    socket.on('SKIP_SAM', (code) => {
        if (rooms[code]) rooms[code].handleSkipSam(socket.playerId, io);
    });

    // 6. Đánh bài
    socket.on('PLAY_CARDS', ({ code, cards }) => {
        const room = rooms[code];
        if (!room || room.status !== 'PLAYING') return;

        const player = room.players[room.currentTurn];
        if (player.id !== socket.playerId) return;

        const playInfo = SamLogic.getPlayType(cards);
        if (playInfo.type !== 'INVALID' && Dealer.canPlay(playInfo, room.lastMove)) {

            // Trừ bài
            player.cards = player.cards.filter(c => !cards.find(selected => selected.rank === c.rank && selected.suit === c.suit));
            room.lastMove = { ...playInfo, cards, playerId: player.id };

            io.to(code).emit('MOVE_ACCEPTED', { playerId: player.id, cards });

            // Check Báo
            if (player.cards.length === 1) {
                player.isBao = true;
                io.to(code).emit('PLAYER_BAO', { playerId: player.id });
            }

            // Check Thắng (Khi người chơi vừa đánh hết bài)
            if (player.cards.length === 0) {
                room.status = 'ENDED';

                // Gọi kế toán ra tính tiền
                const result = Scoring.calculateResult(room, player.id);

                // Chỉ lưu lịch sử ván đấu vào SQLite (để sau này có thể xem lại)
                const insertHistory = db.prepare('INSERT INTO match_results (room_code, player_id, score_change) VALUES (?, ?, ?)');

                result.details.forEach(item => {
                    if (item.loss > 0) {
                        insertHistory.run(code, item.playerId, -item.loss);
                    }
                });

                // Ghi lịch sử cho người thắng
                insertHistory.run(code, result.winnerId, result.totalWinnerGain);

                // Gửi thông báo bảng điểm cho toàn phòng (UI sẽ dựa vào đây để hiển thị)
                io.to(code).emit('GAME_OVER', result);

            } else {
                // Chưa hết bài thì chuyển lượt
                room.nextTurn(io);
                io.to(code).emit('ROOM_UPDATE', room.getSafeRoomData());
            }
        } else {
            socket.emit('ERROR', 'Bài không hợp lệ');
        }
    });

    // 7. Bỏ lượt
    socket.on('PASS_TURN', (code) => {
        const room = rooms[code];
        if (room && room.players[room.currentTurn].id === socket.playerId) {
            room.passPlayers.add(socket.playerId);
            io.to(code).emit('PLAYER_PASSED', { playerId: socket.playerId });
            room.nextTurn(io);
        }
    });
});

httpServer.listen(3001, () => console.log('🚀 Server Sâm Lốc đang chạy tại port 3001'));