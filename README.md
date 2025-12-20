# بنية نظام الاختبارات الذكي

## الملفات الأساسية
- `index.html` - الصفحة الرئيسية
- `package.json` - Dependencies و scripts
- `vercel.json` - إعدادات Vercel
- `.env` - متغيرات البيئة (لا تُرفع على Git)
- `.env.example` - مثال لمتغيرات البيئة

## المجلدات

### `/prisma`
- `schema.prisma` - مخطط قاعدة البيانات

### `/assets`
- `/css` - ملفات الستايلات
- `/js` - ملفات JavaScript
- `/data/questions` - ملفات الأسئلة

### `/api`
- `/users` - API endpoints للمستخدمين
  - `create.js` - إنشاء مستخدم جديد
  - `update-points.js` - تحديث النقاط
  - `update-username.js` - تحديث اسم المستخدم
  - `update-activity.js` - تحديث نشاط المستخدم (تتبع الوقت)
  - `[username].js` - جلب بيانات مستخدم
  - `all.js` - جلب جميع المستخدمين
- `/cron` - Scheduled functions
  - `send-activity-report.js` - إرسال تقرير النشاط كل 12 ساعة
- `evaluate.js` - تصحيح الأسئلة المقالية بـ AI

## النشر على Vercel

### 1. إعداد قاعدة البيانات
```bash
# في Vercel Dashboard:
# Storage -> Create Database -> Postgres
# سيتم إنشاء DATABASE_URL تلقائياً
```

### 2. ضبط Environment Variables
```
DATABASE_URL=<من Vercel Postgres>
DIRECT_URL=<من Vercel Postgres>
GROQ_API_KEY=<مفتاح Groq API>
CRON_SECRET=<مفتاح سري لحماية cron jobs (اختياري)>
```

### 3. Deploy
```bash
git push origin main
# أو استخدم Vercel Dashboard
```

## التطوير المحلي

### 1. تثبيت Dependencies
```bash
npm install
```

### 2. إعداد قاعدة البيانات
```bash
# تعديل .env بمعلومات قاعدة البيانات
npx prisma migrate dev
npx prisma generate
```

### 3. تشغيل الخادم
```bash
npm run dev
```

## API Endpoints

### POST /api/users/create
إنشاء أو جلب مستخدم

Request:
```json
{
  "username": "أحمد"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "أحمد",
    "points": 0
  }
}
```

### POST /api/users/update-points
تحديث نقاط المستخدم

Request:
```json
{
  "username": "أحمد",
  "pointsToAdd": 10
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "أحمد",
    "points": 10
  }
}
```

### GET /api/users/[username]
جلب بيانات مستخدم

Response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "أحمد",
    "points": 10,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/users/update-activity
تحديث نشاط المستخدم (تتبع الوقت)

Request:
```json
{
  "username": "أحمد",
  "timeSpent": 30
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "أحمد",
    "totalTimeSpent": 120,
    "lastActiveAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## نظام تتبع الوقت

### الميزات:
- ✅ تتبع الوقت الذي يقضيه كل مستخدم على الموقع
- ✅ تحديث تلقائي كل 30 ثانية
- ✅ إرسال تقرير تيليجرام كل 12 ساعة تلقائياً
- ✅ **طلب تقرير فوري عبر تيليجرام في أي وقت**

### إعداد Cron Job:
تم إعداد cron job في `vercel.json` ليعمل كل 12 ساعة تلقائياً.

### إعداد Telegram Webhook (للحصول على تقرير فوري):

بعد نشر المشروع على Vercel، قم بإعداد webhook:

```bash
# استبدل YOUR_PROJECT_URL برابط المشروع الفعلي
curl -X POST "https://api.telegram.org/bot5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_PROJECT_URL/api/telegram/webhook"}'
```

**الأوامر المتاحة في البوت:**
- `/start` أو `/help` - عرض الأوامر
- `/report` - تقرير آخر 12 ساعة
- `/report 24` - تقرير آخر 24 ساعة
- `/report 6` - تقرير آخر 6 ساعات
- أي رسالة أخرى - تقرير آخر 12 ساعة

راجع `TELEGRAM_WEBHOOK_SETUP.md` للتفاصيل الكاملة.

### ملاحظات:
- يتم تتبع الوقت فقط عندما تكون الصفحة مرئية (visible)
- إذا غادر المستخدم الصفحة لأكثر من 5 دقائق، تعتبر جلسة جديدة
- التقرير يُرسل تلقائياً على تيليجرام كل 12 ساعة
- يمكنك طلب تقرير فوري في أي وقت عبر إرسال رسالة للبوت
