<!-- ============================================ -->
<!-- ✅ JAVASCRIPT - config.js load karein FIRST   -->
<!-- ============================================ -->

<!-- ✅ 1. CONFIG.JS LOAD KAREIN (Pehle) -->
<script src="/config.js"></script>

<!-- ✅ 2. Aapka Main Script -->
<script>
    // ============================================
    // 1. callAI FUNCTION (config.js se use karega)
    // ============================================
    
    // Agar config.js load nahi ho raha toh ye fallback hai:
    async function callAIFallback(prompt, systemPrompt = '', maxTokens = 1500) {
        try {
            console.log('🚀 Calling AI API (Fallback)...');
            const response = await fetch('/api/groq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, systemPrompt, maxTokens })
            });
            const data = await response.json();
            if (data.choices && data.choices[0]) {
                return data.choices[0].message.content;
            } else {
                throw new Error(data.error || 'No response from AI');
            }
        } catch (error) {
            console.error('❌ API Error:', error);
            throw new Error(error.message || 'Failed to generate response. Please try again.');
        }
    }

    // Agar config.js load nahi hua toh fallback use karein
    if (typeof window.callAI === 'undefined') {
        console.warn('⚠️ config.js not loaded, using fallback');
        window.callAI = callAIFallback;
    }

    // ============================================
    // 2. TOOL FUNCTIONS
    // ============================================

    let lastSummaryContent = '';
    let summaryData = {};

    function updateCharCount() {
        const text = document.getElementById('inputText').value;
        document.getElementById('charCount').textContent = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        document.getElementById('wordCount').textContent = words;
    }

    function loadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('inputText').value = e.target.result;
            updateCharCount();
            showToast('File Loaded!');
        };
        reader.readAsText(file);
    }

    function loadSample(type) {
        const samples = {
            technology: `Artificial Intelligence (AI) is transforming the world at an unprecedented pace. From virtual assistants like Siri and Alexa to self-driving cars, AI has become an integral part of our daily lives. Machine learning algorithms can now diagnose diseases with accuracy comparable to human doctors. In the business world, AI-powered chatbots handle customer service queries 24/7, while predictive analytics helps companies make data-driven decisions. The education sector is also being revolutionized with personalized learning experiences. However, with great power comes great responsibility. There are concerns about job displacement, privacy issues, and the ethical use of AI. Governments worldwide are working on regulations to ensure AI is developed and deployed responsibly. Despite these challenges, the future of AI looks promising, with potential breakthroughs in healthcare, climate change, and space exploration on the horizon.`,
            
            health: `Regular exercise is one of the most important things you can do for your health. Physical activity can help prevent chronic diseases like heart disease, diabetes, and obesity. The World Health Organization recommends at least 150 minutes of moderate-intensity exercise per week for adults. Exercise not only improves physical health but also has significant mental health benefits. It releases endorphins, which are natural mood elevators, helping to reduce stress, anxiety, and depression. Regular physical activity also improves sleep quality, boosts energy levels, and enhances cognitive function. For best results, combine cardiovascular exercises like running or swimming with strength training exercises. Remember to start slowly and gradually increase intensity. Always consult with a healthcare provider before starting any new exercise program, especially if you have existing health conditions.`,
            
            business: `Digital marketing has become essential for businesses of all sizes in today's digital age. Unlike traditional marketing, digital marketing allows businesses to reach their target audience with precision and measure results in real-time. Social media platforms like Facebook, Instagram, and LinkedIn offer powerful advertising tools that can be customized based on demographics, interests, and behavior. Search engine optimization (SEO) helps businesses rank higher in Google search results, driving organic traffic to their websites. Content marketing establishes brand authority and builds trust with potential customers. Email marketing remains one of the highest ROI marketing channels, with an average return of $42 for every $1 spent. The key to successful digital marketing is understanding your audience and creating valuable content that addresses their needs. With the rise of mobile usage, businesses must ensure their websites are mobile-friendly and load quickly.`
        };
        
        document.getElementById('inputText').value = samples[type];
        updateCharCount();
        showToast('Sample Loaded!');
    }

    async function generateSummary() {
        const text = document.getElementById('inputText').value;
        const format = document.getElementById('summaryFormat').value;
        const length = document.getElementById('summaryLength').value;
        const language = document.getElementById('language').value;
        
        const result = document.getElementById('result');
        const loading = document.getElementById('loading');
        const btn = document.getElementById('generateBtn');
        const downloadBtns = document.getElementById('downloadBtns');

        if (!text || text.length < 50) {
            alert('Please paste at least 50 characters of text.');
            return;
        }

        summaryData = { format, length, language };

        btn.disabled = true;
        loading.style.display = 'block';
        result.style.display = 'none';
        downloadBtns.style.display = 'none';

        const prompt = `Summarize the following text.\n\nFORMAT: ${format}\nLENGTH: ${length}\nLANGUAGE: ${language}\n\nTEXT TO SUMMARIZE:\n${text}\n\nProvide the summary in ${language} language.`;
        const systemPrompt = 'You are a professional content summarizer. Create clear, accurate summaries.';

        try {
            // ✅ config.js se callAI use karein (ya fallback)
            const content = await window.callAI(prompt, systemPrompt, 1500);
            
            lastSummaryContent = content;
            result.innerHTML = `<strong>✅ Summary (${format}):</strong><br><br>${content.replace(/\n/g, '<br>')}`;
            result.style.display = 'block';
            downloadBtns.style.display = 'flex';
            result.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            result.innerHTML = `❌ Error: ${error.message}`;
            result.style.display = 'block';
        } finally {
            btn.disabled = false;
            loading.style.display = 'none';
        }
    }

    function downloadPDF() {
        if (!lastSummaryContent) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Text Summary', 105, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${summaryData.format} | ${summaryData.length}`, 105, 19, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(lastSummaryContent, 180);
        doc.text(lines, 15, 35);
        doc.save('Summary_' + Date.now() + '.pdf');
        showToast('PDF Downloaded!');
    }

    function downloadTXT() {
        if (!lastSummaryContent) return;
        const txtContent = 'TEXT SUMMARY\nFormat: ' + summaryData.format + '\n\n' + lastSummaryContent;
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Summary_' + Date.now() + '.txt';
        link.click();
        showToast('TXT Downloaded!');
    }

    function copySummary() {
        if (!lastSummaryContent) return;
        navigator.clipboard.writeText(lastSummaryContent).then(() => {
            showToast('Summary Copied!');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = lastSummaryContent;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Summary Copied!');
        });
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = '✅ ' + message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }

    window.onload = function() {
        updateCharCount();
        console.log('✅ Summary page loaded!');
        if (typeof window.callAI !== 'undefined') {
            console.log('✅ callAI function available from config.js');
        } else {
            console.warn('⚠️ Using fallback callAI');
        }
    };
</script>
