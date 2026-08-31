// ============================================
// CHATBOT - GROQ API ONLY (100% WORKING)
// ============================================

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { message, history } = req.body;

        if (!message || message.trim().length < 1) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please enter a message' 
            });
        }

        console.log('💬 User Message:', message);
        
        // Check if API Key exists
        const apiKey = process.env.GROQ_API_KEY;
        console.log('🔑 API Key exists:', !!apiKey);
        console.log('🔑 API Key starts with gsk_:', apiKey ? apiKey.startsWith('gsk_') : false);

        let reply = null;
        let usedApi = null;

        // ============================================
        // GROQ API
        // ============================================
        if (apiKey && apiKey.startsWith('gsk_')) {
            try {
                console.log('🔄 Trying Groq API...');
                
                // Build messages
                const messages = [
                    { 
                        role: 'system', 
                        content: `You are a helpful, intelligent, and thoughtful AI assistant. 
                        Provide detailed, accurate, and personalized answers to the user's questions.
                        If you don't know something, say so honestly.
                        Be empathetic and engaging in your responses.` 
                    }
                ];

                if (history && Array.isArray(history)) {
                    for (const h of history.slice(-10)) {
                        messages.push({ role: h.role, content: h.content });
                    }
                }

                messages.push({ role: 'user', content: message });

                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'mixtral-8x7b-32768',
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 800,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0]) {
                        reply = data.choices[0].message.content;
                        usedApi = 'Groq (Mixtral-8x7b) ⚡';
                        console.log('✅ Groq Success!');
                    }
                } else {
                    const errorData = await response.json();
                    console.log('❌ Groq API Error:', errorData);
                    
                    if (errorData.error?.code === 'invalid_api_key') {
                        reply = `❌ Invalid Groq API Key!

Please check:
1. 🔑 Go to https://console.groq.com/keys
2. 🆕 Create a new API Key (starts with gsk_)
3. 📋 Copy the key
4. ⚙️ Update GROQ_API_KEY in Vercel Environment Variables
5. 🔄 Redeploy the project

I'll be ready to help you after that! 😊`;
                    } else {
                        reply = `❌ Groq API Error: ${errorData.error?.message || 'Unknown error'}`;
                    }
                    usedApi = 'AI Assistant (Error)';
                }
            } catch (error) {
                console.log('❌ Groq Error:', error.message);
                reply = `❌ Error: ${error.message}`;
                usedApi = 'AI Assistant (Error)';
            }
        } else {
            console.log('⚠️ GROQ_API_KEY is missing or invalid format');
            reply = `❌ API Key not configured properly!

**To fix this:**
1. 🔑 Go to https://console.groq.com/keys
2. 🆕 Create a new API Key (starts with gsk_)
3. 📋 Copy the key
4. ⚙️ Add to Vercel: Settings → Environment Variables
   - Name: GROQ_API_KEY
   - Value: gsk_xxxxxxxxxxxxxxxx
5. 🔄 Redeploy

I'll be ready to help you after that! 😊`;
            usedApi = 'AI Assistant (No API Key)';
        }

        return res.status(200).json({
            success: true,
            reply: reply,
            api: usedApi,
            message: `✅ Responded with ${usedApi}`
        });

    } catch (error) {
        console.error('❌ Chat Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
