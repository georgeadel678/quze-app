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
        const questionId = String(questionData.id || questionData.question || '').trim();
        if (!questionId) {
            console.error('Cannot add note: questionId is empty');
            return false;
        }

        // التحقق من وجود السؤال باستخدام مقارنة موحدة
        const exists = notes.some(note => {
            const noteId = String(note.id || note.question || '').trim();
            return noteId === questionId;
        });

        if (exists) {
            return false; // السؤال موجود بالفعل
        }

        // التأكد من وجود id في questionData - هذا مهم جداً للمقارنة
        if (!questionData.id) {
            questionData.id = questionId;
        } else {
            // التأكد من أن id محفوظ كـ string
            questionData.id = String(questionData.id).trim();
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
        let notes = this.get(key, []);
        
        // تنظيف الملاحظات القديمة - التأكد من وجود id لكل ملاحظة
        let needsUpdate = false;
        notes = notes.map(note => {
            if (!note.id && note.question) {
                // إذا لم يكن هناك id، نستخدم question كـ id
                note.id = String(note.question).trim();
                needsUpdate = true;
            } else if (note.id) {
                // التأكد من أن id هو string
                note.id = String(note.id).trim();
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
    isNoteExists(questionId) {
        if (!questionId) {
            return false;
        }
        
        const notes = this.getNotes();
        if (!notes || notes.length === 0) {
            return false;
        }
        
        const searchId = String(questionId).trim();
        if (!searchId || searchId === 'null' || searchId === 'undefined') {
            return false;
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
                if (isNaN(searchId) && noteQuestion === searchId && noteQuestion.length > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }
};

// تصدير للاستخدام العام
window.Storage = Storage;
