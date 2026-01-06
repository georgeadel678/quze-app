/* ====================================
   storage.js - إدارة التخزين المحلي
   ==================================== */
// الإصدار الحالي للتطبيق - تغيير هذا الرقم سيقوم بمسح بيانات المستخدمين
const APP_VERSION = 'v3_new_questions_2026';

const Storage = {
    // التحقق من إصدار التطبيق ومسح البيانات القديمة
    checkAppVersion() {
        const savedVersion = this.get('app_version');

        if (savedVersion !== APP_VERSION) {
            console.log(`Detected new app version: ${APP_VERSION} (was ${savedVersion}). Cleaning up old data...`);

            // قائمة المفاتيح التي يجب الاحتفاظ بها (مثل اسم المستخدم إذا أردنا، لكن الطلب كان "كلو يبداء من الاول")
            // الطلب: "تصفر كل النقط وكلو يبداء من الاول"
            // لذا سنحتفظ فقط باسم المستخدم لتسهيل الدخول، لكن نصفر النقاط وكل شيء آخر
            const username = this.getUsername();
            const userId = this.get('userId');

            // مسح كل شيء
            this.clear();

            // استعادة بيانات المستخدم الأساسية فقط (بدون نقاط)
            if (username && username !== 'مستخدم') {
                this.set('username', username);
                if (userId) this.set('userId', userId);
            }

            // تعيين الإصدار الجديد
            this.set('app_version', APP_VERSION);

            return true; // تم التحديث (يستدعي إعادة تحميل أو إشعار)
        }
        return false; // الإصدار متطابق
    },

    // حفظ البيانات
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            return false;
        }
    },

    // قراءة البيانات
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('خطأ في قراءة البيانات:', error);
            return defaultValue;
        }
    },

    // حذف البيانات
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            return false;
        }
    },

    // مسح كل البيانات
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('خطأ في مسح البيانات:', error);
            return false;
        }
    },

    // النقاط
    getPoints() {
        return this.get('quizPoints', 0);
    },

    addPoints(points) {
        const current = this.getPoints();
        this.set('quizPoints', current + points);
        return current + points;
    },

    // اسم المستخدم
    getUsername() {
        return this.get('username', 'مستخدم');
    },

    setUsername(name) {
        this.set('username', name);
    },

    // الوضع الداكن
    isDarkMode() {
        return this.get('darkMode', false);
    },

    setDarkMode(enabled) {
        this.set('darkMode', enabled);
        document.body.classList.toggle('dark-mode', enabled);
        this.updateDarkModeToggle();
    },

    toggleDarkMode() {
        const newState = !this.isDarkMode();
        this.setDarkMode(newState);
        return newState;
    },

    updateDarkModeToggle() {
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) {
            toggle.textContent = this.isDarkMode() ? '☀️' : '🌙';
        }
    },

    // حفظ تقدم الاختبار
    saveQuizProgress(data) {
        this.set('quizProgress', data);
    },

    getQuizProgress() {
        return this.get('quizProgress', null);
    },

    clearQuizProgress() {
        this.remove('quizProgress');
    },

    // الملاحظات (Notes)
    // حفظ سؤال في الملاحظات
    addNote(questionData) {
        const username = this.getUsername();
        if (!username || username === 'مستخدم') return false;

        const key = `notes_${username}`;
        let notes = this.get(key, []);

        // التحقق من عدم وجود السؤال مسبقاً (باستخدام ID)
        let questionId = String(questionData.id || questionData.question || '').trim();
        if (!questionId) {
            console.error('Cannot add note: questionId is empty');
            return false;
        }

        // إضافة chapter إلى questionId إذا كان موجوداً ولم يكن موجوداً بالفعل
        const chapter = questionData.chapter || null;
        if (chapter && !questionId.startsWith(`ch${chapter}_`)) {
            questionId = `ch${chapter}_${questionId}`;
        }

        // البحث عن الملاحظة الموجودة
        const existingIndex = notes.findIndex(note => {
            const noteId = String(note.id || note.question || '').trim();
            return noteId === questionId;
        });

        // إعداد بيانات السؤال
        questionData.id = questionId;
        if (chapter) questionData.chapter = chapter;
        questionData.addedAt = new Date().toISOString();

        if (existingIndex !== -1) {
            // تحديث الملاحظة الموجودة
            notes[existingIndex] = questionData;
            this.set(key, notes);
            return 'updated';
        } else {
            // إضافة ملاحظة جديدة
            notes.push(questionData);
            this.set(key, notes);
            return 'added';
        }
    },

    // جلب ملاحظة محددة
    getNote(questionId) {
        if (!questionId) return null;
        const notes = this.getNotes(); // نستخدم getNotes لضمان تنظيف البيانات
        const searchId = String(questionId).trim();
        return notes.find(note => String(note.id).trim() === searchId) || null;
    },

    // جلب جميع الملاحظات
    getNotes() {
        const username = this.getUsername();
        if (!username || username === 'مستخدم') return [];

        const key = `notes_${username}`;
        let notes = this.get(key, []);

        // تنظيف الملاحظات القديمة - التأكد من وجود id لكل ملاحظة وإضافة chapter إذا لم يكن موجوداً
        let needsUpdate = false;
        notes = notes.map(note => {
            let updated = false;

            if (!note.id && note.question) {
                // إذا لم يكن هناك id، نستخدم question كـ id
                // إضافة chapter إذا كان موجوداً
                if (note.chapter && !String(note.question).trim().startsWith(`ch${note.chapter}_`)) {
                    note.id = `ch${note.chapter}_${String(note.question).trim()}`;
                } else {
                    note.id = String(note.question).trim();
                }
                updated = true;
            } else if (note.id) {
                // التأكد من أن id هو string
                const oldId = String(note.id).trim();
                // إذا كان هناك chapter ولم يكن موجوداً في id، نضيفه
                if (note.chapter && !oldId.startsWith(`ch${note.chapter}_`)) {
                    note.id = `ch${note.chapter}_${oldId}`;
                    updated = true;
                } else {
                    note.id = oldId;
                }
            }

            if (updated) {
                needsUpdate = true;
            }

            return note;
        });

        // حفظ الملاحظات المحدثة إذا تم التعديل
        if (needsUpdate) {
            this.set(key, notes);
        }

        return notes;
    },

    // حذف سؤال من الملاحظات
    removeNote(questionId) {
        const username = this.getUsername();
        if (!username || username === 'مستخدم') {
            console.error('No username found');
            return false;
        }

        if (!questionId) {
            console.error('questionId is missing');
            return false;
        }

        const key = `notes_${username}`;
        let notes = this.get(key, []);

        const originalLength = notes.length;

        // استخدام String() لضمان المقارنة الصحيحة
        notes = notes.filter(note => {
            const noteId = String(note.id || note.question || '');
            return noteId !== String(questionId);
        });

        const newLength = notes.length;

        if (newLength < originalLength) {
            this.set(key, notes);
            return true;
        } else {
            console.warn('Note not found for deletion:', questionId);
            return false;
        }
    },

    // التحقق من وجود سؤال في الملاحظات
    isNoteExists(questionId, chapter = null) {
        if (!questionId) {
            return false;
        }

        const notes = this.getNotes();
        if (!notes || notes.length === 0) {
            return false;
        }

        let searchId = String(questionId).trim();
        if (!searchId || searchId === 'null' || searchId === 'undefined') {
            return false;
        }

        // إذا كان questionId لا يحتوي على chapter prefix وكان chapter موجود، نضيفه
        if (chapter && !searchId.startsWith(`ch${chapter}_`)) {
            searchId = `ch${chapter}_${searchId}`;
        }

        // البحث في الملاحظات - نعتمد فقط على id للمقارنة الدقيقة
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];

            // التحقق من id أولاً - هذا هو المعرف الموثوق
            if (note.id) {
                const noteId = String(note.id).trim();
                if (noteId === searchId) {
                    return true;
                }
            }

            // إذا لم يكن هناك id في الملاحظة، نتحقق من question text فقط
            // لكن فقط إذا كان searchId هو نص السؤال (ليس رقم) و note.id غير موجود
            if (!note.id && note.question) {
                const noteQuestion = String(note.question).trim();
                // فقط إذا كان searchId هو نص السؤال (ليس رقم)
                if (isNaN(searchId.replace(/^ch\d+_/, '')) && noteQuestion === searchId && noteQuestion.length > 0) {
                    return true;
                }
            }
        }

        return false;
    },

    // ترحيل بيانات المستخدم عند تغيير الاسم
    migrateUserData(oldUsername, newUsername) {
        if (!oldUsername || !newUsername || oldUsername === newUsername) return false;

        console.log(`Migrating data from ${oldUsername} to ${newUsername}...`);

        let migratedCount = 0;
        const keysToRemove = [];
        const updates = {}; // تخزين التحديثات لتطبيقها لاحقاً لتجنب مشاكل أثناء الدوران

        // البحث في كل المفاتيح
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            // تحقق مما إذا كان المفتاح يخص المستخدم القديم
            // الأنماط المدعومة:
            // notes_OLDUSER
            // mastered_OLDUSER_ch...
            // wrong_OLDUSER_ch...
            // liked_OLDUSER

            if (key.includes(`_${oldUsername}`)) {
                // تأكد من أن المفتاح ينتهي بالاسم القديم أو يتبعه فاصل (مثل _ch)
                // هذا يمنع استبدال user1 في user10

                // الطريقة الأفضل: استبدال أول حدوث للاسم القديم بالجديد
                // ونفترض أن التنسيق هو prefix_USERNAME أو prefix_USERNAME_suffix

                // استبدال الاسم القديم بالجديد في المفتاح
                const newKey = key.replace(`_${oldUsername}`, `_${newUsername}`);

                // قراءة القيمة
                const value = localStorage.getItem(key);

                // جدولة التحديث
                updates[newKey] = value;
                keysToRemove.push(key);
                migratedCount++;
            }
        }

        // تطبيق التحديثات
        for (const [newKey, value] of Object.entries(updates)) {
            localStorage.setItem(newKey, value);
        }

        // حذف المفاتيح القديمة
        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log(`Migration complete. Moved ${migratedCount} items.`);
        return true;
    }
};

