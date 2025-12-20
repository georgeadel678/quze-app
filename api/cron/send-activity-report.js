import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHAT_ID = '1350722553';

// استيراد الدوال المشتركة
import { sendTelegramMessage, generateActivityReport } from '../utils/telegram-utils.js';

export default async function handler(req, res) {
    // Vercel Cron يرسل header خاص
    const cronHeader = req.headers['x-vercel-cron'] || req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    
    // التحقق من أن الطلب من Vercel Cron أو من authorization header
    if (cronHeader !== '1' && cronHeader !== `Bearer ${cronSecret}`) {
        // السماح بالاختبار المحلي بدون auth
        if (process.env.NODE_ENV !== 'development' && !cronSecret) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        // إنشاء التقرير (12 ساعة)
        const report = await generateActivityReport(prisma, 12);

        // إرسال الرسالة
        await sendTelegramMessage(CHAT_ID, report);

        return res.status(200).json({
            success: true,
            message: 'Report sent successfully'
        });

    } catch (error) {
        console.error('Error generating activity report:', error);
        
        // محاولة إرسال رسالة خطأ
        try {
            await sendTelegramMessage(
                CHAT_ID,
                `❌ <b>خطأ في تقرير النشاط</b>\n\n` +
                `الخطأ: ${error.message}\n` +
                `الوقت: ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`
            );
        } catch (telegramError) {
            console.error('Failed to send error notification:', telegramError);
        }

        return res.status(500).json({
            error: 'Failed to generate report',
            details: error.message
        });
    } finally {
        await prisma.$disconnect();
    }
}

