import express from 'express';
import { InferenceClient } from '@huggingface/inference';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize the new InferenceClient
const hf = new InferenceClient(process.env.HF_TOKEN);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

console.log("🛠️ [SYSTEM] Booting Vectorizer with HF Router support...");

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
    res.status(200).send('Vectorizer Proxy Online (Router Enabled)');
});

// --- UPDATED TEST ENDPOINT ---
app.get('/test-hf', async (req, res) => {
    console.log("🧪 [TEST] Pinging HF Router...");
    try {
        // featureExtraction handles the routing internally now
        const result = await hf.featureExtraction({
            model: 'openai/clip-vit-base-patch32',
            inputs: "test ping", 
        });
        console.log("✅ [TEST] Router Response Received!");
        res.json({ status: "Connected", provider: "HF Router", vector_length: result.length });
    } catch (error) {
        console.error("❌ [TEST] Router Error:", error.message);
        res.status(500).json({ status: "Failed", error: error.message });
    }
});

// --- MAIN VECTORIZER ---
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    
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

        res.json({ embedding });
    } catch (error) {
        console.error("💥 Execution Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Proxy active on ${PORT}`));