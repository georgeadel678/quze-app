
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
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
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
