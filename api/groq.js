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
        
        // Try Groq
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            const result = await callGroq(groqKey, prompt, systemPrompt, maxTokens);
            if (result) {
                return res.status(200).json(result);
            }
        }
        
        // Try Gemini
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            const result = await callGemini(geminiKey, prompt, systemPrompt, maxTokens);
            if (result) {
                return res.status(200).json(result);
            }
        }
        
        res.status(500).json({ error: 'All AI services unavailable' });
        
    } catch (error) {
        res.status(500).json({ error: 'Internal error: ' + error.message });
    }
}

async function callGroq(key, prompt, systemPrompt, maxTokens) {
    try {
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
            return data;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function callGemini(key, prompt, systemPrompt, maxTokens) {
    try {
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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
            return {
                choices: [{
                    message: {
                        content: data.candidates[0].content.parts[0].text
                    }
                }]
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}
