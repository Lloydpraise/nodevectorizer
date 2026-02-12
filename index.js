import express from 'express';
import { HfInference } from '@huggingface/inference';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const hf = new HfInference(process.env.HF_TOKEN);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    
    try {
        let imageInput;

        if (image_url) {
            // Fetch the image from URL
            const response = await fetch(image_url);
            imageInput = await response.blob();
        } else if (image_base64) {
            // Convert Base64 to Blob
            const base64Data = image_base64.split(',')[1] || image_base64;
            imageInput = new Blob([Buffer.from(base64Data, 'base64')], { type: 'image/jpeg' });
        }

        // Call Hugging Face Inference API
        const embedding = await hf.featureExtraction({
            model: 'openai/clip-vit-base-patch32',
            inputs: imageInput,
        });

        res.json({ embedding });
        console.log("✅ Vector returned from Hugging Face");

    } catch (error) {
        console.error("💥 HF Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Proxy active on ${PORT}`));