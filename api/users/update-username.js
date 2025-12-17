import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const { currentUsername, newUsername } = req.body;

    // التحقق من الإدخال
    if (!currentUsername || !newUsername) {
        return res.status(400).json({ error: 'الاسم الحالي والجديد مطلوبان' });
    }

    const cleanCurrentUsername = currentUsername.trim();
    const cleanNewUsername = newUsername.trim();

    // التحقق من الطول
    if (cleanNewUsername.length < 2 || cleanNewUsername.length > 20) {
        return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون بين 2-20 حرف' });
    }

    // التحقق من الأحرف المسموحة (عربي، إنجليزي، أرقام، مسافات)
    const validPattern = /^[\u0600-\u06FFa-zA-Z0-9\s]+$/;
    if (!validPattern.test(cleanNewUsername)) {
        return res.status(400).json({ error: 'اسم المستخدم يحتوي على أحرف غير مسموحة' });
    }

    // التحقق من أن الاسم ليس نفسه
    if (cleanCurrentUsername === cleanNewUsername) {
        return res.status(400).json({ error: 'الاسم الجديد مطابق للاسم الحالي' });
    }

    try {
        // التحقق من وجود المستخدم الحالي
        const currentUser = await prisma.user.findUnique({
            where: { username: cleanCurrentUsername }
        });

        if (!currentUser) {
            return res.status(404).json({ error: 'المستخدم الحالي غير موجود' });
        }

        // التحقق من عدم وجود الاسم الجديد
        const existingUser = await prisma.user.findUnique({
            where: { username: cleanNewUsername }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'اسم المستخدم الجديد موجود مسبقاً' });
        }

        // تحديث اسم المستخدم
        const updatedUser = await prisma.user.update({
            where: { username: cleanCurrentUsername },
            data: { username: cleanNewUsername }
        });

        // إرسال إشعار تيليجرام
        try {
            const token = '5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo';
            const chatId = '1350722553';
            const message = `تم تحديث الاسم من "${cleanCurrentUsername}" إلى "${cleanNewUsername}"`;

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message
                })
            });
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }

        return res.status(200).json({
            success: true,
            message: 'تم تحديث الاسم بنجاح',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                points: updatedUser.points
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            error: 'حدث خطأ في الخادم',
            details: error.message
        });
    }
}
