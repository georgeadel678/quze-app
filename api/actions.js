import FormData from 'form-data';
import Busboy from 'busboy';

// Configuration for handling file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

const TELEGRAM_TOKEN = '5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo';
const TELEGRAM_CHAT_ID = '1350722553';

// Helper function to parse multipart form data using busboy
async function parseFormData(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || req.headers['Content-Type'];

        // Check if this is JSON
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

        // Check if this is multipart/form-data
        if (!contentType || !contentType.includes('multipart/form-data')) {
            reject(new Error('Unsupported content type'));
            return;
        }

        const busboy = Busboy({ headers: req.headers });
        let fileData = null;

        busboy.on('file', (fieldname, file, info) => {
            const { filename, encoding, mimeType } = info;
            const chunks = [];

            file.on('data', (data) => {
                chunks.push(data);
            });

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
            if (fileData) {
                resolve(fileData);
            } else {
                reject(new Error('No file found in request'));
            }
        });

        busboy.on('error', reject);

        req.pipe(busboy);
    });
}

// Send file to Telegram
async function sendFileToTelegram(fileBuffer, filename, username) {
    const form = new FormData();

    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty');
    }

    // Sanitize filename for the FormData to avoid header encoding issues
    // We still preserve the original filename in the caption
    const ext = filename.split('.').pop().toLowerCase() || 'dat';
    const safeFilename = `file_${Date.now()}.${ext}`;

    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('document', fileBuffer, {
        filename: safeFilename,
        contentType: 'application/octet-stream',
        knownLength: fileBuffer.length
    });

    const caption = `📤 ملف جديد من المستخدم: ${username}\n📄 اسم الملف الأصلي: ${filename}\n📊 الحجم: ${(fileBuffer.length / 1024).toFixed(2)} KB`;
    form.append('caption', caption);

    const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`,
        {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        const errorJson = JSON.parse(errorText);
        throw new Error(`Telegram API error: ${response.status} ${response.statusText} - ${errorJson.description || errorText}`);
    }

    return await response.json();
}

// Main handler for both feedback and file upload
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Username');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const parsed = await parseFormData(req);

        // Handle file upload
        if (parsed.type === 'file') {
            const { filename, content } = parsed;

            // Validate file extension
            if (!filename.toLowerCase().endsWith('.bdf') && !filename.toLowerCase().endsWith('.pdf')) {
                return res.status(400).json({
                    error: 'نوع الملف غير صحيح. يرجى رفع ملفات PDF أو BDF فقط.'
                });
            }

            // Validate file size (max 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (content.length > maxSize) {
                return res.status(400).json({
                    error: 'حجم الملف كبير جداً. الحد الأقصى 50MB.'
                });
            }

            // Get username from request and decode it
            const rawUsername = req.headers['x-username'] || '';
            const username = rawUsername ? decodeURIComponent(rawUsername) : 'مستخدم غير معروف';

            // Send file to Telegram
            await sendFileToTelegram(content, filename, username);

            return res.status(200).json({
                success: true,
                message: 'تم رفع الملف بنجاح وإرساله على التليجرام! ✅'
            });
        }

        // Handle feedback message
        if (parsed.type === 'json') {
            const { username, message, type } = parsed.body;

            if (!message || !username) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Format the message for Telegram
            const telegramMessage = `
📩 <b>رسالة جديدة من المستخدم</b>
👤 <b>الاسم:</b> ${username}
🏷️ <b>النوع:</b> ${type || 'عام'}
📝 <b>الرسالة:</b>
${message}
            `.trim();

            // Send to Telegram
            await sendTelegramMessage(null, telegramMessage);

            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid request format' });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({
            error: 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.',
            details: error.message
        });
    }
}
