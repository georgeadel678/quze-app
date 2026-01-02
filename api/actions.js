import Busboy from 'busboy';
import { sendTelegramMessage } from '../utils/telegram-utils.js';

// Vercel config
export const config = {
    api: {
        bodyParser: false,
    },
};

const TELEGRAM_TOKEN = '5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo';
const TELEGRAM_CHAT_ID = '1350722553';

async function parseFormData(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || req.headers['Content-Type'];

        if (contentType && contentType.includes('application/json')) {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => {
                try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    resolve({ type: 'json', body });
                } catch (error) {
                    reject(error);
                }
            });
            req.on('error', reject);
            return;
        }

        if (!contentType || !contentType.includes('multipart/form-data')) {
            reject(new Error('Unsupported content type'));
            return;
        }

        const busboy = Busboy({ headers: req.headers });
        let fileData = null;

        busboy.on('file', (fieldname, file, info) => {
            const { filename, encoding, mimeType } = info;
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                fileData = {
                    type: 'file',
                    filename: filename,
                    content: Buffer.concat(chunks),
                    encoding: encoding,
                    mimeType: mimeType
                };
            });
        });

        busboy.on('finish', () => {
            if (fileData) resolve(fileData);
            else reject(new Error('No file found in request'));
        });

        busboy.on('error', reject);
        req.pipe(busboy);
    });
}

// Send file using Native FormData and Blob (Node 18+)
async function sendFileToTelegram(fileBuffer, filename, username) {
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty');
    }

    const ext = filename.split('.').pop().toLowerCase() || 'dat';
    const safeFilename = `file_${Date.now()}.${ext}`;

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);

    // Convert Buffer to Blob for FormData
    const fileBlob = new Blob([fileBuffer], { type: 'application/octet-stream' });
    formData.append('document', fileBlob, safeFilename);

    const caption = `📤 ملف جديد من المستخدم: ${username}\n📄 اسم الملف الأصلي: ${filename}\n📊 الحجم: ${(fileBuffer.length / 1024).toFixed(2)} KB`;
    formData.append('caption', caption);

    const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`,
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        let errorDescription = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            errorDescription = errorJson.description || errorText;
        } catch (e) { }
        throw new Error(`Telegram API error: ${response.status} ${response.statusText} - ${errorDescription}`);
    }

    return await response.json();
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Username');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const parsed = await parseFormData(req);

        if (parsed.type === 'file') {
            const { filename, content } = parsed;

            if (!filename.toLowerCase().endsWith('.bdf') && !filename.toLowerCase().endsWith('.pdf')) {
                return res.status(400).json({ error: 'نوع الملف غير صحيح. يرجى رفع ملفات PDF أو BDF فقط.' });
            }

            const rawUsername = req.headers['x-username'] || '';
            const username = rawUsername ? decodeURIComponent(rawUsername) : 'مستخدم غير معروف';

            await sendFileToTelegram(content, filename, username);

            return res.status(200).json({
                success: true,
                message: 'تم رفع الملف بنجاح وإرساله على التليجرام! ✅'
            });
        }

        if (parsed.type === 'json') {
            const { username, message, type } = parsed.body;
            const telegramMessage = `
📩 <b>رسالة جديدة من المستخدم</b>
👤 <b>الاسم:</b> ${username}
🏷️ <b>النوع:</b> ${type || 'عام'}
📝 <b>الرسالة:</b>
${message}
            `.trim();
            await sendTelegramMessage(null, telegramMessage);
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid request format' });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({
            error: 'حدث خطأ أثناء معالجة الطلب.',
            details: error.message
        });
    }
}
