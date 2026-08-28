// ============================================
// AI CHATBOT API - ChatGPT + Groq + Free Backup
// ============================================

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { message, history } = req.body;

        if (!message || message.trim().length < 1) {
            return res.status(400).json({ success: false, error: 'Please enter a message' });
        }

        console.log('💬 Chat message:', message);

        let reply = null;
        let usedApi = null;
        let errors = [];

        // ============================================
        // API 1: ChatGPT (Best Quality)
        // ============================================
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log('🔄 Trying ChatGPT...');
                
                const messages = [];
                
                // Add history if available
                if (history && Array.isArray(history)) {
                    for (const h of history) {
                        messages.push({ role: h.role, content: h.content });
                    }
                }
                
                // Add current message
                messages.push({ role: 'user', content: message.trim() });

                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                });

                reply = response.choices[0].message.content;
                usedApi = 'ChatGPT (GPT-4o-mini)';
                console.log('✅ Reply from ChatGPT!');
            } catch (error) {
                console.log('⚠️ ChatGPT failed:', error.message);
                errors.push(`ChatGPT: ${error.message}`);
            }
        }

        // ============================================
        // API 2: Groq (Free Alternative)
        // ============================================
        if (!reply && process.env.GROQ_API_KEY) {
            try {
                console.log('🔄 Trying Groq...');
                
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'mixtral-8x7b-32768',
                        messages: [
                            { role: 'system', content: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.' },
                            { role: 'user', content: message.trim() }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0]) {
                        reply = data.choices[0].message.content;
                        usedApi = 'Groq (Mixtral-8x7b)';
                        console.log('✅ Reply from Groq!');
                    }
                } else {
                    errors.push(`Groq: ${response.status}`);
                }
            } catch (error) {
                console.log('⚠️ Groq failed:', error.message);
                errors.push(`Groq: ${error.message}`);
            }
        }

        // ============================================
        // API 3: Free Fallback (Simple Response)
        // ============================================
        if (!reply) {
            try {
                console.log('🔄 Using Fallback...');
                reply = `I'm an AI assistant. I received your message: "${message.trim()}". 

💡 Here are some ways I can help:
- Answer questions on any topic
- Provide explanations and summaries
- Help with writing and editing
- Give advice and suggestions
- Chat about anything you like

What would you like to know more about? 😊`;
                usedApi = 'AI Assistant (Fallback)';
                console.log('✅ Using fallback response!');
            } catch (error) {
                errors.push(`Fallback: ${error.message}`);
            }
        }

        // ============================================
        // FINAL RESPONSE
        // ============================================
        if (!reply) {
            return res.status(500).json({
                success: false,
                error: 'All APIs failed. Please try again.',
                details: errors.join(' | ')
            });
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
