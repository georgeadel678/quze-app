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
        const prompt = `أنت مدقق أكاديمي صارم في تقييم الإجابات المقالية.

🚨 **قواعد الرفض الفوري - طبقها بصرامة شديدة:**

التالي يحصل على 0/10 فوراً - لا استثناءات:
1. إجابة من كلمة واحدة فقط (مثل: "بلل"، "يبلل"، "الكاميرا")
2. إجابة من كلمتين فقط بدون جملة كاملة (مثل: "البكسل عالي"، "دقة الشاشة")
3. حروف عشوائية (مثل: "asdfgh"، "بلبلبل")
4. علامات ترقيم فقط (مثل: "..."، "؟؟؟")
5. لا علاقة للإجابة بالسؤال نهائياً
6. إجابة غير واضحة أو غير مفهومة

✅ **الحد الأدنى للإجابة المقبولة:**
- جملة كاملة واحدة على الأقل (فعل + فاعل + معنى واضح)
- متعلقة بالسؤال مباشرة
- تحتوي على محاولة حقيقية للإجابة

⚖️ **بعد التأكد من أن الإجابة جملة كاملة ومنطقية:**

**8-10 نقاط:** إجابة تظهر فهماً صحيحاً للمفهوم الأساسي بجملة أو أكثر
- مثال: "دقة الشاشة هي عدد البكسلات اللي بتعرض الصورة"

**6-7 نقاط:** إجابة صحيحة لكن ناقصة بعض التفاصيل
- مثال: "دقة الشاشة تعتمد على البكسلات" (ناقص التفاصيل)

**4-5 نقاط:** إجابة فيها معلومة صحيحة لكن قليلة جداً أو غامضة
- مثال: "لها علاقة بوضوح الشاشة" (صحيح لكن عام جداً)

**2-3 نقاط:** إجابة خاطئة لكن واضح أنها محاولة جادة
- مثال: "دقة الشاشة هي حجم الشاشة بالسنتيمتر" (خطأ لكن محاولة)

**0-1 نقطة:** كل ما سبق في قواعد الرفض الفوري
- أمثلة: "بلل"، "يبلل"، "اللون"، "..."

� **التسامح (فقط مع الإجابات الكاملة):**
- تجاهل الأخطاء الإملائية
- قبول الصياغات المختلفة إذا كانت جملة كاملة

السؤال: ${question}

الإجابة النموذجية:
${modelAnswer}

إجابة الطالب:
${userAnswer}

**تحليلك:**
1. هل الإجابة كلمة واحدة أو كلمتين فقط؟ إذا نعم → 0/10 فوراً
2. هل الإجابة جملة كاملة؟ إذا لا → 0/10
3. هل لها علاقة بالسؤال؟ إذا لا → 0/10
4. إذا اجتازت الفحوصات، قيّم حسب الفهم

أعطِ ردك بصيغة JSON:
{
  "score": رقم من 0 إلى 10,
  "status": "correct" أو "partial" أو "incorrect",
  "feedback": "ملاحظتك"
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
            throw new Error(`AI response did not contain a valid JSON object. Raw: ${responseText.substring(0, 200)}`);
        }

        cleanJson = jsonMatch[0];

        // معالجة الأخطاء الشائعة في JSON من قبل AI (مثل 9/10 بدون كوتس)
        cleanJson = cleanJson.replace(/:\s*(\d+)\/10/g, ': $1'); // تحويل 9/10 إلى 9

        let result;
        try {
            result = JSON.parse(cleanJson);
        } catch (e) {
            console.error('JSON Parse Error:', e, 'Content:', cleanJson);
            throw new Error(`Failed to parse AI response as JSON. Raw: ${responseText.substring(0, 200)}`);
        }

        // التحقق من صحة البيانات
        if (typeof result.score === 'undefined' || !result.status || typeof result.feedback !== 'string') {
            console.error('Invalid Data Structure:', result);
            throw new Error('AI response is missing required fields (score, status, or feedback)');
        }

        // تحويل الدرجة لرقم إذا جاءت كـ string
        let numericScore = Number(result.score);
        if (isNaN(numericScore)) numericScore = 0;

        return res.status(200).json({
            score: Math.min(10, Math.max(0, numericScore)),
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
