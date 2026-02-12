import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

// Fail fast if token is missing
if (!HF_TOKEN) {
    console.error("❌ [FATAL] HF_TOKEN environment variable is not set!");
    process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. RAILWAY HEALTH CHECK
app.get('/', (req, res) => {
    console.log("💓 [HEALTH] Railway pinged us.");
    res.status(200).send('Proxy is Online');
});

// 2. THE TEST ENDPOINT (Simplified - text input only)
app.get('/test-hf', async (req, res) => {
    console.log("🧪 [TEST] Pinging Hugging Face with text input...");
    try {
        const response = await fetch("https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: "test product photo" }),
            timeout: 30000
        });

        const text = await response.text();
        console.log("📩 [TEST] HF Response Status:", response.status);
        console.log("📩 [TEST] HF Response Body:", text.substring(0, 200));
        
        res.status(response.ok ? 200 : response.status)
           .json({ 
               status: response.ok ? "✅ SUCCESS" : "⚠️ FAILED",
               httpStatus: response.status,
               preview: text.substring(0, 500)
           });
    } catch (error) {
        console.error("❌ [TEST] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. MAIN VECTORIZER
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    
    if (!image_base64 && !image_url) {
        return res.status(400).json({ error: "Provide either image_base64 or image_url" });
    }
    
    try {
        let body;
        let headers = { "Authorization": `Bearer ${HF_TOKEN}` };

        if (image_url) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify({ inputs: image_url });
        } else {
            const base64Data = image_base64.split(',')[1] || image_base64;
            body = Buffer.from(base64Data, 'base64');
        }

        const hfRes = await fetch("https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: headers,
            body: body,
            timeout: 60000
        });

        const responseText = await hfRes.text();
        
        if (responseText.trim().startsWith('[')) {
            res.json({ embedding: JSON.parse(responseText) });
        } else {
            console.error("⚠️ [HF ERROR]:", responseText.substring(0, 200));
            res.status(hfRes.status).json({ error: responseText });
        }
    } catch (error) {
        console.error("💥 [SYSTEM ERROR]:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 4. ERROR HANDLERS
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ [UNCAUGHT EXCEPTION]', error);
    process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SYSTEM] Server listening on ${PORT}`);
    console.log("✅ [SYSTEM] HF Token loaded successfully");
});