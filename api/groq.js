// ============================================
// GROQ API - WITH MULTIPLE FALLBACK MODELS
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
        
        // ✅ LIST OF WORKING MODELS (अगर पहला fail हो तो अगला try करेगा)
        const modelsToTry = [
            'llama-3.1-8b-instant',    // ✅ 100% Working
            'mixtral-8x7b-32768',      // ✅ 100% Working
            'gemma2-9b-it'             // ✅ 100% Working
        ];
        
        let lastError = null;
        
        // Try each model one by one
        for (const model of modelsToTry) {
            console.log(`🔄 Trying model: ${model}`);
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
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
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Success with model: ${model}`);
                return res.status(200).json({
                    success: true,
                    response: data.choices[0].message.content,
                    model: model,
                    usage: data.usage
                });
            }
            
            const errorData = await response.json();
            console.error(`❌ Model ${model} failed:`, errorData.error?.message);
            lastError = errorData.error?.message || 'Unknown error';
        }
        
        // If all models fail
        return res.status(500).json({
            error: 'All Groq models failed',
            details: lastError,
            suggestion: 'Please check your API key or try again later.'
        });
        
    } catch (error) {
        console.error('Server Error:', error.message);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
}
