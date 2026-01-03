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

