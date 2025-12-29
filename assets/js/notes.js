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

        noteDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="color: #007bff; margin: 0;">
                    📌 السؤال ${index + 1}
                </h3>
                <button onclick="removeNoteFromList('${note.id || note.question}')" 
                        style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                    🗑️ حذف
                </button>
            </div>
            <p style="font-weight: 600; margin-bottom: 1rem; color: #2c3e50;">
                ${note.question}
            </p>
            <div style="background: #fff; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <strong style="color: ${isCorrect ? '#28a745' : '#dc3545'};">إجابتك:</strong>
                ${note.answers && note.answers[note.userAnswer] ? note.answers[note.userAnswer] : (note.userAnswer === true ? 'صواب' : note.userAnswer === false ? 'خطأ' : note.userAnswer)}
            </div>
            <div style="background: #d4edda; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <strong style="color: #28a745;">الإجابة الصحيحة:</strong>
                ${note.answers && note.answers[note.correctAnswer] ? note.answers[note.correctAnswer] : (note.correctAnswer === true ? 'صواب' : note.correctAnswer === false ? 'خطأ' : note.correctAnswer)}
            </div>
            ${note.explanation ? `
                <div style="background: #e7f3ff; padding: 1rem; border-radius: 8px; border-right: 4px solid #007bff;">
                    <strong>💡 توضيح:</strong> ${note.explanation}
                </div>
            ` : ''}
            ${note.addedAt ? `
                <div style="margin-top: 1rem; color: #6b7280; font-size: 0.9rem;">
                    تم الإضافة: ${new Date(note.addedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            ` : ''}
        `;

        container.appendChild(noteDiv);
    });
}

// إضافة سؤال للملاحظات
function addQuestionToNotes(question, userAnswer, correctAnswer, answers, explanation, questionId) {
    const questionData = {
        id: questionId || question,
        question: question,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        answers: answers,
        explanation: explanation || ''
    };

    const added = Storage.addNote(questionData);
    
    if (added) {
        showToast('تم إضافة السؤال للملاحظات بنجاح! ✅', 'success');
        // تحديث حالة الزر
        updateNoteButtonState(questionId || question);
    } else {
        showToast('السؤال موجود بالفعل في الملاحظات', 'warning');
    }
}

// حذف سؤال من الملاحظات
function removeNoteFromList(questionId) {
    // Escape special characters in questionId for use in onclick
    const escapedId = questionId.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    if (confirm('هل أنت متأكد من حذف هذا السؤال من الملاحظات؟')) {
        Storage.removeNote(questionId);
        showToast('تم حذف السؤال من الملاحظات', 'success');
        displayNotes();
    }
}

// تحديث حالة زر "أضف للملاحظات"
function updateNoteButtonState(questionId) {
    const btn = document.querySelector(`[data-question-id="${questionId}"]`);
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

