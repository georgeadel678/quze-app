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
        const prompt = `أنت مدقق أكاديمي متخصص في تقييم الإجابات المقالية بناءً على إجابة نموذجية محددة.
المهمة: تقييم إجابة الطالب مقارنة بالإجابة النموذجية المعطاة.

قواعد التقييم الصارمة (بالترتيب):
1. [الصفر المطلق]: إذا كانت الإجابة فارغة، أو علامات ترقيم (مثل ...)، أو كلاماً تافهاً/عشوائياً، النتيجة "0/10" والحالة "incorrect".
2. [الدرجة الكاملة للجوهـر]: إذا كانت إجابة الطالب تغطي "جوهر" أو "لب" الإجابة النموذجية بشكل صحيح، امنحه "10/10" والحالة "correct" فوراً، حتى لو كانت صياغته مختصرة جداً. لا تطلب منه توسعة إذا أصاب المعنى.
3. [التقييم الجزئي]: إذا كانت الإجابة صحيحة في جزء منها ولكن ينقصها نقاط جوهرية مذكورة في الإجابة النموذجية:
    - النتيجة: من (1/10) إلى (9/10) حسب كمية المعلومات الصحيحة.
    - الحالة: "partial".
    - الملاحظات (Feedback): يجب أن تشرح للطالب بوضوح "النص الناقص" الذي لم يذكره، ثم ألحق له "الإجابة النموذجية" كاملةً ليتعلم منها.
4. [التغاضي]: لا تحاسب على الأخطاء الإملائية أو التعبيرية ما دام المعنى وصل.

السؤال: ${question}

الإجابة النموذجية:
${modelAnswer}

إجابة الطالب:
${userAnswer}

أعطِ ردك بصيغة JSON فقط:
{
  "score": رقم من 0 إلى 10,
  "status": "correct" أو "partial" أو "incorrect",
  "feedback": "ملاحظاتك التفصيلية هنا (اذكر الناقص واعرض الإجابة النموذجية عند الضرورة)"
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
            temperature: 0.1, // توازن بين الدقة وعدم التخيل
            max_tokens: 1024,
            top_p: 1,
            stream: false
        });

        const responseText = chatCompletion.choices[0]?.message?.content || '';
        console.log('Groq Response:', responseText);

        // محاولة استخراج JSON
        let cleanJson = responseText.trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('Failed to find JSON in response:', responseText);
            throw new Error('AI response did not contain a valid JSON object');
        }

        cleanJson = jsonMatch[0];
        let result;
        try {
            result = JSON.parse(cleanJson);
        } catch (e) {
            console.error('JSON Parse Error:', e, 'Content:', cleanJson);
            throw new Error('Failed to parse AI response as JSON');
        }

        // التحقق من صحة البيانات
        if (typeof result.score !== 'number' || !result.status || !result.feedback) {
            console.error('Invalid Data Structure:', result);
            throw new Error('AI response is missing required fields (score, status, or feedback)');
        }

        return res.status(200).json({
            score: Math.min(10, Math.max(0, result.score)),
            status: result.status,
            feedback: result.feedback
        });

    } catch (error) {
        console.error('Evaluation Logic Error:', error);
        return res.status(500).json({
            error: error.message || 'Failed to evaluate answer',
            details: error.stack
        });
    }
}
