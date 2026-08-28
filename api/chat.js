// ============================================
// AI CHATBOT API - ChatGPT + Groq + Fallback
// Best Quality, Always Working
// ============================================

import OpenAI from 'openai';

// Initialize OpenAI (ChatGPT)
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

        console.log('💬 User Message:', message);

        let reply = null;
        let usedApi = null;
        let errors = [];

        // ============================================
        // API 1: ChatGPT (Best Quality) ⭐⭐⭐⭐⭐
        // ============================================
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log('🔄 Trying ChatGPT API...');
                
                const messages = [
                    { 
                        role: 'system', 
                        content: `You are a helpful, friendly, and knowledgeable AI assistant. 
                        Provide clear, accurate, and concise responses. 
                        If you don't know something, say so honestly. 
                        Be empathetic and engaging in your responses.` 
                    }
                ];

                // Add conversation history
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
                    top_p: 0.9,
                });

                reply = response.choices[0].message.content;
                usedApi = 'ChatGPT (GPT-4o-mini) ⭐';
                console.log('✅ ChatGPT Response Success!');
            } catch (error) {
                console.log('⚠️ ChatGPT Error:', error.message);
                errors.push(`ChatGPT: ${error.message}`);
            }
        } else {
            console.log('⚠️ OPENAI_API_KEY not set');
        }

        // ============================================
        // API 2: Groq (Fast & Free) ⭐⭐⭐⭐
        // ============================================
        if (!reply && process.env.GROQ_API_KEY) {
            try {
                console.log('🔄 Trying Groq API...');
                
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'mixtral-8x7b-32768',
                        messages: [
                            { 
                                role: 'system', 
                                content: `You are a helpful, friendly, and knowledgeable AI assistant. 
                                Provide clear, accurate, and concise responses. 
                                If you don't know something, say so honestly.` 
                            },
                            { role: 'user', content: message.trim() }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000,
                        top_p: 0.9,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0]) {
                        reply = data.choices[0].message.content;
                        usedApi = 'Groq (Mixtral-8x7b) ⚡';
                        console.log('✅ Groq Response Success!');
                    }
                } else {
                    const errorData = await response.json();
                    console.log('⚠️ Groq Error:', errorData);
                    errors.push(`Groq: ${errorData.error?.message || response.status}`);
                }
            } catch (error) {
                console.log('⚠️ Groq Error:', error.message);
                errors.push(`Groq: ${error.message}`);
            }
        } else if (!reply) {
            console.log('⚠️ GROQ_API_KEY not set');
        }

        // ============================================
        // API 3: Intelligent Fallback (Always Works) ⭐⭐⭐
        // ============================================
        if (!reply) {
            console.log('🔄 Using Intelligent Fallback...');
            
            const userMsg = message.trim();
            const userLower = userMsg.toLowerCase();
            
            let fallbackReply = '';
            
            // Smart responses based on user input
            if (userLower.includes('hello') || userLower.includes('hi') || userLower.includes('hey')) {
                fallbackReply = `👋 Hello! I'm your AI assistant. How can I help you today? Ask me anything!`;
            } 
            else if (userLower.includes('how are you')) {
                fallbackReply = `😊 I'm doing great! Thanks for asking. I'm here to help you with anything you need. What's on your mind?`;
            }
            else if (userLower.includes('what is') || userLower.includes('explain') || userLower.includes('meaning')) {
                fallbackReply = `🤔 That's a great question! I'd love to help explain. Could you please provide more details so I can give you a better answer?`;
            }
            else if (userLower.includes('help') || userLower.includes('support')) {
                fallbackReply = `🆘 I'm here to help! I can assist you with:\n
• Answering questions on any topic\n
• Writing and editing content\n
• Explaining complex topics\n
• Giving advice and suggestions\n
• Brainstorming ideas\n\nWhat would you like help with?`;
            }
            else if (userLower.includes('thank') || userLower.includes('thanks')) {
                fallbackReply = `😊 You're welcome! I'm always here to help. If you need anything else, just ask!`;
            }
            else if (userLower.includes('bye') || userLower.includes('goodbye')) {
                fallbackReply = `👋 Goodbye! It was nice chatting with you. Come back anytime you need help. Take care! 😊`;
            }
            else if (userLower.includes('weather')) {
                fallbackReply = `🌤️ I'd love to tell you the weather, but I need your location to do that. Could you please tell me which city you're in?`;
            }
            else if (userLower.includes('name')) {
                fallbackReply = `🤖 I'm your AI Chatbot assistant! I don't have a specific name, but you can call me AI Buddy. What's your name? 😊`;
            }
            else if (userLower.includes('joke') || userLower.includes('funny')) {
                const jokes = [
                    `😂 Why don't scientists trust atoms? Because they make up everything!`,
                    `😄 What do you call a fake noodle? An impasta!`,
                    `🤣 Why did the scarecrow win an award? Because he was outstanding in his field!`,
                    `😅 What do you call a bear with no teeth? A gummy bear!`
                ];
                fallbackReply = jokes[Math.floor(Math.random() * jokes.length)];
            }
            else if (userLower.includes('story') || userLower.includes('tell me a story')) {
                fallbackReply = `📖 Once upon a time, in a world powered by AI, there was a curious person who asked amazing questions. Every question led to new discoveries, and soon they became the smartest person in the world. The end. 😊 Want to hear another story?`;
            }
            else if (userLower.includes('love') || userLower.includes('❤️')) {
                fallbackReply = `❤️ That's wonderful! Love is the most beautiful thing in the world. I'm here to help you with anything you need. How can I assist you today?`;
            }
            else if (userLower.includes('food') || userLower.includes('recipe') || userLower.includes('cook')) {
                fallbackReply = `🍳 I love food! What kind of recipe are you looking for? I can suggest recipes for:\n
• Italian (Pasta, Pizza)\n
• Indian (Curry, Biryani)\n
• Chinese (Noodles, Fried Rice)\n
• Mexican (Tacos, Burritos)\n
• Desserts (Cakes, Cookies)\n\nWhat would you like?`;
            }
            else if (userLower.includes('code') || userLower.includes('programming') || userLower.includes('python')) {
                fallbackReply = `💻 I can help with coding! I know Python, JavaScript, HTML, CSS, and more. What would you like to know?\n
• Learn Python basics\n
• JavaScript for beginners\n
• Build a website\n
• Debug your code\n\nTell me what you need!`;
            }
            else if (userLower.includes('study') || userLower.includes('learn') || userLower.includes('education')) {
                fallbackReply = `📚 Learning is the key to success! I can help you with:\n
• Study tips and techniques\n
• Subject explanations\n
• Homework help\n
• Career guidance\n\nWhat would you like to learn about?`;
            }
            else if (userLower.includes('time') || userLower.includes('date') || userLower.includes('today')) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                fallbackReply = `🕐 Today is ${dateStr} and the time is ${timeStr}. How can I help you today?`;
            }
            else if (userLower.length < 5) {
                fallbackReply = `💡 I see you sent a short message: "${userMsg}". Could you please tell me more so I can help you better? I'm here to assist with anything! 😊`;
            }
            else {
                fallbackReply = `💡 I received your message: "${userMsg}".\n\nHere are some ways I can help you:\n
📌 Answer questions on any topic\n
✍️ Help with writing and editing\n
🔬 Explain complex topics simply\n
💡 Give advice and suggestions\n
🎨 Brainstorm creative ideas\n
📖 Tell stories and jokes\n
💻 Help with coding and tech\n
🎯 Provide study tips and career guidance\n\nWhat would you like to explore today? 😊`;
            }
            
            reply = fallbackReply;
            usedApi = 'AI Assistant (Smart Fallback) 🧠';
            console.log('✅ Fallback Response Success!');
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
