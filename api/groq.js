// api/groq.js - Groq API Proxy (Keys Server-Side Safe)
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        const { prompt, systemPrompt, maxTokens } = req.body;
        
        // Basic validation
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        
        if (prompt.length > 10000) {
            res.status(400).json({ error: 'Prompt too long' });
            return;
        }
        
        // Call Groq API (Server-side - Keys safe)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt || 'You are a helpful assistant.' 
                    },
                    { 
                        role: 'user', 
                        content: prompt 
                    }
                ],
                max_tokens: maxTokens || 1000,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            res.status(response.status).json(data);
            return;
        }
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Groq API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
