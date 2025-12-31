
import { PrismaClient } from '@prisma/client';
// import { notifyUserStatus } from '../../utils/telegram-utils.js'; // Disabled to save resources

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

    const { action, ...data } = req.body;

    if (!action) {
        return res.status(400).json({ error: 'Action is required' });
    }

    try {
        switch (action) {
            case 'update-activity':
                return await handleUpdateActivity(data, res);
            case 'update-username':
                return await handleUpdateUsername(data, res);
            case 'update-points':
                return await handleUpdatePoints(data, res);
            case 'set-points':
                return await handleSetPoints(data, res);
            case 'toggle-like':
                return await handleToggleLike(data, res);
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        await prisma.$disconnect();
    }
}

async function handleToggleLike({ targetUsername }, res) {
    if (!targetUsername) return res.status(400).json({ error: 'Missing targetUsername' });

    try {
        const user = await prisma.user.update({
            where: { username: targetUsername },
            data: { likes: { increment: 1 } }
        });

        return res.status(200).json({
            success: true,
            likes: user.likes
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        throw error;
    }
}

async function handleUpdateActivity({ username, timeSpent }, res) {
    // Disabled to reduce database writes and plan usage
    return res.status(200).json({
        success: true,
        message: 'Activity tracking disabled to save resources',
        user: {
            username: username,
            totalTimeSpent: 0,
            lastActiveAt: new Date()
        }
    });
}

async function handleUpdateUsername({ currentUsername, newUsername }, res) {
    if (!currentUsername || !newUsername) return res.status(400).json({ error: 'الاسم الحالي والجديد مطلوبان' });

    const cleanCurrent = currentUsername.trim();
    const cleanNew = newUsername.trim();

    if (cleanNew.length < 2 || cleanNew.length > 20) return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون بين 2-20 حرف' });
    if (!/^[\u0600-\u06FFa-zA-Z0-9\s]+$/.test(cleanNew)) return res.status(400).json({ error: 'اسم المستخدم يحتوي على أحرف غير مسموحة' });
    if (cleanCurrent === cleanNew) return res.status(400).json({ error: 'الاسم الجديد مطابق للاسم الحالي' });

    const currentUser = await prisma.user.findUnique({ where: { username: cleanCurrent } });
    if (!currentUser) return res.status(404).json({ error: 'المستخدم الحالي غير موجود' });

    const existingUser = await prisma.user.findUnique({ where: { username: cleanNew } });
    if (existingUser) return res.status(409).json({ error: 'اسم المستخدم الجديد موجود مسبقاً' });

    const updatedUser = await prisma.user.update({
        where: { username: cleanCurrent },
        data: { username: cleanNew }
    });

    // Telegram notification disabled
    /*
    try {
        await notifyUserStatus(cleanNew, 'name_change', { oldName: cleanCurrent, newName: cleanNew });
    } catch (e) {
        console.error('Telegram notification failed:', e);
    }
    */

    return res.status(200).json({
        success: true,
        message: 'تم تحديث الاسم بنجاح',
        user: { id: updatedUser.id, username: updatedUser.username, points: updatedUser.points }
    });
}

async function handleUpdatePoints({ username, pointsToAdd }, res) {
    if (!username || pointsToAdd === undefined) return res.status(400).json({ error: 'Missing required fields' });
    if (typeof pointsToAdd !== 'number' || pointsToAdd < 0) return res.status(400).json({ error: 'Invalid points value' });

    const user = await prisma.user.update({
        where: { username: username.trim() },
        data: { points: { increment: pointsToAdd } }
    });

    return res.status(200).json({
        success: true,
        user: { id: user.id, username: user.username, points: user.points }
    });
}

async function handleSetPoints({ username, newPoints }, res) {
    if (!username || newPoints === undefined) return res.status(400).json({ error: 'Missing required fields' });
    if (typeof newPoints !== 'number' || newPoints < 0) return res.status(400).json({ error: 'Invalid points value' });

    const user = await prisma.user.update({
        where: { username: username.trim() },
        data: { points: newPoints }
    });

    return res.status(200).json({
        success: true,
        message: `User ${username} points set to ${newPoints}`,
        user: { id: user.id, username: user.username, points: user.points }
    });
}
