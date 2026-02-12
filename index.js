import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

// --- CONFIGURATION ---
// This specific URL is the only one that works with the new 2026 Router
const HF_ROUTER_URL = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32";

if (!HF_TOKEN) {
    console.error("❌ [FATAL] HF_TOKEN is missing in Railway Variables!");
    process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. RAILWAY HEALTH CHECK (Prevents reboots)
app.get('/', (req, res) => {
    console.log("💓 [HEALTH] Railway heartbeat received.");
    res.status(200).send('<h1>Vectorizer Proxy: Online</h1>');
});

// 2. THE TEST ENDPOINT (Use this to verify HF is awake)
app.get('/test-hf', async (req, res) => {
    const testImage = "https://www.kisasacraft.co.ke/cdn/shop/files/IMG_3491.jpg?v=1761125454&width=360";
    console.log("🧪 [TEST] Pinging HF Router with test image...");
    
    try {
        const response = await fetch(HF_ROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: testImage }),
        });

        const text = await response.text();
        console.log(`📍 [TEST] Status: ${response.status}`);
        
        if (response.ok) {
            const data = JSON.parse(text);
            console.log("✅ [TEST] Success! Model is awake.");
            res.json({ status: "Connected", success: true, vector_sample: data.slice(0, 5) });
        } else {
            console.error("❌ [TEST] HF Error:", text);
            res.status(response.status).json({ success: false, error: text });
        }
    } catch (error) {
        console.error("💥 [TEST] Crash:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. MAIN VECTORIZER (The one your app calls)
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const reqId = Math.random().toString(36).substring(7);

    console.log(`📩 [REQ-${reqId}] Vectorizing...`);

    try {
        let body;
        let headers = { "Authorization": `Bearer ${HF_TOKEN}` };

        if (image_url) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify({ inputs: image_url });
        } else {
            // Convert Base64 to raw binary for Hugging Face
            const base64Data = image_base64.split(',')[1] || image_base64;
            body = Buffer.from(base64Data, 'base64');
            headers["Content-Type"] = "image/jpeg";
        }

        const hfRes = await fetch(HF_ROUTER_URL, {
            method: "POST",
            headers: headers,
            body: body,
        });

        const responseText = await hfRes.text();

        if (hfRes.ok) {
            console.log(`✅ [REQ-${reqId}] Vector returned.`);
            res.json({ embedding: JSON.parse(responseText) });
        } else {
            console.error(`⚠️ [REQ-${reqId}] HF Error:`, responseText);
            res.status(hfRes.status).json({ error: responseText });
        }
    } catch (error) {
        console.error(`💥 [REQ-${reqId}] System Error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SYSTEM] Proxy active on port ${PORT}`);
    console.log(`🔗 [SYSTEM] Target URL: ${HF_ROUTER_URL}`);
});