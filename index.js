import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Increase limit for Base64 strings
app.use(express.json({ limit: '50mb' }));

let browser;
let page;

async function initBrowser() {
    console.log("🛠️ Starting Browser initialization...");
    try {
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process' // Helps with memory on Railway
            ],
            headless: "new"
        });

        page = await browser.newPage();
        const filePath = `file://${path.join(__dirname, 'logic.html')}`;
        await page.goto(filePath);
        
        console.log("✅ Browser & AI Logic Ready for Requests");
    } catch (e) {
        console.error("❌ FAILED TO START BROWSER:", e);
    }
}

// Start browser immediately
initBrowser();

// CHANGE: Route must match your Edge Function (/vectorize)
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const source = image_url || image_base64;

    console.log("📩 Request received. Processing image...");

    if (!source) return res.status(400).json({ error: "No image source" });

    try {
        if (!page) {
            console.log("⚠️ Page not ready, re-initializing...");
            await initBrowser();
        }

        // Run the function inside the browser
        const embedding = await page.evaluate(async (input) => {
            return await window.getEmbedding(input);
        }, source);

        if (embedding.error) throw new Error(embedding.error);

        console.log("🎯 Vectorization successful.");
        res.json({ embedding });

    } catch (error) {
        console.error("💥 Execution Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Health check for Railway
app.get('/', (req, res) => res.send('Vectorizer is Alive'));

app.listen(PORT, '0.0.0.0', () => console.log(`🌍 Server active on port ${PORT}`));