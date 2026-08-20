export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        const { prompt, systemPrompt, maxTokens } = req.body;
        
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        
        // Gemini API Call
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: systemPrompt ? systemPrompt + '\n\n' + prompt : prompt
                        }]
                    }]
                })
            }
        );
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            return res.status(200).json({
                choices: [{
                    message: {
                        content: data.candidates[0].content.parts[0].text
                    }
                }]
            });
        }
        
        return res.status(500).json({ 
            error: 'Gemini Error: ' + JSON.stringify(data).substring(0, 300)
        });
        
    } catch (error) {
        return res.status(500).json({ error: 'Error: ' + error.message });
    }
}
