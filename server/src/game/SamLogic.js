export default class SamLogic {
    static getPlayType(cards) {
        if (!cards || cards.length === 0) return { type: 'INVALID' };
        const len = cards.length;
        const sorted = [...cards].sort((a, b) => a.rank - b.rank);

        if (len === 1) return { type: 'SINGLE', power: sorted[0].rank, length: 1 };
        if (len === 2 && sorted[0].rank === sorted[1].rank) return { type: 'PAIR', power: sorted[0].rank, length: 2 };
        if (len === 3 && sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) return { type: 'TRIPLE', power: sorted[0].rank, length: 3 };
        if (len === 4 && sorted.every(c => c.rank === sorted[0].rank)) return { type: 'QUAD', power: sorted[0].rank, length: 4 };

        if (this.isStraight(sorted)) return { type: 'STRAIGHT', power: sorted[len - 1].rank, length: len };

        return { type: 'INVALID' };
    }

    static isStraight(sortedCards) {
        if (sortedCards.length < 3) return false;
        if (sortedCards.some(c => c.rank === 15)) return false; // Sâm không cho phép sảnh có Heo (2)
        for (let i = 0; i < sortedCards.length - 1; i++) {
            if (sortedCards[i + 1].rank !== sortedCards[i].rank + 1) return false;
        }
        return true;
    }
}