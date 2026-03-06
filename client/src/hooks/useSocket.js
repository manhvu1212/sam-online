import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

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

        newSocket.on("disconnect", (reason) => {
            toast.error('Mất kết nối với SERVER');
            console.log("Mất kết nối:", reason);
            if (reason === "io server disconnect") {
                // Nếu server chủ động ngắt, bạn phải tự gọi connect() lại
                newSocket.connect();
            }
        });

        newSocket.io.on("reconnection_attempt", (attempt) => {
            toast.loading('Đang thử lại...');
            console.log("Đang thử kết nối lại lần thứ: " + attempt);
        });

        newSocket.io.on("reconnect", (attempt) => {
            toast.success('Đã kết nối lại với SERVER');
            console.log("Đã kết nối lại thành công sau " + attempt + " lần!");
        });

        newSocket.io.on("reconnect_error", (error) => {
            toast.loading('Đang thử lại...');
            console.log("Lỗi khi cố gắng kết nối lại:", error);
        });

        // Hứng thông tin hồ sơ từ Server (Database) gửi về
        newSocket.on('USER_INFO', (userData) => {
            setUser(userData);
        });

        return () => newSocket.close();
    }, []);

    return { socket, user };
}