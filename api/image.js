// ============================================
// SUPER SIMPLE - 100% WORKING
// No External Dependencies
// ============================================

export default function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { prompt } = req.body;

        if (!prompt || prompt.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please enter at least 3 characters' 
            });
        }

        // Generate image URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

        // Success Response
        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt.trim()
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
