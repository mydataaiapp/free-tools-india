// ============================================
// COMPLETE IMAGE API - ChatGPT + WaveSpeedAI + Pollinations
// ============================================

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt || prompt.trim().length < 3) {
            return res.status(400).json({ success: false, error: 'Please enter at least 3 characters' });
        }

        console.log('🎨 Generating image for:', prompt);

        let imageUrl = null;
        let usedApi = null;
        let errors = [];

        // ============================================
        // API 1: ChatGPT Images 2.0 (Best Quality)
        // ============================================
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log('🔄 Trying ChatGPT API...');
                const response = await openai.images.generate({
                    model: "gpt-image-2",
                    prompt: prompt.trim(),
                    n: 1,
                    size: "1024x1024",
                    quality: "high",
                });
                imageUrl = response.data[0].url;
                usedApi = 'ChatGPT Images 2.0 ⭐';
                console.log('✅ Generated with ChatGPT!');
            } catch (error) {
                console.log('⚠️ ChatGPT failed:', error.message);
                errors.push(`ChatGPT: ${error.message}`);
            }
        }

        // ============================================
        // API 2: WaveSpeedAI (Budget Friendly)
        // ============================================
        if (!imageUrl && process.env.WAVESPEED_API_KEY) {
            try {
                console.log('🔄 Trying WaveSpeedAI...');
                const response = await fetch('https://api.wavespeed.ai/api/v2/black-forest-labs/flux-2-pro', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: prompt.trim(),
                        image_size: 'square_hd',
                        num_outputs: 1,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        imageUrl = data.url;
                        usedApi = 'WaveSpeedAI (FLUX-2 Pro) ⚡';
                        console.log('✅ Generated with WaveSpeedAI!');
                    }
                } else {
                    const errorText = await response.text();
                    console.log('⚠️ WaveSpeed error:', errorText);
                    errors.push(`WaveSpeed: ${response.status}`);
                }
            } catch (error) {
                console.log('⚠️ WaveSpeed failed:', error.message);
                errors.push(`WaveSpeed: ${error.message}`);
            }
        }

        // ============================================
        // API 3: Pollinations AI (Free Backup)
        // ============================================
        if (!imageUrl) {
            try {
                console.log('🔄 Trying Pollinations AI (Free)...');
                const seed = Math.floor(Math.random() * 2147483647);
                imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?width=1024&height=1024&nologo=true&seed=${seed}`;
                usedApi = 'Pollinations AI (Free) 🎨';
                console.log('✅ Generated with Pollinations!');
            } catch (error) {
                errors.push(`Pollinations: ${error.message}`);
            }
        }

        // ============================================
        // FINAL RESPONSE
        // ============================================
        if (!imageUrl) {
            return res.status(500).json({
                success: false,
                error: 'All APIs failed. Please try again.',
                details: errors.join(' | ')
            });
        }

        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt.trim(),
            api: usedApi,
            message: `✅ Generated with ${usedApi}`
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
