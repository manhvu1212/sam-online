// Khai báo biến toàn cục để xài chung (Tránh lỗi tràn bộ nhớ Audio của trình duyệt)
let audioCtx = null;

export const playFeedback = () => {
    // ==========================================
    // 1. XỬ LÝ RUNG (Dành cho Android & PWA hỗ trợ)
    // ==========================================
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            // Rung đúng 40ms - Độ dài "Vàng" để tạo cảm giác nảy (Bump) cực êm
            navigator.vibrate(40);
        } catch (e) {
            console.warn("Trình duyệt không cho phép rung", e);
        }
    }

    // ==========================================
    // 2. XỬ LÝ TIẾNG BÍP (Cứu cánh cho iOS và tạo cảm giác đã tay)
    // ==========================================
    try {
        // Chỉ khởi tạo Context 1 lần duy nhất vào lúc người chơi bấm nút (lách luật Autoplay)
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }

        // Bọn trình duyệt hay tự "ngủ đông" Audio, phải gọi dậy
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // Tạo 2 cục màng loa ảo: Bộ tạo sóng (Oscillator) và Cục âm lượng (Gain)
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // CHỈNH ÂM SẮC:
        // 'sine' (Êm ái), 'square' (Hơi gắt, giống game 8-bit), 'triangle' (Sắc nét)
        oscillator.type = 'sine';

        // CHỈNH ĐỘ CAO (Tần số): 600Hz nghe khá thanh thoát (Tiếng quẹt bài)
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);

        // CHỈNH ÂM LƯỢNG MƯỢT MÀ (Fade-out effect):
        // Bắt đầu ở mức 30% âm lượng để không làm giật mình
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        // Ép âm lượng giảm dần về 0.01 trong vòng 0.1 giây (Nghe tiếng bíp sẽ rất "sạch")
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        // Cắm dây kết nối các màng loa ảo lại với nhau
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Phát âm thanh và Hẹn giờ tự hủy sau 0.1 giây
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);

    } catch (error) {
        console.warn("Không thể phát tiếng bíp:", error);
    }
};