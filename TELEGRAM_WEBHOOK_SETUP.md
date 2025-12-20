# إعداد Telegram Webhook للحصول على تقرير فوري

## الخطوات:

### 1. احصل على URL المشروع من Vercel

بعد نشر المشروع، ستحصل على URL مثل:
```
https://your-project-name.vercel.app
```

### 2. إعداد Webhook

استخدم أحد الطرق التالية:

#### الطريقة الأولى: عبر المتصفح
افتح هذا الرابط (استبدل `YOUR_PROJECT_URL`):
```
https://api.telegram.org/bot5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo/setWebhook?url=https://YOUR_PROJECT_URL/api/telegram/webhook
```

#### الطريقة الثانية: عبر Terminal
```bash
curl -X POST "https://api.telegram.org/bot5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_PROJECT_URL/api/telegram/webhook"}'
```

### 3. التحقق من إعداد Webhook

افتح هذا الرابط للتحقق:
```
https://api.telegram.org/bot5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo/getWebhookInfo
```

يجب أن ترى `url` يحتوي على رابط المشروع.

### 4. اختبار البوت

أرسل أي رسالة للبوت على تيليجرام، يجب أن تحصل على:
- رسالة ترحيب إذا أرسلت `/start` أو `/help`
- تقرير فوري إذا أرسلت أي رسالة أخرى

## الأوامر المتاحة:

- `/start` أو `/help` - عرض الأوامر المتاحة
- `/report` - تقرير آخر 12 ساعة
- `/report 24` - تقرير آخر 24 ساعة
- `/report 6` - تقرير آخر 6 ساعات
- أي رسالة أخرى - تقرير آخر 12 ساعة

## ملاحظات:

- ✅ فقط المستخدم المصرح به (Chat ID: 1350722553) يمكنه الحصول على التقارير
- ✅ يمكنك طلب تقرير في أي وقت بدون انتظار 12 ساعة
- ✅ التقرير التلقائي كل 12 ساعة سيستمر في العمل أيضاً

## إلغاء Webhook (إذا أردت):

```bash
curl -X POST "https://api.telegram.org/bot5789183030:AAElmk-M-SL2BtV4UFXp5A_yslcTG3Q4cxo/deleteWebhook"
```

