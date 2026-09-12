let userFavorites = JSON.parse(localStorage.getItem('luthfi_favorites')) || [];
let userHistory = JSON.parse(localStorage.getItem('luthfi_history')) || [];
let currentGeneratedImageUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearchAndFilter();
    initCounterAnimation();
    initStickyNavbar();
    renderHistoryLog();
    checkApiHealth();
});

async function checkApiHealth() {
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');

    try {
        const res = await fetch('/api/health');
        const data = await res.json();

        if (data.success && data.apiKeyConfigured) {
            statusDot.style.color = '#10b981';
            statusText.textContent = 'API Online';
        } else {
            statusDot.style.color = '#ef4444';
            statusText.textContent = 'AI Service Error (Key Missing)';
        }
    } catch (err) {
        statusDot.style.color = '#ef4444';
        statusText.textContent = 'API Offline';
    }
}

const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('i');

function initTheme() {
    const savedTheme = localStorage.getItem('luthfi_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('luthfi_theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} theme`);
});

function updateThemeIcon(theme) {
    themeIcon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');

hamburgerBtn.addEventListener('click', () => { toggleMobileMenu(); });
function toggleMobileMenu() { mobileMenu.classList.toggle('open'); }

function initStickyNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
}

function initSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const catButtons = document.querySelectorAll('.cat-btn');
    const allCards = document.querySelectorAll('.card');

    let currentCategory = 'all';
    let searchQuery = '';

    function filterCards() {
        allCards.forEach(card => {
            const title = card.getAttribute('data-title').toLowerCase();
            const desc = card.querySelector('.card-desc').textContent.toLowerCase();
            const category = card.getAttribute('data-category');

            const matchesCat = (currentCategory === 'all' || category === currentCategory);
            const matchesSearch = title.includes(searchQuery) || desc.includes(searchQuery);

            if (matchesCat && matchesSearch) card.style.display = 'flex';
            else card.style.display = 'none';
        });
    }

    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-cat');
            filterCards();
        });
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterCards();
    });
}

function switchAppTab(tabId) {
    const tabs = document.querySelectorAll('.app-tab-btn');
    const panes = document.querySelectorAll('.app-pane');

    panes.forEach(pane => pane.classList.remove('active'));
    tabs.forEach(tab => tab.classList.remove('active'));

    const activePane = document.getElementById(tabId);
    if (activePane) activePane.classList.add('active');

    document.getElementById('app-workspace').scrollIntoView({ behavior: 'smooth' });
}

function handleChatKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}
function formatAIResponse(text) {
    // Escape HTML dulu supaya respons AI tidak bisa menyisipkan HTML berbahaya
    const escapeHTML = (str) =>
        str.replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;');

    let safe = escapeHTML(text);

    // Code block ```...```
    safe = safe.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code `...`
    safe = safe.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    safe = safe.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

    // Markdown headings
    safe = safe.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    safe = safe.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    safe = safe.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Bullet points
    safe = safe.replace(/^[*-] (.+)$/gm, '• $1');

    // Line breaks
    safe = safe.replace(/\n/g, '<br>');

    return safe;
}
async function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    const chatBox = document.getElementById('chat-messages-box');
    const sendBtn = document.getElementById('btn-chat-send');
    const text = input.value.trim();

    if (!text) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg msg-user';
    userMsg.textContent = text;
    chatBox.appendChild(userMsg);

    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    sendBtn.disabled = true;
    const typingEl = document.createElement('div');
    typingEl.className = 'typing-indicator';
    typingEl.id = 'temp-typing';
    typingEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Luthfi AI is thinking...`;
    chatBox.appendChild(typingEl);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        const typingMsg = document.getElementById('temp-typing');
        if (typingMsg) typingMsg.remove();

        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg msg-ai';

    if (data.success) {
    aiMsg.innerHTML = `
        <div class="ai-response-content">
            ${formatAIResponse(data.reply)}
        </div>

        <button class="copy-ai-btn" onclick="copyAIResponse(this)">
            <i class="fa-regular fa-copy"></i> Copy
        </button>

        <button class="copy-ai-btn" onclick="regenerateAIResponse(this)">
            <i class="fa-solid fa-rotate-right"></i> Regenerate
        </button>
    `;

    addHistoryItem(text.substring(0, 30) + '...', 'Chat', 'success');
    
    
}
         else {
            aiMsg.style.borderColor = '#ef4444';
            aiMsg.innerHTML = `<strong style="color:#ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Error:</strong> ${data.error}`;
            addHistoryItem(text.substring(0, 30) + '...', 'Chat', 'failed');
        }

        chatBox.appendChild(aiMsg);

    } catch (err) {
        const typingMsg = document.getElementById('temp-typing');
        if (typingMsg) typingMsg.remove();

        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg msg-ai';
        aiMsg.style.borderColor = '#ef4444';
        aiMsg.innerHTML = `<strong style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Connection Error:</strong> Unable to reach server backend.`;
        chatBox.appendChild(aiMsg);
    } finally {
        sendBtn.disabled = false;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}
