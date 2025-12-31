
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgres://1eee7fc3d06ad06c357ab33444d89c7a93f0b12fdd7b7d6455b5f2965887f4f5:sk_Xb74pyMeoSiycrbqOWbIC@db.prisma.io:5432/postgres?sslmode=require',
        },
    },
});

async function main() {
    try {
        console.log('Attempting to connect to database...');
        await prisma.$connect();
        console.log('✅ Connection successful!');

        // Try a simple query
        const userCount = await prisma.user.count();
        console.log(`✅ Database query successful! Found ${userCount} users.`);

    } catch (error) {
        console.error('❌ Connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
