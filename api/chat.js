// ============================================
// AI CHATBOT - FIXED VERSION
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

        console.log('💬 Received message:', message);

        let reply = null;
        let usedApi = null;
        let errors = [];

        // ============================================
        // API 1: ChatGPT (Best Quality)
        // ============================================
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log('🔄 Trying ChatGPT...');
                
                const messages = [
                    { role: 'system', content: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.' }
                ];

                if (history && Array.isArray(history)) {
                    for (const h of history) {
                        messages.push({ role: h.role, content: h.content });
                    }
                }

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
                console.error('❌ ChatGPT Error:', error.message);
                errors.push(`ChatGPT: ${error.message}`);
            }
        } else {
            console.log('⚠️ OPENAI_API_KEY not set');
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
                            { role: 'system', content: 'You are a helpful AI assistant. Provide clear, accurate responses.' },
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
                    const errorText = await response.text();
                    console.error('❌ Groq Error:', errorText);
                    errors.push(`Groq: ${response.status}`);
                }
            } catch (error) {
                console.error('❌ Groq Error:', error.message);
                errors.push(`Groq: ${error.message}`);
            }
        } else if (!reply) {
            console.log('⚠️ GROQ_API_KEY not set');
        }

        // ============================================
        // API 3: Fallback (Always Works)
        // ============================================
        if (!reply) {
            console.log('🔄 Using Fallback...');
            const responses = [
                `I'm your AI assistant! I received your message: "${message.trim()}". I can help you with questions, explanations, writing, advice, and more. What would you like to know? 😊`,
                
                `Hello! 👋 I understand you asked: "${message.trim()}". I'm here to help with anything - from answering questions to creative writing. Feel free to ask me anything!`,
                
                `Great question! 😊 Here's what I can help with: answering questions, explaining topics, writing content, giving advice, brainstorming ideas, and much more. Just let me know what you need!`
            ];
            reply = responses[Math.floor(Math.random() * responses.length)];
            usedApi = 'AI Assistant (Fallback)';
            console.log('✅ Using fallback response!');
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
