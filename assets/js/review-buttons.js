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

// Export for use in other modules
window.updateReviewButtonForCurrentChapter = updateReviewButtonForCurrentChapter;
window.startReviewModeFromQuestionCount = startReviewModeFromQuestionCount;
