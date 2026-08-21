// ============================================
// Supabase Configuration - Secure
// ============================================

// ✅ Import Supabase Client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG = {
    SUPABASE_URL: 'https://ibosfyljujpwsyyjdurl.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_XF-3E1hw8_84grRf2Kl3zQ_J4kc0ENc',
    ANON_KEY: 'sb_publishable_XF-3E1hw8_84grRf2Kl3zQ_J4kc0ENc' // Same as publishable key
};

// ✅ Initialize Supabase Client
const supabase = createClient(
    SUPABASE_CONFIG.SUPABASE_URL,
    SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY
);

// ============================================
// Database Tables Schema (Reference)
// ============================================

/*
-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expiry TIMESTAMP,
    daily_requests INT DEFAULT 0,
    last_request_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- api_keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key TEXT UNIQUE NOT NULL,
    name TEXT,
    scopes TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- usage_logs table
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    tool TEXT NOT NULL,
    model TEXT,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    estimated_cost DECIMAL(10, 6),
    duration_ms INT,
    status TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL, -- 'monthly', 'yearly', 'lifetime'
    status TEXT NOT NULL, -- 'active', 'expired', 'cancelled'
    razorpay_subscription_id TEXT,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);
*/

// ============================================
// User Management Functions
// ============================================

