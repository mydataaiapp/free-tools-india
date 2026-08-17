// Supabase Integration
class SupabaseDB {
    constructor() {
        this.url = SUPABASE_CONFIG.SUPABASE_URL;
        this.key = SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY;
        this.headers = {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': 'Bearer ' + this.key
        };
    }

    // Save user feedback
    async saveFeedback(toolName, rating, message) {
        try {
            const response = await fetch(`${this.url}/rest/v1/feedback`, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    tool_name: toolName,
                    rating: rating,
                    message: message
                })
            });

            if (response.ok) {
                console.log('✅ Feedback saved successfully');
                return true;
            } else {
                console.error('Error saving feedback:', await response.json());
                return false;
            }
        } catch (error) {
            console.error('Supabase Error:', error);
            return false;
        }
    }

    // Track tool usage
    async trackUsage(toolName) {
        try {
            const response = await fetch(`${this.url}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    tool_used: toolName,
                    ip_address: 'unknown'
                })
            });

            if (response.ok) {
                console.log('✅ Usage tracked');
                return true;
            } else {
                console.error('Error tracking:', await response.json());
                return false;
            }
        } catch (error) {
            console.error('Supabase Error:', error);
            return false;
        }
    }

    // Get all feedback
    async getFeedback() {
        try {
            const response = await fetch(`${this.url}/rest/v1/feedback?select=*&order=created_at.desc&limit=100`, {
                method: 'GET',
                headers: this.headers
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Supabase Error:', error);
            return [];
        }
    }
}

// Create instance
const supabaseDB = new SupabaseDB();
