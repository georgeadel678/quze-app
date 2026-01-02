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
    updateUploadUI('initial');
}

// Close BDF Upload Modal
function closeBDFUploadModal() {
    const modal = document.getElementById('bdf-upload-modal');
    modal.style.display = 'none';
}

// Update Upload UI State
function updateUploadUI(state, data = {}) {
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
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    validateAndPreviewFile(file);
}

// Handle Drag and Drop
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        validateAndPreviewFile(files[0]);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('drag-over');
}

// Validate and Preview File
function validateAndPreviewFile(file) {
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.bdf')) {
        showToast('❌ يرجى اختيار ملف بصيغة BDF فقط', 'error');
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
    updateUploadUI('file-selected', { filename: file.name });

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
    updateUploadUI('uploading');

    try {
        // Get username from localStorage
        const username = localStorage.getItem('username') || 'مستخدم غير معروف';

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload file
        const response = await fetch('/api/upload-bdf', {
            method: 'POST',
            headers: {
                'X-Username': username
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            updateUploadUI('success');
            showToast(result.message || '✅ تم رفع الملف بنجاح!', 'success');

            // Clear selected file
            window.selectedBDFFile = null;
        } else {
            throw new Error(result.error || 'فشل رفع الملف');
        }

    } catch (error) {
        console.error('Upload error:', error);
        updateUploadUI('error');
        showToast(`❌ ${error.message}`, 'error');
    }
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('bdf-file-input');
    const dropZone = document.getElementById('drop-zone');

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('drop', handleDrop);
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
    }
});

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast-notification toast-${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
