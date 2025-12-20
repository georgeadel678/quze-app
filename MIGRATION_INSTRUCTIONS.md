# تعليمات تطبيق نظام تتبع الوقت

## الخطوات المطلوبة:

### 1. تحديث قاعدة البيانات

بعد تحديث `schema.prisma`، تحتاج لتطبيق التغييرات:

```bash
# في بيئة التطوير المحلي
npx prisma migrate dev --name add_time_tracking

# أو في Vercel (بعد النشر)
npx prisma migrate deploy
```

### 2. إعداد Environment Variables في Vercel

اذهب إلى Vercel Dashboard → Project Settings → Environment Variables وأضف:

```
CRON_SECRET=your-secret-key-here
```

(اختياري - لحماية cron endpoint من الاستخدام غير المصرح به)

### 3. تفعيل Cron Jobs في Vercel

- Cron jobs تم إعدادها تلقائياً في `vercel.json`
- ستعمل تلقائياً كل 12 ساعة بعد النشر
- يمكنك التحقق من Cron Jobs في Vercel Dashboard → Settings → Cron Jobs

### 4. اختبار النظام

#### اختبار تتبع الوقت:
1. افتح الموقع
2. سجل دخول كمستخدم
3. انتظر 30 ثانية على الأقل
4. تحقق من console في المتصفح - يجب أن ترى رسالة "✅ تم تحديث نشاط المستخدم"

#### اختبار التقرير:
يمكنك استدعاء endpoint يدوياً للاختبار:

```bash
curl -X GET https://your-domain.vercel.app/api/cron/send-activity-report \
  -H "Authorization: Bearer your-cron-secret"
```

أو في Vercel Dashboard → Functions → Cron → Test

### 5. التحقق من إرسال التقرير

- التقرير يُرسل تلقائياً كل 12 ساعة على تيليجرام
- يمكنك التحقق من سجل Cron Jobs في Vercel Dashboard
- تأكد من أن bot token و chat ID صحيحين في `send-activity-report.js`

## ملاحظات مهمة:

1. **تتبع الوقت**: يعمل فقط عندما تكون الصفحة مرئية (visible)
2. **الجلسات**: إذا غادر المستخدم لأكثر من 5 دقائق، تعتبر جلسة جديدة
3. **التقرير**: يُرسل كل 12 ساعة تلقائياً (في الساعة 00:00 و 12:00 حسب UTC)
4. **الأمان**: يمكنك إضافة `CRON_SECRET` لحماية endpoint من الاستخدام غير المصرح به

### 6. إعداد Telegram Webhook (للحصول على تقرير فوري)

بعد نشر المشروع على Vercel، ستحصل على URL مثل: `https://your-project.vercel.app`

قم بإعداد webhook في تيليجرام:

```bash
# استبدل YOUR_BOT_TOKEN و YOUR_WEBHOOK_URL
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-project.vercel.app/api/telegram/webhook"}'
```

أو استخدم هذا الرابط مباشرة (استبدل القيم):
```
https://api.telegram.org/bot5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo/setWebhook?url=https://your-project.vercel.app/api/telegram/webhook
```

**ملاحظة:** تأكد من استبدال `your-project.vercel.app` بـ URL المشروع الفعلي.

#### استخدام البوت:
بعد إعداد webhook، يمكنك:
- إرسال أي رسالة للبوت → ستحصل على تقرير آخر 12 ساعة
- إرسال `/report` → تقرير آخر 12 ساعة
- إرسال `/report 24` → تقرير آخر 24 ساعة
- إرسال `/report 6` → تقرير آخر 6 ساعات
- إرسال `/help` → عرض الأوامر المتاحة

## استكشاف الأخطاء:

### التقرير لا يُرسل:
- تحقق من Cron Jobs في Vercel Dashboard
- تأكد من أن bot token و chat ID صحيحين
- تحقق من logs في Vercel Dashboard

### Webhook لا يعمل:
- تحقق من أن webhook تم إعداده بشكل صحيح
- تأكد من أن URL صحيح ويمكن الوصول إليه
- تحقق من logs في Vercel Dashboard
- جرب إرسال `/start` للبوت للتحقق من الاتصال

### الوقت لا يُتتبع:
- افتح Developer Console وتحقق من الأخطاء
- تأكد من أن المستخدم مسجل دخول
- تحقق من network requests في Developer Tools

### قاعدة البيانات لا تتحدث:
- تأكد من تطبيق migrations
- تحقق من `DATABASE_URL` في Environment Variables
- راجع logs في Vercel Dashboard

