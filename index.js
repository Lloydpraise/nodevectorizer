import express from 'express';
import { HfInference } from '@huggingface/inference';
import cors from 'cors';

const app = express();
// Railway provides the PORT, but we fallback to 8080
const PORT = process.env.PORT || 8080; 
const hf = new HfInference(process.env.HF_TOKEN);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

console.log("🛠️ [SYSTEM] Booting Vectorizer...");
console.log(process.env.HF_TOKEN ? "✅ [SYSTEM] HF_TOKEN Found" : "❌ [SYSTEM] HF_TOKEN MISSING in Railway Variables!");

// --- 1. RAILWAY HEALTH CHECK ---
app.get('/', (req, res) => {
    res.status(200).send('<h1>Vectorizer Proxy Online</h1><p>Send POST to /vectorize</p>');
});

// --- 2. THE TEST ENDPOINT ---
// Use this to manually verify your token and HF connection
app.get('/test-hf', async (req, res) => {
    console.log("🧪 [TEST] Running connectivity test to Hugging Face...");
    try {
        const result = await hf.featureExtraction({
            model: 'openai/clip-vit-base-patch32',
            inputs: "test", 
        });
        console.log("✅ [TEST] Success! Hugging Face is responding.");
        res.json({ status: "Connected", model: "CLIP-ViT-B-32", sample_vector_size: result.length });
    } catch (error) {
        console.error("❌ [TEST] Failed:", error.message);
        res.status(500).json({ status: "Failed", error: error.message });
    }
});

// --- 3. THE MAIN VECTORIZER ---
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const requestId = Math.random().toString(36).substring(7);
    
    console.log(`📩 [REQ-${requestId}] Processing Request...`);
    
    try {
        let imageInput;
        if (image_url) {
            const response = await fetch(image_url);
            imageInput = await response.blob();
        } else if (image_base64) {
            const base64Data = image_base64.split(',')[1] || image_base64;
            imageInput = new Blob([Buffer.from(base64Data, 'base64')], { type: 'image/jpeg' });
        }

        const embedding = await hf.featureExtraction({
            model: 'openai/clip-vit-base-patch32',
            inputs: imageInput,
        });

        console.log(`✅ [REQ-${requestId}] Vectorization Complete.`);
        res.json({ embedding });

    } catch (error) {
        console.error(`💥 [REQ-${requestId}] Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SYSTEM] Server listening on port ${PORT}`);
});