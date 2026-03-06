import { useEffect, useRef } from 'react';
import NoSleep from 'nosleep.js';

export default function useAutoWakeLock() {
    const noSleepRef = useRef(null);

    useEffect(() => {
        if (!noSleepRef.current) {
            noSleepRef.current = new NoSleep();
        }
        const noSleep = noSleepRef.current;

        // Phải có chữ ASYNC ở đây
        const enableWakeLock = async () => {
            if (!noSleep.isEnabled) {
                try {
                    // Bắt buộc phải có AWAIT: Đợi nó xin quyền xong mới được chạy tiếp
                    await noSleep.enable();

                    console.log("🔥 Đã kích hoạt NoSleep THẬT SỰ thành công!");

                    // Chỉ khi nào bật thành công 100% thì mới gỡ bẫy ra
                    document.removeEventListener('pointerdown', enableWakeLock);
                    document.removeEventListener('touchstart', enableWakeLock);
                    document.removeEventListener('click', enableWakeLock);
                } catch (err) {
                    // Nếu trình duyệt từ chối, nó sẽ chui vào đây
                    console.warn("❌ Bật thất bại! Lý do:", err.message);
                }
            }
        };

        // Giăng 3 lớp bẫy bóp cò để đảm bảo không lọt cú chạm nào
        document.addEventListener('pointerdown', enableWakeLock);
        document.addEventListener('touchstart', enableWakeLock);
        document.addEventListener('click', enableWakeLock);

        return () => {
            document.removeEventListener('pointerdown', enableWakeLock);
            document.removeEventListener('touchstart', enableWakeLock);
            document.removeEventListener('click', enableWakeLock);

            if (noSleep && noSleep.isEnabled) {
                noSleep.disable();
                console.log("💤 Đã tắt NoSleep.");
            }
        };
    }, []);
}