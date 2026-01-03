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
        const prompt = `أنت مدقق أكاديمي متخصص في تقييم الإجابات المقالية بطريقة ذكية ومتوازنة.
المهمة: تقييم إجابة الطالب مقارنة بالإجابة النموذجية، مع التركيز على الفهم والجوهر وليس الحفظ الحرفي.

⚠️ **قبل أي شيء - فحص الصحة الأساسية:**
- إذا كانت الإجابة كلمة واحدة أو كلمتين فقط بدون سياق منطقي → 0/10 (incorrect)
- إذا كانت الإجابة حروف عشوائية أو كلام غير مفهوم → 0/10 (incorrect)
- إذا كانت الإجابة لا علاقة لها بالسؤال نهائياً → 0/10 (incorrect)
- إذا كانت الإجابة علامات ترقيم أو رموز فقط → 0/10 (incorrect)

⚖️ **بعد التأكد من أن الإجابة منطقية ومتعلقة بالسؤال، طبق المعايير التالية:**

1. 🎯 [الفهم الجوهري - الأولوية القصوى]:
   - إذا أظهر الطالب فهماً صحيحاً للمفهوم الأساسي بجملة كاملة منطقية → امنحه درجة عالية (8-10).
   - الصياغة المختلفة ليست خطأ طالما المعنى صحيح والإجابة مكتملة.
   - التبسيط أو الشرح بأسلوب مختلف يُقبل إذا كان المحتوى سليماً ومنطقياً.

2. 📊 [التقييم الجزئي السخي]:
   - إذا ذكر الطالب النقطة الرئيسية بجملة كاملة أو أكثر من نصف المحتوى → 6-9 نقاط.
   - إذا كانت الإجابة تحتوي على معلومات صحيحة ومنطقية لكن ناقصة → 4-7 نقاط.
   - المعلومات الصحيحة تُحتسب فقط إذا كانت مكتوبة بشكل واضح ومنطقي.

3. ✅ [الدرجة الكاملة]:
   - امنح 10/10 إذا غطى الطالب الفكرة الأساسية والنقاط الرئيسية بإجابة متماسكة.
   - لا تطلب التوسع إذا كانت الإجابة وافية ومنطقية.
   - التفاصيل الإضافية مستحسنة لكن ليست إلزامية.

4. ❌ [الدرجات المنخفضة]:
   - 0-1 نقطة: إجابة فارغة، عشوائية، غير مفهومة، أو كلمة واحدة بلا معنى.
   - 2-3 نقاط: إجابة خاطئة تماماً أو غير متعلقة بالسؤال.
   - 4-5 نقاط: إجابة منطقية لكن تحتوي معلومات صحيحة قليلة جداً.
   
5. 🔍 [التسامح - فقط مع الإجابات المنطقية]:
   - تجاهل الأخطاء الإملائية والنحوية الطفيفة.
   - لا تحاسب على ترتيب النقاط إذا كانت كلها صحيحة.
   - قبول الأمثلة البديلة المنطقية.
   - التركيز على الفهم وليس التطابق النصي.

6. 💬 [الملاحظات]:
   - للإجابات العشوائية/الفارغة: "الإجابة غير كافية أو غير متعلقة بالسؤال."
   - للإجابات الجزئية: اذكر الإيجابيات أولاً ثم الناقص.
   - استخدم لغة تشجيعية مع الإجابات الجادة.

السؤال: ${question}

الإجابة النموذجية (للمقارنة - ليست مطلوبة حرفياً):
${modelAnswer}

إجابة الطالب:
${userAnswer}

أعطِ ردك بصيغة JSON فقط واستخدم اللغة العربية الفصيحة في الملاحظات:
{
  "score": عدد فقط من 0 إلى 10 (مثال: 9 وليس 9/10),
  "status": "correct" أو "partial" أو "incorrect",
  "feedback": "ملاحظاتك البناءة هنا"
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