function copyAIResponse(button) {
    const content = button.parentElement.querySelector('.ai-response-content');
    if (!content) return;

    navigator.clipboard.writeText(content.innerText).then(() => {
        const original = button.innerHTML;

        button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        button.classList.add('copied');

        setTimeout(() => {
            button.innerHTML = original;
            button.classList.remove('copied');
        }, 1500);
    }).catch(() => {
        showToast('Failed to copy response', true);
    });
}
function clearChatMessages() {
    const chatBox = document.getElementById('chat-messages-box');
    chatBox.innerHTML = `<div class="chat-msg msg-ai">Chat reset. How can I assist you today?</div>`;
    showToast('Chat history cleared!');
}

async function generateCodeSnippet() {
    const promptInput = document.getElementById('code-prompt-input');
    const langSelect = document.getElementById('code-lang-select');
    const frameSelect = document.getElementById('code-frame-select');
    const codeOutput = document.getElementById('code-output-view');
    const previewIframe = document.getElementById('code-live-preview');
    const genBtn = document.getElementById('btn-generate-code');

    const prompt = promptInput.value.trim();
    if (!prompt) {
        showToast('Please enter a description of what you want to build!', true);
        return;
    }

    const lang = langSelect.value;
    const frame = frameSelect.value;

    genBtn.disabled = true;
    codeOutput.textContent = `// Contacting Gemini API...
// Generating code snippet for: "${prompt}"
// Language: ${lang} | Framework: ${frame}

Please wait...`;

    try {
        const res = await fetch('/api/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, language: lang, framework: frame })
        });

        const data = await res.json();

        if (data.success) {
            codeOutput.textContent = data.code;
            previewIframe.srcdoc = data.code;
            showToast('Code generated successfully!');
            addHistoryItem(`Code: ${lang} - ${prompt.substring(0, 20)}...`, 'Code', 'success');
        } else {
            codeOutput.textContent = `// Error generating code:
// ${data.error}`;
            showToast(data.error || 'Code generation failed', true);
            addHistoryItem(`Code: ${lang} - ${prompt.substring(0, 20)}...`, 'Code', 'failed');
        }
    } catch (err) {
        codeOutput.textContent = `// Network/Server Error occurred while calling /api/code`;
        showToast('Failed to connect to backend server', true);
    } finally {
        genBtn.disabled = false;
    }
}

function toggleCodeView(view) {
    const codeView = document.getElementById('code-output-view');
    const prevView = document.getElementById('code-live-preview');
    const codeBtn = document.getElementById('btn-code-tab');
    const prevBtn = document.getElementById('btn-preview-tab');

    if (view === 'code') {
        codeView.style.display = 'block';
        prevView.style.display = 'none';
        codeBtn.classList.add('active');
        prevBtn.classList.remove('active');
    } else {
        codeView.style.display = 'none';
        prevView.style.display = 'block';
        prevBtn.classList.add('active');
        codeBtn.classList.remove('active');
    }
}

function copyCodeOutput() {
    const text = document.getElementById('code-output-view').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Code copied to clipboard!');
    }).catch(() => {
        showToast('Code output copied!');
    });
}

function downloadCodeOutput() {
    const text = document.getElementById('code-output-view').textContent;
    const lang = document.getElementById('code-lang-select').value.toLowerCase();
    const ext = lang.includes('html') ? 'html' : lang.includes('css') ? 'css' : lang.includes('javascript') ? 'js' : lang.includes('python') ? 'py' : 'txt';
    
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `luthfi-ai-code.${ext}`;
    link.click();
    showToast(`Downloaded code file (luthfi-ai-code.${ext})`);
}

