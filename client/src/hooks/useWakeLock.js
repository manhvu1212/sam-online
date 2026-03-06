import { useEffect, useRef } from 'react';

export default function useWakeLock() {
    const wakeLockRef = useRef(null);

    useEffect(() => {
        // Hàm yêu cầu khóa màn hình
        const requestWakeLock = async () => {
            try {
                // Kiểm tra xem trình duyệt có hỗ trợ công nghệ này không
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    alert('Khóa sáng màn hình thành công! Game on! 🚀');

                    // Lắng nghe sự kiện lỡ hệ thống tự ngắt (ví dụ pin yếu)
                    wakeLockRef.current.addEventListener('release', () => {
                        alert('Màn hình đã được thả rông (có thể tắt).');
                    });
                } else {
                    alert('Trình duyệt của bạn không hỗ trợ Wake Lock API.');
                }
            } catch (err) {
                alert('Không thể khóa sáng màn hình:' + err.name + err.message);
            }
        };

        requestWakeLock();

        // TUYỆT CHIÊU QUAN TRỌNG: 
        // Khi người dùng ẩn game (chuyển sang app khác hoặc nhắn tin), hệ thống sẽ TỰ ĐỘNG hủy Wake Lock.
        // Khi họ quay lại game, ta phải tự động bật lên lại.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup: Khi người chơi thoát khỏi bàn (Component unmount), nhả màn hình ra cho đỡ tốn pin
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current !== null) {
                wakeLockRef.current.release();
                wakeLockRef.current = null;
            }
        };
    }, []); // Chỉ chạy 1 lần khi component mount
}