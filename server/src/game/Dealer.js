export default class Dealer {
    static canPlay(currentMove, lastMove) {
        if (!lastMove) return true; // Đánh đầu vòng

        // Cùng loại, cùng độ dài -> So sánh power
        if (currentMove.type === lastMove.type && currentMove.length === lastMove.length) {
            return currentMove.power > lastMove.power;
        }

        // Tứ quý chặt Heo
        if (lastMove.type === 'SINGLE' && lastMove.power === 15 && currentMove.type === 'QUAD') return true;

        // Tứ quý chặt Tứ quý
        if (lastMove.type === 'QUAD' && currentMove.type === 'QUAD') return currentMove.power > lastMove.power;

        return false;
    }
}