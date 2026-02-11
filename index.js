import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080; // Railway often prefers 8080

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let browser = null;
let page = null;

/**
 * Initializes the headless browser. 
 * Note: We do NOT provide an executablePath here. 
 * Puppeteer will find the Chrome we installed in ./.cache/puppeteer
 */
async function initBrowser() {
    console.log("🛠️ Initializing Puppeteer Instance...");
    try {
        if (browser) await browser.close();

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process' // Saves memory on Railway Hobby
            ],
            headless: "new"
        });

        page = await browser.newPage();
        
        // Load the logic.html file that contains Transformers.js
        const filePath = `file://${path.join(__dirname, 'logic.html')}`;
        await page.goto(filePath);
        
        console.log("✅ Headless Browser & AI Model Ready");
    } catch (e) {
        console.error("❌ BROWSER INIT FAILED:", e.message);
        browser = null;
        page = null;
    }
}

// Initial boot
initBrowser();

/**
 * Endpoint: /vectorize
 * Receives: { image_url, image_base64 }
 * Returns: { embedding: [...] }
 */
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const source = image_url || image_base64;

    console.log("📩 Request Received. Source type:", image_url ? "URL" : "Base64");

    if (!source) {
        return res.status(400).json({ error: "Missing image source (url or base64)" });
    }

    try {
        // Safety check: If browser crashed or didn't start, try once to recover
        if (!page) {
            console.warn("⚠️ Browser page not found. Attempting emergency restart...");
            await initBrowser();
            if (!page) throw new Error("Browser failed to initialize.");
        }

        // Execute the embedding logic inside the hidden browser page
        const result = await page.evaluate(async (input) => {
            if (typeof window.getEmbedding !== 'function') {
                return { error: "getEmbedding function not found in logic.html" };
            }
            return await window.getEmbedding(input);
        }, source);

        if (result.error) {
            throw new Error(result.error);
        }

        console.log("🎯 Vectorization Complete.");
        res.json({ embedding: result });

    } catch (error) {
        console.error("💥 Vectorizer Error:", error.message);
        res.status(500).json({ 
            error: error.message,
            context: "Node Vectorizer (Railway)"
        });
    }
});

// Health check endpoint for Railway monitoring
app.get('/', (req, res) => res.send('AI Vectorizer is Online'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌍 Server active on port ${PORT}`);
});