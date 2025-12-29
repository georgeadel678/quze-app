/* ====================================
   storage.js - إدارة التخزين المحلي
   ==================================== */

const Storage = {
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
        const questionId = questionData.id || questionData.question;
        if (notes.some(note => (note.id || note.question) === questionId)) {
            return false; // السؤال موجود بالفعل
        }

        // إضافة تاريخ الإضافة
        questionData.addedAt = new Date().toISOString();
        notes.push(questionData);

        this.set(key, notes);
        return true;
    },

    // جلب جميع الملاحظات
    getNotes() {
        const username = this.getUsername();
        if (!username || username === 'مستخدم') return [];

        const key = `notes_${username}`;
        return this.get(key, []);
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
    isNoteExists(questionId) {
        const notes = this.getNotes();
        return notes.some(note => (note.id || note.question) === questionId);
    }
};

// تصدير للاستخدام العام
window.Storage = Storage;
