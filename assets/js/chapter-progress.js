/* ====================================
   chapter-progress.js - شريط تقدم الفصل
   ==================================== */

// تحديث شريط تقدم الفصل
function updateChapterProgress() {
    if (!window.Quiz || !Quiz.selectedChapter || Quiz.selectedChapter === 'full') {
        // إخفاء الشريط إذا كان المنهج كامل
        const container = document.getElementById('chapter-progress-container');
        if (container) {
            container.style.display = 'none';
        }
        return;
    }

    // إظهار الشريط
    const container = document.getElementById('chapter-progress-container');
    if (container) {
        container.style.display = 'block';
    }

    // جلب جميع أسئلة الفصل
    const allQuestions = window.questions || [];
    const chapterQuestions = allQuestions.filter(q => q.chapter == Quiz.selectedChapter);
    const totalQuestions = chapterQuestions.length;

    if (totalQuestions === 0) {
        // لا توجد أسئلة
        const progressText = document.getElementById('chapter-progress-text');
        const progressBar = document.getElementById('chapter-progress-bar');
        const progressPercentage = document.getElementById('chapter-progress-percentage');

        if (progressText) progressText.textContent = '0 / 0';
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        if (progressPercentage) progressPercentage.textContent = '0%';
        return;
    }

    // جلب الأسئلة المتقنة
    const masteredIds = Quiz.getMasteredQuestions();
    const masteredCount = masteredIds.length;

    // حساب النسبة المئوية
    const percentage = totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0;

    // تحديث النص
    const progressText = document.getElementById('chapter-progress-text');
    if (progressText) {
        progressText.textContent = `${masteredCount} / ${totalQuestions}`;
    }

    // تحديث الشريط
    const progressBar = document.getElementById('chapter-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;

        // إضافة النسبة المئوية داخل الشريط إذا كان الشريط كبيراً بما يكفي
        const progressPercentage = document.getElementById('chapter-progress-percentage');
        if (progressPercentage) {
            if (percentage >= 10) {
                progressPercentage.textContent = `${percentage}%`;
            } else {
                progressPercentage.textContent = '';
            }
        }
    }
}

// تحديث شريط التقدم العام (عبر جميع الفصول)
function updateGlobalProgress() {
    // جلب جميع الأسئلة
    const allQuestions = window.questions || [];

    // حساب إجمالي عدد الأسئلة في جميع الفصول (1-5)
    const totalQuestions = allQuestions.filter(q => q.chapter >= 1 && q.chapter <= 5).length;

    if (totalQuestions === 0) {
        // لا توجد أسئلة
        const progressText = document.getElementById('global-progress-text');
        const progressBar = document.getElementById('global-progress-bar');
        const progressPercentage = document.getElementById('global-progress-percentage');

        if (progressText) progressText.textContent = '0 / 0';
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercentage) progressPercentage.textContent = '0%';
        return;
    }

    // جلب الأسئلة المتقنة من جميع الفصول
    const username = Storage.getUsername();
    if (!username) return;

    let totalMastered = 0;

    // حساب الأسئلة المتقنة من كل فصل
    for (let chapter = 1; chapter <= 5; chapter++) {
        const key = `mastered_${username}_ch${chapter}`;
        const mastered = JSON.parse(localStorage.getItem(key) || '[]');
        totalMastered += mastered.length;
    }

    // حساب النسبة المئوية
    const percentage = totalQuestions > 0 ? Math.round((totalMastered / totalQuestions) * 100) : 0;

    // تحديث النص
    const progressText = document.getElementById('global-progress-text');
    if (progressText) {
        progressText.textContent = `${totalMastered} / ${totalQuestions}`;
    }

    // تحديث الشريط
    const progressBar = document.getElementById('global-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;

        // إضافة النسبة المئوية داخل الشريط
        const progressPercentage = document.getElementById('global-progress-percentage');
        if (progressPercentage) {
            if (percentage >= 10) {
                progressPercentage.textContent = `${percentage}%`;
            } else {
                progressPercentage.textContent = '';
            }
        }
    }
}

// تصدير للاستخدام العام
window.updateChapterProgress = updateChapterProgress;
window.updateGlobalProgress = updateGlobalProgress;


