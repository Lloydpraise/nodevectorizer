import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

// 2026 Router Endpoint
const HF_ROUTER_URL = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32";

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => res.send('<h1>VVStudios Vectorizer: Router Edition</h1>'));

// 🧪 UPDATED TEST ENDPOINT
app.get('/test-hf', async (req, res) => {
    const testUrl = "https://www.kisasacraft.co.ke/cdn/shop/files/IMG_3491.jpg?v=1761125454&width=360";
    console.log("🧪 [TEST] Pinging Router for Embeddings...");

    try {
        const response = await fetch(HF_ROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
                "x-wait-for-model": "true" // 👈 Critical for 2026 cold starts
            },
            body: JSON.stringify({ 
                inputs: testUrl // 👈 Simplified: Just the string/URL
            })
        });

        const data = await response.json();
        console.log(`📍 [TEST] Status: ${response.status}`);
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 🚀 REWRITTEN MAIN VECTORIZER
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const reqId = Math.random().toString(36).substring(7);

    try {
        let payload;

        if (image_url) {
            console.log(`🌐 [REQ-${reqId}] Type: URL`);
            payload = { inputs: image_url };
        } else {
            console.log(`📄 [REQ-${reqId}] Type: Base64`);
            // ⚠️ FIX: Strip prefix if present. HF needs the RAW base64 string.
            const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, "");
            payload = { inputs: cleanBase64 };
        }

        const hfRes = await fetch(HF_ROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
                "x-wait-for-model": "true" 
            },
            body: JSON.stringify(payload)
        });

        const result = await hfRes.json();

        if (hfRes.ok) {
            console.log(`✅ [REQ-${reqId}] Success. Vector length: ${result.length || 'N/A'}`);
            res.json({ embedding: result });
        } else {
            console.error(`⚠️ [REQ-${reqId}] HF Error:`, result);
            res.status(hfRes.status).json(result);
        }
    } catch (error) {
        console.error(`💥 [REQ-${reqId}] Crash:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy active on ${PORT}`);
    console.log(`🔗 Token check: ${HF_TOKEN ? "OK (" + HF_TOKEN.length + " chars)" : "MISSING"}`);
});