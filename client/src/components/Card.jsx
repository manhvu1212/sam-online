import React from 'react';

// Dùng Unicode hoặc SVG cho chất bài sắc nét (Khuyên dùng SVG)
const SUIT_ICONS = {
    heart: { char: '♥', color: 'text-red-600' }, // emerald-600
    diamond: { char: '♦', color: 'text-red-600' },
    club: { char: '♣', color: 'text-black' }, // zinc-900 (trông tối hơn #000)
    spade: { char: '♠', color: 'text-black' }
};

const RANK_LABELS = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
};

export default function Card({ rank, suit, style, className = '', scale = 1 }) {
    const label = RANK_LABELS[rank];
    const suitInfo = SUIT_ICONS[suit] || SUIT_ICONS['spade']; // mặc định Bích nếu sai dữ liệu

    const [isGhost, setIsGhost] = useState(false);
    const handleTap = (e) => {
        e.stopPropagation();

        // Nếu đang là bóng ma (đang trượt) thì cấm không cho bấm double-tap
        if (isGhost) return;

        // 2. Kích hoạt xuyên thấu
        setIsGhost(true);

        // 3. Hẹn giờ 250ms sau (đợi CSS trượt xong) thì gỡ xuyên thấu ra
        // Để người chơi còn có thể bấm vào lá bài đó để hạ nó xuống
        setTimeout(() => {
            setIsGhost(false);
        }, 300);
    };

    return (
        <div
            onPointerDown={handleTap}
            style={{ ...style, width: `${Math.round(scale * 80)}px` }}
            className={`
                        relative 
                        bg-white rounded-lg border border-slate-300 
                        flex flex-col select-none transition-all duration-300
                        shadow-[0_2px_8px_rgba(0,0,0,0.5)] border-zinc-500
                        p-1
                        aspect-[2/3]
                        ${className}

                        ${isGhost ? 'pointer-events-none' : 'pointer-events-auto'}
                    `}
        >
            {/* 1. GÓC TRÊN BÊN TRÁI: Chữ đứng thẳng, to rõ */}
            <div className={`flex flex-col items-center self-start leading-none ${suitInfo.color}`}>
                {/* Bỏ italic, dùng font-black chuẩn */}
                <span style={{ fontSize: `${Math.round(scale * 20)}px` }} className={`font-black tracking-tight`}>
                    {label}
                </span>
                <span style={{ fontSize: `${Math.round(scale * 19)}px` }} className={`-mt-0.5`}>
                    {suitInfo.char}
                </span>
            </div>

            {/* 2. PIP (KÝ HIỆU GIỮA): Luôn hiển thị, điều chỉnh cỡ cho mobile */}
            <div style={{ fontSize: `${Math.round(scale * 50)}px` }}
                className={`
                                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                                ${suitInfo.color} opacity-[0.15]
                            `}>
                {suitInfo.char}
            </div>

            {/* 3. GÓC DƯỚI BÊN PHẢI: Xoay ngược đối xứng */}
            <div className={`flex flex-col items-center self-end leading-none rotate-180 mt-auto ${suitInfo.color}`}>
                <span style={{ fontSize: `${Math.round(scale * 20)}px` }} className={`font-black tracking-tight`}>
                    {label}
                </span>
                <span style={{ fontSize: `${Math.round(scale * 19)}px` }} className={`-mt-0.5`}>
                    {suitInfo.char}
                </span>
            </div>
        </div>
    );
}