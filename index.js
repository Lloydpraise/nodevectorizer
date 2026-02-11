import express from 'express';
import cors from 'cors';
import { pipeline, env } from '@xenova/transformers';
import sharp from 'sharp';
// Keep memory low by disabling sharp's internal cache
sharp.cache(false);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Optimize for CPU environment
env.allowLocalModels = false;
let aiExtractor = null;
let isProcessing = false;

// Helper: 70% Center Crop using Sharp (Server-side Canvas alternative)
async function processImage(inputSource) {
    const input = inputSource.includes('base64,') 
        ? Buffer.from(inputSource.split(',')[1], 'base64') 
        : inputSource;

    const metadata = await sharp(input).metadata();
    const cropW = Math.round(metadata.width * 0.70);
    const cropH = Math.round(metadata.height * 0.70);
    const left = Math.round((metadata.width - cropW) / 2);
    const top = Math.round((metadata.height - cropH) / 2);

    // Crop and convert to raw pixels for the AI model
    return await sharp(input)
        .extract({ left, top, width: cropW, height: cropH })
        .resize(224, 224)
        .toBuffer();
}

app.post('/vectorize', async (req, res) => {
    try {
        const { image_url, image_base64 } = req.body;
        const source = image_base64 || image_url;

        if (!source) throw new Error("No image source provided");

        // Prevent concurrent processing which can double RAM usage
        if (isProcessing) {
            return res.status(429).json({ error: "Server busy, try again in a second." });
        }

        isProcessing = true;

        // Load model on first request (quantized to reduce memory)
        if (!aiExtractor) {
            console.log("Loading CLIP Model...");
            aiExtractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', { quantized: true });
        }

        // Process image to Buffer
        const imageBuffer = await processImage(source);
        
        // Generate Vector
        // Transformers.js needs a URL or path, but it also accepts raw data
        const output = await aiExtractor(imageBuffer);
        const embedding = Array.from(output.data);

        res.json({ embedding });

    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        // Release processing lock and trigger GC if Node started with --expose-gc
        isProcessing = false;
        if (global.gc) {
            global.gc();
        }
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Image Vectorizer running on port ${PORT}`));