async function generateAIImage() {
    const prompt = document.getElementById('image-prompt').value.trim();
    const style = document.getElementById('image-style').value;
    const aspect = document.getElementById('image-aspect').value;
    const displayBox = document.getElementById('image-display-box');
    const actionsBox = document.getElementById('image-actions');
    const genBtn = document.getElementById('btn-generate-image');

    if (!prompt) {
        showToast('Please enter an image prompt description!', true);
        return;
    }

    genBtn.disabled = true;
    actionsBox.style.display = 'none';
    displayBox.style.background = 'rgba(0,0,0,0.4)';
    displayBox.innerHTML = `<div style="color:var(--primary); font-size:1rem; font-weight:700;"><i class="fa-solid fa-spinner fa-spin"></i> Generating image via Gemini API...</div>`;

    try {
        const res = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, style, aspectRatio: aspect })
        });

        const data = await res.json();

        if (data.success && data.imageUrl) {
            currentGeneratedImageUrl = data.imageUrl;
            displayBox.innerHTML = `<img src="${data.imageUrl}" alt="AI Artwork">`;
            actionsBox.style.display = 'flex';
            showToast('AI Image generated successfully!');
            addHistoryItem(`Image: ${prompt.substring(0, 20)}...`, 'Image', 'success');
        } else {
            displayBox.innerHTML = `
                <div style="padding:1.5rem; color:#ef4444;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:0.8rem;"></i>
                    <div style="font-weight:700; font-size:0.95rem;">Image Generation Error</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem;">${data.error || 'Image generation unavailable'}</div>
                </div>
            `;
            addHistoryItem(`Image: ${prompt.substring(0, 20)}...`, 'Image', 'failed');
        }

    } catch (err) {
        displayBox.innerHTML = `<div style="color:#ef4444;"><i class="fa-solid fa-circle-xmark"></i> Connection error to server backend.</div>`;
    } finally {
        genBtn.disabled = false;
    }
}

function downloadImage() {
    if (!currentGeneratedImageUrl) return;
    const link = document.createElement('a');
    link.href = currentGeneratedImageUrl;
    link.download = `luthfi-ai-image-${Date.now()}.jpg`;
    link.click();
    showToast('Artwork download started!');
}

function copyImagePrompt() {
    const prompt = document.getElementById('image-prompt').value;
    navigator.clipboard.writeText(prompt);
    showToast('Image prompt copied!');
}

function presetAgent(name) {
    document.getElementById('agent-select').value = name;
    updateAgentSelection();
}

function updateAgentSelection() {
    const agentName = document.getElementById('agent-select').value;
    document.getElementById('active-agent-name').innerHTML = `<i class="fa-solid fa-robot"></i> ${agentName} Console`;
}

async function runRealAgent() {
    const agentName = document.getElementById('agent-select').value;
    const instruction = document.getElementById('agent-instruction-input').value.trim();
    const consoleLog = document.getElementById('agent-console-log');
    const statusTag = document.getElementById('agent-status-tag');
    const runBtn = document.getElementById('btn-run-agent');

    if (!instruction) {
        showToast('Please enter task instructions for the agent!', true);
        return;
    }

    runBtn.disabled = true;
    statusTag.textContent = "Processing";
    statusTag.style.background = "rgba(59, 130, 246, 0.2)";
    statusTag.style.color = "#60a5fa";

    consoleLog.textContent = `> Launching ${agentName}...
> Goal: "${instruction}"
> Step 1/3: Formulating cognitive plan...
> Step 2/3: Dispatching instruction to Gemini Reasoning Pipeline...`;

    try {
        const res = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentName, instruction })
        });

        const data = await res.json();

        if (data.success) {
            consoleLog.textContent = `> Status: Execution Completed Successfully!
----------------------------------------
${data.output}`;
            statusTag.textContent = "Completed";
            statusTag.style.background = "rgba(16, 185, 129, 0.2)";
            statusTag.style.color = "#10b981";
            showToast(`${agentName} finished task execution!`);
            addHistoryItem(`Agent (${agentName}): ${instruction.substring(0, 20)}...`, 'Agent', 'success');
        } else {
            consoleLog.textContent += `

[ERROR]: ${data.error}`;
            statusTag.textContent = "Failed";
            statusTag.style.background = "rgba(239, 68, 68, 0.2)";
            statusTag.style.color = "#ef4444";
            showToast(`Agent execution failed`, true);
            addHistoryItem(`Agent (${agentName}): ${instruction.substring(0, 20)}...`, 'Agent', 'failed');
        }

    } catch (err) {
        consoleLog.textContent += `

[ERROR]: Network error contacting /api/agent`;
        statusTag.textContent = "Failed";
        statusTag.style.background = "rgba(239, 68, 68, 0.2)";
        statusTag.style.color = "#ef4444";
    } finally {
        runBtn.disabled = false;
    }
}

