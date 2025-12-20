const DEFAULT_TOKEN = '5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo';
const DEFAULT_CHAT_ID = '1350722553';

// تحويل الثواني إلى صيغة مقروءة
export function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds} ثانية`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${minutes} دقيقة و ${secs} ثانية` : `${minutes} دقيقة`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        let result = `${hours} ساعة`;
        if (minutes > 0) result += ` و ${minutes} دقيقة`;
        if (secs > 0 && minutes === 0) result += ` و ${secs} ثانية`;

        return result;
    }
}

// إرسال رسالة تيليجرام
export async function sendTelegramMessage(chatId, message, parseMode = 'HTML') {
    const token = process.env.TELEGRAM_TOKEN || DEFAULT_TOKEN;
    const finalChatId = chatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: finalChatId,
                text: message,
                parse_mode: parseMode
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Telegram API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
        throw error;
    }
}

// إرسال إشعار حالة المستخدم
export async function notifyUserStatus(username, statusType, extraData = {}) {
    let message = '';

    switch (statusType) {
        case 'online':
            message = `👤 المستخدم <b>${username}</b> متصل الآن`;
            break;
        case 'new_user':
            message = `🆕 سجل مستخدم جديد: <b>${username}</b>`;
            break;
        case 'name_change':
            message = `📝 تم تحديث الاسم من "${extraData.oldName}" إلى "<b>${extraData.newName}</b>"`;
            break;
        default:
            return;
    }

    return sendTelegramMessage(null, message);
}

// إنشاء تقرير النشاط
export async function generateActivityReport(prisma, hours = 12) {
    const now = new Date();
    const timeAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // جلب المستخدمين النشطين خلال الفترة المحددة
    const activeUsers = await prisma.user.findMany({
        where: {
            lastActiveAt: {
                gte: timeAgo
            }
        },
        orderBy: {
            lastActiveAt: 'desc'
        },
        select: {
            username: true,
            totalTimeSpent: true,
            lastActiveAt: true,
            sessionStartAt: true
        }
    });

    if (activeUsers.length === 0) {
        return `📊 <b>تقرير النشاط - آخر ${hours} ساعة</b>\n\n` +
            `⏰ الوقت: ${now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}\n\n` +
            `❌ لا يوجد مستخدمين نشطين خلال الفترة الماضية.`;
    }

    // بناء الرسالة
    let message = `📊 <b>تقرير النشاط - آخر ${hours} ساعة</b>\n\n`;
    message += `⏰ الوقت: ${now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}\n`;
    message += `👥 عدد المستخدمين النشطين: <b>${activeUsers.length}</b>\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // إضافة تفاصيل كل مستخدم
    activeUsers.forEach((user, index) => {
        // حساب الوقت المقضي في الجلسة الحالية (إذا بدأت خلال الفترة المحددة)
        let sessionTime = 0;
        if (user.sessionStartAt) {
            const sessionStart = new Date(user.sessionStartAt);
            if (sessionStart >= timeAgo) {
                // الجلسة بدأت خلال الفترة المحددة
                const sessionEnd = user.lastActiveAt ? new Date(user.lastActiveAt) : now;
                sessionTime = Math.floor((sessionEnd - sessionStart) / 1000); // بالثواني
            }
        }

        // إذا لم يكن هناك sessionStartAt، نستخدم تقدير بناءً على lastActiveAt
        if (sessionTime === 0 && user.lastActiveAt) {
            const lastActive = new Date(user.lastActiveAt);
            if (lastActive >= timeAgo) {
                // تقدير: الوقت منذ آخر نشاط (بحد أقصى 5 دقائق كتقدير)
                const timeSinceLastActive = Math.floor((now - lastActive) / 1000);
                sessionTime = Math.min(timeSinceLastActive, 300); // حد أقصى 5 دقائق
            }
        }

        const timeSpent = formatTime(sessionTime);
        const lastActive = user.lastActiveAt
            ? new Date(user.lastActiveAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })
            : 'غير متاح';

        message += `${index + 1}. <b>${user.username}</b>\n`;
        message += `   ⏱️ الوقت المقضي: ${timeSpent}\n`;
        message += `   🕐 آخر نشاط: ${lastActive}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 <b>الإجمالي:</b> ${activeUsers.length} مستخدم نشط`;

    return message;
}

