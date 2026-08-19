// API Health Check
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const healthStatus = {
        groq: await checkGroq(),
        gemini: await checkGemini(),
        openrouter: await checkOpenRouter(),
        timestamp: new Date().toISOString()
    };
    
    res.status(200).json(healthStatus);
}

async function checkGroq() {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY }
        });
        return response.ok ? 'Working' : 'Failed';
    } catch {
        return 'Failed';
    }
}

async function checkGemini() {
    try {
        if (!process.env.GEMINI_API_KEY) return 'Not configured';
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        );
        return response.ok ? 'Working' : 'Failed';
    } catch {
        return 'Failed';
    }
}

async function checkOpenRouter() {
    try {
        if (!process.env.OPENROUTER_API_KEY) return 'Not configured';
        return 'Configured';
    } catch {
        return 'Failed';
    }
}
