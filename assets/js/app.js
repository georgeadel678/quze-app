/* ====================================
   app.js - التطبيق الرئيسي
   ==================================== */

// دالة عرض إشعار Toast
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast-notification');

    // إضافة الأيقونة المناسبة
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    toast.textContent = `${icons[type]} ${message}`;
    toast.className = `toast-notification ${type}`;

    // عرض Toast
    setTimeout(() => toast.classList.add('show'), 10);

    // إخفاء Toast بعد المدة المحددة
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

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

    // عرض المودال
    const modal = document.getElementById('change-username-modal');
    const currentUsernameDisplay = document.getElementById('current-username-display');
    const newUsernameInput = document.getElementById('new-username-input');
    const confirmBtn = document.getElementById('confirm-username-change');
    const cancelBtn = document.getElementById('cancel-username-change');

    // تعيين الاسم الحالي
    currentUsernameDisplay.value = currentUsername;
    newUsernameInput.value = '';
    modal.classList.add('visible');

    // التركيز على حقل الاسم الجديد
    setTimeout(() => newUsernameInput.focus(), 100);

    // إزالة المستمعين القدامى
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.replaceWith(newConfirmBtn);
    cancelBtn.replaceWith(newCancelBtn);

    // زر الإلغاء
    newCancelBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
    });

    // زر التأكيد
    newConfirmBtn.addEventListener('click', async () => {
        const cleanNewUsername = newUsernameInput.value.trim();

        if (!cleanNewUsername) {
            alert('من فضلك أدخل اسماً جديداً');
            newUsernameInput.focus();
            return;
        }

        if (cleanNewUsername.length < 2) {
            alert('الاسم يجب أن يكون حرفين على الأقل');
            newUsernameInput.focus();
            return;
        }

        if (cleanNewUsername.length > 20) {
            alert('الاسم يجب ألا يتجاوز 20 حرف');
            newUsernameInput.focus();
            return;
        }

        if (cleanNewUsername === currentUsername) {
            alert('الاسم الجديد مطابق للاسم الحالي');
            newUsernameInput.focus();
            return;
        }

        // تعطيل الزر أثناء الإرسال
        newConfirmBtn.disabled = true;
        newConfirmBtn.textContent = 'جاري التحديث...';

        try {
            const response = await fetch('/api/users/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-username',
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

            // إخفاء المودال
            modal.classList.remove('visible');

            showToast(`تم تحديث الاسم بنجاح! الاسم الجديد: ${data.user.username}`, 'success');

            // إعادة تحميل الصفحة after a small delay to show toast
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Error updating username:', error);
            alert(error.message || 'حدث خطأ، حاول مرة أخرى');

            // إعادة تفعيل الزر
            newConfirmBtn.disabled = false;
            newConfirmBtn.textContent = 'تأكيد';
            newUsernameInput.focus();
        }
    });

    // دعم Enter للتأكيد
    newUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            newConfirmBtn.click();
        }
    });
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

    // ✅ بدء تتبع الوقت للمستخدم
    startTimeTracking();
});

// ====================================
// نظام تتبع الوقت
// ====================================
let timeTrackingInterval = null;
let sessionStartTime = null;
let accumulatedTime = 0; // الوقت المتراكم في هذه الجلسة (بالثواني)
let lastUpdateTime = null;

function startTimeTracking() {
    const username = Storage.getUsername();

    // إذا لم يكن هناك مستخدم، لا نتابع
    if (!username || username === 'مستخدم') {
        return;
    }

    // بدء الجلسة
    sessionStartTime = Date.now();
    lastUpdateTime = Date.now();

    // إرسال تحديث كل 30 ثانية
    timeTrackingInterval = setInterval(() => {
        updateUserActivity();
    }, 30000); // كل 30 ثانية

    // تحديث عند إغلاق الصفحة
    window.addEventListener('beforeunload', () => {
        updateUserActivity(true); // إرسال فوري قبل الإغلاق
    });

    // تحديث عند فقدان التركيز (تبديل التبويب)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // الصفحة مخفية - حفظ الوقت حتى الآن
            updateUserActivity(true);
        } else {
            // الصفحة ظاهرة - إعادة بدء التتبع
            lastUpdateTime = Date.now();
        }
    });

    console.log('⏱️ تم تفعيل تتبع الوقت للمستخدم:', username);
}

function updateUserActivity(immediate = false) {
    const username = Storage.getUsername();

    if (!username || username === 'مستخدم') {
        return;
    }

    // إذا كانت الصفحة مخفية، لا نضيف وقت
    if (document.hidden && !immediate) {
        return;
    }

    const now = Date.now();

    // حساب الوقت المنقضي منذ آخر تحديث
    if (lastUpdateTime) {
        const timeDiff = Math.floor((now - lastUpdateTime) / 1000); // بالثواني

        // فقط إذا كان الفرق أقل من 5 دقائق (300 ثانية) - لتجنب إضافة وقت عند إعادة فتح التبويب بعد فترة طويلة
        if (timeDiff <= 300) {
            accumulatedTime += timeDiff;
        }
    }

    lastUpdateTime = now;

    // إرسال التحديث للخادم كل 30 ثانية أو عند الطلب الفوري
    if (accumulatedTime >= 30 || immediate) {
        const timeToSend = accumulatedTime;
        accumulatedTime = 0; // إعادة تعيين

        fetch('/api/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update-activity',
                username: username,
                timeSpent: timeToSend
            })
        })
            .then(response => {
                if (response.ok) {
                    console.log(`✅ تم تحديث نشاط المستخدم: +${timeToSend} ثانية`);
                } else {
                    console.warn('⚠️ فشل تحديث نشاط المستخدم');
                }
            })
            .catch(error => {
                console.error('❌ خطأ في تحديث النشاط:', error);
            });
    }
}

// إيقاف تتبع الوقت
function stopTimeTracking() {
    if (timeTrackingInterval) {
        clearInterval(timeTrackingInterval);
        timeTrackingInterval = null;
    }

    // إرسال آخر تحديث
    updateUserActivity(true);

    sessionStartTime = null;
    lastUpdateTime = null;
    accumulatedTime = 0;
}

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

// Like System
window.toggleLike = async function(targetUsername, btnElement) {
    const currentUser = Storage.getUsername();
    
    if (!currentUser || currentUser === 'مستخدم') {
        showToast('يجب تسجيل الدخول للإعجاب', 'warning');
        return;
    }

    if (currentUser === targetUsername) {
        showToast('لا يمكنك الإعجاب بنفسك', 'warning');
        return;
    }

    // Local storage check
    const storageKey = 'liked_' + currentUser;
    const likedUsers = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (likedUsers.includes(targetUsername)) {
        showToast('لقد قمت بالإعجاب مسبقاً', 'warning');
        return;
    }

    // Optimistic Update
    const countSpan = btnElement.parentElement.querySelector('.like-count');
    let currentCount = parseInt(countSpan.textContent) || 0;
    countSpan.textContent = currentCount + 1;
    
    btnElement.classList.add('liked');
    btnElement.disabled = true;
    
    // Save locally
    likedUsers.push(targetUsername);
    localStorage.setItem(storageKey, JSON.stringify(likedUsers));

    try {
        await fetch('/api/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'toggle-like',
                targetUsername: targetUsername
            })
        });
    } catch (error) {
        console.error('Like error:', error);
    }
};

