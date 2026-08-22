// ============================================
// API Configuration - Secure (Browser Version)
// ============================================

const CONFIG = {
    API_URL: '/api/groq',
    DEFAULT_MODEL: 'llama-3.1-8b-instant',
    PREMIUM_MODEL: 'llama-3.3-70b-versatile',
    MAX_TOKENS: 1500,
    TEMPERATURE: 0.7,
    
    PRICING: {
        'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
        'llama-4-scout': { input: 0.11, output: 0.34 },
        'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
        'qwen3-32b': { input: 0.29, output: 0.59 }
    },
    
    FREE_TIER: {
        dailyRequests: 50,
        maxTokensPerRequest: 1500
    },
    
    PREMIUM_TIER: {
        dailyRequests: 500,
        maxTokensPerRequest: 4000
    }
};

// ============================================
// User Session Management
// ============================================

function checkIfPremiumUser() {
    const premiumStatus = localStorage.getItem('isPremium');
    if (premiumStatus === 'true') return true;
    
    const sessionPremium = sessionStorage.getItem('isPremium');
    if (sessionPremium === 'true') return true;
    
    const cookiePremium = document.cookie.split('; ').find(row => row.startsWith('isPremium='));
    if (cookiePremium && cookiePremium.split('=')[1] === 'true') return true;
    
    return false;
}

function setPremiumUser(isPremium = true, expiryDays = 30) {
    localStorage.setItem('isPremium', isPremium);
    sessionStorage.setItem('isPremium', isPremium);
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    document.cookie = `isPremium=${isPremium}; expires=${expiryDate.toUTCString()}; path=/`;
}

function getDailyRequestCount() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('requestCount');
    const storedDate = localStorage.getItem('requestDate');
    
    if (storedDate !== today) {
        localStorage.setItem('requestDate', today);
        localStorage.setItem('requestCount', '0');
        return 0;
    }
    
    return parseInt(stored || '0');
}

function incrementRequestCount() {
    const today = new Date().toDateString();
    const current = getDailyRequestCount();
    localStorage.setItem('requestDate', today);
    localStorage.setItem('requestCount', String(current + 1));
    return current + 1;
}

function checkDailyLimit() {
    const isPremium = checkIfPremiumUser();
    const limit = isPremium ? CONFIG.PREMIUM_TIER.dailyRequests : CONFIG.FREE_TIER.dailyRequests;
    const current = getDailyRequestCount();
    
    if (current >= limit) {
        return {
            allowed: false,
            message: `You've reached your daily limit of ${limit} requests. ${isPremium ? 'Wait for tomorrow or contact support.' : 'Upgrade to premium for 500 requests/day!'}`,
            limit: limit,
            used: current
        };
    }
    
    return {
        allowed: true,
        limit: limit,
        used: current,
        remaining: limit - current
    };
}

// ============================================
// Main AI Call Function
// ============================================

async function callAI(prompt, systemPrompt = '', maxTokens = 1500, model = null, options = {}) {
    try {
        console.log('🚀 Calling AI API...');
        
        // ✅ Check daily limit
        const limitCheck = checkDailyLimit();
        if (!limitCheck.allowed) {
            throw new Error(limitCheck.message);
        }
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                systemPrompt: systemPrompt,
                maxTokens: maxTokens,
                temperature: options.temperature || CONFIG.TEMPERATURE
            })
        });
        
        const data = await response.json();
        
        // ✅ Increment request count
        incrementRequestCount();
        
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content;
        } else {
            throw new Error(data.error?.message || JSON.stringify(data));
        }
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Failed to generate response. Please try again.');
    }
}

// ============================================
// Helper Functions
// ============================================

function selectModel(prompt, maxTokens) {
    const isPremium = checkIfPremiumUser();
    if (isPremium && maxTokens > 1500) {
        return CONFIG.PREMIUM_MODEL;
    }
    return CONFIG.DEFAULT_MODEL;
}

function getModelPricing(model) {
    return CONFIG.PRICING[model] || { input: 'N/A', output: 'N/A' };
}

function getDailyUsageStats() {
    const used = getDailyRequestCount();
    const isPremium = checkIfPremiumUser();
    const limit = isPremium ? CONFIG.PREMIUM_TIER.dailyRequests : CONFIG.FREE_TIER.dailyRequests;
    
    return {
        used: used,
        limit: limit,
        remaining: Math.max(0, limit - used),
        isPremium: isPremium,
        percentageUsed: Math.round((used / limit) * 100)
    };
}

// ============================================
// ✅ BROWSER GLOBAL SCOPE (No export!)
// ============================================

// ❌ REMOVE: export { ... }
// ✅ USE: window assignments

window.CONFIG = CONFIG;
window.callAI = callAI;
window.checkIfPremiumUser = checkIfPremiumUser;
window.setPremiumUser = setPremiumUser;
window.checkDailyLimit = checkDailyLimit;
window.getDailyUsageStats = getDailyUsageStats;
window.selectModel = selectModel;
window.getModelPricing = getModelPricing;

console.log('✅ config.js loaded successfully!');
