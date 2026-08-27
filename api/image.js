// ============================================
// FORCE FRESH IMAGE - ALWAYS NEW
// ============================================

export default function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        // ============================================
        // MULTIPLE RANDOM PARAMETERS - FORCE FRESH IMAGE
        // ============================================
        const seed = Math.floor(Math.random() * 2147483647);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        
        // Different parameters every time
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?width=1024&height=1024&nologo=true&seed=${seed}&ts=${timestamp}&r=${random}`;

        console.log('🎨 Generated Image URL:', imageUrl);

        return res.status(200).json({
            success: true,
            image: imageUrl,
            prompt: prompt.trim(),
            seed: seed,
            api: 'Pollinations AI (Fresh)'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
