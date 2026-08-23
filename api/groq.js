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
        
        // 1. Try Groq Key 1 (Original)
        let result = await tryGroq(process.env.GROQ_API_KEY, prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 2. Try Groq Key 2
        result = await tryGroq(process.env.GROQ_API_KEY_1, prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 3. Try Groq Key 3
        result = await tryGroq(process.env.GROQ_API_KEY_2, prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 4. Try Groq Key 4
        result = await tryGroq(process.env.GROQ_API_KEY_3, prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 5. Try Gemini (Backup - Working)
        result = await tryGemini(prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 6. Try OpenRouter
        result = await tryOpenRouter(prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 7. Try Cerebras
        result = await tryCerebras(prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        res.status(500).json({ error: 'All AI services unavailable' });
        
    } catch (error) {
        res.status(500).json({ error: 'Internal error: ' + error.message });
    }
}

// Groq API
async function tryGroq(key, prompt, systemPrompt, maxTokens) {
    try {
        if (!key) return null;
        
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

// Gemini API (Working)
async function tryGemini(prompt, systemPrompt, maxTokens) {
    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return null;
        
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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

// OpenRouter API
async function tryOpenRouter(prompt, systemPrompt, maxTokens) {
    try {
        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return null;
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + key,
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are helpful.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000
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

// Cerebras API
async function tryCerebras(prompt, systemPrompt, maxTokens) {
    try {
        const key = process.env.CEREBRAS_API_KEY;
        if (!key) return null;
        
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + key,
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are helpful.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000
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
