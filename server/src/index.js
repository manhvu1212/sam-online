import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Room from './game/Room.js';
import db from './models/db.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 10000,
    pingTimeout: 5000,
});

const rooms = {};

const generateRoomCode = () => Math.random().toString(36).substring(2, 7).toUpperCase();

// --- BỘ LỌC KẾT NỐI (MIDDLEWARE) ---
// Hứng playerId từ trình duyệt (LocalStorage) truyền lên qua query
io.use((socket, next) => {
    const playerId = socket.handshake.query.playerId;
    if (!playerId || playerId === 'undefined') {
        return next(new Error('Authentication error: Không tìm thấy playerId'));
    }
    socket.playerId = playerId;
    next();
});

io.on('connection', (socket) => {
    console.log(`[+] Khách VIP kết nối: Socket=${socket.id} | PlayerID=${socket.playerId}`);

    // --- 1. KIỂM TRA & TẠO DỮ LIỆU NGƯỜI CHƠI TRONG SQLITE ---
    let user = db.prepare('SELECT * FROM players WHERE id = ?').get(socket.playerId);

    if (!user) {
        // Nếu khách mới tinh, tạo hồ sơ mới trong Database
        const defaultName = `Guest_${socket.playerId.substring(0, 4)}`;
        db.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run(socket.playerId, defaultName);
        user = db.prepare('SELECT * FROM players WHERE id = ?').get(socket.playerId);
    }

    // Lưu thông tin vào bộ nhớ tạm của socket để truy xuất nhanh
    socket.playerName = user.name;

    // Trả thông tin hồ sơ về cho trình duyệt hiển thị
    socket.emit('USER_INFO', user);

    // --- NẾU NGƯỜI CHƠI F5 TRONG LÚC ĐANG CHƠI (TÁI KẾT NỐI) ---
    for (const code in rooms) {
        const room = rooms[code];
        const playerInRoom = room.players.find(p => p.id === socket.playerId);

        if (playerInRoom) {
            // Cập nhật lại socketId mới cho người chơi này để server biết đường gửi bài
            playerInRoom.socketId = socket.id;
            playerInRoom.status = "ONLINE";
            socket.join(code);

            io.to(code).emit('NOTIFICATION', { message: `${socket.playerName} vừa trở lại`, type: 'success', config: { id: `${playerInRoom.id}_NETWORK` } });
            // Gửi lại tình trạng phòng và bài trên tay cho họ
            socket.emit('ROOM_UPDATE', room.getSafeRoomData());
            socket.emit('GAME_DEAL_CARDS', playerInRoom.cards);
            console.log(`[*] Khách ${socket.playerName} vừa F5 và vào lại bàn ${code}`);
            break;
        }
    }

    // --- 2. LOBBY: CẬP NHẬT TÊN VÀO DATABASE ---
    socket.on('UPDATE_NAME', (name) => {
        if (name.trim() !== '') {
            db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name, socket.playerId);
            socket.playerName = name;

            // Lấy lại info mới và gửi về client
            const updatedUser = db.prepare('SELECT * FROM players WHERE id = ?').get(socket.playerId);
            socket.emit('USER_INFO', updatedUser);
        }
    });

    // --- 3. LOBBY: TẠO PHÒNG MỚI ---
    socket.on('CREATE_ROOM', (settings) => {
        while (true) {
            const code = generateRoomCode();
            if (rooms[code]) continue
            const room = new Room(code, socket.playerId, settings);
            rooms[code] = room
            socket.emit('ROOM_CREATED', code);

            const newPlayer = {
                id: socket.playerId,
                socketId: socket.id,
                name: socket.playerName
            };
            room.addPlayer(newPlayer, io, socket)

            break
        }
    });

    // --- 4. LOBBY: VÀO BÀN ---
    socket.on('JOIN_ROOM', (code) => {
        const room = rooms[code];
        if (!room) return socket.emit('NOTIFICATION', { message: 'Phòng không tồn tại!', type: 'error' });
        if ((room.players.length + room.waitingPlayers.length) >= 5) return socket.emit('NOTIFICATION', { message: 'Bàn đã kín chỗ!', type: 'error' });
        // Chống vào 2 lần bằng 1 trình duyệt
        if (room.players.find(p => p.id === socket.playerId)) return;
        if (room.waitingPlayers.find(p => p.id === socket.playerId)) return;
        const newPlayer = {
            id: socket.playerId,
            socketId: socket.id,
            name: socket.playerName
        };

        if (room.status === 'SAM_WAITING' || room.status === 'PLAYING') {
            // ván đấu đang diễn ra
            socket.emit('NOTIFICATION', { message: 'Ván đấu đang diễn ra! Bạn ngồi chờ tí nhé', type: 'error' });
            socket.to(code).emit('NOTIFICATION', { message: `${newPlayer.name} đang ở phòng chờ`, type: 'loading' });
            room.addWaitingPlayer(newPlayer, io, socket)
        } else {
            room.addPlayer(newPlayer, io, socket)
        }
    });

    // --- CÁC SỰ KIỆN GAME (Gọi vào Class Room) ---
    socket.on('START_GAME', (code) => {
        if (rooms[code] && rooms[code].hostId === socket.playerId) rooms[code].startDeal(io, socket);
    });

    socket.on('REQUEST_SAM', (code) => {
        if (rooms[code]) rooms[code].handleSam(socket.playerId, io, socket);
    });

    socket.on('SKIP_SAM', (code) => {
        if (rooms[code]) rooms[code].handleSkipSam(socket.playerId, io, socket);
    });

    socket.on('PLAY_CARDS', (data) => {
        if (rooms[data.code]) rooms[data.code].handlePlayCards(socket.playerId, data.cards, io, socket);
    });

    socket.on('PASS_TURN', (code) => {
        if (rooms[code]) rooms[code].handlePass(socket.playerId, io, socket);
    });

    socket.on('READY_NEXT', (code) => {
        if (rooms[code]) rooms[code].handleReady(socket.playerId, io, socket);
    });

    // --- XỬ LÝ SỰ CỐ: THOÁT GAME ---
    socket.on('disconnect', () => {
        console.log(`[-] Socket ngắt kết nối: ${socket.id}`);

        for (const code in rooms) {
            const room = rooms[code];
            const player = room.players.find(p => p.id === socket.playerId);

            if (player) {
                if (room.players.length <= 1) {
                    clearInterval(room.timer);
                    delete rooms[code];
                } else {
                    let isReadyToNew = false
                    if (room.status === 'SAM_WAITING' || room.status === 'PLAYING') {
                        // Đang chơi thì sẽ giữ thông tin đến hết ván
                        player.status = "OFFLINE"
                    } else {
                        // Đang chờ hoặc đã chơi xong thì sẽ xóa đi
                        const playerIndex = room.players.findIndex(p => p.id === socket.playerId);
                        room.players.splice(playerIndex, 1);

                        // NẾU TẤT CẢ NGƯỜI CHƠI CON LẠI ĐÃ READY -> TỰ ĐỘNG CHIA BÀI!
                        isReadyToNew = room.players.every(p => p.isReady)
                    }
                    if (room.hostId === socket.playerId) room.hostId = room.players.find(p => p.id != socket.playerId).id;
                    io.to(code).emit('ROOM_UPDATE', room.getSafeRoomData());
                    io.to(code).emit('NOTIFICATION', { message: `${socket.playerName} bị rớt mạng`, type: 'loading', config: { id: `${player.id}_NETWORK` } });
                    if (isReadyToNew) room.startDeal(io, socket);
                }

                break;
            }

            const waitingPlayer = room.waitingPlayers.find(p => p.id === socket.playerId);
            if (waitingPlayer) {
                const playerIndex = room.waitingPlayers.findIndex(p => p.id === socket.playerId);
                room.waitingPlayers.splice(playerIndex, 1);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 VIP Sâm Lốc Server đang chạy tại cổng ${PORT}`);
});