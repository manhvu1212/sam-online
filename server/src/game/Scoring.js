export default class Scoring {
    static calculateResult(room, winnerId) {
        const { bet, penalty } = room.settings;
        const results = [];
        const winner = room.players.find(p => p.id === winnerId);
        let totalWinnerGain = 0;

        // Logic Đền Sâm: Có người xin sâm nhưng người thắng lại là người khác
        const isDenSam = room.samPlayer && room.samPlayer !== winnerId;

        // Mức đền sâm: Thường là 20 lá x Số người thua
        const samPenaltyLeaves = 20 * (room.players.length - 1);

        room.players.forEach(player => {
            if (player.id === winnerId) return; // Bỏ qua người thắng

            let leafCount = player.cards.length;
            let penaltyCount = 0;
            let totalLossAmount = 0;
            let note = "";

            if (isDenSam) {
                // TRƯỜNG HỢP 1: BỊ ĐỀN SÂM
                if (player.id === room.samPlayer) {
                    totalLossAmount = samPenaltyLeaves * bet;
                    note = "Đền Sâm (Bị chặt)";
                } else {
                    totalLossAmount = 0;
                    note = "Hưởng sái (Không mất tiền)";
                }
            } else {
                // TRƯỜNG HỢP 2: TÍNH ĐIỂM BÌNH THƯỜNG

                // 1. Phạt Cóng (Không đánh được lá nào)
                if (leafCount === 10) {
                    leafCount = 20; // Phạt gấp đôi
                    note = "Cóng";
                } else {
                    note = `Thua ${leafCount} lá`;
                }

                // 2. Phạt thối Heo (2)
                const twosCount = player.cards.filter(c => c.rank === 15).length;
                if (twosCount > 0) {
                    penaltyCount += twosCount * penalty; // penalty mặc định là 5 lá / con
                    note += ` + Thối ${twosCount} Heo`;
                }

                // 3. Phạt thối Tứ Quý
                const quadsCount = this.countQuads(player.cards);
                if (quadsCount > 0) {
                    penaltyCount += quadsCount * penalty;
                    note += ` + Thối ${quadsCount} Tứ Quý`;
                }

                totalLossAmount = (leafCount + penaltyCount) * bet;

                // 4. Ưu tiên: Nếu người thắng là người Xin Sâm (Thắng Sâm thành công)
                if (room.samPlayer === winnerId) {
                    totalLossAmount = 20 * bet; // Thắng sâm ăn mỗi nhà 20 lá (không cộng dồn thối)
                    note = "Thua Sâm";
                }
            }

            if (totalLossAmount > 0) {
                totalWinnerGain += totalLossAmount;
            }

            results.push({
                playerId: player.id,
                name: player.name,
                loss: totalLossAmount,
                remainingCards: player.cards.length,
                note: note
            });
        });

        return {
            winnerId,
            winnerName: winner.name,
            totalWinnerGain,
            details: results
        };
    }

    // Hàm phụ: Đếm xem trên tay còn bao nhiêu bộ Tứ Quý
    static countQuads(cards) {
        if (cards.length < 4) return 0;
        let count = 0;
        const rankCounts = {};

        cards.forEach(c => {
            rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
        });

        Object.values(rankCounts).forEach(qty => {
            if (qty === 4) count++;
        });

        return count;
    }
}