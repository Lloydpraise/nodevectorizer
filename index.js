import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { HfInference } from '@huggingface/inference';

const app = express();
const PORT = process.env.PORT || 8080;

// Hugging Face SDK
const HF_TOKEN = process.env.HF_TOKEN;
const hf = new HfInference(HF_TOKEN);

// CLIP Model (works with URL and base64)
const MODEL_ID = 'openai/clip-vit-base-patch32';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Homepage
app.get('/', (req, res) => res.send('<h1>VVStudios Vectorizer: CLIP Edition</h1>'));

// Helper: Convert image URL to Buffer
async function imageUrlToBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch image");
  const arrayBuffer = await res.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// 🧪 Test endpoint
app.get('/test-hf', async (req, res) => {
  try {
    const testUrl = "https://www.kisasacraft.co.ke/cdn/shop/files/IMG_3491.jpg?v=1761125454";
    const imageBuffer = await imageUrlToBuffer(testUrl);

    const result = await hf.featureExtraction({
      model: MODEL_ID,
      inputs: imageBuffer,
      wait_for_model: true
    });

    res.json({
      success: true,
      vector_length: Array.isArray(result[0]) ? result[0].length : result.length
    });
  } catch (err) {
    console.error("❌ Test Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Main vectorizer endpoint
app.post('/vectorize', async (req, res) => {
  const { image_url, image_base64 } = req.body;
  const reqId = Math.random().toString(36).substring(7);

  try {
    let inputData;

    if (image_url) {
      console.log(`🌐 [REQ-${reqId}] Type: URL`);
      inputData = await imageUrlToBuffer(image_url);
    } else if (image_base64) {
      console.log(`📄 [REQ-${reqId}] Type: Base64`);
      inputData = Uint8Array.from(Buffer.from(image_base64.replace(/^data:image\/\w+;base64,/, ""), 'base64'));
    } else {
      throw new Error("No image data provided");
    }

    const output = await hf.featureExtraction({
      model: MODEL_ID,
      inputs: inputData,
      wait_for_model: true
    });

    const embedding = Array.isArray(output[0]) ? output[0] : output;

    console.log(`✅ [REQ-${reqId}] Success. Vector length: ${embedding.length}`);
    res.json({ embedding });
  } catch (error) {
    console.error(`💥 [REQ-${reqId}] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Vectorizer active on ${PORT}`);
  console.log(`🔗 HF Token: ${HF_TOKEN ? "OK" : "MISSING"}`);
});
