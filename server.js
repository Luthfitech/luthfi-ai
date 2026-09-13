const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002';

app.get('/api/health', (req, res) => {
  const ai = getAIClient();
  if (!ai) {
    return res.json({
      success: true,
      status: 'offline',
      apiKeyConfigured: false,
      message: 'Gemini API key is not configured'
    });
  }
  return res.json({
    success: true,
    status: 'online',
    apiKeyConfigured: true,
    message: 'API Online',
    textModel: TEXT_MODEL
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image, mimeType } = req.body;

    if ((!message || message.trim() === '') && !image) {
      return res.status(400).json({
        success: false,
        error: 'Pesan atau gambar harus diisi.'
      });
    }

    const ai = getAIClient();

    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key belum dikonfigurasi.'
      });
    }

    let contents;

    // Jika ada gambar, kirim teks + gambar ke Gemini
    if (image) {
      contents = [
        {
          text: message && message.trim()
            ? message
            : 'Analisis dan jelaskan gambar ini.'
        },
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: image
          }
        }
      ];
    } else {
      // Chat teks biasa
      contents = message;
    }

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: contents,
      config: {
        systemInstruction:
          'You are Luthfi AI, an advanced, intelligent, and helpful AI assistant. Jawab menggunakan bahasa yang sama dengan pengguna. Jika pengguna mengirim gambar, analisis isi gambar dengan jelas dan akurat.'
      }
    });

    const reply = response.text || 'Tidak ada respons dari AI.';

    return res.json({
      success: true,
      reply
    });

  } catch (err) {
    console.error('[Error /api/chat]:', err);

    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan saat memproses permintaan.'
    });
  }
});

app.post('/api/code', async (req, res) => {
  try {
    const { language = 'HTML', framework = 'Vanilla', prompt } = req.body;
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ success: false, error: 'Code generation prompt is required.' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key is not configured on the server.'
      });
    }

    const systemInstruction = `You are Luthfi AI Code Generator. Generate clean, modular, executable code for Language: ${language} and Framework/Environment: ${framework}. Provide ONLY the raw source code or code blocks suitable for direct usage. Avoid verbose introductory text.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { systemInstruction }
    });

    const code = response.text || '// No code output returned.';
    return res.json({ success: true, code, language, framework });

  } catch (err) {
    console.error('[Error /api/code]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate code snippet.'
    });
  }
});

app.post('/api/agent', async (req, res) => {
  try {
    const { agentName = 'AI Research Agent', instruction } = req.body;
    if (!instruction || instruction.trim() === '') {
      return res.status(400).json({ success: false, error: 'Agent instruction prompt is required.' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key is not configured on the server.'
      });
    }

    const systemInstruction = `You are ${agentName}, an autonomous specialized AI Agent on the Luthfi AI Platform. Analyze the user request carefully and execute a step-by-step reasoning workflow. Return a structured breakdown containing:
1. Context & Objectives
2. Key Insights & Strategy
3. Actionable Output & Solution Summary`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: instruction,
      config: { systemInstruction }
    });

    const result = response.text || 'Agent workflow complete without output.';
    return res.json({ success: true, agentName, output: result });

  } catch (err) {
    console.error('[Error /api/agent]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Agent execution failed.'
    });
  }
});

app.post('/api/image', async (req, res) => {
  try {
    const { prompt, style = 'Cinematic Neon', aspectRatio = '1:1' } = req.body;
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ success: false, error: 'Image description prompt is required.' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key is not configured on the server.'
      });
    }

    try {
      const response = await ai.models.generateImages({
        model: IMAGE_MODEL,
        prompt: `${prompt}, style: ${style}`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : '1:1'
        }
      });

      if (response && response.generatedImages && response.generatedImages.length > 0) {
        const base64Bytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64Bytes}`;
        return res.json({ success: true, imageUrl, prompt, style, aspectRatio });
      } else {
        throw new Error('No image returned from Gemini Image API');
      }

    } catch (imageErr) {
      console.warn('[Image API Notice]:', imageErr.message);
      return res.status(400).json({
        success: false,
        error: 'Image generation is not available in the current API configuration or model access is restricted.'
      });
    }

  } catch (err) {
    console.error('[Error /api/image]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Image generation failed.'
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`⚡ Luthfi AI Server running at http://localhost:${PORT}`);
  console.log(`🤖 Text Model : ${TEXT_MODEL}`);
  console.log(`🎨 Image Model: ${IMAGE_MODEL}`);
  console.log(`🔑 API Key Configured: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);
  console.log(`==================================================`);
});
