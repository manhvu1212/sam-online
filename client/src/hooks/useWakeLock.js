import { useEffect, useRef } from 'react';

export default function useWakeLock() {
    const wakeLockRef = useRef(null);

    useEffect(() => {
        // Hàm cốt lõi để xin quyền
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && wakeLockRef.current === null) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    console.log('✅ Khóa sáng màn hình thành công!');
                    // Chạy thành công thì gỡ cái bẫy này ra cho nhẹ máy
                    document.removeEventListener('pointerdown', handleFirstInteraction);
                    document.removeEventListener('touchstart', handleFirstInteraction);

                    wakeLockRef.current.addEventListener('release', () => {
                        console.log('⚠️ Màn hình đã được thả rông.');
                        wakeLockRef.current = null;
                    });
                }
            } catch (err) {
                // Nếu lỗi là do chưa tương tác, hệ thống sẽ im lặng chờ cú click tiếp theo
                console.log('Wake Lock bị từ chối: ', err.message);
            }
        };

        // 1. Thử gọi ngay lập tức (Hên xui, nếu người dùng đã click đâu đó trước khi vào bàn thì sẽ ăn ngay)
        requestWakeLock();

        // 2. CÀI BẪY: Lắng nghe cú chạm ĐẦU TIÊN của người dùng vào màn hình để kích hoạt
        const handleFirstInteraction = () => {
            requestWakeLock();
            // Chạy thành công thì gỡ cái bẫy này ra cho nhẹ máy
        };
        document.addEventListener('pointerdown', handleFirstInteraction);
        document.addEventListener('touchstart', handleFirstInteraction);

        // 3. Phục hồi Wake Lock khi người dùng lỡ ẩn tab rồi quay lại
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Dọn dẹp chiến trường khi thoát bàn chơi
        return () => {
            document.removeEventListener('pointerdown', handleFirstInteraction);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current !== null) {
                wakeLockRef.current.release();
                wakeLockRef.current = null;
            }
        };
    }, []);
}