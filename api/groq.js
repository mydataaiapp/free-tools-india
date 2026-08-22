// ============================================
// /api/groq.js - Multi-Provider AI Handler
// ============================================

// ✅ CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
    // ✅ 1. CORS Headers set karein
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // ✅ 2. OPTIONS request handle karein
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // ✅ 3. Only POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, systemPrompt, maxTokens } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('📤 Received request:', {
            promptLength: prompt.length,
            maxTokens: maxTokens || 1000,
            systemPromptLength: systemPrompt ? systemPrompt.length : 0
        });

        // ✅ 4. Try providers in order
        const providers = [
            { name: 'Groq', fn: callGroq, keys: [
                process.env.GROQ_API_KEY,
                process.env.GROQ_API_KEY_1,
                process.env.GROQ_API_KEY_2,
                process.env.GROQ_API_KEY_3
            ]},
            { name: 'Gemini', fn: callGemini, keys: [process.env.GEMINI_API_KEY] },
            { name: 'OpenRouter', fn: callOpenRouter, keys: [process.env.OPENROUTER_API_KEY] },
            { name: 'Cerebras', fn: callCerebras, keys: [process.env.CEREBRAS_API_KEY] }
        ];

        let result = null;
        let errors = [];

        for (const provider of providers) {
            if (!provider.keys || provider.keys.every(k => !k)) {
                console.log(`⚠️ ${provider.name}: No API keys`);
                continue;
            }

            console.log(`🔍 Trying ${provider.name}...`);

            for (const key of provider.keys) {
                if (!key) continue;
                
                try {
                    result = await provider.fn(key, prompt, systemPrompt, maxTokens || 1000);
                    if (result) {
                        console.log(`✅ ${provider.name} success!`);
                        break;
                    }
                } catch (err) {
                    errors.push(`${provider.name}: ${err.message}`);
                    console.warn(`❌ ${provider.name} failed:`, err.message);
                }
            }

            if (result) break;
        }

        // ✅ 5. Return response
        if (result) {
            return res.status(200).json(result);
        }

        // ✅ 6. All providers failed
        console.error('❌ All providers failed:', errors);
        return res.status(503).json({
            error: 'All AI services temporarily unavailable. Please try again later.',
            details: errors,
            providers_tried: providers.map(p => p.name)
        });

    } catch (error) {
        console.error('❌ Handler Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
}

// ============================================
// PROVIDER FUNCTIONS
// ============================================

// 1. Groq API
async function callGroq(key, prompt, systemPrompt, maxTokens) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key.trim()}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: Math.min(maxTokens || 1000, 8000),
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Groq Response Error:', data);
            return null;
        }

        if (data.choices && data.choices[0]) {
            return data;
        }

        return null;
    } catch (error) {
        console.error('Groq Error:', error.message);
        return null;
    }
}

// 2. Gemini API
async function callGemini(key, prompt, systemPrompt, maxTokens) {
    try {
        if (!key) return null;

        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key.trim()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: {
                        maxOutputTokens: Math.min(maxTokens || 1000, 8192),
                        temperature: 0.7
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini Response Error:', data);
            return null;
        }

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
        console.error('Gemini Error:', error.message);
        return null;
    }
}

// 3. OpenRouter API
async function callOpenRouter(key, prompt, systemPrompt, maxTokens) {
    try {
        if (!key) return null;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key.trim()}`,
                'HTTP-Referer': 'https://www.freetoolindia.com',
                'X-Title': 'Free Tools India'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: Math.min(maxTokens || 1000, 8192),
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenRouter Response Error:', data);
            return null;
        }

        if (data.choices && data.choices[0]) {
            return data;
        }

        return null;
    } catch (error) {
        console.error('OpenRouter Error:', error.message);
        return null;
    }
}

// 4. Cerebras API
async function callCerebras(key, prompt, systemPrompt, maxTokens) {
    try {
        if (!key) return null;

        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key.trim()}`
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: Math.min(maxTokens || 1000, 8192),
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Cerebras Response Error:', data);
            return null;
        }

        if (data.choices && data.choices[0]) {
            return data;
        }

        return null;
    } catch (error) {
        console.error('Cerebras Error:', error.message);
        return null;
    }
}
