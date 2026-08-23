// Common AI function for all tools
window.callAI = async function(prompt, systemPrompt, maxTokens) {
    console.log('Calling AI...');
    
    try {
        const response = await fetch('/api/groq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                systemPrompt: systemPrompt || '',
                maxTokens: maxTokens || 1000
            })
        });

        if (!response.ok) {
            throw new Error('Server error: ' + response.status);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        
        return 'No response from AI';
        
    } catch (error) {
        console.error('Error:', error);
        return 'Error: ' + error.message;
    }
};

console.log('callAI function loaded');
