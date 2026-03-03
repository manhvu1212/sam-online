import React from 'react';

// Dùng Unicode hoặc SVG cho chất bài sắc nét (Khuyên dùng SVG)
const SUIT_ICONS = {
    heart: { char: '♥', color: '#dc2626' }, // emerald-600
    diamond: { char: '♦', color: '#dc2626' },
    club: { char: '♣', color: '#18181b' }, // zinc-900 (trông tối hơn #000)
    spade: { char: '♠', color: '#18181b' }
};

const RANK_LABELS = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
};

// --- QUY TẮC PHÂN BỔ PIPS (HÌNH CHẤT BÀI GIỮA BÀN) ---
// Dùng CSS Grid để xếp các vị trí 
const PIP_LAYOUTS = {
    'A': ['center'],
    '2': ['top-center', 'bottom-center'],
    '3': ['top-center', 'center', 'bottom-center'],
    '4': ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    '5': ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    '6': ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
    '7': ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right', 'center-top'],
    '8': ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right', 'center-top', 'center-bottom'],
    '9': ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right', 'middle-center-top', 'middle-center-bottom', 'center'],
    '10': ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right', 'middle-center-top', 'middle-center-bottom', 'center-top-mid', 'center-bottom-mid'],
    // Face cards (J, Q, K) thường dùng 1 hình lớn ở giữa, tạm dùng 1 Pip
    'J': ['center'], 'Q': ['center'], 'K': ['center'],
};

// Ánh xạ CSS Grid class cho từng vị trí Pip
const PIP_POSITION_CLASSES = {
    'center': 'row-start-3 col-start-2',
    'top-center': 'row-start-1 col-start-2',
    'top-left': 'row-start-1 col-start-1',
    'top-right': 'row-start-1 col-start-3',
    'bottom-center': 'row-start-5 col-start-2 rotate-180',
    'bottom-left': 'row-start-5 col-start-1 rotate-180',
    'bottom-right': 'row-start-5 col-start-3 rotate-180',
    'middle-left': 'row-start-3 col-start-1',
    'middle-right': 'row-start-3 col-start-3',
    'center-top': 'row-start-2 col-start-2',
    'center-bottom': 'row-start-4 col-start-2 rotate-180',
    // Layout phức tạp cho 9 và 10
    'middle-center-top': 'row-start-2 col-start-1',
    'middle-center-bottom': 'row-start-4 col-start-1 rotate-180',
    'center-top-mid': 'row-start-2 col-start-2',
    'center-bottom-mid': 'row-start-4 col-start-2 rotate-180',
};

export default function Card({ rank, suit, className = '' }) {
    const label = RANK_LABELS[rank];
    const suitInfo = SUIT_ICONS[suit] || SUIT_ICONS['spade']; // mặc định Bích nếu sai dữ liệu
    const pipLayout = PIP_LAYOUTS[label] || [];

    return (
        // Toàn bộ lá bài: Ép tỉ lệ vàng (2.5x3.5), có bo góc, đổ bóng, viền mỏng
        <div
            className={`
        aspect-[2.5/3.5] bg-[#fafafa] rounded-[0.5rem]
        border border-zinc-300 shadow-[0_2px_8px_rgba(0,0,0,0.4)]
        flex flex-col select-none relative
        ${className}
      `}
            style={{ color: suitInfo.color }}
        >
            {/* 1. GÓC TRÊN TRÁI: Rank + Suit nhỏ */}
            <div className="flex flex-col items-center absolute top-1.5 left-1 z-10">
                <span className={`text-xl sm:text-2xl font-bold leading-none ${label === '10' ? '-ml-1' : ''}`}>
                    {label}
                </span>
                <span className="text-xs sm:text-sm -mt-0.5 leading-none">
                    {suitInfo.char}
                </span>
            </div>

            {/* 2. GÓC DƯỚI PHẢI: Rank + Suit lật ngược 180 độ */}
            <div className="flex flex-col items-center absolute bottom-1.5 right-1 z-10 rotate-180">
                <span className={`text-xl sm:text-2xl font-bold leading-none ${label === '10' ? '-ml-1' : ''}`}>
                    {label}
                </span>
                <span className="text-xs sm:text-sm -mt-0.5 leading-none">
                    {suitInfo.char}
                </span>
            </div>

            {/* 3. KHU VỰC TRUNG TÂM (PIPS DISTRIBUTION) */}
            {/* Dùng CSS Grid 5 hàng 3 cột để xếp chất bài cân đối */}
            <div className="flex-1 flex items-center justify-center p-4 py-6">
                <div className="grid grid-cols-3 grid-rows-5 gap-y-1 gap-x-1.5 justify-items-center items-center h-full w-full">

                    {pipLayout.map((pos, i) => (
                        <div
                            key={i}
                            className={`
                text-base sm:text-xl md:text-2xl opacity-100
                ${PIP_POSITION_CLASSES[pos]}
                ${['J', 'Q', 'K'].includes(label) ? ' scale-[3] text-zinc-900' : ''} // Face cards tạm dùng 1 hình lớn
              `}
                        >
                            {suitInfo.char}
                        </div>
                    ))}

                </div>
            </div>

        </div>
    );
}