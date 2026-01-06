import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            return await handleGet(req, res);
        } else if (req.method === 'POST') {
            return await handlePost(req, res);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

async function handleGet(req, res) {
    const { username, action } = req.query;

    // 1. Get Specific User
    if (username) {
        const user = await prisma.user.findUnique({
            where: { username: username.trim() }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                points: user.points,
                createdAt: user.createdAt
            }
        });
    }

    // 2. Get All Users (Leaderboard)
    // Default behavior if no username is provided, or explicit action=all
    const users = await prisma.user.findMany({
        orderBy: {
            points: 'desc'
        },
        select: {
            id: true,
            username: true,
            points: true,
            likes: true,
            createdAt: true
        }
    });

    return res.status(200).json({
        success: true,
        count: users.length,
        users: users
    });
}

async function handlePost(req, res) {
    const { action, username, ...data } = req.body;

    // Handle "create" action specially or map it
    // Logic from create.js
    if (action === 'create' || (!action && username && !data.newUsername)) {
        // Note: Check conditions carefully to distinguish from other updates
        // If action is explicit 'create', use it.
        return await handleCreateUser(req, res);
    }

    if (action === 'delete') {
        return await handleDeleteUser(req, res);
    }

    // Default to update logic
    return await handleUpdate(req, res);
}

// Logic from create.js
async function handleCreateUser(req, res) {
    const { username } = req.body;

    if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }

    const cleanUsername = username.trim();

    // Validation
    if (cleanUsername.length < 2 || cleanUsername.length > 20) {
        return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون بين 2-20 حرف' });
    }

    const validPattern = /^[\u0600-\u06FFa-zA-Z0-9\s]+$/;
    if (!validPattern.test(cleanUsername)) {
        return res.status(400).json({ error: 'اسم المستخدم يحتوي على أحرف غير مسموحة' });
    }

    try {
        let user = await prisma.user.findUnique({
            where: { username: cleanUsername }
        });

        if (user) {
            if (cleanUsername === 'جورج عادل') {
                return res.status(200).json({
                    success: true,
                    user: { id: user.id, username: user.username, points: user.points },
                    message: 'تم تسجيل الدخول بنجاح'
                });
            }
            return res.status(409).json({ error: 'اسم المستخدم موجود مسبقاً، اختر اسماً آخر', exists: true });
        }

        user = await prisma.user.create({
            data: { username: cleanUsername, points: 0 }
        });

        try {
            const { notifyUserStatus } = await import('./utils/telegram-utils.js');
            await notifyUserStatus(cleanUsername, 'new_user');
        } catch (e) { console.error('Telegram error:', e); }

        return res.status(200).json({
            success: true,
            user: { id: user.id, username: user.username, points: user.points }
        });
    } catch (error) {
        throw error;
    }
}

// Logic from delete.js
async function handleDeleteUser(req, res) {
    const { username } = req.body;
    if (!username || username.trim().length === 0) return res.status(400).json({ error: 'اسم المستخدم مطلوب' });

    const cleanUsername = username.trim();

    try {
        const deletedUser = await prisma.user.delete({
            where: { username: cleanUsername }
        });

        return res.status(200).json({
            success: true,
            message: `تم حذف المستخدم "${cleanUsername}" بنجاح`,
            deletedUser: { id: deletedUser.id, username: deletedUser.username, points: deletedUser.points }
        });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'المستخدم غير موجود', username: cleanUsername });
        throw error;
    }
}

// Logic from update.js
async function handleUpdate(req, res) {
    const { action, ...data } = req.body;

    if (!action) return res.status(400).json({ error: 'Action is required' });

    switch (action) {
        case 'update-activity': return await handleUpdateActivity(data, res);
        case 'update-username': return await handleUpdateUsername(data, res);
        case 'update-points': return await handleUpdatePoints(data, res);
        case 'set-points': return await handleSetPoints(data, res);
        case 'toggle-like': return await handleToggleLike(data, res);
        default: return res.status(400).json({ error: 'Invalid action' });
    }
}

async function handleToggleLike({ targetUsername }, res) {
    if (!targetUsername) return res.status(400).json({ error: 'Missing targetUsername' });
    try {
        const user = await prisma.user.update({
            where: { username: targetUsername },
            data: { likes: { increment: 1 } }
        });
        return res.status(200).json({ success: true, likes: user.likes });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'User not found' });
        throw error;
    }
}

async function handleUpdateActivity({ username }, res) {
    try {
        const { notifyUserStatus } = await import('./utils/telegram-utils.js');
        await notifyUserStatus(username, 'online');
    } catch (e) { console.error('Activity notify error:', e); }

    return res.status(200).json({
        success: true,
        message: 'Activity notification sent (Stateless)',
        user: { username, totalTimeSpent: 0, lastActiveAt: new Date() }
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

    try {
        const { notifyUserStatus } = await import('./utils/telegram-utils.js');
        await notifyUserStatus(cleanNew, 'name_change', { oldName: cleanCurrent, newName: cleanNew });
    } catch (e) { }

    return res.status(200).json({
        success: true,
        message: 'تم تحديث الاسم بنجاح',
        user: { id: updatedUser.id, username: updatedUser.username, points: updatedUser.points }
    });
}

async function handleUpdatePoints({ username, pointsToAdd }, res) {
    if (!username || pointsToAdd === undefined) return res.status(400).json({ error: 'Missing required fields' });

    try {
        const user = await prisma.user.update({
            where: { username: username.trim() },
            data: { points: { increment: pointsToAdd } }
        });
        return res.status(200).json({ success: true, user: { id: user.id, username: user.username, points: user.points } });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'المستخدم غير موجود' });
        throw error;
    }
}

async function handleSetPoints({ username, newPoints }, res) {
    if (!username || newPoints === undefined) return res.status(400).json({ error: 'Missing required fields' });

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
