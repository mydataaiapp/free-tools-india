// ============================================
// CHATBOT - UPDATED GROQ MODELS
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

        console.log('💬 User:', message);

        let reply = null;
        let usedApi = null;

        // ============================================
        // API 1: Groq (Free & Fast)
        // ============================================
        if (process.env.GROQ_API_KEY) {
            try {
                console.log('🔄 Trying Groq API...');
                
                const messages = [
                    { 
                        role: 'system', 
                        content: `You are a helpful, intelligent, and thoughtful AI assistant. 
                        Provide detailed, accurate, and personalized answers.` 
                    }
                ];

                if (history && Array.isArray(history)) {
                    for (const h of history.slice(-10)) {
                        messages.push({ role: h.role, content: h.content });
                    }
                }

                messages.push({ role: 'user', content: message });

                // ✅ UPDATED: Using new Groq models
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-70b-versatile',  // ✅ New model
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 800,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0]) {
                        reply = data.choices[0].message.content;
                        usedApi = 'Groq (Llama 3.1 70B) ⚡';
                        console.log('✅ Groq Success!');
                    }
                } else {
                    const errorData = await response.json();
                    console.log('❌ Groq Error:', errorData);
                    
                    // Try fallback model
                    const response2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        },
                        body: JSON.stringify({
                            model: 'llama-3.1-8b-instant',  // ✅ Fallback model
                            messages: messages,
                            temperature: 0.7,
                            max_tokens: 800,
                        })
                    });

                    if (response2.ok) {
                        const data2 = await response2.json();
                        if (data2.choices && data2.choices[0]) {
                            reply = data2.choices[0].message.content;
                            usedApi = 'Groq (Llama 3.1 8B) ⚡';
                            console.log('✅ Groq Fallback Success!');
                        }
                    } else {
                        throw new Error('Both Groq models failed');
                    }
                }
            } catch (error) {
                console.log('❌ Groq Error:', error.message);
            }
        }

        // ============================================
        // API 2: ChatGPT (Backup)
        // ============================================
        if (!reply && process.env.OPENAI_API_KEY) {
            try {
                console.log('🔄 Trying ChatGPT...');
                
                const messages = [
                    { role: 'system', content: 'You are a helpful AI assistant.' }
                ];

                if (history && Array.isArray(history)) {
                    for (const h of history.slice(-10)) {
                        messages.push({ role: h.role, content: h.content });
                    }
                }

                messages.push({ role: 'user', content: message });

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 800,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0]) {
                        reply = data.choices[0].message.content;
                        usedApi = 'ChatGPT (GPT-4o-mini) 🤖';
                        console.log('✅ ChatGPT Success!');
                    }
                } else {
                    console.log('❌ ChatGPT Error:', response.status);
                }
            } catch (error) {
                console.log('❌ ChatGPT Error:', error.message);
            }
        }

        // ============================================
        // API 3: Intelligent Fallback
        // ============================================
        if (!reply) {
            console.log('🔄 Using Fallback...');
            
            const userMsg = message.trim().toLowerCase();
            let fallbackReply = '';

            if (userMsg.includes('hello') || userMsg.includes('hi')) {
                fallbackReply = `👋 Hello! I'm your AI assistant. How can I help you today?`;
            } else if (userMsg.includes('how are you')) {
                fallbackReply = `😊 I'm doing great! Thanks for asking. How can I assist you?`;
            } else if (userMsg.includes('friend') && userMsg.includes('lie')) {
                fallbackReply = `💭 That's a difficult situation. Here's some advice:

**Should you confront them?**
✅ YES if: You want clarity and can stay calm
❌ NO if: It's a small issue or might end the friendship

**How to approach:**
1. Choose the right time when you're both calm
2. Use "I" statements: "I felt hurt when..."
3. Listen to their side
4. Decide if the friendship is worth the effort

Remember: Honesty builds stronger friendships. What feels right to you? 💭`;
            } else if (userMsg.includes('recipe') || userMsg.includes('food')) {
                fallbackReply = `🍳 **Healthy Breakfast Recipe - Oatmeal with Fruits**

**Ingredients:**
• Rolled oats - 1/2 cup
• Milk/water - 1 cup
• Banana - 1 sliced
• Berries - 1/2 cup
• Honey - 1 tsp
• Nuts - 2 tbsp

**Instructions:**
1. Boil milk/water
2. Add oats, cook 5 mins
3. Top with fruits, nuts, honey
4. Enjoy! 😊

**Calories:** ~350

Want more recipes? Just ask! 🍽️`;
            } else if (userMsg.includes('coding') || userMsg.includes('learn')) {
                fallbackReply = `💻 **How to Learn Coding Fast:**

1. Choose one language (Python is best for beginners)
2. Start with basics (variables, loops, functions)
3. Build small projects (calculator, to-do list)
4. Practice daily (30 mins minimum)
5. Join coding communities

**Best Free Resources:**
• freeCodeCamp
• Codecademy
• YouTube tutorials

Start today! 🚀 What language are you interested in?`;
            } else if (userMsg.includes('career') || userMsg.includes('job')) {
                fallbackReply = `💼 **Career Growth Tips:**

1. Keep learning new skills
2. Network with people in your field
3. Set clear goals
4. Build a strong portfolio
5. Find a mentor

**Quick actions:**
• Update LinkedIn weekly
• Take online courses
• Attend industry events

What specific aspect would you like help with? 🚀`;
            } else {
                fallbackReply = `💡 I received your question: "${message}"

I'm currently unable to connect to AI services. This might be because:

1. 🔑 API keys need to be updated
2. ⏳ Rate limit exceeded
3. 🌐 Network issue

**To fix this:**
• Make sure your API keys are correct
• Try again after a few seconds
• Check Vercel logs for more details

I'll be back online soon! 😊`;
            }
            
            reply = fallbackReply;
            usedApi = 'AI Assistant (Fallback) 🧠';
            console.log('✅ Fallback Response!');
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
