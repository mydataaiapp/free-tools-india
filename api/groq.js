// ============================================
// /api/groq.js - Multi-Provider AI Handler
// ============================================

// Model configuration with pricing and capabilities
const MODEL_CONFIG = {
    // Groq Models
    'llama-3.1-8b-instant': {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        costPer1MInput: 0.05,
        costPer1MOutput: 0.08,
        maxTokens: 8000,
        tier: 'free'
    },
    'llama-4-scout': {
        provider: 'groq',
        model: 'llama-4-scout',
        costPer1MInput: 0.11,
        costPer1MOutput: 0.34,
        maxTokens: 10000,
        tier: 'premium'
    },
    'llama-3.3-70b-versatile': {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        costPer1MInput: 0.59,
        costPer1MOutput: 0.79,
        maxTokens: 8000,
        tier: 'premium'
    },
    'qwen3-32b': {
        provider: 'groq',
        model: 'qwen3-32b',
        costPer1MInput: 0.29,
        costPer1MOutput: 0.59,
        maxTokens: 8000,
        tier: 'premium'
    },
    'openai/gpt-oss-120b': {
        provider: 'groq',
        model: 'openai/gpt-oss-120b',
        costPer1MInput: 0.15,
        costPer1MOutput: 0.60,
        maxTokens: 8000,
        tier: 'premium'
    },
    
    // Fallback Models (OpenRouter, Gemini, Cerebras)
    'gemini-2.5-flash': {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        tier: 'free',
        fallback: true
    },
    'meta-llama/llama-3.1-8b-instruct:free': {
        provider: 'openrouter',
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        tier: 'free',
        fallback: true
    },
    'llama3.1-8b': {
        provider: 'cerebras',
        model: 'llama3.1-8b',
        tier: 'free',
        fallback: true
    }
};

// User tier limits
const TIER_LIMITS = {
    free: {
        maxTokensPerRequest: 1500,
        dailyRequests: 50,
        allowedModels: ['llama-3.1-8b-instant', 'gemini-2.5-flash', 'meta-llama/llama-3.1-8b-instruct:free', 'llama3.1-8b']
    },
    premium: {
        maxTokensPerRequest: 4000,
        dailyRequests: 500,
        allowedModels: ['llama-3.1-8b-instant', 'llama-4-scout', 'llama-3.3-70b-versatile', 'qwen3-32b', 'openai/gpt-oss-120b']
    }
};

// ============================================
// Main Handler
// ============================================

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
        const { 
            prompt, 
            systemPrompt, 
            maxTokens, 
            model: requestedModel,
            temperature = 0.7,
            user = 'anonymous',
            isPremium = false
        } = req.body;
        
        if (!prompt || prompt.trim().length === 0) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        
        // ✅ Determine user tier
        const tier = isPremium ? 'premium' : 'free';
        const limit = TIER_LIMITS[tier];
        
        // ✅ Select model (with tier restrictions)
        let model = selectModel(requestedModel, tier, prompt, maxTokens);
        
        // ✅ Validate token limit
        const effectiveMaxTokens = Math.min(
            maxTokens || limit.maxTokensPerRequest,
            limit.maxTokensPerRequest
        );
        
        console.log(`📤 User: ${user} | Tier: ${tier} | Model: ${model} | MaxTokens: ${effectiveMaxTokens}`);
        
        // ✅ Try primary provider with fallback chain
        const result = await callWithFallback({
            prompt,
            systemPrompt,
            maxTokens: effectiveMaxTokens,
            model,
            temperature,
            tier
        });
        
        if (result) {
            // ✅ Add usage metadata
            const usage = result.usage || {};
            const modelInfo = MODEL_CONFIG[model] || {};
            
            return res.status(200).json({
                ...result,
                model: model,
                tier: tier,
                usage: {
                    prompt_tokens: usage.prompt_tokens || 0,
                    completion_tokens: usage.completion_tokens || 0,
                    total_tokens: usage.total_tokens || 0,
                    estimated_cost: estimateCost(model, usage)
                }
            });
        }
        
        // ❌ All providers failed
        res.status(503).json({ 
            error: 'All AI services temporarily unavailable. Please try again later.',
            providers_tried: getProviderList()
        });
        
    } catch (error) {
        console.error('❌ Handler Error:', error);
        res.status(500).json({ 
            error: 'Internal server error: ' + error.message 
        });
    }
}

// ============================================
// Model Selection Logic
// ============================================

function selectModel(requestedModel, tier, prompt, maxTokens) {
    const limit = TIER_LIMITS[tier];
    
    // If specific model requested and allowed
    if (requestedModel && limit.allowedModels.includes(requestedModel)) {
        return requestedModel;
    }
    
    // Auto-select based on tier and complexity
    const wordCount = prompt.split(/\s+/).length;
    const isComplex = wordCount > 200 || (maxTokens && maxTokens > 1500);
    
    if (tier === 'premium') {
        // Premium: Smart selection
        if (isComplex || (maxTokens && maxTokens > 2000)) {
            return 'llama-3.3-70b-versatile'; // Best quality
        }
        if (wordCount > 100) {
            return 'llama-4-scout'; // Good balance
        }
        return 'llama-3.1-8b-instant'; // Fast & cheap
    }
    
    // Free tier: Always use cheapest available
    return 'llama-3.1-8b-instant';
}

// ============================================
// Provider Call Functions
// ============================================

