import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Đổi URL này thành IP của bạn nếu muốn test trên điện thoại (ví dụ: http://192.168.1.x:3001)
const SERVER_URL = 'http://localhost:3001';

export const useSocket = () => {
    const [socket, setSocket] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        // 1. Khi kết nối thành công, yêu cầu Server xác thực
        newSocket.on('connect', () => {
            const savedPlayerId = localStorage.getItem('playerId');
            const savedName = localStorage.getItem('playerName');

            newSocket.emit('AUTH', {
                playerId: savedPlayerId,
                name: savedName || ""
            });
        });

        // 2. Nhận thông tin user từ Server (ID cố định)
        newSocket.on('AUTH_SUCCESS', (userData) => {
            setUser(userData);
            localStorage.setItem('playerId', userData.id);
            localStorage.setItem('playerName', userData.name);
        });

        // Bắt lỗi chung
        newSocket.on('ERROR', (msg) => alert(`Lỗi: ${msg}`));

        return () => newSocket.disconnect();
    }, []);

    return { socket, user, setUser };
};