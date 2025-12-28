// WhatsApp Channel Verification System
(function () {
    'use strict';

    const STORAGE_KEY = 'whatsapp_verified';
    const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029VbBdWXVGk1Fm2YKm8L37';

    // Check verification status on page load
    function checkVerificationStatus() {
        const isVerified = localStorage.getItem(STORAGE_KEY) === 'true';

        if (!isVerified) {
            showVerificationModal();
            blockSiteInteractions();
        }
    }

    // Show verification modal
    function showVerificationModal() {
        const modal = document.getElementById('whatsapp-verification-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // Hide verification modal
    function hideVerificationModal() {
        const modal = document.getElementById('whatsapp-verification-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        enableSiteInteractions();
    }

    // Block all site interactions
    function blockSiteInteractions() {
        document.body.classList.add('verification-blocked');
    }

    // Enable site interactions
    function enableSiteInteractions() {
        document.body.classList.remove('verification-blocked');
    }

    // Handle verification link click
    function handleVerificationClick(event) {
        // Open WhatsApp link in new tab
        window.open(WHATSAPP_LINK, '_blank');

        // Mark as verified
        localStorage.setItem(STORAGE_KEY, 'true');

        // Hide modal
        hideVerificationModal();
    }

    // Initialize on DOM ready
    function init() {
        // Check verification status
        checkVerificationStatus();

        // Attach click handler to verification button
        const verifyBtn = document.getElementById('verify-whatsapp-btn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', handleVerificationClick);
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