async function callWithFallback({ prompt, systemPrompt, maxTokens, model, temperature, tier }) {
    const modelConfig = MODEL_CONFIG[model];
    
    // ✅ Try primary provider first
    if (modelConfig && !modelConfig.fallback) {
        const result = await callProvider(modelConfig.provider, {
            prompt,
            systemPrompt,
            maxTokens,
            model: modelConfig.model,
            temperature
        });
        if (result) return result;
    }
    
    // ✅ Fallback chain (if primary fails)
    const fallbackProviders = ['groq', 'gemini', 'openrouter', 'cerebras'];
    const fallbackModels = {
        groq: ['llama-3.1-8b-instant', 'openai/gpt-oss-120b'],
        gemini: ['gemini-2.5-flash'],
        openrouter: ['meta-llama/llama-3.1-8b-instruct:free'],
        cerebras: ['llama3.1-8b']
    };
    
    for (const provider of fallbackProviders) {
        const models = fallbackModels[provider] || [];
        for (const fallbackModel of models) {
            // Skip if same as primary
            if (fallbackModel === model) continue;
            
            // Check tier compatibility
            const fbConfig = MODEL_CONFIG[fallbackModel];
            if (fbConfig && fbConfig.tier === 'free' && tier === 'premium') {
                // Premium can use free fallbacks
            } else if (fbConfig && fbConfig.tier === 'premium' && tier === 'free') {
                continue; // Free cannot use premium fallbacks
            }
            
            const result = await callProvider(provider, {
                prompt,
                systemPrompt,
                maxTokens,
                model: fallbackModel,
                temperature
            });
            
            if (result) {
                console.log(`✅ Fallback to ${provider} (${fallbackModel}) successful`);
                return result;
            }
        }
    }
    
    return null;
}

// ============================================
// Individual Provider Implementations
// ============================================

// 1. Groq API (Primary)
async function callGroq(key, { prompt, systemPrompt, maxTokens, model, temperature }) {
    try {
        if (!key) return null;
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + key,
            },
            body: JSON.stringify({
                model: model || 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000,
                temperature: temperature || 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return data;
        }
        console.warn(`Groq (${model}) failed:`, data.error?.message || 'Unknown error');
        return null;
    } catch (error) {
        console.warn(`Groq error:`, error.message);
        return null;
    }
}

// 2. Gemini API
async function callGemini(key, { prompt, systemPrompt, maxTokens, model, temperature }) {
    try {
        if (!key) return null;
        
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: {
                        maxOutputTokens: maxTokens || 1000,
                        temperature: temperature || 0.7
                    }
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
                }],
                usage: {
                    prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
                    completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
                    total_tokens: data.usageMetadata?.totalTokenCount || 0
                }
            };
        }
        console.warn('Gemini failed:', data.error?.message || 'Unknown error');
        return null;
    } catch (error) {
        console.warn('Gemini error:', error.message);
        return null;
    }
}

// 3. OpenRouter API
async function callOpenRouter(key, { prompt, systemPrompt, maxTokens, model, temperature }) {
    try {
        if (!key) return null;
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + key,
                'HTTP-Referer': 'https://www.freetoolindia.com',
                'X-Title': 'Free Tools India'
            },
            body: JSON.stringify({
                model: model || 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000,
                temperature: temperature || 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return data;
        }
        console.warn('OpenRouter failed:', data.error?.message || 'Unknown error');
        return null;
    } catch (error) {
        console.warn('OpenRouter error:', error.message);
        return null;
    }
}

// 4. Cerebras API
async function callCerebras(key, { prompt, systemPrompt, maxTokens, model, temperature }) {
    try {
        if (!key) return null;
        
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + key,
            },
            body: JSON.stringify({
                model: model || 'llama3.1-8b',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens || 1000,
                temperature: temperature || 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return data;
        }
        console.warn('Cerebras failed:', data.error?.message || 'Unknown error');
        return null;
    } catch (error) {
        console.warn('Cerebras error:', error.message);
        return null;
    }
}

// ============================================
// Provider Router
// ============================================

async function callProvider(provider, params) {
    const envKeys = {
        groq: [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3],
        gemini: [process.env.GEMINI_API_KEY],
        openrouter: [process.env.OPENROUTER_API_KEY],
        cerebras: [process.env.CEREBRAS_API_KEY]
    };
    
    const providerMap = {
        groq: callGroq,
        gemini: callGemini,
        openrouter: callOpenRouter,
        cerebras: callCerebras
    };
    
    const keys = envKeys[provider] || [];
    const callFunc = providerMap[provider];
    
    if (!callFunc) return null;
    
    // Try all keys for this provider
    for (const key of keys) {
        if (!key) continue;
        const result = await callFunc(key, params);
        if (result) return result;
    }
    
    return null;
}

// ============================================
// Helper Functions
// ============================================

function estimateCost(model, usage) {
    const config = MODEL_CONFIG[model];
    if (!config || !config.costPer1MInput) return 'N/A';
    
    const inputCost = ((usage.prompt_tokens || 0) / 1000000) * config.costPer1MInput;
    const outputCost = ((usage.completion_tokens || 0) / 1000000) * config.costPer1MOutput;
    const total = inputCost + outputCost;
    
    return `$${total.toFixed(6)}`;
}

function getProviderList() {
    return ['Groq', 'Gemini', 'OpenRouter', 'Cerebras'];
}

// ============================================
// Health Check (Optional)
// ============================================

export async function healthCheck(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        providers: {
            groq: !!process.env.GROQ_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
            openrouter: !!process.env.OPENROUTER_API_KEY,
            cerebras: !!process.env.CEREBRAS_API_KEY
        }
    };
    
    res.status(200).json(status);
}
