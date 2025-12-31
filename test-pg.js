
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://1eee7fc3d06ad06c357ab33444d89c7a93f0b12fdd7b7d6455b5f2965887f4f5:sk_Xb74pyMeoSiycrbqOWbIC@db.prisma.io:5432/postgres?sslmode=require';

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function main() {
    try {
        console.log('Connecting with pg...');
        await client.connect();
        console.log('✅ Connected successfully with pg!');

        const res = await client.query('SELECT NOW()');
        console.log('Time from DB:', res.rows[0]);

    } catch (err) {
        console.error('❌ pg connection error:', err);
    } finally {
        await client.end();
    }
}

main();
