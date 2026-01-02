
import { sendTelegramMessage } from '../utils/telegram-utils.js';

// Configuration for handling file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

const TELEGRAM_TOKEN = '5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo';
const TELEGRAM_CHAT_ID = '1350722553';

// Helper function to parse multipart form data
async function parseForm(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);

                // Check if this is multipart/form-data
                const contentType = req.headers['content-type'] || '';
                if (contentType.includes('multipart/form-data')) {
                    const boundary = contentType.split('boundary=')[1];
                    const parts = buffer.toString('binary').split(`--${boundary}`);

                    for (const part of parts) {
                        if (part.includes('filename=')) {
                            const filenameMatch = part.match(/filename="([^"]+)"/);
                            const filename = filenameMatch ? filenameMatch[1] : 'file';

                            // Extract file content
                            const contentStart = part.indexOf('\r\n\r\n') + 4;
                            const contentEnd = part.lastIndexOf('\r\n');
                            const fileContent = part.substring(contentStart, contentEnd);

                            resolve({
                                type: 'file',
                                filename,
                                content: Buffer.from(fileContent, 'binary')
                            });
                            return;
                        }
                    }
                }

                // If not a file upload, parse as JSON
                const body = JSON.parse(buffer.toString());
                resolve({ type: 'json', body });

            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

// Send file to Telegram
async function sendFileToTelegram(fileBuffer, filename, username) {
    const FormData = require('form-data');
    const form = new FormData();

    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('document', fileBuffer, {
        filename: filename,
        contentType: 'application/octet-stream'
    });

    const caption = `📤 ملف جديد من المستخدم: ${username}\n📄 اسم الملف: ${filename}`;
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
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
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
        const parsed = await parseForm(req);

        // Handle file upload
        if (parsed.type === 'file') {
            const { filename, content } = parsed;

            // Validate file extension
            if (!filename.toLowerCase().endsWith('.bdf')) {
                return res.status(400).json({
                    error: 'نوع الملف غير صحيح. يرجى رفع ملفات BDF فقط.'
                });
            }

            // Validate file size (max 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (content.length > maxSize) {
                return res.status(400).json({
                    error: 'حجم الملف كبير جداً. الحد الأقصى 50MB.'
                });
            }

            // Get username from request
            const username = req.headers['x-username'] || 'مستخدم غير معروف';

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
            error: 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.'
        });
    }
}
