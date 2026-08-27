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
            return res.status(400).json({ 
                success: false,
                error: 'Please enter a valid description (minimum 3 characters)' 
            });
        }

        console.log('🎨 Generating image with prompt:', prompt);

        // ============================================
        // DIRECT POLLINATIONS API (100% FREE - NO API KEY NEEDED)
        // ============================================
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

        console.log('✅ Image URL generated:', imageUrl);

        // Return success response
        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt,
            api: 'Pollinations AI (Free)',
            message: '✅ Image generated successfully!'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
