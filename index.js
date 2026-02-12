import express from 'express';
import cors from 'cors';
import { HfInference } from '@huggingface/inference';

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize the Client (This handles the Router/Auth automatically)
const HF_TOKEN = process.env.HF_TOKEN;
const hf = new HfInference(HF_TOKEN);

// The Model ID (We don't need the full URL anymore, just the ID)
const MODEL_ID = 'google/vit-base-patch16-224-in21k';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => res.send('<h1>VVStudios Vectorizer: SDK Edition</h1>'));

// 🧪 TEST ENDPOINT
app.get('/test-hf', async (req, res) => {
    const testUrl = "https://www.kisasacraft.co.ke/cdn/shop/files/IMG_3491.jpg?v=1761125454&width=360";
    console.log("🧪 [TEST] Pinging HF via SDK...");

    try {
        // We use featureExtraction because we want VECTORS (embeddings), 
        // not classification (labels).
        const result = await hf.featureExtraction({
            model: MODEL_ID,
            inputs: testUrl
        });

        console.log(`📍 [TEST] Success. Vector length: ${result.length}`);
        res.status(200).json({ embedding: result });
    } catch (err) {
        console.error("❌ [TEST] Error:", err);
        res.status(500).send(err.message);
    }
});

// 🚀 MAIN VECTORIZER
app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    const reqId = Math.random().toString(36).substring(7);

    try {
        let inputData;

        if (image_url) {
            console.log(`🌐 [REQ-${reqId}] Type: URL`);
            inputData = image_url;
        } else if (image_base64) {
            console.log(`📄 [REQ-${reqId}] Type: Base64`);
            // The SDK handles Base64, but we strip the header just to be safe and clean
            inputData = image_base64.replace(/^data:image\/\w+;base64,/, "");
        } else {
            throw new Error("No image data provided");
        }

        // Call Hugging Face SDK
        // Note: We use 'featureExtraction' because 'zeroShotImageClassification' 
        // requires candidate_labels and returns probabilities, not the embedding vector.
        const output = await hf.featureExtraction({
            model: MODEL_ID,
            inputs: inputData,
            wait_for_model: true // SDK built-in "wait" feature
        });

        // The API might return the vector directly or nested in an array.
        // We normalize it here.
        const embedding = Array.isArray(output[0]) ? output[0] : output;

        console.log(`✅ [REQ-${reqId}] Success. Vector length: ${embedding.length}`);
        res.json({ embedding: embedding });

    } catch (error) {
        console.error(`💥 [REQ-${reqId}] Crash:`, error);
        
        // Detailed error logging for SDK errors
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${error.response.statusText}`);
        }
        
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Vectorizer active on ${PORT}`);
    console.log(`🔗 Token check: ${HF_TOKEN ? "OK" : "MISSING"}`);
});
