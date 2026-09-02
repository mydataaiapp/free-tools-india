// ============================================
// GROQ API - Production Ready
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
            return res.status(400).json({ 
                error: 'Prompt is required (minimum 3 characters)' 
            });
        }
        
        // 🔑 CRITICAL: Get API key from environment
        const apiKey = process.env.GROQ_API_KEY;
        
        // ✅ Validate API Key exists
        if (!apiKey) {
            console.error('❌ GROQ_API_KEY is not set in environment');
            return res.status(500).json({ 
                error: 'Server configuration error',
                details: 'API key not configured'
            });
        }
        
        // ✅ Validate API Key format
        if (!apiKey.startsWith('gsk_')) {
            console.error('❌ Invalid GROQ_API_KEY format');
            return res.status(500).json({ 
                error: 'Server configuration error',
                details: 'Invalid API key format'
            });
        }
        
        console.log('✅ API Key validated (starts with gsk_)');
        console.log('📝 Prompt:', prompt.substring(0, 50) + '...');
        
        // 🌐 Call Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt || 'You are a helpful, intelligent AI assistant. Provide clear, accurate, and detailed responses.' 
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000,
                temperature: 0.7,
            })
        });
        
        // Handle API response
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Groq API Error:', errorData);
            
            // Special handling for 401
            if (response.status === 401) {
                return res.status(401).json({
                    error: 'Invalid API Key',
                    details: 'Your Groq API key is invalid or expired. Please update it in Vercel Environment Variables.',
                    status: 401
                });
            }
            
            // Try fallback model
            console.log('🔄 Trying fallback model...');
            
            const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: maxTokens || 1000,
                    temperature: 0.7,
                })
            });
            
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                console.log('✅ Fallback model success!');
                return res.status(200).json({
                    success: true,
                    response: fallbackData.choices[0].message.content,
                    api: 'Groq (Fallback)',
                    usage: fallbackData.usage
                });
            }
            
            return res.status(response.status).json({
                error: 'Groq API Error',
                details: errorData.error?.message || 'Unknown error',
                suggestion: 'Check your API key or try again later.'
            });
        }
        
        const data = await response.json();
        console.log('✅ Groq API Success!');
        
        return res.status(200).json({
            success: true,
            response: data.choices[0].message.content,
            api: 'Groq (Llama 3.1 70B)',
            usage: data.usage
        });
        
    } catch (error) {
        console.error('❌ Server Error:', error.message);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
}
