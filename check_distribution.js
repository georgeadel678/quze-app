const fs = require('fs');
const path = require('path');

const designDir = '/home/george/Desktop/platformQuizz/Sound-techniques/assets/data/questions/design';
const chapters = [1, 2, 3, 4, 5, 6, 7];

chapters.forEach(chapterNum => {
    const filename = `chapter${chapterNum}.js`;
    const fullPath = path.join(designDir, filename);

    if (!fs.existsSync(fullPath)) {
        return;
    }

    let fileContent = fs.readFileSync(fullPath, 'utf8');
    global.window = {};
    try {
        eval(fileContent);
    } catch (e) {
        return;
    }

    const questions = window.QuestionBank?.design?.[`chapter${chapterNum}`];
    if (!questions) return;

    const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 'other': 0 };
    let maxIndex = 0;

    questions.forEach(q => {
        if (!q.answers || q.answers.length <= 2) return; // Skip T/F

        if (typeof distribution[q.correctAnswer] !== 'undefined') {
            distribution[q.correctAnswer]++;
        } else {
            distribution['other']++;
        }
        if (q.correctAnswer > maxIndex) maxIndex = q.correctAnswer;
    });

    console.log(`Chapter ${chapterNum}:`, distribution, `Max Index: ${maxIndex}`);
});
