import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Room from './game/Room.js';
import db from './models/db.js'; // QUAN TRỌNG: Gọi lại file kết nối SQLite

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
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
            socket.join(code);

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
        const code = generateRoomCode();
        rooms[code] = new Room(code, socket.playerId, settings);
        socket.emit('ROOM_CREATED', code);
    });

    // --- 4. LOBBY: VÀO BÀN ---
    socket.on('JOIN_ROOM', (code) => {
        const room = rooms[code];
        if (!room) return socket.emit('ERROR', 'Phòng không tồn tại!');
        if (room.status !== 'WAITING') return socket.emit('ERROR', 'Ván đấu đang diễn ra!');
        if (room.players.length >= 5) return socket.emit('ERROR', 'Bàn VIP đã kín chỗ!');

        // Chống vào 2 lần bằng 1 trình duyệt
        if (room.players.find(p => p.id === socket.playerId)) return;

        const newPlayer = {
            id: socket.playerId, // Dùng ID vĩnh viễn
            socketId: socket.id, // Dùng ID tạm thời để gửi data
            name: socket.playerName,
            cards: [],
            isBao: false
        };

        room.players.push(newPlayer);
        socket.join(code);
        io.to(code).emit('ROOM_UPDATE', room.getSafeRoomData());
    });

    // --- CÁC SỰ KIỆN GAME (Gọi vào Class Room) ---
    socket.on('START_GAME', (code) => {
        if (rooms[code] && rooms[code].hostId === socket.playerId) rooms[code].startDeal(io);
    });

    socket.on('REQUEST_SAM', (code) => {
        if (rooms[code]) rooms[code].handleSam(socket.playerId, io);
    });

    socket.on('SKIP_SAM', (code) => {
        if (rooms[code]) rooms[code].handleSkipSam(socket.playerId, io);
    });

    socket.on('PLAY_CARDS', (data) => {
        if (rooms[data.code]) rooms[data.code].handlePlayCards(socket.playerId, data.cards, io);
    });

    socket.on('PASS_TURN', (code) => {
        if (rooms[code]) rooms[code].handlePass(socket.playerId, io);
    });

    // --- XỬ LÝ SỰ CỐ: THOÁT GAME ---
    socket.on('disconnect', () => {
        console.log(`[-] Socket ngắt kết nối: ${socket.id}`);

        for (const code in rooms) {
            const room = rooms[code];
            const playerIndex = room.players.findIndex(p => p.id === socket.playerId);

            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);

                if (room.players.length === 0) {
                    // THÊM DÒNG NÀY: Xóa đồng hồ đếm ngược trước khi xóa phòng
                    clearInterval(room.timer);
                    delete rooms[code];
                } else {
                    if (room.hostId === socket.playerId) room.hostId = room.players[0].id;
                    io.to(code).emit('ROOM_UPDATE', room.getSafeRoomData());
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 VIP Sâm Lốc Server đang chạy tại cổng ${PORT}`);
});