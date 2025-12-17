/* ====================================
   app.js - التطبيق الرئيسي
   ==================================== */

// دالة تقديم اسم المستخدم - يجب أن تكون في النطاق العام
async function submitUsername() {
    const input = document.getElementById('username-input');
    const submitBtn = document.getElementById('submit-username');
    const username = input.value.trim();

    // التحقق من الإدخال
    if (!username) {
        alert('من فضلك أدخل اسمك');
        input.focus();
        return;
    }

    if (username.length < 2) {
        alert('الاسم يجب أن يكون حرفين على الأقل');
        input.focus();
        return;
    }

    if (username.length > 20) {
        alert('الاسم يجب ألا يتجاوز 20 حرف');
        input.focus();
        return;
    }

    // تعطيل الزر أثناء الإرسال
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري التحميل...';

    try {
        // إنشاء/جلب المستخدم
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            const error = await response.json();
            console.log('Server error details:', error);
            throw new Error(error.details || error.error || 'حدث خطأ');
        }

        const data = await response.json();

        // حفظ في localStorage
        Storage.setUsername(data.user.username);
        Storage.set('userId', data.user.id);
        Storage.set('userPoints', data.user.points);

        console.log('تم تسجيل الدخول بنجاح:', data.user);

        // الانتقال للفصول
        UI.showPage('chapters-page');
    } catch (error) {
        console.error('Error creating user:', error);
        alert(error.message || 'حدث خطأ، حاول مرة أخرى');

        // إعادة تفعيل الزر
        submitBtn.disabled = false;
        submitBtn.textContent = 'متابعة';
        input.focus();
    }
}

// دالة تغيير اسم المستخدم
async function changeUsername() {
    const currentUsername = Storage.getUsername();

    if (!currentUsername || currentUsername === 'مستخدم') {
        alert('لم يتم العثور على مستخدم مسجل');
        return;
    }

    const newUsername = prompt(`اسمك الحالي: ${currentUsername}\n\nأدخل الاسم الجديد:`);

    if (!newUsername) {
        return; // المستخدم ألغى العملية
    }

    const cleanNewUsername = newUsername.trim();

    if (cleanNewUsername.length < 2) {
        alert('الاسم يجب أن يكون حرفين على الأقل');
        return;
    }

    if (cleanNewUsername.length > 20) {
        alert('الاسم يجب ألا يتجاوز 20 حرف');
        return;
    }

    if (cleanNewUsername === currentUsername) {
        alert('الاسم الجديد مطابق للاسم الحالي');
        return;
    }

    try {
        const response = await fetch('/api/users/update-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentUsername: currentUsername,
                newUsername: cleanNewUsername
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'حدث خطأ');
        }

        // تحديث localStorage
        Storage.setUsername(data.user.username);
        Storage.set('userId', data.user.id);
        Storage.set('userPoints', data.user.points);

        alert(`✅ تم تحديث الاسم بنجاح!\nالاسم الجديد: ${data.user.username}`);

        // إعادة تحميل الصفحة لتحديث كل شيء
        window.location.reload();
    } catch (error) {
        console.error('Error updating username:', error);
        alert(error.message || 'حدث خطأ، حاول مرة أخرى');
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function () {
    console.log('🎓 تطبيق الاختبارات جاهز!');

    // تفعيل الوضع الداكن إذا كان محفوظاً
    if (Storage.isDarkMode()) {
        document.body.classList.add('dark-mode');
        Storage.updateDarkModeToggle();
    }

    // ✅ تحقق من وجود مستخدم محفوظ في قاعدة البيانات
    const savedUsername = Storage.getUsername();
    if (savedUsername && savedUsername !== 'مستخدم') {
        console.log('🔄 التحقق من صلاحية الجلسة للمستخدم:', savedUsername);

        // ⚡ واجهة متفائلة: عرض الفصول فوراً بناءً على التخزين المحلي
        // هذا يمنع ظهور صفحة الترحيب أثناء انتظار السيرفر
        UI.showPage('chapters-page');

        // التحقق من السيرفر في الخلفية
        fetch(`/api/users/${encodeURIComponent(savedUsername)}`)
            .then(response => {
                if (response.status === 404) {
                    console.warn('⚠️ المستخدم غير موجود في قاعدة البيانات - تسجيل خروج تلقائي');
                    Storage.clear();
                    window.location.reload();
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success) {
                    console.log('✅ الجلسة صالحة ومؤكدة من السيرفر');
                    // لا نحتاج لإعادة توجيه لأننا عرضنا الفصول بالفعل
                }
            })
            .catch(err => {
                console.error('خطأ في التحقق من الجلسة (قد يكون انترنت):', err);
                // السيرفر لا يرد، لكننا سمحنا بالدخول مسبقاً (Offline First)
            });
    }

    // ربط زر الوضع الداكن
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            Storage.toggleDarkMode();
        });
    }

    // ربط نافذة المؤقت
    const startWithTimer = document.getElementById('start-with-timer');
    const startWithoutTimer = document.getElementById('start-without-timer');

    if (startWithTimer) {
        startWithTimer.addEventListener('click', () => {
            Quiz.startQuiz(true);
        });
    }

    if (startWithoutTimer) {
        startWithoutTimer.addEventListener('click', () => {
            Quiz.startQuiz(false);
        });
    }

    // إغلاق النوافذ عند الضغط خارجها
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
            }
        });
    });

    // إضافة تأثيرات الجسيمات
    createParticles();

    // عرض رسالة ترحيب في Console
    console.log(`
    ╔══════════════════════════════════════╗
    ║   مرحباً بك في نظام الاختبارات!     ║
    ║                                      ║
    ║   📚 اختبر معلوماتك في الصوت       ║
    ║   💎 احصل على النقاط والرتب         ║
    ║   🎯 تابع تقدمك وإنجازاتك           ║
    ╚══════════════════════════════════════╝
    `);
});

// إنشاء تأثير الجسيمات
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 12 + 's';
        particle.style.animationDuration = (Math.random() * 8 + 8) + 's';
        particlesContainer.appendChild(particle);
    }
}

// معالجة الأخطاء العامة
window.addEventListener('error', function (e) {
    console.error('حدث خطأ:', e.message);
});

// منع فقدان التقدم عند إعادة التحميل
window.addEventListener('beforeunload', function (e) {
    if (Quiz.currentQuestions.length > 0 && Quiz.currentQuestionIndex > 0) {
        e.preventDefault();
        e.returnValue = '';
        return 'لديك اختبار قيد التقدم. هل أنت متأكد من المغادرة؟';
    }
});

// إضافة مستمع لزر Enter في حقل الاسم
document.addEventListener('DOMContentLoaded', function () {
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                submitUsername();
            }
        });

        // التركيز التلقائي عند عرض صفحة الاسم
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.target.classList.contains('active') &&
                    mutation.target.id === 'username-page') {
                    setTimeout(() => usernameInput.focus(), 100);
                }
            });
        });

        const usernamePage = document.getElementById('username-page');
        if (usernamePage) {
            observer.observe(usernamePage, { attributes: true, attributeFilter: ['class'] });
        }
    }
});
