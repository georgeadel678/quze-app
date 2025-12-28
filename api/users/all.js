import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // جلب كل المستخدمين مرتبين حسب النقاط
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
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            error: 'حدث خطأ في الخادم',
            details: error.message
        });
    }
}
