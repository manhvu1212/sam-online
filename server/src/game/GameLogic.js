class GameLogic {
    /**
     * Phân tích các lá bài để xem nó thuộc bộ gì (Rác, Đôi, Sảnh, Tứ Quý...)
     * Giả sử rank của bạn: 3=3, 4=4 ... J=11, Q=12, K=13, A=14, 2=15
     */
    static getCombo(cards) {
        if (!cards || cards.length === 0) return null;

        // Sắp xếp bài theo thứ tự bé đến lớn
        const sorted = [...cards].sort((a, b) => a.rank - b.rank);
        const length = sorted.length;
        const highestRank = sorted[length - 1].rank;

        // 1. LÁ LẺ (Rác)
        if (length === 1) return { type: 'SINGLE', highestRank, length };

        // Kiểm tra xem tất cả các lá bài có cùng số không (Đôi, Ba, Tứ Quý)
        const isAllSame = sorted.every(c => c.rank === sorted[0].rank);
        if (isAllSame) {
            if (length === 2) return { type: 'PAIR', highestRank, length }; // Đôi
            if (length === 3) return { type: 'TRIPLE', highestRank, length }; // Xám cô (Ba lá)
            if (length === 4) return { type: 'QUAD', highestRank, length }; // Tứ Quý
        }

        // 2. SẢNH (Straight) - Từ 3 lá trở lên, liên tiếp nhau và KHÔNG có Heo (rank 15)
        let isStraight = true;
        for (let i = 0; i < length - 1; i++) {
            if (sorted[i + 1].rank - sorted[i].rank !== 1) {
                isStraight = false;
                break;
            }
        }

        // Sảnh hợp lệ: Liên tiếp và quân lớn nhất không được là Heo (15)
        if (isStraight && length >= 3 && highestRank < 15) {
            return { type: 'STRAIGHT', highestRank, length };
        }

        // Nếu không lọt vào trường hợp nào -> BỘ BÀI LỖI
        return null;
    }

    /**
     * So sánh bài mới đánh ra có đè được bài cũ trên bàn không
     */
    static canPlay(lastCards, newCards) {
        const newCombo = this.getCombo(newCards);

        // Nếu bộ bài bấm chọn là tào lao (vd: 3 Bích + 5 Cơ) -> Chặn luôn!
        if (!newCombo) return false;

        // Nếu bàn đang trống (Mở vòng mới) -> Đánh bộ nào hợp lệ cũng được phép
        if (!lastCards || lastCards.length === 0) return true;

        const lastCombo = this.getCombo(lastCards);
        if (!lastCombo) return true; // (Đề phòng lỗi data cũ)

        // --- LUẬT ĐẶC BIỆT: TỨ QUÝ CHẶT HEO ---
        // Heo lẻ (SINGLE, rank 15) bị chặt bởi Tứ Quý (QUAD)
        if (lastCombo.type === 'SINGLE' && lastCombo.highestRank === 15 && newCombo.type === 'QUAD') {
            return true;
        }

        // --- LUẬT CHUNG ---
        // Phải cùng loại bộ, cùng số lượng lá, và con to nhất phải LỚN HƠN hẳn con to nhất của đối thủ
        // Lưu ý: Sâm Lốc chỉ đọ Số, KHÔNG đọ Chất (vd: 5 Cơ không đè được 5 Bích, bắt buộc phải đánh 6)
        if (newCombo.type === lastCombo.type && newCombo.length === lastCombo.length) {
            return newCombo.highestRank > lastCombo.highestRank;
        }

        // Trái luật -> Bắt lỗi
        return false;
    }
}

export default GameLogic;