// تصدير للاستخدام العام
window.Storage = Storage;
/* ====================================
   ui.js - إدارة واجهة المستخدم
   ==================================== */

const UI = {
    // عرض صفحة معينة
    showPage(pageId) {
        // إخفاء جميع الصفحات
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // عرض الصفحة المطلوبة
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.add('active');
        }

        // تحديث شريط التقدم العام عند عرض صفحة الفصول
        if (pageId === 'chapters-page' && typeof updateGlobalProgress === 'function') {
            setTimeout(updateGlobalProgress, 50);
        }
    },

    // تحديث شريط التقدم
    updateProgress(current, total) {
        const fill = document.getElementById('progress-bar-fill');
        const text = document.getElementById('progress-text');

        const percentage = Math.round((current / total) * 100);

        if (fill) {
            fill.style.width = percentage + '%';
        }

        if (text) {
            text.textContent = `السؤال ${current} من ${total}`;
        }
    },

    // عرض السؤال
    displayQuestion(question, index, userAnswer = null) {
        const questionText = document.getElementById('question-text');
        const answersContainer = document.getElementById('answers-container');

        if (questionText) {
            questionText.textContent = question.question;
        }

        if (answersContainer) {
            answersContainer.innerHTML = '';

            question.answers.forEach((answer, i) => {
                const div = document.createElement('div');
                div.className = 'answer-option';
                div.textContent = answer;

                if (userAnswer === i) {
                    div.classList.add('selected');
                }

                div.onclick = () => Quiz.selectAnswer(i);
                answersContainer.appendChild(div);
            });
        }
    },

    // تحديث أزرار التنقل
    updateNavigationButtons(currentIndex, totalQuestions) {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (prevBtn) {
            prevBtn.style.display = currentIndex === 0 ? 'none' : 'inline-block';
        }

        if (nextBtn) {
            nextBtn.style.display = currentIndex === totalQuestions - 1 ? 'none' : 'inline-block';
        }

        if (submitBtn) {
            submitBtn.style.display = currentIndex === totalQuestions - 1 ? 'inline-block' : 'none';
        }
    },

    // عرض النتائج
    showResults(score, total) {
        const scoreEl = document.getElementById('score');
        const totalEl = document.getElementById('total-questions');
        const messageEl = document.getElementById('result-message');

        if (scoreEl) scoreEl.textContent = score;
        if (totalEl) totalEl.textContent = total;

        if (messageEl) {
            const percentage = (score / total) * 100;
            let message = '';
            let emoji = '';

            if (percentage === 100) {
                message = 'ممتاز! درجة كاملة 🎉';
                emoji = '🏆';
            } else if (percentage >= 80) {
                message = 'رائع جداً! أداء ممتاز';
                emoji = '⭐';
            } else if (percentage >= 60) {
                message = 'جيد! واصل التقدم';
                emoji = '👍';
            } else if (percentage >= 40) {
                message = 'مقبول، يمكنك التحسن';
                emoji = '💪';
            } else {
                message = 'حاول مرة أخرى';
                emoji = '📚';
            }

            messageEl.innerHTML = `<div style="font-size: 3rem; margin: 1rem 0;">${emoji}</div>${message}`;
        }

        this.showPage('results-page');

        // Update review button for results page
        if (typeof updateReviewButtonForResultsPage === 'function') {
            setTimeout(() => {
                updateReviewButtonForResultsPage();
            }, 100);
        }
    },

    // عرض مراجعة الإجابات
    showReview(questions, userAnswers) {
        const container = document.getElementById('review-container');
        if (!container) return;

        container.innerHTML = '';

        questions.forEach((q, index) => {
            const div = document.createElement('div');
            div.className = 'review-item';
            div.style.cssText = `
                background: #f8f9fa;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
                border-radius: 12px;
                text-align: right;
                border: 2px solid ${userAnswers[index] === q.correctAnswer ? '#28a745' : '#dc3545'};
                position: relative;
            `;

            const isCorrect = userAnswers[index] === q.correctAnswer;
            // توليد questionId موحد - استخدام id إذا كان موجوداً، وإلا استخدام نص السؤال
            // لا نستخدم index أبداً لأنه يتغير حسب ترتيب الأسئلة
            // إضافة رقم الفصل لضمان التفرقة بين الفصول
            let questionId = null;
            const chapter = q.chapter || (window.Quiz && window.Quiz.selectedChapter) || null;

            if (q.id) {
                // إضافة رقم الفصل إلى المعرف
                questionId = chapter ? `ch${chapter}_${String(q.id).trim()}` : String(q.id).trim();
            } else if (q.question) {
                // إضافة رقم الفصل إلى نص السؤال
                questionId = chapter ? `ch${chapter}_${String(q.question).trim()}` : String(q.question).trim();
            }

            // إذا لم يكن هناك id أو question، نتخطى إضافة زر الملاحظات
            if (!questionId) {
                console.warn('Question missing id and question text:', q);
            }

            // التحقق من حالة الملاحظة (موجودة، محدثة، غير موجودة)
            let noteStatus = 'missing'; // values: 'missing', 'added', 'stale'
            if (questionId) {
                const existingNote = Storage.getNote(questionId);
                if (existingNote) {
                    // مقارنة نص السؤال الحالي مع المخزن
                    const currentText = String(q.question || '').trim();
                    const storedText = String(existingNote.question || '').trim();

                    if (currentText === storedText) {
                        noteStatus = 'added'; // متطابق تماماً
                    } else {
                        noteStatus = 'stale'; // موجود ولكن النص مختلف (يحتاج تحديث)
                    }
                }
            }

            // إنشاء زر إضافة للملاحظات (فقط إذا كان questionId موجود)
            const addButton = document.createElement('button');
            if (questionId) {
                addButton.setAttribute('data-question-id', questionId);
                addButton.setAttribute('data-question-index', index);
            }

            let btnText = '📌 أضف للملاحظات';
            let btnBg = '#007bff';
            let btnDisabled = false;

            if (noteStatus === 'added') {
                btnText = '✅ تم الإضافة';
                btnBg = '#28a745';
                btnDisabled = true;
            } else if (noteStatus === 'stale') {
                btnText = '🔄 تحديث الملاحظة';
                btnBg = '#fd7e14'; // Orange
                btnDisabled = false;
            }

            addButton.style.cssText = `
                background: ${btnBg};
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                cursor: ${!btnDisabled ? 'pointer' : 'not-allowed'};
                font-size: 0.9rem;
                white-space: nowrap;
                opacity: ${!btnDisabled ? '1' : '0.6'};
            `;
            addButton.textContent = btnText;
            addButton.disabled = btnDisabled;

            if (questionId) {
                addButton.onclick = () => handleAddToNotes(questionId, index);
            } else {
                addButton.onclick = () => {
                    showToast('لا يمكن إضافة هذا السؤال: السؤال لا يحتوي على معرف', 'warning');
                };
            }

            // إنشاء العنوان مع الزر
            const headerDiv = document.createElement('div');
            headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;';

            const titleH3 = document.createElement('h3');
            titleH3.style.cssText = `color: ${isCorrect ? '#28a745' : '#dc3545'}; margin: 0;`;
            titleH3.textContent = `${isCorrect ? '✅' : '❌'} السؤال ${index + 1}`;

            headerDiv.appendChild(titleH3);
            headerDiv.appendChild(addButton);

            // إنشاء محتوى السؤال
            const questionP = document.createElement('p');
            questionP.style.cssText = 'font-weight: 600; margin-bottom: 1rem; color: #2c3e50;';
            questionP.textContent = q.question;

            // إجابتك
            const userAnswerDiv = document.createElement('div');
            userAnswerDiv.style.cssText = 'background: #fff; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;';
            userAnswerDiv.innerHTML = `<strong style="color: ${isCorrect ? '#28a745' : '#dc3545'};">إجابتك:</strong> ${q.answers[userAnswers[index]] || 'لم تجب'}`;

            div.appendChild(headerDiv);
            div.appendChild(questionP);
            div.appendChild(userAnswerDiv);

            // الإجابة الصحيحة (إذا كانت خاطئة)
            if (!isCorrect) {
                const correctAnswerDiv = document.createElement('div');
                correctAnswerDiv.style.cssText = 'background: #d4edda; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;';
                correctAnswerDiv.innerHTML = `<strong style="color: #28a745;">الإجابة الصحيحة:</strong> ${q.answers[q.correctAnswer]}`;
                div.appendChild(correctAnswerDiv);
            }

            // التوضيح (إذا كان موجوداً)
            if (q.explanation) {
                const explanationDiv = document.createElement('div');
                explanationDiv.style.cssText = 'background: #e7f3ff; padding: 1rem; border-radius: 8px; border-right: 4px solid #007bff;';
                explanationDiv.innerHTML = `<strong>💡 توضيح:</strong> ${q.explanation}`;
                div.appendChild(explanationDiv);
            }

            container.appendChild(div);
        });

        this.showPage('review-page');
    },

    // عرض/إخفاء نافذة منبثقة
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('visible');
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('visible');
        }
    }
};

