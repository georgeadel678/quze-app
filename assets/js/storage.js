/* ====================================
   storage.js - إدارة التخزين المحلي
   ==================================== */
// الإصدار الحالي للتطبيق - تغيير هذا الرقم سيقوم بمسح بيانات المستخدمين
const APP_VERSION = 'v2_museums_2025';

const Storage = {
    // التحقق من إصدار التطبيق ومسح البيانات القديمة
    checkAppVersion() {
        const savedVersion = this.get('app_version');

        if (savedVersion !== APP_VERSION) {
            console.log(`Detected new app version: ${APP_VERSION} (was ${savedVersion}). Cleaning up old data...`);

            // قائمة المفاتيح التي يجب الاحتفاظ بها (مثل اسم المستخدم إذا أردنا، لكن الطلب كان "كلو يبداء من الاول")
            // الطلب: "تصفر كل النقط وكلو يبداء من الاول"
            // لذا سنحتفظ فقط باسم المستخدم لتسهيل الدخول، لكن نصفر النقاط وكل شيء آخر
            const username = this.getUsername();
            const userId = this.get('userId');

            // مسح كل شيء
            this.clear();

            // استعادة بيانات المستخدم الأساسية فقط (بدون نقاط)
            if (username && username !== 'مستخدم') {
                this.set('username', username);
                if (userId) this.set('userId', userId);
            }

            // تعيين الإصدار الجديد
            this.set('app_version', APP_VERSION);

            return true; // تم التحديث (يستدعي إعادة تحميل أو إشعار)
        }
        return false; // الإصدار متطابق
    },

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
        let questionId = String(questionData.id || questionData.question || '').trim();
        if (!questionId) {
            console.error('Cannot add note: questionId is empty');
            return false;
        }

        // إضافة chapter إلى questionId إذا كان موجوداً ولم يكن موجوداً بالفعل
        const chapter = questionData.chapter || null;
        if (chapter && !questionId.startsWith(`ch${chapter}_`)) {
            questionId = `ch${chapter}_${questionId}`;
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
        questionData.id = questionId;

        // حفظ chapter أيضاً في questionData
        if (chapter) {
            questionData.chapter = chapter;
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

        // تنظيف الملاحظات القديمة - التأكد من وجود id لكل ملاحظة وإضافة chapter إذا لم يكن موجوداً
        let needsUpdate = false;
        notes = notes.map(note => {
            let updated = false;

            if (!note.id && note.question) {
                // إذا لم يكن هناك id، نستخدم question كـ id
                // إضافة chapter إذا كان موجوداً
                if (note.chapter && !String(note.question).trim().startsWith(`ch${note.chapter}_`)) {
                    note.id = `ch${note.chapter}_${String(note.question).trim()}`;
                } else {
                    note.id = String(note.question).trim();
                }
                updated = true;
            } else if (note.id) {
                // التأكد من أن id هو string
                const oldId = String(note.id).trim();
                // إذا كان هناك chapter ولم يكن موجوداً في id، نضيفه
                if (note.chapter && !oldId.startsWith(`ch${note.chapter}_`)) {
                    note.id = `ch${note.chapter}_${oldId}`;
                    updated = true;
                } else {
                    note.id = oldId;
                }
            }

            if (updated) {
                needsUpdate = true;
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
    isNoteExists(questionId, chapter = null) {
        if (!questionId) {
            return false;
        }

        const notes = this.getNotes();
        if (!notes || notes.length === 0) {
            return false;
        }

        let searchId = String(questionId).trim();
        if (!searchId || searchId === 'null' || searchId === 'undefined') {
            return false;
        }

        // إذا كان questionId لا يحتوي على chapter prefix وكان chapter موجود، نضيفه
        if (chapter && !searchId.startsWith(`ch${chapter}_`)) {
            searchId = `ch${chapter}_${searchId}`;
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
                if (isNaN(searchId.replace(/^ch\d+_/, '')) && noteQuestion === searchId && noteQuestion.length > 0) {
                    return true;
                }
            }
        }

        return false;
    }
};

// تصدير للاستخدام العام
window.Storage = Storage;
