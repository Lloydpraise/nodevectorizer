import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;
const HF_TOKEN = process.env.HF_TOKEN;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => res.send('Vectorizer Proxy Online'));

app.get('/test-hf', async (req, res) => {
    try {
        const response = await fetch("https://router.huggingface.co/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: "test" }),
        });
        const text = await response.text();
        res.send(text); // See the raw response to debug
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/vectorize', async (req, res) => {
    const { image_base64, image_url } = req.body;
    
    try {
        let body;
        let headers = { "Authorization": `Bearer ${HF_TOKEN}` };

        if (image_url) {
            // For URLs, Hugging Face expects a JSON body
            headers["Content-Type"] = "application/json";
            body = JSON.stringify({ inputs: image_url });
        } else {
            // For Base64, we send the raw binary data directly
            const base64Data = image_base64.split(',')[1] || image_base64;
            body = Buffer.from(base64Data, 'base64');
            // Do NOT set Content-Type to application/json here
        }

        const hfRes = await fetch("https://router.huggingface.co/openai/clip-vit-base-patch32", {
            method: "POST",
            headers: headers,
            body: body,
        });

        const responseText = await hfRes.text();
        
        try {
            const data = JSON.parse(responseText);
            res.json({ embedding: data });
        } catch (e) {
            // If it's not JSON, return the raw text so we can see the error
            console.error("HF Error Raw:", responseText);
            res.status(hfRes.status).json({ error: responseText });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0');