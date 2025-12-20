import { PrismaClient } from '@prisma/client';

// إنشاء Prisma Client مرة واحدة
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

    const { username } = req.body;

    // التحقق من الإدخال
    if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }

    const cleanUsername = username.trim();

    // التحقق من الطول
    if (cleanUsername.length < 2 || cleanUsername.length > 20) {
        return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون بين 2-20 حرف' });
    }

    // التحقق من الأحرف المسموحة (عربي، إنجليزي، أرقام، مسافات)
    const validPattern = /^[\u0600-\u06FFa-zA-Z0-9\s]+$/;
    if (!validPattern.test(cleanUsername)) {
        return res.status(400).json({ error: 'اسم المستخدم يحتوي على أحرف غير مسموحة' });
    }

    try {
        // محاولة إيجاد المستخدم
        let user = await prisma.user.findUnique({
            where: { username: cleanUsername }
        });

        // ❌ إذا الاسم موجود، ارجع خطأ
        if (user) {
            return res.status(409).json({
                error: 'اسم المستخدم موجود مسبقاً، اختر اسماً آخر',
                exists: true
            });
        }

        // ✅ إنشاء مستخدم جديد
        user = await prisma.user.create({
            data: {
                username: cleanUsername,
                points: 0
            }
        });

        // إرسال إشعار تيليجرام
        try {
            const { notifyUserStatus } = await import('../utils/telegram-utils.js');
            await notifyUserStatus(cleanUsername, 'new_user');
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
            // لا نوقف العملية إذا فشل الإشعار
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                points: user.points
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        // إرجاع تفاصيل الخطأ للتشخيص
        return res.status(500).json({
            error: 'حدث خطأ في الخادم',
            details: error.message,
            code: error.code
        });
    }
}
