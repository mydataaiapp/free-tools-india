// Grok API Integration
class GrokAI {
    constructor() {
        this.apiKey = CONFIG.GROK_API_KEY;
        this.apiUrl = CONFIG.GROK_API_URL;
    }

    async generateResponse(prompt, maxTokens = 1000) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.GROK_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant for Indian users. Respond in simple language.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: CONFIG.TEMPERATURE
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Grok API Error:', error);
            return 'Error: API call failed. Please try again.';
        }
    }

    // AI Summary Generator
    async generateSummary(text) {
        const prompt = `Please summarize this text in 5 bullet points (Hindi + English mix):
        
        ${text}
        
        Format:
        ✅ Point 1
        ✅ Point 2
        ✅ Point 3
        ✅ Point 4
        ✅ Point 5`;
        
        return await this.generateResponse(prompt, 500);
    }

    // AI Article Writer
    async generateArticle(topic, wordCount = 500) {
        const prompt = `Write a comprehensive article about "${topic}" 
        in simple Hinglish language.
        Word count: ${wordCount}
        Include: Introduction, Main Points, Conclusion
        Add emojis where appropriate`;
        
        return await this.generateResponse(prompt, wordCount * 2);
    }

    // Excel Formula Generator
    async generateExcelFormula(description) {
        const prompt = `Generate Excel formula for: ${description}
        
        Provide:
        1. Formula
        2. Explanation in Hindi
        3. Example usage`;
        
        return await this.generateResponse(prompt, 300);
    }

    // Resume Content Generator
    async generateResumeContent(jobTitle, experience) {
        const prompt = `Create professional resume content for:
        Job Title: ${jobTitle}
        Experience: ${experience} years
        
        Include:
        - Professional Summary
        - Key Skills (5)
        - Work Experience bullets (3)
        - Achievements (3)`;
        
        return await this.generateResponse(prompt, 800);
    }
}

// Export for use
const grokAI = new GrokAI();
