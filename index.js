import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. RAILWAY HEALTH CHECK (Must return 200 for Railway to keep the app alive)
app.get('/', (req, res) => {
    console.log("💓 [HEALTH] Railway pinged us.");
    res.status(200).send('Proxy is Online');
});

// 2. THE TEST ENDPOINT (Call this to see the real HF response)
app.get('/test-hf', async (req, res) => {
    console.log("🧪 [TEST] Pinging Hugging Face...");
    try {
        const response = await fetch("https://router.huggingface.co/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: "test" }),
        });

        const text = await response.text();
        console.log("📩 [TEST] HF Response:", text);
        res.status(response.ok ? 200 : 400).send(text);
    } catch (error) {
        console.error("❌ [TEST] Error:", error.message);
        res.status(500).send(error.message);
    }
});

// 3. MAIN VECTORIZER
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    
    try {
        let body;
        let headers = { "Authorization": `Bearer ${HF_TOKEN}` };

        if (image_url) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify({ inputs: image_url });
        } else {
            const base64Data = image_base64.split(',')[1] || image_base64;
            body = Buffer.from(base64Data, 'base64');
            // Hugging Face detects binary automatically
        }

        const hfRes = await fetch("https://router.huggingface.co/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: headers,
            body: body,
        });

        const responseText = await hfRes.text();
        
        // Only try to parse if it looks like JSON
        if (responseText.trim().startsWith('[')) {
            res.json({ embedding: JSON.parse(responseText) });
        } else {
            console.error("⚠️ [HF ERROR]:", responseText);
            res.status(hfRes.status).send(responseText);
        }
    } catch (error) {
        console.error("💥 [SYSTEM ERROR]:", error.message);
        res.status(500).send(error.message);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SYSTEM] Server listening on ${PORT}`);
    console.log(HF_TOKEN ? "✅ [SYSTEM] Token found" : "❌ [SYSTEM] HF_TOKEN IS MISSING!");
});