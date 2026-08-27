import Replicate from 'replicate';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt || prompt.length < 3) {
            return res.status(400).json({ error: 'Please enter a valid description (minimum 3 characters)' });
        }

        console.log('🎨 Generating image with prompt:', prompt);

        let imageUrl = null;
        let usedApi = null;
        let errors = [];

        // ============================================
        // API 1: Replicate (FLUX-2 Pro)
        // ============================================
        if (process.env.REPLICATE_API_TOKEN) {
            try {
                console.log('🔄 Trying Replicate API...');
                const replicate = new Replicate({
                    auth: process.env.REPLICATE_API_TOKEN,
                });

                const output = await replicate.run(
                    "black-forest-labs/flux-2-pro",
                    {
                        input: {
                            prompt: prompt,
                            resolution: "1 MP",
                            aspect_ratio: "1:1",
                            input_images: [],
                            output_format: "webp",
                            output_quality: 85,
                            safety_tolerance: 2
                        }
                    }
                );

                if (Array.isArray(output) && output.length > 0) {
                    imageUrl = output[0];
                    usedApi = 'Replicate (FLUX-2 Pro)';
                    console.log('✅ Image generated via Replicate!');
                }
            } catch (replicateError) {
                console.log('⚠️ Replicate failed:', replicateError.message);
                errors.push(`Replicate: ${replicateError.message}`);
            }
        }

        // ============================================
        // API 2: Stability AI (Backup)
        // ============================================
        if (!imageUrl && process.env.STABILITY_API_KEY) {
            try {
                console.log('🔄 Trying Stability AI...');
                const response = await fetch(
                    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            text_prompts: [{ text: prompt, weight: 1 }],
                            cfg_scale: 7,
                            height: 1024,
                            width: 1024,
                            samples: 1,
                            steps: 30,
                        })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.artifacts && data.artifacts.length > 0) {
                        const base64Image = data.artifacts[0].base64;
                        imageUrl = `data:image/png;base64,${base64Image}`;
                        usedApi = 'Stability AI (Stable Diffusion XL)';
                        console.log('✅ Image generated via Stability AI!');
                    }
                } else {
                    const errorText = await response.text();
                    console.log('⚠️ Stability AI error:', errorText);
                    errors.push(`Stability AI: ${response.status}`);
                }
            } catch (stabilityError) {
                console.log('⚠️ Stability AI failed:', stabilityError.message);
                errors.push(`Stability AI: ${stabilityError.message}`);
            }
        }

        // ============================================
        // API 3: Pollinations AI (Last Resort)
        // ============================================
        if (!imageUrl) {
            try {
                console.log('🔄 Trying Pollinations AI (Free)...');
                const encodedPrompt = encodeURIComponent(prompt);
                // Test if Pollinations is working
                const testResponse = await fetch(`https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`);
                if (testResponse.ok) {
                    imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
                    usedApi = 'Pollinations AI (Free)';
                    console.log('✅ Image generated via Pollinations!');
                } else {
                    errors.push('Pollinations: Service unavailable');
                }
            } catch (pollinationsError) {
                console.log('⚠️ Pollinations failed:', pollinationsError.message);
                errors.push(`Pollinations: ${pollinationsError.message}`);
            }
        }

        // ============================================
        // FINAL RESPONSE
        // ============================================
        if (!imageUrl) {
            return res.status(500).json({
                success: false,
                error: 'All APIs failed. Please try again later.',
                details: errors.join(' | ')
            });
        }

        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt,
            api: usedApi,
            message: `✅ Generated using ${usedApi}`
        });

    } catch (error) {
        console.error('❌ Image Generation Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error. Please try again.'
        });
    }
}
