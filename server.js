
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import actionsHandler from './api/actions.js';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// Serve static files (HTML, CSS, JS) from the root directory
app.use(express.static(__dirname));

// API Routes

// 1. Actions API (Feedback + BDF Upload)
app.post('/api/actions', async (req, res) => {
    console.log(`[API] POST /api/actions`);
    try {
        await actionsHandler(req, res);
    } catch (error) {
        console.error('[API Error]', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Server running locally!`);
    console.log(`🏠 Home: http://localhost:${PORT}`);
    console.log(`📡 API:  http://localhost:${PORT}/api/actions`);
    console.log(`===============================================`);
});
