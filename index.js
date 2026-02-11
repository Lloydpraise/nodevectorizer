import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let browser;
let page;

async function initBrowser() {
    console.log("🛠️ Starting Browser initialization...");
    try {
        // REMOVED executablePath to let Puppeteer use its bundled Chromium
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            headless: "new"
        });

        page = await browser.newPage();
        const filePath = `file://${path.join(__dirname, 'logic.html')}`;
        await page.goto(filePath);
        
        console.log("✅ Browser & AI Logic Ready");
    } catch (e) {
        console.error("❌ FAILED TO START BROWSER:", e);
    }
}

initBrowser();

app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const source = image_url || image_base64;

    if (!source) return res.status(400).json({ error: "No image source" });

    try {
        if (!page) {
            // If page isn't ready, we try one more time
            await initBrowser();
            if (!page) throw new Error("Browser environment failed to initialize");
        }

        const embedding = await page.evaluate(async (input) => {
            return await window.getEmbedding(input);
        }, source);

        if (embedding.error) throw new Error(embedding.error);

        res.json({ embedding });
    } catch (error) {
        console.error("💥 Execution Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🌍 Server active on port ${PORT}`));