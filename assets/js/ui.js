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
            `;

            const isCorrect = userAnswers[index] === q.correctAnswer;

            div.innerHTML = `
                <h3 style="color: ${isCorrect ? '#28a745' : '#dc3545'}; margin-bottom: 1rem;">
                    ${isCorrect ? '✅' : '❌'} السؤال ${index + 1}
                </h3>
                <p style="font-weight: 600; margin-bottom: 1rem; color: #2c3e50;">
                    ${q.question}
                </p>
                <div style="background: #fff; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                    <strong style="color: ${isCorrect ? '#28a745' : '#dc3545'};">إجابتك:</strong>
                    ${q.answers[userAnswers[index]] || 'لم تجب'}
                </div>
                ${!isCorrect ? `
                    <div style="background: #d4edda; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                        <strong style="color: #28a745;">الإجابة الصحيحة:</strong>
                        ${q.answers[q.correctAnswer]}
                    </div>
                ` : ''}
                ${q.explanation ? `
                    <div style="background: #e7f3ff; padding: 1rem; border-radius: 8px; border-right: 4px solid #007bff;">
                        <strong>💡 توضيح:</strong> ${q.explanation}
                    </div>
                ` : ''}
            `;

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
        const response = await fetch('/api/users/all');
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
