import express from 'express';
import cors from 'cors';
import { pipeline, env, RawImage } from '@xenova/transformers';
import sharp from 'sharp';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// 1. Memory Optimization Config
env.allowLocalModels = false;
sharp.cache(false); 

let aiExtractor = null;
let isProcessing = false;

// Helper: 70% Center Crop (Server-side replacement for Canvas)
async function getProcessedImageBuffer(inputSource) {
    const input = inputSource.includes('base64,') 
        ? Buffer.from(inputSource.split(',')[1], 'base64') 
        : inputSource;

    const metadata = await sharp(input).metadata();
    const cropW = Math.round(metadata.width * 0.70);
    const cropH = Math.round(metadata.height * 0.70);
    const left = Math.round((metadata.width - cropW) / 2);
    const top = Math.round((metadata.height - cropH) / 2);

    // Convert to PNG buffer so RawImage can read it reliably
    return await sharp(input)
        .extract({ left, top, width: cropW, height: cropH })
        .resize(224, 224)
        .png() 
        .toBuffer();
}

app.post('/vectorize', async (req, res) => {
    // Prevent OOM by only allowing one image at a time
    if (isProcessing) {
        return res.status(429).json({ error: "Server busy, try again in a moment." });
    }

    isProcessing = true;
    try {
        const { image_url, image_base64 } = req.body;
        const source = image_base64 || image_url;
        if (!source) throw new Error("No image source provided");

        // Lazy load the model (Quantized for 1GB limit)
        if (!aiExtractor) {
            console.log("Loading CLIP Model (Quantized)...");
            aiExtractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', { 
                quantized: true 
            });
        }

        // --- THE FIX ---
        // Convert the Buffer to a RawImage object that CLIP can handle
        const imageBuffer = await getProcessedImageBuffer(source);
        const rawImage = await RawImage.read(imageBuffer);
        
        // Generate Embedding
        const output = await aiExtractor(rawImage);
        const embedding = Array.from(output.data);

        res.json({ embedding });

    } catch (err) {
        console.error("Vectorize Error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        isProcessing = false;
        // Trigger manual cleanup if started with --expose-gc
        if (global.gc) global.gc();
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Node Vectorizer listening on port ${PORT}`));