// تصدير للاستخدام العام
window.UI = UI;

// دوال مساعدة للتوافق مع الكود القديم
function showPage(pageId) {
    UI.showPage(pageId);
}

function showReviewPage() {
    if (window.Quiz && window.Quiz.currentQuestions && window.Quiz.userAnswers) {
        UI.showReview(window.Quiz.currentQuestions, window.Quiz.userAnswers);
    }
}

// متغير لحفظ الصفحة السابقة
let previousPage = 'chapters-page';

function showPointsPage() {
    showLeaderboard('chapters-page');
}

// عرض صفحة المتصدرين
async function showLeaderboard(fromPage = 'chapters-page') {
    previousPage = fromPage;
    UI.showPage('leaderboard-page');

    const container = document.getElementById('leaderboard-container');
    container.innerHTML = '<div class="leaderboard-loading">⏳ جاري التحميل...</div>';

    try {
        // مزامنة أي نقاط معلقة قبل عرض الترتيب لضمان الدقة
        if (window.Quiz && typeof window.Quiz.syncPendingPoints === 'function') {
            await window.Quiz.syncPendingPoints();
        }

        const response = await fetch('/api/users?action=all');
        const data = await response.json();

        if (!data.success || !data.users || data.users.length === 0) {
            container.innerHTML = '<div class="leaderboard-empty">لا يوجد مستخدمين بعد</div>';
            return;
        }

        // إنشاء جدول المتصدرين
        let html = '<div class="leaderboard-table">';

        data.users.forEach((user, index) => {
            const rank = index + 1;
            let rankIcon = '';
            let rankClass = '';

            if (rank === 1) {
                rankIcon = '🥇';
                rankClass = 'gold';
            } else if (rank === 2) {
                rankIcon = '🥈';
                rankClass = 'silver';
            } else if (rank === 3) {
                rankIcon = '🥉';
                rankClass = 'bronze';
            } else {
                rankIcon = rank;
                rankClass = '';
            }

            // تحقق إذا كان المستخدم الحالي
            const isCurrentUser = user.username === Storage.getUsername();



            html += `
                <div class="leaderboard-row ${rankClass} ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank">${rankIcon}</div>
                    <div class="leaderboard-info" style="display: flex; align-items: center; flex: 1;">
                         <div class="like-container">
                            <button class="like-btn ${isCurrentUser ? 'disabled' : ''}" 
                                    onclick="event.stopPropagation(); window.toggleLike('${user.username}', this)" 
                                    ${isCurrentUser ? 'disabled' : ''}>
                                <span class="like-icon">❤️</span>
                            </button>
                            <span class="like-count">${user.likes || 0}</span>
                        </div>
                        <div class="leaderboard-username" style="margin-right: 10px;">${user.username}</div>
                    </div>
                    <div class="leaderboard-points">${user.points} نقطة</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        container.innerHTML = '<div class="leaderboard-error">❌ فشل تحميل البيانات</div>';
    }
}

function goBackFromLeaderboard() {
    UI.showPage(previousPage);
}

function startNewExam() {
    UI.showPage('chapters-page');
}

// معالج إضافة سؤال للملاحظات من صفحة المراجعة
function handleAddToNotes(questionId, questionIndex) {
    if (!window.Quiz || !window.Quiz.currentQuestions || !window.Quiz.userAnswers) {
        return;
    }

    const question = window.Quiz.currentQuestions[questionIndex];
    const userAnswer = window.Quiz.userAnswers[questionIndex];

    if (!question) return;

    // توليد questionId موحد - نفس الطريقة المستخدمة في showReview
    // لا نستخدم index أبداً لأنه يتغير
    // إضافة رقم الفصل لضمان التفرقة بين الفصول
    const chapter = question.chapter || (window.Quiz && window.Quiz.selectedChapter) || null;
    let finalQuestionId = null;

    if (question.id) {
        finalQuestionId = chapter ? `ch${chapter}_${String(question.id).trim()}` : String(question.id).trim();
    } else if (question.question) {
        finalQuestionId = chapter ? `ch${chapter}_${String(question.question).trim()}` : String(question.question).trim();
    }

    if (!finalQuestionId) {
        showToast('لا يمكن إضافة هذا السؤال: السؤال لا يحتوي على معرف', 'warning');
        return;
    }

    // التحقق من أن questionId الممرر يطابق finalQuestionId
    if (questionId !== finalQuestionId) {
        console.warn('QuestionId mismatch:', questionId, 'vs', finalQuestionId);
        // استخدام finalQuestionId الصحيح
        questionId = finalQuestionId;
    }

    addQuestionToNotes(
        question.question,
        userAnswer,
        question.correctAnswer,
        question.answers,
        question.explanation,
        finalQuestionId,
        chapter
    );

    // تحديث حالة الزر بعد الإضافة
    setTimeout(() => {
        updateNoteButtonState(finalQuestionId);
    }, 100);
}

/* ====================================
   BDF File Upload Functions
   ==================================== */

// Open BDF Upload Modal
function openBDFUploadModal() {
    const modal = document.getElementById('bdf-upload-modal');
    modal.style.display = 'flex';

    // Reset file input
    const fileInput = document.getElementById('bdf-file-input');
    if (fileInput) {
        fileInput.value = '';
    }

    // Reset UI
    updateBDFUploadUI('initial');
}

// Close BDF Upload Modal
function closeBDFUploadModal() {
    const modal = document.getElementById('bdf-upload-modal');
    modal.style.display = 'none';
}

// Update Upload UI State
function updateBDFUploadUI(state, data = {}) {
    const dropZone = document.getElementById('drop-zone');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadButton = document.getElementById('upload-bdf-button');

    switch (state) {
        case 'initial':
            dropZone.style.display = 'flex';
            uploadProgress.style.display = 'none';
            uploadButton.disabled = true;
            uploadButton.textContent = 'اختر ملف أولاً';
            break;

        case 'file-selected':
            uploadButton.disabled = false;
            uploadButton.textContent = `رفع الملف: ${data.filename}`;
            break;

        case 'uploading':
            dropZone.style.display = 'none';
            uploadProgress.style.display = 'flex';
            uploadButton.disabled = true;
            document.getElementById('progress-text').textContent = 'جاري رفع الملف...';
            break;

        case 'success':
            document.getElementById('progress-text').textContent = '✅ تم الرفع بنجاح!';
            setTimeout(() => {
                closeBDFUploadModal();
            }, 2000);
            break;

        case 'error':
            dropZone.style.display = 'flex';
            uploadProgress.style.display = 'none';
            uploadButton.disabled = false;
            break;
    }
}

// Handle File Selection
function handleBDFFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    validateAndPreviewBDFFile(file);
}

// Handle Drag and Drop
function handleBDFDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        validateAndPreviewBDFFile(files[0]);
    }
}

function handleBDFDragOver(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.add('drag-over');
}

function handleBDFDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('drag-over');
}

// Validate and Preview File
function validateAndPreviewBDFFile(file) {
    // Check file extension (allow .bdf and .pdf)
    if (!file.name.toLowerCase().endsWith('.bdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('❌ يرجى اختيار ملف بصيغة PDF أو BDF', 'error');
        return;
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showToast('❌ حجم الملف كبير جداً. الحد الأقصى 50MB', 'error');
        return;
    }

    // Store file for upload
    window.selectedBDFFile = file;

    // Update UI
    updateBDFUploadUI('file-selected', { filename: file.name });

    showToast(`✅ الملف جاهز للرفع: ${file.name}`, 'success');
}

// Upload BDF File
async function uploadBDFFile() {
    if (!window.selectedBDFFile) {
        showToast('❌ يرجى اختيار ملف أولاً', 'error');
        return;
    }

    const file = window.selectedBDFFile;

    // Update UI to uploading state
    updateBDFUploadUI('uploading');

    try {
        // Get username from localStorage
        const username = localStorage.getItem('username') || 'مستخدم غير معروف';

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload file
        const response = await fetch('/api/actions', {
            method: 'POST',
            headers: {
                'X-Username': encodeURIComponent(username)
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            updateBDFUploadUI('success');
            showToast(result.message || '✅ تم رفع الملف بنجاح!', 'success');

            // Clear selected file
            window.selectedBDFFile = null;
        } else {
            const errorMsg = result.details ? `${result.error} (${result.details})` : (result.error || 'فشل رفع الملف');
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('Upload error:', error);
        updateBDFUploadUI('error');
        showToast(`❌ ${error.message}`, 'error');
    }
}

// Initialize BDF Upload Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('bdf-file-input');
    const dropZone = document.getElementById('drop-zone');

    if (fileInput) {
        fileInput.addEventListener('change', handleBDFFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('drop', handleBDFDrop);
        dropZone.addEventListener('dragover', handleBDFDragOver);
        dropZone.addEventListener('dragleave', handleBDFDragLeave);
    }
});
// Update review button state for current chapter
function updateReviewButtonForCurrentChapter() {
    if (!window.Quiz || !Quiz.selectedChapter) return;

    const wrongCount = Quiz.getWrongAnswersCount(Quiz.selectedChapter);
    const btn = document.getElementById('review-mistakes-btn');
    const countText = document.getElementById('review-count-text');

    if (!btn || !countText) return;

    if (wrongCount === 0) {
        btn.disabled = true;
        countText.textContent = 'لا توجد أخطاء';
    } else {
        btn.disabled = false;
        countText.textContent = `${wrongCount} سؤال تحتاج مراجعة`;
    }
}

// Update review button state for results page
function updateReviewButtonForResultsPage() {
    if (!window.Quiz || !Quiz.selectedChapter) return;

    const wrongCount = Quiz.getWrongAnswersCount(Quiz.selectedChapter);
    const btn = document.getElementById('review-mistakes-result-btn');
    const countText = document.getElementById('review-count-result-text');

    if (!btn || !countText) return;

    if (wrongCount === 0) {
        btn.disabled = true;
        countText.textContent = 'لا توجد أخطاء';
    } else {
        btn.disabled = false;
        countText.textContent = `${wrongCount} سؤال تحتاج مراجعة`;
    }
}

// Start review mode from question count page
function startReviewModeFromQuestionCount() {
    if (!window.Quiz || !Quiz.selectedChapter) return;

    const wrongCount = Quiz.getWrongAnswersCount(Quiz.selectedChapter);

    if (wrongCount === 0) {
        alert('لا توجد أخطاء للمراجعة!');
        return;
    }

    // Set review mode and question count to ALL wrong questions
    Quiz.isReviewMode = true;
    Quiz.questionCount = 'all'; // Show all wrong questions

    // Start quiz directly without timer modal
    Quiz.startQuiz(false);
}

// Start review mode from results page
function startReviewModeFromResults() {
    if (!window.Quiz || !Quiz.selectedChapter) return;

    const wrongCount = Quiz.getWrongAnswersCount(Quiz.selectedChapter);

    if (wrongCount === 0) {
        alert('لا توجد أخطاء للمراجعة!');
        return;
    }

    // Set review mode and question count to ALL wrong questions
    Quiz.isReviewMode = true;
    Quiz.questionCount = 'all'; // Show all wrong questions

    // Start quiz directly without timer modal
    Quiz.startQuiz(false);
}

// Export for use in other modules
window.updateReviewButtonForCurrentChapter = updateReviewButtonForCurrentChapter;
window.updateReviewButtonForResultsPage = updateReviewButtonForResultsPage;
window.startReviewModeFromQuestionCount = startReviewModeFromQuestionCount;
window.startReviewModeFromResults = startReviewModeFromResults;
window.selectSubject = (subject) => {
    if (window.Quiz) {
        window.Quiz.setSubject(subject);
        // Navigate to chapters page
        UI.showPage('chapters-page');
    }
};
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



// Feedback System Logic

function openFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset fields
        document.getElementById('feedback-message').value = '';
        document.getElementById('feedback-type').value = 'problem';
    }
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function submitFeedback() {
    const message = document.getElementById('feedback-message').value.trim();
    const type = document.getElementById('feedback-type').value;
    // Assuming 'currentUser' is globally available from app.js or similar
    // We'll fetch from localStorage if not available globally
    const username = localStorage.getItem('username') || 'Anonymous';

    if (!message) {
        alert('الرجاء كتابة رسالة قبل الإرسال');
        return;
    }

    const btn = document.getElementById('submit-feedback-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'جاري الإرسال... ⏳';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const response = await fetch('/api/actions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'submitFeedback',
                username: username,
                message: message,
                type: translateFeedbackType(type)
            })
        });

        if (response.ok) {
            btn.innerHTML = 'تم الإرسال بنجاح! ✅';
            setTimeout(() => {
                closeFeedbackModal();
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }, 1500);
        } else {
            throw new Error('Failed to send');
        }
    } catch (error) {
        console.error('Feedback error:', error);
        alert('حدث خطأ أثناء الإرسال. حاول مرة أخرى.');
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

function translateFeedbackType(type) {
    const types = {
        'problem': 'مشكلة تقنية',
        'rating': 'تقييم الموقع',
        'advice': 'نصيحة / اقتراح',
        'other': 'أخرى'
    };
    return types[type] || type;
}

// Expose functions to global scope
window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.submitFeedback = submitFeedback;
/* ====================================
   notes.js - إدارة الملاحظات
   ==================================== */

// عرض صفحة الملاحظات
function showNotesPage() {
    UI.showPage('notes-page');
    displayNotes();
}

// عرض جميع الملاحظات
function displayNotes() {
    const container = document.getElementById('notes-container');
    if (!container) return;

    const notes = Storage.getNotes();

    if (notes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">📝</div>
                <h3 style="margin-bottom: 0.5rem;">لا توجد ملاحظات</h3>
                <p>لم تقم بحفظ أي أسئلة بعد. يمكنك إضافة أسئلة للملاحظات من صفحة مراجعة الإجابات.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    // إضافة زر "اختبار في الملاحظات"
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'margin-bottom: 2rem; text-align: center;';

    const testButton = document.createElement('button');
    testButton.className = 'btn';
    testButton.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 2rem; border-radius: 50px; border: none; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s; display: inline-flex; align-items: center; gap: 0.5rem;';
    testButton.innerHTML = '📝 اختبار شامل للملاحظات';

    testButton.onclick = function () {
        if (typeof Quiz !== 'undefined' && Quiz.startNotesQuiz) {
            Quiz.startNotesQuiz();
        } else {
            console.error('Quiz module not loaded');
            alert('حدث خطأ في تحميل نظام الاختبارات');
        }
    };

    // Hover effect via JS since inline styles are used
    testButton.onmouseenter = () => testButton.style.transform = 'translateY(-3px)';
    testButton.onmouseleave = () => testButton.style.transform = 'translateY(0)';

    controlsDiv.appendChild(testButton);
    container.appendChild(controlsDiv);

    notes.forEach((note, index) => {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-item';
        noteDiv.style.cssText = `
            background: #f8f9fa;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border-radius: 12px;
            text-align: right;
            border: 2px solid #007bff;
            position: relative;
        `;

        const isCorrect = note.userAnswer === note.correctAnswer;
        const questionId = note.id || note.question;

        // إنشاء زر الحذف
        const deleteButton = document.createElement('button');
        deleteButton.setAttribute('data-note-id', questionId);
        deleteButton.style.cssText = 'background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;';
        deleteButton.textContent = '🗑️ حذف';
        deleteButton.onclick = function () {
            const noteId = this.getAttribute('data-note-id');
            removeNoteFromList(noteId);
        };

        // إنشاء العنوان
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;';

        const titleH3 = document.createElement('h3');
        titleH3.style.cssText = 'color: #007bff; margin: 0;';
        titleH3.textContent = `📌 السؤال ${index + 1}`;

        headerDiv.appendChild(titleH3);
        headerDiv.appendChild(deleteButton);

        // نص السؤال
        const questionP = document.createElement('p');
        questionP.style.cssText = 'font-weight: 600; margin-bottom: 1rem; color: #2c3e50;';
        questionP.textContent = note.question;

        // إجابتك
        const userAnswerDiv = document.createElement('div');
        userAnswerDiv.style.cssText = 'background: #fff; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;';
        const userAnswerText = note.answers && note.answers[note.userAnswer]
            ? note.answers[note.userAnswer]
            : (note.userAnswer === true ? 'صواب' : note.userAnswer === false ? 'خطأ' : note.userAnswer);
        userAnswerDiv.innerHTML = `<strong style="color: ${isCorrect ? '#28a745' : '#dc3545'};">إجابتك:</strong> ${userAnswerText}`;

        // الإجابة الصحيحة
        const correctAnswerDiv = document.createElement('div');
        correctAnswerDiv.style.cssText = 'background: #d4edda; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;';
        const correctAnswerText = note.answers && note.answers[note.correctAnswer]
            ? note.answers[note.correctAnswer]
            : (note.correctAnswer === true ? 'صواب' : note.correctAnswer === false ? 'خطأ' : note.correctAnswer);
        correctAnswerDiv.innerHTML = `<strong style="color: #28a745;">الإجابة الصحيحة:</strong> ${correctAnswerText}`;

        // إضافة العناصر
        noteDiv.appendChild(headerDiv);
        noteDiv.appendChild(questionP);
        noteDiv.appendChild(userAnswerDiv);
        noteDiv.appendChild(correctAnswerDiv);

        // التوضيح (إذا كان موجوداً)
        if (note.explanation) {
            const explanationDiv = document.createElement('div');
            explanationDiv.style.cssText = 'background: #e7f3ff; padding: 1rem; border-radius: 8px; border-right: 4px solid #007bff;';
            explanationDiv.innerHTML = `<strong>💡 توضيح:</strong> ${note.explanation}`;
            noteDiv.appendChild(explanationDiv);
        }

        // تاريخ الإضافة
        if (note.addedAt) {
            const dateDiv = document.createElement('div');
            dateDiv.style.cssText = 'margin-top: 1rem; color: #6b7280; font-size: 0.9rem;';
            dateDiv.textContent = `تم الإضافة: ${new Date(note.addedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            noteDiv.appendChild(dateDiv);
        }

        container.appendChild(noteDiv);
    });
}

// إضافة سؤال للملاحظات
function addQuestionToNotes(question, userAnswer, correctAnswer, answers, explanation, questionId, chapter = null) {
    const questionData = {
        id: questionId || question,
        question: question,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        answers: answers,
        explanation: explanation || '',
        chapter: chapter
    };

    const result = Storage.addNote(questionData);

    if (result === 'updated') {
        showToast('تم تحديث الملاحظة بنجاح! 🔄', 'success');
        // تحديث حالة الزر
        updateNoteButtonState(questionId || question);
    } else if (result === 'added' || result === true) {
        showToast('تم إضافة السؤال للملاحظات بنجاح! ✅', 'success');
        // تحديث حالة الزر
        updateNoteButtonState(questionId || question);
    } else {
        showToast('السؤال موجود بالفعل في الملاحظات', 'warning');
    }
}

// حذف سؤال من الملاحظات
function removeNoteFromList(questionId) {
    if (!questionId) {
        console.error('questionId is missing');
        return;
    }

    if (confirm('هل أنت متأكد من حذف هذا السؤال من الملاحظات؟')) {
        const result = Storage.removeNote(questionId);
        if (result) {
            showToast('تم حذف السؤال من الملاحظات', 'success');
            displayNotes();
        } else {
            showToast('حدث خطأ أثناء حذف السؤال', 'error');
        }
    }
}

// تحديث حالة زر "أضف للملاحظات"
function updateNoteButtonState(questionId) {
    if (!questionId) return;

    // البحث عن الزر باستخدام data-question-id
    const allButtons = document.querySelectorAll('[data-question-id]');
    let btn = null;

    const searchId = String(questionId).trim();
    allButtons.forEach(button => {
        const btnId = String(button.getAttribute('data-question-id') || '').trim();
        if (btnId === searchId) {
            btn = button;
        }
    });

    if (!btn) return;

    const exists = Storage.isNoteExists(questionId);
    if (exists) {
        btn.textContent = '✅ تم الإضافة';
        btn.disabled = true;
        btn.style.background = '#28a745';
    } else {
        btn.textContent = '📌 أضف للملاحظات';
        btn.disabled = false;
        btn.style.background = '#007bff';
    }
}

// تصدير للاستخدام العام
window.showNotesPage = showNotesPage;
window.displayNotes = displayNotes;
window.addQuestionToNotes = addQuestionToNotes;
window.removeNoteFromList = removeNoteFromList;
window.updateNoteButtonState = updateNoteButtonState;

/* ====================================
   quiz.js - منطق الاختبار
   ==================================== */

const Quiz = {
    currentQuestions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    // State
    state: {
        currentSubject: 'design', // Default subject
        currentChapter: 1,
        score: 0,
        timer: 0,
        timerInterval: null,
        userAnswers: {},
        currentQuestionIndex: 0,
        questions: [], // Loaded questions for current subject/chapter
        reviewMode: false,
        showingWrongOnly: false
    },

    subjects: {
        design: { name: "الرسومات التعليمية", path: "design" },
        teaching: { name: "مناهج وطرق التدريس", path: "teaching" }
    },

    init() {
        // ... previous init code ...
        // Load subject from storage or default
        const savedSubject = localStorage.getItem('currentSubject');
        if (savedSubject && this.subjects[savedSubject]) {
            this.state.currentSubject = savedSubject;
        }
    },

    setSubject(subjectKey) {
        if (this.subjects[subjectKey]) {
            this.state.currentSubject = subjectKey;
            localStorage.setItem('currentSubject', subjectKey);

            // Refresh global question pool for the new subject
            this.refreshGlobalQuestions();

            // Update UI title if needed
            const titleEl = document.getElementById('subject-title');
            if (titleEl) {
                titleEl.textContent = this.subjects[subjectKey].name;
            }

            // NOTE: Do not navigate here. Navigation is handled by window.selectSubject
        }
    },

    // Refresh window.questions based on current subject
    refreshGlobalQuestions() {
        window.questions = [];
        const subjectKey = this.state.currentSubject;

        if (window.QuestionBank && window.QuestionBank[subjectKey]) {
            const bank = window.QuestionBank[subjectKey];
            for (let i = 1; i <= 5; i++) {
                if (bank[`chapter${i}`]) {
                    window.questions = window.questions.concat(bank[`chapter${i}`]);
                }
            }
        }
        console.log(`🔄 تم تحديث الأسئلة للمادة (${subjectKey}): ${window.questions.length}`);
    },

    loadQuestions(chapterId) {
        this.state.currentChapter = chapterId;

        // Ensure questions are refreshed just in case
        // But mainly we rely on the global pool being correct

        this.isReviewMode = false; // Reset review mode
        this.isNotesMode = false; // Reset notes mode
        UI.showPage('quiz-type-select-page');
    },

    // اختيار فصل
    selectChapter(chapter) {
        this.selectedChapter = chapter;
        this.loadQuestions(chapter);
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
            console.log(`جاري إرسال ${pending} نقطة إلى السيرفر...`);
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-points',
                    username,
                    pointsToAdd: pending
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
// --- State Management ---
class AppState {
    constructor() {
        this.gameState = 'setup'; // setup, quiz, results
        this.questionCount = 3;
        this.quizQuestions = [];
        this.currentQIndex = 0;
        this.answers = {}; // { qId: { question, modelAnswer, userAnswer, aiFeedback, status, score } }
        this.loading = false;
        this.errorMsg = '';
        this.selectedChapter = null;
    }

    reset() {
        this.gameState = 'setup';
        this.questionCount = 3;
        this.quizQuestions = [];
        this.currentQIndex = 0;
        this.answers = {};
        this.loading = false;
        this.errorMsg = '';
    }
}

// --- Main App Controller ---
class EssayQuizApp {
    constructor() {
        this.state = new AppState();
        this.appContainer = document.getElementById('essay-app');
    }

    init(selectedChapter) {
        this.state.selectedChapter = selectedChapter;
        this.render();
    }

    render() {
        this.appContainer.innerHTML = '';

        const header = this.createHeader();
        this.appContainer.appendChild(header);

        const mainContent = document.createElement('div');
        mainContent.className = 'main-content';

        if (this.state.gameState === 'setup') {
            mainContent.appendChild(this.createSetupView());
        } else if (this.state.gameState === 'quiz') {
            mainContent.appendChild(this.createQuizView());
        } else if (this.state.gameState === 'results') {
            mainContent.appendChild(this.createResultsView());
        }

        this.appContainer.appendChild(mainContent);
    }

    createHeader() {
        const header = document.createElement('header');
        header.className = 'header';

        header.innerHTML = `
            <h1>نظام اختبار المقالات الذكي</h1>
           
        `;

        return header;
    }

    createSetupView() {
        const container = document.createElement('div');
        container.className = 'setup-content';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.minHeight = '60vh';

        // إنشاء بطاقة منسقة
        const card = document.createElement('div');
        card.className = 'setup-card';
        card.style.background = 'rgba(255, 255, 255, 0.95)';
        card.style.padding = '2.5rem';
        card.style.borderRadius = '24px';
        card.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.1)';
        card.style.width = '100%';
        card.style.maxWidth = '480px';
        card.style.textAlign = 'center';

        // العنوان
        const title = document.createElement('h3');
        title.textContent = 'إعدادات الاختبار';
        title.style.color = '#1f2937';
        title.style.fontSize = '1.5rem';
        title.style.fontWeight = '700';
        title.style.marginBottom = '2rem';

        const countGroup = document.createElement('div');
        countGroup.className = 'input-group';
        countGroup.style.marginBottom = '2rem';

        // تحسين العداد
        const subjectKey = (window.Quiz && window.Quiz.state && window.Quiz.state.currentSubject) || 'design';
        const bank = window.QuestionBank && window.QuestionBank[subjectKey];
        const essayQs = (bank && bank.essay) || [];
        const maxQuestions = essayQs.length;

        countGroup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <label for="countRange" style="font-size: 1.1rem; color: #4b5563; font-weight: 500;">عدد الأسئلة</label>
                <span class="count-badge" style="background: #4f46e5; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9rem;">${this.state.questionCount}</span>
            </div>
            <input 
                type="range" 
                id="countRange"
                min="1" 
                max="${maxQuestions}" 
                value="${this.state.questionCount}"
                class="range-slider"
                style="width: 100%; height: 6px; background: #e5e7eb; border-radius: 5px; outline: none; -webkit-appearance: none; cursor: pointer;"
            />
            <div class="range-info" style="display: flex; justify-content: space-between; color: #9ca3af; font-size: 0.85rem; margin-top: 0.5rem;">
                <span>1</span>
                <span>${maxQuestions}</span>
            </div>
        `;

        const errorBox = this.state.errorMsg ?
            this.createErrorBox(this.state.errorMsg) :
            document.createElement('div');

        const startBtn = document.createElement('button');
        startBtn.className = 'btn btn-primary';
        startBtn.textContent = 'بدء الامتحان';
        startBtn.style.width = '100%';
        startBtn.style.padding = '1rem';
        startBtn.style.fontSize = '1.1rem';
        startBtn.style.borderRadius = '12px';
        startBtn.style.marginTop = '1rem';
        startBtn.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
        startBtn.style.border = 'none';
        startBtn.style.color = 'white';
        startBtn.style.cursor = 'pointer';
        startBtn.style.transition = 'transform 0.2s, box-shadow 0.2s';

        // تأثير الهوفر
        startBtn.onmouseover = () => {
            startBtn.style.transform = 'translateY(-2px)';
            startBtn.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
        };
        startBtn.onmouseout = () => {
            startBtn.style.transform = 'translateY(0)';
            startBtn.style.boxShadow = 'none';
        };

        // Event listeners
        document.addEventListener('change', (e) => {
            if (e.target.id === 'countRange') {
                this.state.questionCount = parseInt(e.target.value);
                // تحديث الرقم المعروض
                const badge = countGroup.querySelector('.count-badge');
                if (badge) badge.textContent = this.state.questionCount;
            }
        });

        // تحديث القيمة مباشرة أثناء التحريك
        document.addEventListener('input', (e) => {
            if (e.target.id === 'countRange') {
                const val = parseInt(e.target.value);
                const badge = countGroup.querySelector('.count-badge');
                if (badge) badge.textContent = val;
            }
        });

        startBtn.addEventListener('click', () => this.startQuiz());

        card.appendChild(title);
        card.appendChild(countGroup);
        if (this.state.errorMsg) card.appendChild(errorBox);
        card.appendChild(startBtn);

        container.appendChild(card);

        return container;
    }

    createQuizView() {
        const container = document.createElement('div');
        container.className = 'quiz-content';

        const currentQuestion = this.state.quizQuestions[this.state.currentQIndex];
        const isAnswered = !!this.state.answers[currentQuestion.id];
        const currentAnswer = this.state.answers[currentQuestion.id];

        // Header with progress
        const header = document.createElement('div');
        header.className = 'quiz-header';
        header.innerHTML = `
            <span class="quiz-counter">سؤال ${this.state.currentQIndex + 1} من ${this.state.quizQuestions.length}</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${((this.state.currentQIndex + 1) / this.state.quizQuestions.length) * 100}%"></div>
            </div>
        `;

        // Question
        const questionEl = document.createElement('h2');
        questionEl.className = 'quiz-question';
        questionEl.textContent = currentQuestion.question;

        // Textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'answer-textarea';
        textarea.placeholder = 'اكتب إجابتك هنا...';
        textarea.disabled = isAnswered || this.state.loading;

        if (isAnswered) {
            textarea.value = currentAnswer.userAnswer;
            textarea.classList.add(currentAnswer.status);
        }

        // Error message
        const errorBox = this.state.errorMsg ?
            this.createErrorBox(this.state.errorMsg) :
            document.createElement('div');

        // Buttons container
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.style.marginTop = '1.5rem';

        if (!isAnswered) {
            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-primary';
            submitBtn.disabled = this.state.loading || !textarea.value.trim();
            submitBtn.innerHTML = this.state.loading
                ? '<div class="loader" style="display: inline-block; margin-right: 0.5rem;"></div> جاري التصحيح...'
                : 'إرسال الإجابة';

            submitBtn.addEventListener('click', () => {
                if (textarea.value.trim()) {
                    this.handleAnswerSubmit(textarea.value);
                }
            });

            textarea.addEventListener('input', () => {
                submitBtn.disabled = this.state.loading || !textarea.value.trim();
            });

            buttonGroup.appendChild(submitBtn);
        } else {
            // Feedback section
            const feedbackSection = this.createFeedbackSection(currentAnswer, currentQuestion);
            buttonGroup.appendChild(feedbackSection);

            // Buttons container for multiple buttons
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'grid';
            buttonsContainer.style.gridTemplateColumns = '1fr 1fr 1fr';
            buttonsContainer.style.gap = '0.5rem';

            // Reset button
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn btn-secondary';
            resetBtn.style.backgroundColor = '#f97316';
            resetBtn.style.fontSize = '0.85rem';
            resetBtn.textContent = 'إعادة';
            resetBtn.addEventListener('click', () => this.resetCurrentQuestion());

            // Skip button
            const skipBtn = document.createElement('button');
            skipBtn.className = 'btn btn-secondary';
            skipBtn.style.backgroundColor = '#6366f1';
            skipBtn.style.fontSize = '0.85rem';
            skipBtn.textContent = 'تخطي';
            skipBtn.addEventListener('click', () => this.skipQuestion());

            // Next button
            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-secondary';
            nextBtn.style.fontSize = '0.85rem';
            nextBtn.textContent = this.state.currentQIndex < this.state.quizQuestions.length - 1
                ? 'التالي'
                : 'النتائج';
            nextBtn.addEventListener('click', () => this.nextQuestion());

            buttonsContainer.appendChild(resetBtn);
            buttonsContainer.appendChild(skipBtn);
            buttonsContainer.appendChild(nextBtn);
            buttonGroup.appendChild(buttonsContainer);
        }

        container.appendChild(header);
        container.appendChild(questionEl);

        const spacer = document.createElement('div');
        spacer.style.marginBottom = '1.5rem';

        container.appendChild(textarea);
        if (this.state.errorMsg) container.appendChild(errorBox);
        container.appendChild(buttonGroup);

        return container;
    }

    createFeedbackSection(answerData, question) {
        const section = document.createElement('div');
        section.className = `feedback-section feedback-${answerData.status}`;
        section.classList.add('animate-fade-in');

        const statusIcon = {
            correct: '✅ إجابة صحيحة',
            partial: '⚠️ إجابة ناقصة',
            incorrect: '❌ إجابة خاطئة'
        }[answerData.status];

        const statusColor = {
            correct: '#16a34a',
            partial: '#b45309',
            incorrect: '#dc2626'
        }[answerData.status];

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '0.5rem';
        header.style.marginBottom = '0.75rem';

        const statusText = document.createElement('span');
        statusText.style.color = statusColor;
        statusText.style.fontSize = '0.875rem';
        statusText.textContent = statusIcon;

        const scoreBadge = document.createElement('span');
        scoreBadge.style.fontSize = '0.75rem';
        scoreBadge.style.fontFamily = 'monospace';
        scoreBadge.style.backgroundColor = 'white';
        scoreBadge.style.padding = '0.25rem 0.5rem';
        scoreBadge.style.borderRadius = '0.25rem';
        scoreBadge.style.border = '1px solid #d1d5db';
        scoreBadge.textContent = `Score: ${answerData.score}/10`;

        header.appendChild(statusText);
        header.appendChild(scoreBadge);

        const feedback = document.createElement('p');
        feedback.style.color = '#374151';
        feedback.style.lineHeight = '1.8';
        feedback.style.fontSize = '0.95rem';
        feedback.style.marginBottom = '0.75rem';
        feedback.style.wordWrap = 'break-word';
        feedback.style.overflowWrap = 'break-word';
        feedback.textContent = answerData.feedback;

        section.appendChild(header);
        section.appendChild(feedback);

        if (answerData.status !== 'correct') {
            const divider = document.createElement('div');
            divider.style.marginTop = '0.75rem';
            divider.style.paddingTop = '0.75rem';
            divider.style.borderTop = '1px solid rgba(0,0,0,0.1)';

            const modelLabel = document.createElement('p');
            modelLabel.style.fontSize = '0.8rem';
            modelLabel.style.fontWeight = 'bold';
            modelLabel.style.color = '#6b7280';
            modelLabel.style.marginBottom = '0.5rem';
            modelLabel.style.textTransform = 'uppercase';
            modelLabel.style.letterSpacing = '0.5px';
            modelLabel.textContent = 'الإجابة النموذجية:';

            const modelAnswer = document.createElement('p');
            modelAnswer.style.fontSize = '0.95rem';
            modelAnswer.style.color = '#374151';
            modelAnswer.style.lineHeight = '1.8';
            modelAnswer.style.wordWrap = 'break-word';
            modelAnswer.style.overflowWrap = 'break-word';
            modelAnswer.textContent = question.model_answer;

            divider.appendChild(modelLabel);
            divider.appendChild(modelAnswer);
            section.appendChild(divider);
        }

        return section;
    }

    createResultsView() {
        const container = document.createElement('div');
        container.className = 'results-content';

        const totalQs = Object.keys(this.state.answers).length;

        // ✅ تغيير حساب النقاط: نقطتين لكل إجابة صحيحة فقط
        const correctAnswers = Object.values(this.state.answers).filter(ans => ans.status === 'correct').length;
        const totalPoints = correctAnswers * 2;

        const totalPossiblePoints = totalQs * 2;
        const percentage = totalQs > 0 ? Math.round((totalPoints / totalPossiblePoints) * 100) : 0;

        // ✅ تحديث النقاط في قاعدة البيانات
        this.updateUserPoints(totalPoints);

        // Score section
        const scoreSection = document.createElement('div');
        scoreSection.style.marginBottom = '2rem';

        const title = document.createElement('h2');
        title.className = 'results-title';
        title.textContent = 'انتهى الاختبار!';

        const percentageEl = document.createElement('div');
        percentageEl.className = 'result-percentage';
        percentageEl.classList.add(percentage >= 50 ? 'high' : 'low');
        percentageEl.textContent = `%${percentage}`;

        const scoreText = document.createElement('p');
        scoreText.style.color = '#6b7280';
        scoreText.style.marginTop = '0.5rem';
        scoreText.textContent = `النقاط: ${totalPoints} من ${totalPossiblePoints} (${correctAnswers} إجابة صحيحة)`;

        scoreSection.appendChild(title);
        scoreSection.appendChild(percentageEl);
        scoreSection.appendChild(scoreText);
        container.appendChild(scoreSection);

        // Review section
        const reviewSection = document.createElement('div');
        reviewSection.className = 'results-review';

        const reviewTitle = document.createElement('h3');
        reviewTitle.textContent = 'مراجعة الإجابات:';
        reviewSection.appendChild(reviewTitle);

        Object.values(this.state.answers).forEach((ans, idx) => {
            const card = document.createElement('div');
            card.className = 'result-card';

            const questionText = document.createElement('p');
            questionText.className = 'answer-item-question';
            questionText.textContent = `س: ${ans.question}`;

            const scoreLine = document.createElement('div');
            scoreLine.className = 'score-line';

            const statusBadge = document.createElement('span');
            statusBadge.className = `status-badge status-${ans.status}`;
            statusBadge.textContent = {
                correct: 'صحيحة',
                partial: 'ناقصة',
                incorrect: 'خاطئة'
            }[ans.status];

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'score-text';
            scoreSpan.textContent = `${ans.score}/10`;

            scoreLine.appendChild(statusBadge);
            scoreLine.appendChild(scoreSpan);

            const userAnswerText = document.createElement('p');
            userAnswerText.className = 'answer-item-answer';
            userAnswerText.style.lineHeight = '1.7';
            userAnswerText.style.wordWrap = 'break-word';
            userAnswerText.style.overflowWrap = 'break-word';
            userAnswerText.innerHTML = `<span style="font-weight: 600;">إجابتك:</span> ${ans.userAnswer}`;

            const feedbackText = document.createElement('p');
            feedbackText.className = 'answer-item-feedback';
            feedbackText.style.lineHeight = '1.7';
            feedbackText.style.wordWrap = 'break-word';
            feedbackText.style.overflowWrap = 'break-word';
            feedbackText.innerHTML = `<span style="font-weight: 600;">المصحح:</span> ${ans.feedback}`;

            card.appendChild(questionText);
            card.appendChild(scoreLine);
            card.appendChild(userAnswerText);
            card.appendChild(feedbackText);
            reviewSection.appendChild(card);
        });

        container.appendChild(reviewSection);

        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '1rem';
        buttonsContainer.style.justifyContent = 'center';
        buttonsContainer.style.marginTop = '2rem';
        buttonsContainer.style.flexWrap = 'wrap';

        // Leaderboard button
        const leaderboardBtn = document.createElement('button');
        leaderboardBtn.className = 'btn btn-warning';
        leaderboardBtn.textContent = '🏆 المتصدرين';
        leaderboardBtn.addEventListener('click', () => {
            // Exit essay mode first
            document.body.classList.remove('essay-mode');
            this.appContainer.innerHTML = '';
            // Show leaderboard
            if (window.showLeaderboard) {
                window.showLeaderboard('chapters-page');
            }
        });

        // Restart button
        const restartBtn = document.createElement('button');
        restartBtn.className = 'btn btn-primary';
        restartBtn.textContent = 'اختبار جديد';
        restartBtn.addEventListener('click', () => this.restart());

        buttonsContainer.appendChild(leaderboardBtn);
        buttonsContainer.appendChild(restartBtn);
        container.appendChild(buttonsContainer);

        return container;
    }

    createErrorBox(message) {
        const box = document.createElement('div');
        box.className = 'error-message';
        box.textContent = message;
        return box;
    }

    startQuiz() {
        const count = parseInt(document.getElementById('countRange').value);
        this.state.questionCount = count;

        // جلب الأسئلة
        const subjectKey = (window.Quiz && window.Quiz.state && window.Quiz.state.currentSubject) || 'design';
        const bank = window.QuestionBank && window.QuestionBank[subjectKey];
        const essayQs = (bank && bank.essay) || [];

        // تصفية الأسئلة حسب الفصل المختار
        let filteredQuestions;
        if (this.state.selectedChapter && this.state.selectedChapter !== 'full') {
            filteredQuestions = essayQs.filter(q => q.chapter == this.state.selectedChapter);
        } else {
            filteredQuestions = [...essayQs];
        }

        if (filteredQuestions.length === 0) {
            alert('عفواً، لا توجد أسئلة متاحة لهذا الاختيار حالياً.');
            // العودة للصفحة الرئيسية
            if (window.UI) {
                window.UI.showPage('chapters-page');
            }
            return;
        }

        // Shuffle and select questions
        const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
        // التأكد من أن عدد الأسئلة لا يتجاوز المتاح
        const actualCount = Math.min(this.state.questionCount, shuffled.length);

        this.state.quizQuestions = shuffled.slice(0, actualCount);

        this.state.gameState = 'quiz';
        this.state.currentQIndex = 0;
        this.state.answers = {};
        this.state.errorMsg = '';

        this.render();
    }

    async handleAnswerSubmit(userAnswer) {
        this.state.loading = true;
        this.render();

        const currentQ = this.state.quizQuestions[this.state.currentQIndex];
        this.state.errorMsg = '';

        try {
            const aiResult = await this.evaluateAnswerWithGemini(
                currentQ.question,
                currentQ.model_answer,
                userAnswer
            );

            this.state.answers[currentQ.id] = {
                question: currentQ.question,
                modelAnswer: currentQ.model_answer,
                userAnswer: userAnswer,
                ...aiResult
            };

        } catch (err) {
            console.error("Evaluation Error:", err);
            this.state.errorMsg = `حدث خطأ: ${err.message || "فشل الاتصال بالخادم"}`;
        } finally {
            this.state.loading = false;
            this.render();
        }
    }

    nextQuestion() {
        if (this.state.currentQIndex < this.state.quizQuestions.length - 1) {
            this.state.currentQIndex++;
            this.state.errorMsg = '';
        } else {
            this.state.gameState = 'results';
        }
        this.render();
    }

    resetCurrentQuestion() {
        const currentQ = this.state.quizQuestions[this.state.currentQIndex];
        // حذف إجابة السؤال الحالي
        delete this.state.answers[currentQ.id];
        // إعادة تصيير الصفحة
        this.render();
    }

    skipQuestion() {
        // الانتقال للسؤال التالي مباشرة دون الإجابة
        if (this.state.currentQIndex < this.state.quizQuestions.length - 1) {
            this.state.currentQIndex++;
            this.state.errorMsg = '';
        } else {
            this.state.gameState = 'results';
        }
        this.render();
    }

    restart() {
        // Exit essay mode and return to main system
        document.body.classList.remove('essay-mode');
        this.appContainer.innerHTML = '';
        // Return to chapters page
        if (window.UI) {
            window.UI.showPage('chapters-page');
        }
    }

    // ✅ تحديث نقاط المستخدم في قاعدة البيانات (مع التجميع لتقليل الطلبات)
    async updateUserPoints(points) {
        const username = Storage.getUsername();

        if (!username || username === 'مستخدم') {
            console.log('لا يوجد مستخدم محفوظ');
            return;
        }

        // نحن نستخدم نفس مفتاح LocalStorage الخاص بـ Quiz.js لتوحيد الرصيد المعلق
        // 1. تحديث النقاط محلياً فوراً
        const currentTotal = Storage.getPoints();
        // Storage.addPoints(points) يجب أن يتم استدعاؤه بشكل منفصل إذا لم يكن مضافاً، 
        // لكن هنا في المقالي لا يتم استدعاء Storage.addPoints إلا يدوياً، 
        // سأتأكد من إضافتها للرصيد المحلي الظاهري أيضاً
        Storage.addPoints(points);

        // 2. إدارة النقاط المعلقة (Pending Points)
        let pending = parseInt(localStorage.getItem('pendingPoints') || '0');
        pending += points;
        localStorage.setItem('pendingPoints', pending);

        console.log(`[Essay] تم إضافة ${points} نقطة للمحفظة المحلية. الرصيد المعلق: ${pending}`);

        // 3. التحقق من حد الإرسال (Threshold)
        const SYNC_THRESHOLD = 50;

        // نحاول استخدام دالة المزامنة الموجودة في Quiz إذا كانت متاحة لتوحيد الكود
        if (pending >= SYNC_THRESHOLD) {
            console.log(`[Essay] تم تجاوز الحد (${SYNC_THRESHOLD})، جاري المزامنة...`);
            if (window.Quiz && typeof window.Quiz.syncPendingPoints === 'function') {
                await window.Quiz.syncPendingPoints();
            } else {
                // Fallback implementation if Quiz object is not available
                await this.syncPendingPointsFallback(username, pending);
            }
        }
    }

    async syncPendingPointsFallback(username, pending) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-points',
                    username,
                    pointsToAdd: pending
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ [Fallback] تم مزامنة النقاط بنجاح:', data.user.points);
                localStorage.setItem('pendingPoints', '0');
                Storage.set('userPoints', data.user.points);
            }
        } catch (error) {
            console.error('خطأ في المزامنة الاحتياطية:', error);
        }
    }

    async evaluateAnswerWithGemini(question, modelAnswer, userAnswer) {
        // الاتصال بالـ Serverless Function بدلاً من Gemini مباشرة
        // هذا يحمي API key من الظهور في الكود الأمامي
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                modelAnswer,
                userAnswer
            })
        });

        if (!response.ok) {
            let errorDetails = 'فشل الاتصال بالخادم';
            try {
                const errData = await response.json();
                errorDetails = errData.error || errorDetails;
                if (errData.details) {
                    console.error('Detailed Error:', errData.details);
                    errorDetails += ` (${errData.details.substring(0, 100)}...)`;
                }
            } catch (e) {
                // ignore JSON parse error
            }
            throw new Error(errorDetails);
        }

        const result = await response.json();
        return result;
    }
}

// --- Export والتهيئة ---
window.EssayQuiz = {
    app: null,
    init(selectedChapter) {
        this.app = new EssayQuizApp();
        this.app.init(selectedChapter);
    }
};/* ====================================
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
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', username })
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

        // الانتقال لاختيار المادة
        UI.showPage('subject-selection-page');
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
            const response = await fetch('/api/users', {
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

            // ترحيل البيانات القديمة إلى الاسم الجديد قبل الحفظ
            if (Storage.migrateUserData) {
                Storage.migrateUserData(currentUsername, data.user.username);
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

// Obsolete selectSubject removed. Using window.selectSubject defined earlier.;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function () {
    console.log('🎓 تطبيق الاختبارات جاهز!');

    // تفعيل الوضع الداكن إذا كان محفوظاً
    if (Storage.isDarkMode()) {
        document.body.classList.add('dark-mode');
        Storage.updateDarkModeToggle();
    }

    // ✅ التحقق من تحديث المنهج ومسح البيانات القديمة
    if (Storage.checkAppVersion()) {
        showToast('تم تحديث المنهج! 📚\nتم بدء فصل دراسي جديد.', 'info', 5000);
    }

    // ✅ تحقق من وجود مستخدم محفوظ في قاعدة البيانات
    const savedUsername = Storage.getUsername();
    if (savedUsername && savedUsername !== 'مستخدم') {
        console.log('🔄 التحقق من صلاحية الجلسة للمستخدم:', savedUsername);

        // ⚡ واجهة متفائلة: عرض اختيار المادة فوراً بناءً على التخزين المحلي
        // هذا يمنع ظهور صفحة الترحيب أثناء انتظار السيرفر
        UI.showPage('subject-selection-page');

        // التحقق من السيرفر في الخلفية
        fetch(`/api/users?username=${encodeURIComponent(savedUsername)}`)
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

    // ✅ إشعار "متصل" مرة واحدة فقط عند الفتح (بدون تكرار)
    // هذا لا يستهلك قاعدة البيانات لأنه لا يحفظ شيئاً، فقط يرسل لتليجرام
    console.log('📡 إرسال إشعار اتصال للمستخدم:', username);
    updateUserActivity(true);

    // تم تعطيل الـ Interval لتوفير الموارد
    // timeTrackingInterval = setInterval(() => { ... }, 30000);
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

        fetch('/api/users', {
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
window.toggleLike = async function (targetUsername, btnElement) {
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
        await fetch('/api/users', {
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

// Summaries Modal Functions
window.showSummariesModal = function () {
    const modal = document.getElementById('summaries-modal');
    if (modal) {
        modal.classList.add('visible');
    }
};

window.closeSummariesModal = function () {
    const modal = document.getElementById('summaries-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
};

window.openSummaryPDF = function (filename) {
    // مسار ملف PDF - يجب أن يكون مسار نسبي من موقع المشروع
    // من Sound-techniques/index.html إلى Sound-techniques/الفصول/
    const pdfPath = `الفصول/${encodeURIComponent(filename)}`;

    try {
        // فتح ملف PDF في تبويب جديد
        const newWindow = window.open(pdfPath, '_blank');

        // التحقق من فتح النافذة بنجاح
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            showToast('تعذر فتح الملف. يرجى التحقق من وجود الملف.', 'error');
        } else {
            // إغلاق الـ modal بعد فتح الملف
            closeSummariesModal();
            showToast(`تم فتح ملف: ${filename}`, 'success');
        }
    } catch (error) {
        console.error('خطأ في فتح ملف PDF:', error);
        showToast('حدث خطأ أثناء فتح الملف', 'error');
    }
};

// إغلاق الـ modal عند الضغط خارجها
document.addEventListener('DOMContentLoaded', function () {
    const summariesModal = document.getElementById('summaries-modal');
    if (summariesModal) {
        summariesModal.addEventListener('click', function (e) {
            if (e.target === summariesModal) {
                closeSummariesModal();
            }
        });
    }
});

// ====================================
// تجميع الأسئلة من جميع الفصول
// ====================================
document.addEventListener('DOMContentLoaded', function () {
    // تجميع الأسئلة من جميع الفصول
    window.questions = [];

    // Determine subject - default to 'design' if not set
    const subjectKey = (window.Quiz && window.Quiz.state && window.Quiz.state.currentSubject) || 'design';

    // تجميع الأسئلة من جميع الفصول الاولي
    if (window.Quiz && window.Quiz.refreshGlobalQuestions) {
        window.Quiz.refreshGlobalQuestions();
    } else {
        // Fallback if Quiz object is not fully ready (should not happen usually)
        window.questions = [];
        console.warn('Quiz object not ready for initial question loading');
    }
});
