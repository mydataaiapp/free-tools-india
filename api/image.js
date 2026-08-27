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

        // ============================================
        // OPTION 1: Pollinations AI (Completely FREE, No API Key)
        // ============================================
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt
        });

        // ============================================
        // OPTION 2: Replicate (Stable Diffusion) - Need API Key
        // Uncomment this section and comment the above to use Replicate
        // ============================================
        /*
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
                input: {
                    prompt: prompt,
                    negative_prompt: 'ugly, blurry, low quality, deformed',
                    width: 768,
                    height: 768,
                    num_outputs: 1,
                }
            })
        });

        const prediction = await response.json();

        if (prediction.error) {
            return res.status(500).json({ error: prediction.error });
        }

        // Poll for result
        let imageUrl = null;
        let attempts = 0;
        while (attempts < 30) {
            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
                headers: { 'Authorization': `Token ${process.env.REPLICATE_API_KEY}` }
            });
            const status = await statusResponse.json();

            if (status.status === 'succeeded') {
                imageUrl = status.output[0];
                break;
            } else if (status.status === 'failed') {
                return res.status(500).json({ error: 'Image generation failed' });
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        if (!imageUrl) {
            return res.status(500).json({ error: 'Timeout: Generation took too long' });
        }

        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt
        });
        */

    } catch (error) {
        console.error('Image Generation Error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
