/* ====================================
   quiz.js - منطق الاختبار
   ==================================== */

const Quiz = {
    currentQuestions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    selectedChapter: null,
    questionCount: 0,
    timerInterval: null,
    timerSeconds: 0,
    isReviewMode: false,

    // اختيار فصل
    selectChapter(chapter) {
        this.selectedChapter = chapter;
        this.isReviewMode = false; // Reset review mode
        this.isNotesMode = false; // Reset notes mode
        UI.showPage('quiz-type-select-page');
    },

    // اختيار المنهج كامل
    selectFullCurriculum() {
        this.selectedChapter = 'full';
        this.isReviewMode = false; // Reset review mode
        this.isNotesMode = false; // Reset notes mode
        UI.showPage('quiz-type-select-page');
    },

    // عرض نافذة المؤقت
    showTimerModal(count) {
        this.questionCount = count;
        UI.showModal('timer-modal');
    },

    // بدء الاختبار
    startQuiz(withTimer = false) {
        UI.hideModal('timer-modal');

        // جلب الأسئلة
        let allQuestions = window.questions || [];

        if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
            alert('لا توجد أسئلة!');
            return;
        }

        // تصفية الأسئلة حسب الفصل
        let filtered = [];
        if (this.selectedChapter === 'full') {
            filtered = allQuestions;
        } else {
            filtered = allQuestions.filter(q => q.chapter == this.selectedChapter);
        }

        // --- Mastery Filter ---
        if (this.selectedChapter !== 'full') {
            const masteredIds = this.getMasteredQuestions();
            const originalCount = filtered.length;

            // Filter out mastered questions
            // Convert all IDs to strings for consistent comparison
            const masteredIdsStr = masteredIds.map(id => String(id));

            filtered = filtered.filter(q => {
                const qId = q.id ? String(q.id) : null;
                // Only filter if question has an ID and it's in mastered list
                return !qId || !masteredIdsStr.includes(qId);
            });

            // Only show reset message if ALL questions are mastered (not just filtered ones)
            // Check if we have enough questions for the requested count
            const requestedCount = this.questionCount === 'all' ? filtered.length : Number(this.questionCount);

            if (filtered.length === 0 && originalCount > 0) {
                // All questions in this chapter are mastered
                alert('🎉 مبروك! لقد أتقنت جميع أسئلة هذا الفصل.\nسيتم إعادة تعيين الأسئلة لتبدأ من جديد.');
                this.resetMasteredQuestions();
                filtered = allQuestions.filter(q => q.chapter == this.selectedChapter);
            } else if (filtered.length > 0 && filtered.length < requestedCount && requestedCount !== filtered.length) {
                // Not enough unmastered questions, but we have some
                // This is normal - just use what's available
                // No alert needed, just continue with available questions
            }
        }

        // --- Review Mode Filter ---
        // تم إزالة شرط (this.selectedChapter !== 'full') للسماح بالمراجعة في المنهج الكامل
        if (this.isReviewMode) {
            const wrongIds = this.getWrongAnswers();

            if (wrongIds.length === 0) {
                alert('🎉 لا توجد أخطاء في هذا الفصل!');
                this.isReviewMode = false;
                UI.showPage('chapter-select-page');
                return;
            }

            // Filter to only show wrong questions
            // Robust ID comparison: convert both to strings
            const wrongIdsStr = wrongIds.map(id => String(id));

            filtered = filtered.filter(q => {
                const qId = q.id ? String(q.id) : null;
                return qId && wrongIdsStr.includes(qId);
            });
        }

        if (filtered.length === 0) {
            alert('لا توجد أسئلة لهذا الفصل!');
            return;
        }

        // اختيار عدد الأسئلة
        if (this.questionCount === 'all' || this.questionCount >= filtered.length) {
            this.currentQuestions = [...filtered];
        } else {
            // اختيار عشوائي
            const shuffled = filtered.sort(() => Math.random() - 0.5);
            this.currentQuestions = shuffled.slice(0, this.questionCount);
        }

        // تهيئة المتغيرات
        this.userAnswers = Array(this.currentQuestions.length).fill(null);
        this.currentQuestionIndex = 0;

        // بدء المؤقت إذا طُلب
        if (withTimer) {
            this.startTimer();
        }

        // عرض الاختبار
        UI.showPage('quiz-page');
        this.displayCurrentQuestion();
    },

    // عرض السؤال الحالي
    displayCurrentQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        const userAnswer = this.userAnswers[this.currentQuestionIndex];

        UI.displayQuestion(question, this.currentQuestionIndex, userAnswer);
        UI.updateProgress(this.currentQuestionIndex + 1, this.currentQuestions.length);
        UI.updateNavigationButtons(this.currentQuestionIndex, this.currentQuestions.length);
    },

    // اختيار إجابة
    selectAnswer(answerIndex) {
        this.userAnswers[this.currentQuestionIndex] = answerIndex;
        this.displayCurrentQuestion();
    },

    // السؤال التالي
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
        }
    },

    // السؤال السابق
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
        }
    },

    // إنهاء الاختبار
    submitQuiz() {
        this.stopTimer();

        // حساب النتيجة
        let score = 0;
        this.currentQuestions.forEach((q, i) => {
            if (this.userAnswers[i] === q.correctAnswer) {
                score++;
                // Save as mastered if answered correctly
                this.saveMasteredQuestion(q.id);
                // Remove from wrong list if it was there
                this.removeWrongAnswer(q.id);
            } else {
                // Add to wrong list if answered incorrectly
                this.saveWrongAnswer(q.id);
            }
        });

        // إضافة النقاط
        const points = score * 1; // نقطة واحدة لكل سؤال صح
        Storage.addPoints(points);

        // حفظ في قاعدة البيانات
        this.updateUserPoints(points);

        // عرض النتيجة
        UI.showResults(score, this.currentQuestions.length);

        // Update review button for current chapter
        if (typeof updateReviewButtonForCurrentChapter === 'function') {
            updateReviewButtonForCurrentChapter();
        }

        // Update chapter progress after submitting quiz
        if (typeof updateChapterProgress === 'function') {
            updateChapterProgress();
        }
    },

    // تحديث نقاط المستخدم في قاعدة البيانات (مع التجميع لتقليل الطلبات)
    async updateUserPoints(points) {
        const username = Storage.getUsername();

        if (!username) {
            console.log('لا يوجد مستخدم محفوظ');
            return;
        }

        // 1. تحديث النقاط محلياً فوراً (ليراها المستخدم)
        const currentTotal = Storage.getPoints();
        // ملاحظة: Storage.addPoints يتم استدعاؤه بالفعل خارج هذه الدالة في submitQuiz
        // لذا هنا فقط نهتم بالمزامنة مع السيرفر

        // 2. إدارة النقاط المعلقة (Pending Points)
        let pending = parseInt(localStorage.getItem('pendingPoints') || '0');
        pending += points;
        localStorage.setItem('pendingPoints', pending);

        console.log(`تم إضافة ${points} نقطة للمحفظة المحلية. الرصيد المعلق: ${pending}`);

        // 3. التحقق من حد الإرسال (Threshold)
        // نرسل فقط إذا جمعنا 50 نقطة أو أكثر لتقليل استهلاك قاعدة البيانات
        const SYNC_THRESHOLD = 50;

        if (pending >= SYNC_THRESHOLD) {
            console.log(`تم تجاوز الحد (${SYNC_THRESHOLD})، جاري المزامنة مع قاعدة البيانات...`);
            await this.syncPendingPoints();
        } else {
            console.log('لم يتم تجاوز الحد، سيتم المزامنة لاحقاً.');
        }
    },

    // دالة لمزامنة النقاط المعلقة مع السيرفر (تستدعى عند الحاجة)
    async syncPendingPoints() {
        const username = Storage.getUsername();
        const pending = parseInt(localStorage.getItem('pendingPoints') || '0');

        if (pending <= 0) return; // لا يوجد شيء للمزامنة

        try {
            // حساب إجمالي الأسئلة المتقنة من localStorage
            let totalMastered = 0;
            for (let chapter = 1; chapter <= 5; chapter++) {
                const key = `mastered_${username}_ch${chapter}`;
                const mastered = JSON.parse(localStorage.getItem(key) || '[]');
                totalMastered += mastered.length;
            }

            console.log(`جاري إرسال ${pending} نقطة و ${totalMastered} سؤال إلى السيرفر...`);
            const response = await fetch('/api/users/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-points',
                    username,
                    pointsToAdd: pending,
                    questionsToAdd: totalMastered // Send total count to server (will be set, not incremented)
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ تم مزامنة النقاط بنجاح:', data.user.points);

                // تصفير النقاط المعلقة بعد النجاح
                localStorage.setItem('pendingPoints', '0');

                // تحديث الرصيد المحلي بالرصيد الحقيقي من السيرفر كزيادة تأكيد
                Storage.set('userPoints', data.user.points);
            } else {
                console.error('فشل مزامنة النقاط المفصولة');
                // لا نصفر الرصيد، سيحاول مرة أخرى لاحقاً
            }
        } catch (error) {
            console.error('خطأ في الاتصال/المزامنة:', error);
        }
    },

    // دالة لمزامنة عدد الأسئلة فقط (بدون نقاط)
    async syncQuestionsCount() {
        const username = Storage.getUsername();
        if (!username || username === 'مستخدم') return;

        try {
            // حساب إجمالي الأسئلة المتقنة من localStorage
            let totalMastered = 0;
            for (let chapter = 1; chapter <= 5; chapter++) {
                const key = `mastered_${username}_ch${chapter}`;
                const mastered = JSON.parse(localStorage.getItem(key) || '[]');
                totalMastered += mastered.length;
            }

            console.log(`جاري مزامنة عدد الأسئلة: ${totalMastered}...`);
            const response = await fetch('/api/users/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-points',
                    username,
                    pointsToAdd: 0, // No points
                    questionsToAdd: totalMastered
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ تم مزامنة عدد الأسئلة:', data.user.questionsAnswered);
            } else {
                console.error('فشل مزامنة عدد الأسئلة');
            }
        } catch (error) {
            console.error('خطأ في مزامنة عدد الأسئلة:', error);
        }
    },

    // بدء المؤقت
    startTimer() {
        this.timerSeconds = this.questionCount === 'all'
            ? this.currentQuestions.length * 60
            : this.questionCount * 60;

        const timerDisplay = document.getElementById('timer');
        if (!timerDisplay) return;

        timerDisplay.style.display = 'block';

        this.timerInterval = setInterval(() => {
            this.timerSeconds--;

            const minutes = Math.floor(this.timerSeconds / 60);
            const seconds = this.timerSeconds % 60;

            timerDisplay.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (this.timerSeconds <= 0) {
                this.submitQuiz();
            }
        }, 1000);
    },



    // --- Mastery Mode Logic ---

    // Start Notes Quiz
    startNotesQuiz() {
        const notes = Storage.getNotes();

        if (!notes || notes.length === 0) {
            alert('لا توجد ملاحظات للاختبار!');
            return;
        }

        // Setup Quiz Mode
        this.isNotesMode = true;
        this.selectedChapter = null; // Mixed chapters
        this.isReviewMode = false;

        // Shuffle questions
        this.currentQuestions = [...notes].sort(() => Math.random() - 0.5);
        this.questionCount = this.currentQuestions.length;

        // Initialize state
        this.userAnswers = Array(this.currentQuestions.length).fill(null);
        this.currentQuestionIndex = 0;

        // Reset Timer
        this.timerSeconds = 0;
        this.stopTimer();

        // Show Quiz Page
        UI.showPage('quiz-page');
        this.displayCurrentQuestion();
    },

    // Save correct answer to mastered list
    saveMasteredQuestion(questionId) {
        // Skip if in Notes Mode (as chapters are mixed)
        if (this.isNotesMode) return;

        const username = Storage.getUsername();
        if (!username || !this.selectedChapter || !questionId) return;

        const key = `mastered_${username}_ch${this.selectedChapter}`;
        let mastered = JSON.parse(localStorage.getItem(key) || '[]');

        // Convert to string for consistent storage
        const questionIdStr = String(questionId);
        const masteredStr = mastered.map(id => String(id));

        if (!masteredStr.includes(questionIdStr)) {
            mastered.push(questionIdStr);
            localStorage.setItem(key, JSON.stringify(mastered));
        }
    },

    // Save wrong answer to list
    saveWrongAnswer(questionId) {
        // Skip if in Notes Mode
        if (this.isNotesMode) return;

        const username = Storage.getUsername();
        if (!username || !this.selectedChapter) return;

        const key = `wrong_${username}_ch${this.selectedChapter}`;
        let wrong = JSON.parse(localStorage.getItem(key) || '[]');

        if (!wrong.includes(questionId)) {
            wrong.push(questionId);
            localStorage.setItem(key, JSON.stringify(wrong));
        }
    },

    // Remove from wrong answer list
    removeWrongAnswer(questionId) {
        // Skip if in Notes Mode
        if (this.isNotesMode) return;

        const username = Storage.getUsername();
        if (!username || !this.selectedChapter) return;

        const key = `wrong_${username}_ch${this.selectedChapter}`;
        let wrong = JSON.parse(localStorage.getItem(key) || '[]');

        wrong = wrong.filter(id => id !== questionId);
        localStorage.setItem(key, JSON.stringify(wrong));
    },

    // Get list of mastered question IDs
    getMasteredQuestions() {
        const username = Storage.getUsername();
        if (!username || !this.selectedChapter) return [];

        const key = `mastered_${username}_ch${this.selectedChapter}`;
        const mastered = JSON.parse(localStorage.getItem(key) || '[]');
        // Return as strings for consistent comparison
        return mastered.map(id => String(id));
    },

    // Reset mastery for a specific chapter
    resetMasteredQuestions() {
        const username = Storage.getUsername();
        if (!username || !this.selectedChapter) return;

        const key = `mastered_${username}_ch${this.selectedChapter}`;
        localStorage.removeItem(key);
    },

    // Get wrong answers for current chapter
    getWrongAnswers() {
        const username = Storage.getUsername();
        if (!username || !this.selectedChapter) return [];

        const key = `wrong_${username}_ch${this.selectedChapter}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    },

    // Get wrong answer count for any chapter
    getWrongAnswersCount(chapter) {
        const username = Storage.getUsername();
        if (!username) return 0;

        const key = `wrong_${username}_ch${chapter}`;
        const wrong = JSON.parse(localStorage.getItem(key) || '[]');
        return wrong.length;
    },

    // Start review mode for a specific chapter
    startReviewMode(chapter) {
        this.selectedChapter = chapter;
        this.isReviewMode = true;
        this.isNotesMode = false;
        UI.showPage('quiz-type-select-page');
    },

    // Stop Timer
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const timerDisplay = document.getElementById('timer');
        if (timerDisplay) {
            timerDisplay.style.display = 'none';
        }
    }
};

// تصدير للاستخدام العام
window.Quiz = Quiz;

// دوال مساعدة للتوافق
function selectChapter(chapter) {
    Quiz.selectChapter(chapter);
}

function selectFullCurriculum() {
    Quiz.selectFullCurriculum();
}

function showTimerModal(count) {
    Quiz.showTimerModal(count);
}

function nextQuestion() {
    Quiz.nextQuestion();
}

function prevQuestion() {
    Quiz.prevQuestion();
}

function submitQuiz() {
    // إنشاء النافذة إذا لم تكن موجودة
    let modal = document.getElementById('custom-submit-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-submit-modal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.zIndex = '9999';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.backdropFilter = 'blur(4px)';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.background = 'var(--bg-card, #ffffff)';
        modalContent.style.padding = '2rem';
        modalContent.style.borderRadius = '24px';
        modalContent.style.maxWidth = '400px';
        modalContent.style.width = '90%';
        modalContent.style.textAlign = 'center';
        modalContent.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        modalContent.style.border = '1px solid var(--border-color, rgba(0,0,0,0.1))';

        // التعامل مع الوضع الليلي يدوياً إذا لم تكن المتغيرات موجودة
        if (document.body.classList.contains('dark-mode')) {
            modalContent.style.background = '#1f2937';
            modalContent.style.color = '#ffffff';
        }

        modalContent.innerHTML = `
            <div style="font-size: 3.5rem; margin-bottom: 1rem; animation: bounce 1s infinite;">🤔</div>
            <h3 style="margin-bottom: 0.5rem; font-weight: 800; font-size: 1.5rem; color: var(--text-primary, inherit);">هل أنت متأكد؟</h3>
            <p style="color: var(--text-secondary, #6b7280); margin-bottom: 2rem; line-height: 1.6;">هل تريد حقاً إنهاء الاختبار وتسليم الإجابات؟<br>لا يمكن التراجع عن هذه الخطوة.</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="modal-submit-confirm" class="btn" style="flex: 1; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border: none; padding: 0.75rem; border-radius: 12px; font-weight: bold; cursor: pointer; transition: transform 0.2s;">نعم، سلم</button>
                <button id="modal-submit-cancel" class="btn" style="flex: 1; background: #e5e7eb; color: #374151; border: none; padding: 0.75rem; border-radius: 12px; font-weight: bold; cursor: pointer; transition: background 0.2s;">تراجع</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Event Listeners
        const confirmBtn = document.getElementById('modal-submit-confirm');
        const cancelBtn = document.getElementById('modal-submit-cancel');

        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            Quiz.submitQuiz();
        };

        cancelBtn.onclick = () => {
            modal.style.display = 'none';
        };

        // Hover effects
        confirmBtn.onmouseover = () => confirmBtn.style.transform = 'scale(1.02)';
        confirmBtn.onmouseout = () => confirmBtn.style.transform = 'scale(1)';

        cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#d1d5db';
        cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = '#e5e7eb';

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    } else {
        // تحديث الألوان في حالة تغيير الوضع (فاتح/غامق)
        const content = modal.querySelector('.modal-content');
        if (document.body.classList.contains('dark-mode')) {
            content.style.background = '#1f2937';
            content.style.color = '#ffffff';
        } else {
            content.style.background = '#ffffff';
            content.style.color = 'inherit';
        }
    }

    modal.style.display = 'flex';
}

function startReviewMode(chapter) {
    Quiz.startReviewMode(chapter);
}

// اختيار نوع الاختبار
function selectQuizType(type) {
    if (type === 'mcq') {
        // الذهاب لصفحة اختيار عدد الأسئلة (MCQ)
        UI.showPage('question-count-page');

        // Update review button when showing question count page
        if (typeof updateReviewButtonForCurrentChapter === 'function') {
            setTimeout(updateReviewButtonForCurrentChapter, 100);
        }

        // Update chapter progress bar
        if (typeof updateChapterProgress === 'function') {
            setTimeout(updateChapterProgress, 100);
        }
    } else if (type === 'essay') {
        // تفعيل وضع Essay وإخفاء الحاوية الرئيسية
        document.body.classList.add('essay-mode');

        // تهيئة Essay Quiz مع الفصل المحدد
        if (window.EssayQuiz) {
            window.EssayQuiz.init(Quiz.selectedChapter);
        }
    }
}
