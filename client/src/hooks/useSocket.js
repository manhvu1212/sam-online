import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
    const [socket, setSocket] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // 1. Tìm thẻ CMND trong ví (LocalStorage)
        let playerId = localStorage.getItem('playerId');

        // 2. Nếu chưa có, cấp cho 1 thẻ CMND mới và cất vào ví
        if (!playerId) {
            playerId = Math.random().toString(36).substring(2, 12);
            localStorage.setItem('playerId', playerId);
        }

        // 3. Đưa CMND cho bảo vệ (Server) lúc kết nối
        const newSocket = io('http://localhost:3000', {
            query: { playerId: playerId }
        });

        setSocket(newSocket);

        // Hứng thông tin hồ sơ từ Server (Database) gửi về
        newSocket.on('USER_INFO', (userData) => {
            setUser(userData);
        });

        return () => newSocket.close();
    }, []);

    return { socket, user };
}