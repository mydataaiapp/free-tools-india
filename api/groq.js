// ============================================
// GROQ API - Updated with Working Models
// ============================================

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Only POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        const { prompt, systemPrompt, maxTokens } = req.body;
        
        // Validate prompt
        if (!prompt || prompt.trim().length < 3) {
            res.status(400).json({ error: 'Prompt is required (minimum 3 characters)' });
            return;
        }
        
        console.log('🚀 Groq API called with prompt:', prompt.substring(0, 50) + '...');
        console.log('🔑 API Key exists:', !!process.env.GROQ_API_KEY);
        
        // ============================================
        // Groq API Call - Updated Models
        // ============================================
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',  // ✅ Updated working model
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
        
        // Check if response is OK
        if (!response.ok) {
            const errorData = await response.json();
            console.log('❌ Groq API Error:', errorData);
            
            // Try fallback model
            console.log('🔄 Trying fallback model...');
            
            const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',  // ✅ Fallback working model
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
                if (fallbackData.choices && fallbackData.choices[0]) {
                    console.log('✅ Fallback model success!');
                    res.status(200).json({
                        success: true,
                        response: fallbackData.choices[0].message.content,
                        api: 'Groq (Fallback)',
                        usage: fallbackData.usage
                    });
                    return;
                }
            }
            
            // If both fail
            res.status(500).json({ 
                error: 'Groq API Error', 
                details: errorData.error?.message || 'Unknown error',
                suggestion: 'Check your API key or try again later.'
            });
            return;
        }
        
        const data = await response.json();
        console.log('✅ Groq API Success!');
        
        // Check if we have a valid response
        if (data.choices && data.choices[0]) {
            res.status(200).json({
                success: true,
                response: data.choices[0].message.content,
                api: 'Groq (Llama 3.1 70B)',
                usage: data.usage
            });
        } else {
            console.log('❌ Invalid response structure:', data);
            res.status(500).json({ 
                error: 'Invalid response from Groq', 
                details: data 
            });
        }
        
    } catch (error) {
        console.error('❌ Groq API Error:', error.message);
        res.status(500).json({ 
            error: error.message || 'Internal server error',
            suggestion: 'Please try again later.'
        });
    }
}
