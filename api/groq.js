// ============================================
// GROQ API - SIMPLIFIED WORKING VERSION
// ============================================
export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { prompt, systemPrompt, maxTokens } = req.body;
        
        if (!prompt || prompt.trim().length < 3) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        // ✅ ONLY WORKING MODEL - NO FALLBACK
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',  // ✅ 100% WORKING
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt || 'You are a helpful AI assistant.' 
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000,
                temperature: 0.7,
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Groq API Error:', errorData);
            return res.status(response.status).json({
                error: 'Groq API Error',
                details: errorData.error?.message || 'Unknown error'
            });
        }
        
        const data = await response.json();
        return res.status(200).json({
            success: true,
            response: data.choices[0].message.content,
            usage: data.usage
        });
        
    } catch (error) {
        console.error('Server Error:', error.message);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
}
