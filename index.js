import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

// ✅ Correct Router endpoint
const HF_ROUTER_URL = "https://router.huggingface.co/feature_extraction";
const HF_MODEL = "openai/clip-vit-base-patch32";

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("<h1>CLIP Image Vectorizer Proxy (Router)</h1>");
});

// 🧪 Test endpoint
app.get("/test-hf", async (req, res) => {
  const testUrl =
    "https://www.kisasacraft.co.ke/cdn/shop/files/IMG_3491.jpg?v=1761125454&width=360";

  console.log("🧪 Testing Hugging Face Router…");

  try {
    const hfRes = await fetch(HF_ROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HF_MODEL,
        inputs: {
          image: testUrl,
        },
      }),
    });

    const text = await hfRes.text();
    console.log("📡 Status:", hfRes.status);
    res.status(hfRes.status).send(text);
  } catch (err) {
    console.error("💥 Test failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Main vectorizer endpoint
app.post("/vectorize", async (req, res) => {
  const { image_url, image_base64 } = req.body;
  const reqId = Math.random().toString(36).slice(2, 8);

  try {
    let imageInput;

    if (image_url) {
      console.log(`🌐 [${reqId}] Using image URL`);
      imageInput = image_url;
    } else if (image_base64) {
      console.log(`📦 [${reqId}] Using base64 image`);
      imageInput = image_base64.includes("base64,")
        ? image_base64
        : `data:image/jpeg;base64,${image_base64}`;
    } else {
      return res.status(400).json({ error: "No image provided" });
    }

    const hfRes = await fetch(HF_ROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HF_MODEL,
        inputs: {
          image: imageInput,
        },
      }),
    });

    const text = await hfRes.text();

    if (!hfRes.ok) {
      console.error(`⚠️ [${reqId}] HF error:`, text);
      return res.status(hfRes.status).send(text);
    }

    console.log(`✅ [${reqId}] Vector created`);
    res.json({ embedding: JSON.parse(text) });
  } catch (err) {
    console.error(`💥 [${reqId}] Crash:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `🔑 HF Token: ${HF_TOKEN ? "OK (" + HF_TOKEN.length + " chars)" : "MISSING"}`
  );
});
