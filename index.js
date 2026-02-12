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
    console.log("💓 [HEALTH] Railway heartbeat received.");
    res.status(200).send('Vectorizer Proxy Online');
});

// 2. THE TEST ENDPOINT - Verifies the Router Connection
app.get('/test-hf', async (req, res) => {
    const imageUrl = req.query.image_url || "https://www.kisasacraft.co.ke/cdn/shop/files/IMG_3491.jpg?v=1761125454&width=360";
    
    console.log(`🧪 [TEST] Running connectivity test with image: ${imageUrl.substring(0, 50)}...`);
    
    try {
        const response = await fetch("https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: imageUrl }),
        });

        const text = await response.text();
        console.log(`📍 [TEST] HF Status: ${response.status}`);
        
        if (response.ok) {
            const data = JSON.parse(text);
            console.log("✅ [TEST] Success! Vector received.");
            res.json({ status: "Connected", vector_size: data.length, success: true });
        } else {
            console.error("❌ [TEST] HF rejected request:", text);
            res.status(response.status).json({ success: false, error: text });
        }
    } catch (error) {
        console.error("💥 [TEST] System Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. MAIN VECTORIZER
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const requestId = Math.random().toString(36).substring(7);

    console.log(`📩 [REQ-${requestId}] New vectorization request...`);

    if (!image_base64 && !image_url) {
        return res.status(400).json({ error: "Provide image_base64 or image_url" });
    }

    try {
        let body;
        let headers = { "Authorization": `Bearer ${HF_TOKEN}` };

        if (image_url) {
            console.log(`🌐 [REQ-${requestId}] Source: URL`);
            headers["Content-Type"] = "application/json";
            body = JSON.stringify({ inputs: image_url });
        } else {
            console.log(`📄 [REQ-${requestId}] Source: Base64`);
            const base64Data = image_base64.split(',')[1] || image_base64;
            body = Buffer.from(base64Data, 'base64');
            headers["Content-Type"] = "image/jpeg"; 
        }

        console.log(`🛰️ [REQ-${requestId}] Forwarding to HF Router...`);
        
        const hfRes = await fetch("https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: headers,
            body: body,
        });

        const responseText = await hfRes.text();
        console.log(`📥 [REQ-${requestId}] HF Response Status: ${hfRes.status}`);

        if (hfRes.ok) {
            const embedding = JSON.parse(responseText);
            console.log(`✅ [REQ-${requestId}] Vectorization successful.`);
            res.json({ embedding });
        } else {
            console.error(`⚠️ [REQ-${requestId}] HF Error:`, responseText.substring(0, 200));
            res.status(hfRes.status).json({ error: responseText });
        }
    } catch (error) {
        console.error(`💥 [REQ-${requestId}] System Failure:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// 4. ERROR HANDLERS
process.on('unhandledRejection', (reason) => {
    console.error('❌ [CRITICAL] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ [CRITICAL] Uncaught Exception:', error);
    process.exit(1);
});

// 5. GRACEFUL SHUTDOWN
let server;
process.on('SIGTERM', () => {
    console.log('📍 [SHUTDOWN] Signal received. Closing connections...');
    if (server) {
        server.close(() => {
            console.log('✅ [SHUTDOWN] Cleanup complete.');
            process.exit(0);
        });
    }
});

server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SYSTEM] Vectorizer online on port ${PORT}`);
    console.log(`✅ [SYSTEM] HF_TOKEN length: ${HF_TOKEN.length} chars`);
});