function addHistoryItem(title, type, status = 'success') {
    const item = {
        title,
        type,
        status,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    userHistory.unshift(item);
    if (userHistory.length > 15) userHistory.pop();
    localStorage.setItem('luthfi_history', JSON.stringify(userHistory));
    renderHistoryLog();
}

function renderHistoryLog() {
    const historyBox = document.getElementById('history-list-box');
    if (!historyBox) return;

    if (userHistory.length === 0) {
        historyBox.innerHTML = `<div style="color:var(--text-muted); font-size:0.9rem;">No generation history recorded yet.</div>`;
        return;
    }

    historyBox.innerHTML = userHistory.map(item => `
        <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem;">
                    <span class="badge" style="font-size:0.75rem;">${item.type}</span>
                    <span style="font-size:0.75rem; font-weight:700; color:${item.status === 'success' ? '#10b981' : '#ef4444'};">
                        <i class="fa-solid ${item.status === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> ${item.status.toUpperCase()}
                    </span>
                </div>
                <div style="font-weight:600; font-size:0.95rem;">${item.title}</div>
            </div>
            <span style="font-size:0.8rem; color:var(--text-dim);">${item.date}</span>
        </div>
    `).join('');
}

function confirmClearHistory() {
    if (confirm("Are you sure you want to clear all history records?")) {
        userHistory = [];
        localStorage.removeItem('luthfi_history');
        renderHistoryLog();
        showToast('History log cleared');
    }
}

function toggleFav(element, toolName) {
    element.classList.toggle('active');
    if (element.classList.contains('active')) {
        element.className = "fa-solid fa-star fav-star active";
        if (!userFavorites.includes(toolName)) userFavorites.push(toolName);
        showToast(`Added ${toolName} to Favorites!`);
    } else {
        element.className = "fa-regular fa-star fav-star";
        userFavorites = userFavorites.filter(item => item !== toolName);
        showToast(`Removed from Favorites`);
    }
    localStorage.setItem('luthfi_favorites', JSON.stringify(userFavorites));
}

function openModal(title, description) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = description;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');

    msgEl.textContent = message;
    if (isError) {
        iconEl.className = 'fa-solid fa-circle-exclamation';
        iconEl.style.color = '#ef4444';
        toast.style.borderColor = '#ef4444';
    } else {
        iconEl.className = 'fa-solid fa-circle-check';
        iconEl.style.color = '#10b981';
        toast.style.borderColor = 'var(--primary)';
    }

    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');
    let animated = false;

    window.addEventListener('scroll', () => {
        const triggerBottom = window.innerHeight * 0.85;
        counters.forEach(counter => {
            const top = counter.getBoundingClientRect().top;
            if (top < triggerBottom && !animated) {
                animated = true;
                counters.forEach(c => {
                    const target = +c.getAttribute('data-target');
                    let count = 0;
                    const speed = target / 30;
                    const updateCount = () => {
                        count += speed;
                        if (count < target) {
                            c.innerText = Math.ceil(count);
                            setTimeout(updateCount, 40);
                        } else {
                            c.innerText = target;
                        }
                    };
                    updateCount();
                });
            }
        });
    });
}

async function regenerateAIResponse(button) {
    const aiMsg = button.closest('.chat-msg');
    if (!aiMsg) return;

    const userMsg = aiMsg.previousElementSibling;
    if (!userMsg || !userMsg.classList.contains('msg-user')) {
        showToast('Pesan sebelumnya tidak ditemukan', true);
        return;
    }

    const text = userMsg.textContent.trim();

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        if (data.success) {
            aiMsg.innerHTML = `
                <div class="ai-response-content">
                    ${formatAIResponse(data.reply)}
                </div>

                <button class="copy-ai-btn" onclick="copyAIResponse(this)">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>

                <button class="copy-ai-btn" onclick="regenerateAIResponse(this)">
                    <i class="fa-solid fa-rotate-right"></i> Regenerate
                </button>
            `;
            showToast('Jawaban berhasil dibuat ulang!');
        } else {
            showToast(data.error || 'Gagal regenerate', true);
            button.disabled = false;
            button.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Regenerate';
        }
    } catch (err) {
        showToast('Gagal terhubung ke server', true);
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Regenerate';
    }
}
