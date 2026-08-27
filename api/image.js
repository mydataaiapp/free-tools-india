// ============================================
// SIMPLE & WORKING - Pollinations AI (100% Free)
// ============================================

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        // Get prompt from request body
        const { prompt } = req.body;

        // Validate prompt
        if (!prompt || prompt.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please enter a valid description (minimum 3 characters)' 
            });
        }

        console.log('🎨 Generating image for:', prompt);

        // ============================================
        // POLLINATIONS AI - COMPLETELY FREE
        // No API Key Required!
        // ============================================
        const encodedPrompt = encodeURIComponent(prompt.trim());
        const timestamp = Date.now();
        
        // Generate image URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${timestamp}`;

        console.log('✅ Image URL created:', imageUrl);

        // Return success response with image URL
        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt.trim(),
            api: 'Pollinations AI (Free)',
            message: '✅ Image generated successfully!'
        });

    } catch (error) {
        console.error('❌ Error in image generation:', error);
        
        // Return error response
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error. Please try again.'
        });
    }
}
