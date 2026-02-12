import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

// The correct Router Endpoint for 2026
const HF_ROUTER_URL = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32";

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => res.send('<h1>Vectorizer Proxy: Router Edition</h1>'));

// 🧪 THE TEST ENDPOINT (Uses your new JSON research)
app.get('/test-hf', async (req, res) => {
    const testUrl = "https://www.kisasacraft.co.ke/cdn/shop/files/IMG_3491.jpg?v=1761125454&width=360";
    console.log("🧪 [TEST] Pinging Router with your new JSON format...");

    try {
        const response = await fetch(HF_ROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            // THE CRITICAL FORMAT YOU FOUND:
            body: JSON.stringify({ 
                inputs: { image: testUrl } 
            })
        });

        const text = await response.text();
        console.log(`📍 [TEST] Status: ${response.status}`);
        res.status(response.status).send(text);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 🚀 THE MAIN VECTORIZER
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const reqId = Math.random().toString(36).substring(7);

    try {
        let inputSource;

        if (image_url) {
            console.log(`🌐 [REQ-${reqId}] Type: URL`);
            inputSource = image_url;
        } else {
            console.log(`📄 [REQ-${reqId}] Type: Base64`);
            // Hugging Face likes the full data URI or just the string
            inputSource = image_base64.includes('base64,') ? image_base64 : `data:image/jpeg;base64,${image_base64}`;
        }

        const hfRes = await fetch(HF_ROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            // APPLYING YOUR RESEARCH HERE TOO:
            body: JSON.stringify({ 
                inputs: { image: inputSource } 
            })
        });

        const responseText = await hfRes.text();

        if (hfRes.ok) {
            console.log(`✅ [REQ-${reqId}] Success.`);
            res.json({ embedding: JSON.parse(responseText) });
        } else {
            console.error(`⚠️ [REQ-${reqId}] HF Error:`, responseText);
            res.status(hfRes.status).send(responseText);
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