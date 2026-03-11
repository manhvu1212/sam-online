import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize } = format;

// Định dạng hiển thị log
const logFormat = printf(({ level, message, timestamp, roomCode, playerId, playerName }) => {
    return `${timestamp} [${level}] [${roomCode || ''}] [${playerId || ''}] [${playerName || ''}]: ${message}`;
});

// Cấu hình xoay vòng file log
const dailyRotateTransport = new transports.DailyRotateFile({
    dirname: 'logs',              // Thư mục lưu log
    filename: 'application-%DATE%.log', // Tên file kèm ngày tháng
    datePattern: 'YYYY-MM-DD',    // Định dạng ngày (mỗi ngày 1 file)
    zippedArchive: true,          // Nén file cũ thành file .gz để tiết kiệm dung lượng
    maxSize: '20m',               // Nếu file trong ngày vượt quá 20MB sẽ tách file mới
    maxFiles: '7d',                // CHỈ GIỮ LẠI LOG TRONG 7 NGÀY
    handleExceptions: true,  // Gộp exception vào đây
    handleRejections: true   // Gộp rejection vào đây
});

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // 1. In ra console để theo dõi khi code
        new transports.Console({
            handleExceptions: true,
            handleRejections: true
        })
    ]
});

export default logger;