// ✅ Get or Create User
async function getOrCreateUser(email, name = null) {
    try {
        // Check if user exists
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (user) {
            // ✅ Reset daily requests if new day
            const today = new Date().toDateString();
            const lastDate = new Date(user.last_request_date).toDateString();
            
            if (lastDate !== today) {
                const { data: updated, error: updateError } = await supabase
                    .from('users')
                    .update({ 
                        daily_requests: 0, 
                        last_request_date: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id)
                    .select()
                    .single();
                
                if (!updateError && updated) {
                    user = updated;
                }
            }
            
            return { user, error: null };
        }
        
        // Create new user
        const newUser = {
            email,
            name: name || email.split('@')[0],
            is_premium: false,
            daily_requests: 0,
            last_request_date: new Date().toISOString()
        };
        
        const { data: created, error: createError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();
        
        if (createError) {
            return { user: null, error: createError };
        }
        
        return { user: created, error: null };
        
    } catch (error) {
        console.error('❌ getOrCreateUser Error:', error);
        return { user: null, error };
    }
}

// ✅ Check if user is premium
async function checkUserPremium(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('is_premium, premium_expiry')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        if (!user) return { isPremium: false, error: 'User not found' };
        
        // Check expiry
        if (user.is_premium && user.premium_expiry) {
            const now = new Date();
            const expiry = new Date(user.premium_expiry);
            
            if (expiry < now) {
                // Premium expired - update status
                await supabase
                    .from('users')
                    .update({ 
                        is_premium: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);
                
                return { isPremium: false, error: 'Premium expired' };
            }
            
            return { isPremium: true, error: null };
        }
        
        return { isPremium: false, error: null };
        
    } catch (error) {
        console.error('❌ checkUserPremium Error:', error);
        return { isPremium: false, error: error.message };
    }
}

// ✅ Upgrade user to premium
async function upgradeUser(userId, plan = 'monthly', durationMonths = 1) {
    try {
        const now = new Date();
        const expiry = new Date(now);
        expiry.setMonth(expiry.getMonth() + durationMonths);
        
        // Update user
        const { data: user, error } = await supabase
            .from('users')
            .update({
                is_premium: true,
                premium_expiry: expiry.toISOString(),
                updated_at: now.toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        // Add subscription record
        const { error: subError } = await supabase
            .from('subscriptions')
            .insert([{
                user_id: userId,
                plan: plan,
                status: 'active',
                start_date: now.toISOString(),
                end_date: expiry.toISOString()
            }]);
        
        if (subError) console.warn('Subscription log failed:', subError.message);
        
        return { user, error: null };
        
    } catch (error) {
        console.error('❌ upgradeUser Error:', error);
        return { user: null, error: error.message };
    }
}

// ============================================
// API Key Management
// ============================================

// ✅ Generate new API key
async function generateAPIKey(userId, name = null, scopes = ['all']) {
    try {
        // Generate secure key
        const key = 'fti_' + crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 365); // 1 year expiry
        
        const { data, error } = await supabase
            .from('api_keys')
            .insert([{
                user_id: userId,
                key: key,
                name: name || 'Default Key',
                scopes: scopes,
                is_active: true,
                expires_at: expiresAt.toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return { key: data, error: null };
        
    } catch (error) {
        console.error('❌ generateAPIKey Error:', error);
        return { key: null, error: error.message };
    }
}

// ✅ Verify API key
async function verifyAPIKey(key) {
    try {
        const { data: apiKey, error } = await supabase
            .from('api_keys')
            .select(`
                *,
                users (
                    id,
                    email,
                    name,
                    is_premium,
                    premium_expiry
                )
            `)
            .eq('key', key)
            .single();
        
        if (error) throw error;
        
        if (!apiKey) {
            return { valid: false, error: 'Invalid API key' };
        }
        
        // Check if key is active
        if (!apiKey.is_active) {
            return { valid: false, error: 'API key is inactive' };
        }
        
        // Check expiry
        if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
            return { valid: false, error: 'API key expired' };
        }
        
        // Check user premium status
        if (apiKey.users) {
            const user = apiKey.users;
            if (user.is_premium && user.premium_expiry) {
                if (new Date(user.premium_expiry) < new Date()) {
                    // Premium expired - update
                    await supabase
                        .from('users')
                        .update({ is_premium: false })
                        .eq('id', user.id);
                }
            }
        }
        
        // Update last_used
        await supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', apiKey.id);
        
        return { 
            valid: true, 
            key: apiKey,
            user: apiKey.users,
            error: null 
        };
        
    } catch (error) {
        console.error('❌ verifyAPIKey Error:', error);
        return { valid: false, error: error.message };
    }
}

// ✅ Revoke API key
async function revokeAPIKey(userId, keyId) {
    try {
        const { data, error } = await supabase
            .from('api_keys')
            .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', keyId)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        return { key: data, error: null };
        
    } catch (error) {
        console.error('❌ revokeAPIKey Error:', error);
        return { key: null, error: error.message };
    }
}

// ✅ List user's API keys
async function listUserKeys(userId) {
    try {
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return { keys: data, error: null };
        
    } catch (error) {
        console.error('❌ listUserKeys Error:', error);
        return { keys: null, error: error.message };
    }
}

// ============================================
// Usage Tracking
// ============================================

// ✅ Log API usage
async function logUsage(usageData) {
    try {
        const { error } = await supabase
            .from('usage_logs')
            .insert([{
                user_id: usageData.userId,
                api_key_id: usageData.apiKeyId || null,
                tool: usageData.tool,
                model: usageData.model,
                prompt_tokens: usageData.promptTokens || 0,
                completion_tokens: usageData.completionTokens || 0,
                total_tokens: usageData.totalTokens || 0,
                estimated_cost: usageData.estimatedCost || 0,
                duration_ms: usageData.durationMs || 0,
                status: usageData.status || 'success',
                ip_address: usageData.ipAddress || null,
                user_agent: usageData.userAgent || null
            }]);
        
        if (error) {
            console.warn('Usage log failed:', error.message);
            return { success: false, error: error.message };
        }
        
        // Update user's daily request count
        if (usageData.userId) {
            const today = new Date().toDateString();
            const { data: user } = await supabase
                .from('users')
                .select('daily_requests, last_request_date')
                .eq('id', usageData.userId)
                .single();
            
            if (user) {
                const lastDate = user.last_request_date ? new Date(user.last_request_date).toDateString() : null;
                const dailyRequests = lastDate === today ? (user.daily_requests || 0) + 1 : 1;
                
                await supabase
                    .from('users')
                    .update({ 
                        daily_requests: dailyRequests,
                        last_request_date: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', usageData.userId);
            }
        }
        
        return { success: true, error: null };
        
    } catch (error) {
        console.error('❌ logUsage Error:', error);
        return { success: false, error: error.message };
    }
}

// ✅ Get user's usage stats
async function getUserUsageStats(userId, period = 'day') {
    try {
        let query = supabase
            .from('usage_logs')
            .select('*')
            .eq('user_id', userId);
        
        // Filter by period
        const now = new Date();
        if (period === 'day') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            query = query.gte('created_at', start.toISOString());
        } else if (period === 'week') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            query = query.gte('created_at', start.toISOString());
        } else if (period === 'month') {
            const start = new Date(now);
            start.setMonth(start.getMonth() - 1);
            query = query.gte('created_at', start.toISOString());
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Calculate aggregates
        const stats = {
            total_requests: data.length,
            total_tokens: data.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
            total_cost: data.reduce((sum, log) => sum + (log.estimated_cost || 0), 0),
            avg_duration: data.length > 0 ? data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / data.length : 0,
            by_tool: {},
            logs: data
        };
        
        // Group by tool
        data.forEach(log => {
            const tool = log.tool || 'unknown';
            stats.by_tool[tool] = (stats.by_tool[tool] || 0) + 1;
        });
        
        return { stats, error: null };
        
    } catch (error) {
        console.error('❌ getUserUsageStats Error:', error);
        return { stats: null, error: error.message };
    }
}

// ============================================
// Export Functions
// ============================================

// For ES Modules
export {
    supabase,
    SUPABASE_CONFIG,
    getOrCreateUser,
    checkUserPremium,
    upgradeUser,
    generateAPIKey,
    verifyAPIKey,
    revokeAPIKey,
    listUserKeys,
    logUsage,
    getUserUsageStats
};

// For Legacy Scripts (keep global)
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.getOrCreateUser = getOrCreateUser;
    window.checkUserPremium = checkUserPremium;
    window.upgradeUser = upgradeUser;
    window.generateAPIKey = generateAPIKey;
    window.verifyAPIKey = verifyAPIKey;
    window.revokeAPIKey = revokeAPIKey;
    window.listUserKeys = listUserKeys;
    window.logUsage = logUsage;
    window.getUserUsageStats = getUserUsageStats;
}
