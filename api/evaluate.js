// Serverless Function for Groq API
import Groq from 'groq-sdk';

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

    const { question, modelAnswer, userAnswer } = req.body;

    // التحقق من المفتاح
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'API key not configured. Please set GROQ_API_KEY in environment variables.'
        });
    }

    // التحقق من الإدخال
    if (!question || !modelAnswer || !userAnswer) {
        return res.status(400).json({
            error: 'Missing required fields: question, modelAnswer, userAnswer'
        });
    }

    try {
        // إعداد Groq client
        const groq = new Groq({ apiKey: apiKey });

        // بناء الـ Prompt
         const prompt = `أنت مدقق أكاديمي متخصص في تقييم الإجابات المقالية.
المهمة: تقييم إجابة الطالب مقارنة بالإجابة النموذجية.

القواعد الصارمة للتقييم:
1. إذا كانت إجابة الطالب "قريبة في المضمون والمعنى" للإجابة النموذجية، حتى لو اختلفت الصياغة، يجب منح الدرجة الكاملة (10/10).
2. لا تخصم درجات بسبب الأخطاء الإملائية البسيطة أو التعبير المختلف طالما الفكرة صحيحة.
3. التقييم "correct" يُمنح لأي إجابة تغطي الفكرة الرئيسية بشكل صحيح.
4. التقييم "partial" فقط للإجابات التي تفتقر لجزء جوهري من المعلومة.
5. التقييم "incorrect" للإجابات الخاطئة تماماً.
 اي نوع من الاجابه حتي لو كانت صحيحه ايضا اظهر الاجابه النموذجيه في كل الاحول
السؤال: ${question}

الإجابة النموذجية:
${modelAnswer}

إجابة الطالب:
${userAnswer}

أعطِ ردك بصيغة JSON فقط (بدون أي نص إضافي) بالشكل التالي:
{
  "score": رقم من 0 إلى 10,
  "status": "correct" أو "partial" أو "incorrect",
  "feedback": "ملاحظاتك وتوجيهاتك هنا"
}`;

        // استدعاء Groq API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful academic evaluator. Always respond in valid JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 1,
            stream: false
        });

        const responseText = chatCompletion.choices[0]?.message?.content || '';

        // محاولة استخراج JSON
        let cleanJson = responseText.trim();

        // إزالة أي نص قبل/بعد JSON إذا وجد
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanJson = jsonMatch[0];
        }

        const result = JSON.parse(cleanJson);

        // التحقق من صحة البيانات
        if (typeof result.score !== 'number' || !result.status || !result.feedback) {
            throw new Error('Invalid AI response format');
        }

        return res.status(200).json({
            score: Math.min(10, Math.max(0, result.score)),
            status: result.status,
            feedback: result.feedback
        });

    } catch (error) {
        console.error('Groq API Error:', error);
        return res.status(500).json({
            error: 'Failed to evaluate answer',
            details: error.message
        });
    }
}
