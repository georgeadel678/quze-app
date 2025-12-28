
import { sendTelegramMessage } from '../utils/telegram-utils.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, message, type } = request.body;

        if (!message || !username) {
            return response.status(400).json({ error: 'Missing required fields' });
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

        return response.status(200).json({ success: true });
    } catch (error) {
        console.error('Feedback error:', error);
        return response.status(500).json({ error: 'Internal server error' });
    }
}
