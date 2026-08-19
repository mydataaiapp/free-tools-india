// Multi-API Auto-Fallback System
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
        
        // Auto-Fallback: Try multiple APIs in order
        let result = null;
        
        // 1. Try Groq
        result = await tryGroq(prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 2. Try Gemini
        result = await tryGemini(prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // 3. Try OpenRouter (if configured)
        result = await tryOpenRouter(prompt, systemPrompt, maxTokens);
        if (result) return res.status(200).json(result);
        
        // All failed
        res.status(500).json({ 
            error: 'All AI services are temporarily unavailable. Please try again later.' 
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// 1. Groq API
async function tryGroq(prompt, systemPrompt, maxTokens) {
    try {
        console.log('Trying Groq API...');
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
            console.log('Groq Success!');
            return data;
        }
        console.log('Groq Failed:', data.error?.message || 'Unknown');
        return null;
    } catch (error) {
        console.log('Groq Error:', error.message);
        return null;
    }
}

// 2. Gemini API (Free)
async function tryGemini(prompt, systemPrompt, maxTokens) {
    try {
        console.log('Trying Gemini API...');
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            console.log('Gemini key not configured');
            return null;
        }
        
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }]
                })
            }
        );
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            console.log('Gemini Success!');
            return {
                choices: [{
                    message: {
                        content: data.candidates[0].content.parts[0].text
                    }
                }]
            };
        }
        console.log('Gemini Failed');
        return null;
    } catch (error) {
        console.log('Gemini Error:', error.message);
        return null;
    }
}

// 3. OpenRouter API (Free models)
async function tryOpenRouter(prompt, systemPrompt, maxTokens) {
    try {
        console.log('Trying OpenRouter API...');
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        
        if (!OPENROUTER_API_KEY) {
            console.log('OpenRouter key not configured');
            return null;
        }
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
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
            console.log('OpenRouter Success!');
            return data;
        }
        console.log('OpenRouter Failed');
        return null;
    } catch (error) {
        console.log('OpenRouter Error:', error.message);
        return null;
    }
}
