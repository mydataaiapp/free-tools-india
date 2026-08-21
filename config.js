// ============================================
// API Configuration - Secure
// ============================================

const CONFIG = {
    // API Endpoints
    API_URL: '/api/groq',
    
    // Default Model Settings
    DEFAULT_MODEL: 'llama-3.1-8b-instant',  // Fast & cheap
    PREMIUM_MODEL: 'llama-3.3-70b-versatile', // High quality
    MAX_TOKENS: 1500,
    TEMPERATURE: 0.7,
    
    // Model Pricing (per 1M tokens - for reference only)
    PRICING: {
        'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
        'llama-4-scout': { input: 0.11, output: 0.34 },
        'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
        'qwen3-32b': { input: 0.29, output: 0.59 }
    },
    
    // Free Tier Limits
    FREE_TIER: {
        dailyRequests: 50,
        maxTokensPerRequest: 1500
    },
    
    // Premium Tier Limits
    PREMIUM_TIER: {
        dailyRequests: 500,
        maxTokensPerRequest: 4000
    }
};

// ============================================
// User Session Management
// ============================================

// ✅ NEW: Check if user is premium
function checkIfPremiumUser() {
    // Option 1: Check localStorage
    const premiumStatus = localStorage.getItem('isPremium');
    if (premiumStatus === 'true') return true;
    
    // Option 2: Check sessionStorage
    const sessionPremium = sessionStorage.getItem('isPremium');
    if (sessionPremium === 'true') return true;
    
    // Option 3: Check cookie (if you have)
    const cookiePremium = document.cookie.split('; ').find(row => row.startsWith('isPremium='));
    if (cookiePremium && cookiePremium.split('=')[1] === 'true') return true;
    
    return false;
}

// ✅ NEW: Set premium status (call after payment)
function setPremiumUser(isPremium = true, expiryDays = 30) {
    localStorage.setItem('isPremium', isPremium);
    sessionStorage.setItem('isPremium', isPremium);
    
    // Set cookie with expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    document.cookie = `isPremium=${isPremium}; expires=${expiryDate.toUTCString()}; path=/`;
}

// ✅ NEW: Get user's daily request count
function getDailyRequestCount() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('requestCount');
    const storedDate = localStorage.getItem('requestDate');
    
    if (storedDate !== today) {
        // Reset counter for new day
        localStorage.setItem('requestDate', today);
        localStorage.setItem('requestCount', '0');
        return 0;
    }
    
    return parseInt(stored || '0');
}

// ✅ NEW: Increment daily request count
function incrementRequestCount() {
    const today = new Date().toDateString();
    const current = getDailyRequestCount();
    localStorage.setItem('requestDate', today);
    localStorage.setItem('requestCount', String(current + 1));
    return current + 1;
}

// ✅ NEW: Check if user has reached daily limit
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

/**
 * Call AI API with specified model
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System instructions
 * @param {number} maxTokens - Max tokens to generate
 * @param {string} model - Model name (optional, auto-selected if not provided)
 * @param {Object} options - Additional options
 * @returns {Promise<string>} AI response
 */
async function callAI(prompt, systemPrompt = '', maxTokens = 1500, model = null, options = {}) {
    // ✅ Check daily limit
    const limitCheck = checkDailyLimit();
    if (!limitCheck.allowed) {
        throw new Error(limitCheck.message);
    }
    
    // ✅ Auto-select model based on user tier and prompt length
    if (!model) {
        model = selectModel(prompt, maxTokens);
    }
    
    // ✅ Track usage
    const isPremium = checkIfPremiumUser();
    const startTime = Date.now();
    
    try {
        console.log(`🚀 Calling AI with model: ${model} (Premium: ${isPremium})`);
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                systemPrompt: systemPrompt,
                maxTokens: Math.min(maxTokens, isPremium ? CONFIG.PREMIUM_TIER.maxTokensPerRequest : CONFIG.FREE_TIER.maxTokensPerRequest),
                model: model,
                temperature: options.temperature || CONFIG.TEMPERATURE,
                user: options.userId || 'anonymous'
            })
        });
        
        const data = await response.json();
        
        // ✅ Track response time
        const responseTime = Date.now() - startTime;
        console.log(`⏱️ Response time: ${responseTime}ms`);
        
        // ✅ Increment request count
        incrementRequestCount();
        
        if (data.choices && data.choices[0]) {
            const content = data.choices[0].message.content;
            
            // ✅ Track token usage (if available)
            if (data.usage) {
                console.log(`📊 Tokens: ${data.usage.total_tokens} (${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion)`);
            }
            
            return content;
        } else {
            throw new Error(data.error?.message || JSON.stringify(data));
        }
    } catch (error) {
        console.error('❌ API Error:', error);
        throw new Error(error.message || 'Failed to generate response. Please try again.');
    }
}

// ============================================
// Model Selection Logic
// ============================================

/**
 * Smart model selection based on user tier and task complexity
 */
function selectModel(prompt, maxTokens) {
    const isPremium = checkIfPremiumUser();
    
    // ✅ Premium users get better models by default
    if (isPremium) {
        // For very long/complex tasks, use premium models
        if (maxTokens > 2000 || prompt.length > 5000) {
            return 'llama-3.3-70b-versatile'; // Best quality for complex tasks
        }
        return CONFIG.PREMIUM_MODEL; // Default premium model
    }
    
    // ✅ Free users: Determine based on task complexity
    const wordCount = prompt.split(/\s+/).length;
    
    // Simple tasks (summaries, short replies)
    if (wordCount < 50 && maxTokens < 500) {
        return 'llama-3.1-8b-instant'; // Fast & cheap
    }
    
    // Medium complexity
    if (wordCount < 200 && maxTokens < 1500) {
        return 'llama-3.1-8b-instant';
    }
    
    // Complex tasks (article writing, long content)
    return 'llama-3.1-8b-instant'; // Free tier always uses cheap model
}

// ============================================
// Helper Functions
// ============================================

// ✅ NEW: Get model pricing info
function getModelPricing(model) {
    return CONFIG.PRICING[model] || { input: 'N/A', output: 'N/A' };
}

// ✅ NEW: Check API health
async function checkAPIHealth() {
    try {
        const response = await fetch(CONFIG.API_URL + '/health', {
            method: 'GET'
        });
        return response.ok;
    } catch {
        return false;
    }
}

// ✅ NEW: Get daily usage stats
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
// Export for Module Use
// ============================================

// For ES Modules (if using import/export)
export {
    CONFIG,
    callAI,
    checkIfPremiumUser,
    setPremiumUser,
    checkDailyLimit,
    getDailyUsageStats,
    selectModel,
    getModelPricing,
    checkAPIHealth
};

// For Legacy Script (keep global)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.callAI = callAI;
    window.checkIfPremiumUser = checkIfPremiumUser;
    window.setPremiumUser = setPremiumUser;
    window.checkDailyLimit = checkDailyLimit;
    window.getDailyUsageStats = getDailyUsageStats;
    window.selectModel = selectModel;
    window.getModelPricing = getModelPricing;
    window.checkAPIHealth = checkAPIHealth;
}
