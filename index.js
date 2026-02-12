import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

console.log("🛠️ [SYSTEM] Booting Direct-Fetch Vectorizer...");

// --- 1. HEALTH CHECK ---
app.get('/', (req, res) => {
    res.status(200).send('Vectorizer Proxy Online (Direct Fetch Mode)');
});

// --- 2. THE TEST ENDPOINT ---
app.get('/test-hf', async (req, res) => {
    console.log("🧪 [TEST] Pinging Hugging Face via Direct Fetch...");
    try {
        const response = await fetch("https://router.huggingface.co/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: "test ping" }),
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(JSON.stringify(result));

        console.log("✅ [TEST] Success! Hugging Face responded.");
        res.json({ status: "Connected", provider: "Direct HTTP", vector_length: result.length });
    } catch (error) {
        console.error("❌ [TEST] Error:", error.message);
        res.status(500).json({ status: "Failed", error: error.message });
    }
});

// --- 3. MAIN VECTORIZER ---
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    
    try {
        let imageInput;
        if (image_url) {
            const imgRes = await fetch(image_url);
            imageInput = await imgRes.arrayBuffer(); // Get raw bytes
        } else if (image_base64) {
            const base64Data = image_base64.split(',')[1] || image_base64;
            imageInput = Buffer.from(base64Data, 'base64');
        }

        console.log("🛰️ Sending to Hugging Face Router...");
        
        const hfRes = await fetch("https://router.huggingface.co/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: imageInput, // Send the image data directly
        });

        const embedding = await hfRes.json();
        
        if (!hfRes.ok) throw new Error(JSON.stringify(embedding));

        res.json({ embedding });
    } catch (error) {
        console.error("💥 Execution Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Proxy active on ${PORT}`));