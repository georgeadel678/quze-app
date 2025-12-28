// Update review button states based on wrong answer counts
function updateReviewButtons() {
    if (!window.Quiz) return;

    for (let ch = 1; ch <= 6; ch++) {
        const wrongCount = Quiz.getWrongAnswersCount(ch);
        const btn = document.getElementById(`review-ch${ch}-btn`);

        if (!btn) continue;

        if (wrongCount === 0) {
            btn.disabled = true;
            btn.textContent = '📝 مراجعة الأخطاء';
        } else {
            btn.disabled = false;
            btn.textContent = `📝 مراجعة الأخطاء (${wrongCount})`;
        }
    }
}

// Call on page load and when returning to chapter selection
document.addEventListener('DOMContentLoaded', () => {
    updateReviewButtons();
});

// Export for use in other modules
window.updateReviewButtons = updateReviewButtons;
