export default async function handler(req, res) {
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
        
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are helpful.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            res.status(200).json(data);
        } else {
            res.status(500).json({ error: 'Invalid response from Groq', details: data });
        }
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
