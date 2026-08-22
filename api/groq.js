export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
    }
    
    try {
        const { prompt, systemPrompt, maxTokens } = req.body;
        
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        
        // Try Gemini (Working)
        const geminiKey = process.env.GEMINI_API_KEY;
        
        if (geminiKey) {
            const fullPrompt = systemPrompt ? systemPrompt + '\n\n' + prompt : prompt;
            
            const response = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + geminiKey,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: fullPrompt }] }]
                    })
                }
            );
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0]) {
                return res.status(200).json({
                    choices: [{
                        message: {
                            content: data.candidates[0].content.parts[0].text
                        }
                    }]
                });
            }
        }
        
        // Try Groq (all keys)
        const groqKeys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_1,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3
        ];
        
        for (const key of groqKeys) {
            if (!key) continue;
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + key,
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
                return res.status(200).json(data);
            }
        }
        
        res.status(500).json({ error: 'All AI services unavailable' });
        
    } catch (error) {
        res.status(500).json({ error: 'Internal error: ' + error.message });
    }
}
