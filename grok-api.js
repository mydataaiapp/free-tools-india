// Groq AI Integration (Free API)
class GrokAI {
    constructor() {
        this.apiKey = CONFIG.GROQ_API_KEY;
        this.apiUrl = CONFIG.GROQ_API_URL;
        this.model = CONFIG.GROQ_MODEL;
    }

    // Main API call function
    async generateResponse(prompt, maxTokens = 1000, systemPrompt = '') {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt || 'You are a helpful assistant. Respond in simple English.'
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
            
            if (data.choices && data.choices[0]) {
                return data.choices[0].message.content;
            } else {
                console.error('API Error:', data);
                return 'Error: ' + JSON.stringify(data);
            }
        } catch (error) {
            console.error('API Error:', error);
            return 'Error: API call failed. Please try again.';
        }
    }

    // AI Summary Generator
    async generateSummary(text) {
        const prompt = `Please summarize this text in 5 bullet points:
        
        ${text}
        
        Format:
        ✅ Point 1
        ✅ Point 2
        ✅ Point 3
        ✅ Point 4
        ✅ Point 5`;
        
        return await this.generateResponse(prompt, 500, 'You are a professional content summarizer.');
    }

    // AI Article Writer
    async generateArticle(topic, wordCount = 500) {
        const prompt = `Write a comprehensive article about "${topic}" 
        Word count: ${wordCount}
        Include: Title, Introduction, Main Points with Subheadings, Conclusion`;
        
        return await this.generateResponse(prompt, wordCount * 2, 'You are a professional content writer.');
    }

    // Excel Formula Generator
    async generateExcelFormula(description) {
        const prompt = `Generate Excel formula for: ${description}
        
        Provide:
        1. FORMULA: [the formula]
        2. EXPLANATION: [simple explanation]
        3. EXAMPLE: [practical example]`;
        
        return await this.generateResponse(prompt, 300, 'You are an Excel expert.');
    }

    // Resume Content Generator
    async generateResumeContent(name, jobTitle, experience, skills, education) {
        const prompt = `Create professional resume content for:
        Name: ${name}
        Job Title: ${jobTitle}
        Experience: ${experience}
        Skills: ${skills}
        Education: ${education}
        
        Include:
        - Professional Summary
        - Key Skills (5)
        - Work Experience bullets (3)
        - Achievements (3)`;
        
        return await this.generateResponse(prompt, 800, 'You are a professional resume writer.');
    }

    // Email Writer
    async generateEmail(emailType, recipient, keyPoints) {
        const prompt = `Write a ${emailType} email to ${recipient}. 
        Key points: ${keyPoints || 'Not specified'}
        Include: Subject line, Greeting, Body, Professional Signature`;
        
        return await this.generateResponse(prompt, 500, 'You are a business communication expert.');
    }

    // Social Media Post Generator
    async generateSocialPost(platform, topic, details) {
        const prompt = `Create an engaging ${platform} post about "${topic}". 
        Details: ${details || 'None'}
        Include: Catchy headline, Main content, 10 relevant hashtags, Call to action`;
        
        return await this.generateResponse(prompt, 500, 'You are a social media marketing expert.');
    }
}

// Create instance for use
const grokAI = new GrokAI();
