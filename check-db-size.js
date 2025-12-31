
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
        console.log('Attempting to check database size...');
        // محاولة تنفيذ استعلام SQL مباشر لمعرفة حجم قاعدة البيانات
        const result = await prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) as size;`;
        console.log('✅ Database size:', result);

    } catch (error) {
        console.error('❌ Failed to check size. Reason:');
        console.error(error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
