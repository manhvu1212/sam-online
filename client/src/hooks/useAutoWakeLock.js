import { useEffect, useRef } from 'react';
import NoSleep from 'nosleep.js';

export default function useAutoWakeLock() {
    // Dùng useRef để giữ lại đúng 1 bản thể (instance) của NoSleep trong suốt quá trình chơi
    const noSleepRef = useRef(null);

    useEffect(() => {
        // Khởi tạo NoSleep nếu chưa có
        if (!noSleepRef.current) {
            noSleepRef.current = new NoSleep();
        }

        const noSleep = noSleepRef.current;

        // KỸ THUẬT BẪY TÀNG HÌNH
        const enableWakeLock = () => {
            if (!noSleep.isEnabled) {
                noSleep.enable();
                console.log("🔥 Đã kích hoạt NoSleep thành công nhờ cú chạm đầu tiên!");

                // Quan trọng: Bật thành công rồi thì gỡ bẫy ra để đỡ nặng máy
                document.removeEventListener('pointerdown', enableWakeLock);
                document.removeEventListener('touchstart', enableWakeLock);
            }
        };

        // 1. Thử gọi luôn xem trình duyệt có thả cửa không (thường là xịt nếu vừa F5)
        try {
            enableWakeLock();
        } catch (e) {
            console.log("Tự động bật thất bại, đang chờ cú chạm đầu tiên...");
        }

        // 2. Nếu xịt, giăng bẫy toàn màn hình. 
        // Dùng cả pointerdown và touchstart để bắt cực nhạy trên mọi dòng máy
        document.addEventListener('pointerdown', enableWakeLock);
        document.addEventListener('touchstart', enableWakeLock);

        // Dọn dẹp chiến trường khi Component Unmount (Thoát khỏi bàn chơi)
        return () => {
            document.removeEventListener('pointerdown', enableWakeLock);
            document.removeEventListener('touchstart', enableWakeLock);

            // Tắt NoSleep đi để trả lại trạng thái tiết kiệm pin cho điện thoại
            if (noSleep && noSleep.isEnabled) {
                noSleep.disable();
                console.log("💤 Đã tắt NoSleep, cho phép tắt màn hình.");
            }
        };
    }, []); // [] Đảm bảo Hook này chỉ chạy 1 lần khi vào bàn
}