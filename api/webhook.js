import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// استيراد الدوال المشتركة
import { sendTelegramMessage, generateActivityReport } from '../utils/telegram-utils.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;

        // التحقق من أن الرسالة من تيليجرام
        if (!update.message || !update.message.chat) {
            return res.status(400).json({ error: 'Invalid Telegram update' });
        }

        const chatId = update.message.chat.id;
        const messageText = update.message.text || '';
        const authorizedChatId = '1350722553'; // Chat ID المصرح به

        // التحقق من أن الرسالة من المستخدم المصرح به
        if (chatId.toString() !== authorizedChatId) {
            console.log(`Unauthorized access attempt from chat ID: ${chatId}`);
            return res.status(200).json({ ok: true }); // نرد بـ 200 حتى لا يعيد تيليجرام المحاولة
        }

        // معالجة الأوامر
        const command = messageText.trim().toLowerCase();

        if (command === '/start' || command === '/help') {
            const helpMessage = `👋 <b>مرحباً!</b>\n\n` +
                `يمكنك استخدام الأوامر التالية:\n\n` +
                `📊 <code>/report</code> - تقرير آخر 12 ساعة\n` +
                `📊 <code>/report 24</code> - تقرير آخر 24 ساعة\n` +
                `📊 <code>/report 6</code> - تقرير آخر 6 ساعات\n\n` +
                `أو فقط اكتب أي رسالة وسأرسل لك التقرير!`;

            await sendTelegramMessage(chatId, helpMessage);
            return res.status(200).json({ ok: true });
        }

        // إذا كانت الرسالة تحتوي على رقم (مثل "24" أو "6")، نستخدمه كعدد الساعات
        let hours = 12; // افتراضي 12 ساعة
        const hoursMatch = messageText.match(/(\d+)/);
        if (hoursMatch) {
            hours = parseInt(hoursMatch[1]);
            if (hours < 1 || hours > 168) { // حد أقصى أسبوع
                hours = 12;
            }
        }

        // إذا كانت الرسالة تحتوي على "/report" أو أي نص آخر، نرسل التقرير
        if (command.includes('/report') || messageText.trim().length > 0) {
            // إرسال رسالة "جاري التحميل..."
            await sendTelegramMessage(chatId, '⏳ جاري تحضير التقرير...');

            // إنشاء التقرير
            const report = await generateActivityReport(prisma, hours);

            // إرسال التقرير
            await sendTelegramMessage(chatId, report);

            return res.status(200).json({ ok: true });
        }

        // إذا لم تكن هناك أوامر معروفة، نرد بـ 200
        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('Error processing Telegram webhook:', error);

        // محاولة إرسال رسالة خطأ
        try {
            const chatId = req.body?.message?.chat?.id;
            if (chatId) {
                await sendTelegramMessage(
                    chatId,
                    `❌ <b>حدث خطأ</b>\n\n` +
                    `الخطأ: ${error.message}\n` +
                    `الوقت: ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`
                );
            }
        } catch (telegramError) {
            console.error('Failed to send error notification:', telegramError);
        }

        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    } finally {
        await prisma.$disconnect();
    }
}

