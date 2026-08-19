// API Configuration - Secure
const CONFIG = {
    API_URL: '/api/groq',
    MAX_TOKENS: 1500,
    TEMPERATURE: 0.7
};

// AI Call Function
async function callAI(prompt, systemPrompt = '', maxTokens = 1500) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                systemPrompt: systemPrompt,
                maxTokens: maxTokens
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content;
        } else {
            throw new Error(JSON.stringify(data));
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
