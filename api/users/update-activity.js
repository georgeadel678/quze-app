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

    const { username, timeSpent } = req.body;

    // التحقق من الإدخال
    if (!username) {
        return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }

    if (typeof timeSpent !== 'number' || timeSpent < 0) {
        return res.status(400).json({ error: 'قيمة الوقت غير صحيحة' });
    }

    try {
        // البحث عن المستخدم
        const user = await prisma.user.findUnique({
            where: { username: username.trim() }
        });

        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        const now = new Date();
        const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;

        // حساب الوقت الإضافي (إذا مر أكثر من 5 دقائق منذ آخر نشاط، نعتبره جلسة جديدة)
        let additionalTime = 0;
        let sessionStart = user.sessionStartAt ? new Date(user.sessionStartAt) : null;
        let isNewSession = false;

        if (lastActive) {
            const timeDiff = Math.floor((now - lastActive) / 1000); // الفرق بالثواني
            // إذا كان الفرق أقل من 5 دقائق (300 ثانية)، نضيفه للوقت
            if (timeDiff <= 300) {
                additionalTime = timeDiff;
            } else {
                // جلسة جديدة - إعادة تعيين sessionStartAt
                sessionStart = now;
                isNewSession = true;
            }
        } else {
            // أول مرة - بدء جلسة جديدة
            sessionStart = now;
            isNewSession = true;
        }

        // إرسال إشعار إذا كانت جلسة جديدة
        if (isNewSession) {
            try {
                const { notifyUserStatus } = await import('../utils/telegram-utils.js');
                await notifyUserStatus(username.trim(), 'online');
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
            }
        }

        // تحديث المستخدم
        const updatedUser = await prisma.user.update({
            where: { username: username.trim() },
            data: {
                lastActiveAt: now,
                totalTimeSpent: {
                    increment: additionalTime + timeSpent
                },
                sessionStartAt: sessionStart || now
            }
        });

        return res.status(200).json({
            success: true,
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                totalTimeSpent: updatedUser.totalTimeSpent,
                lastActiveAt: updatedUser.lastActiveAt
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            error: 'حدث خطأ في الخادم',
            details: error.message
        });
    } finally {
        await prisma.$disconnect();
    }
}

