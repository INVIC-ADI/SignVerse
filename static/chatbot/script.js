// Load chat from localStorage on page load
window.addEventListener("DOMContentLoaded", () => {
    const savedChat = localStorage.getItem("chatHistory");
    if (savedChat) {
        chatBox.innerHTML = savedChat;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});

const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const videoEl = document.getElementById("signVideo");
const videoContainer = document.querySelector(".video-container");
const replayBtn = document.getElementById("replayBtn");
const stopBtn   = document.getElementById("stopBtn");
const modelToggle = document.getElementById("modelToggle");
const localLabel  = document.getElementById("localLabel");
const geminiLabel = document.getElementById("geminiLabel");
const voiceBtn   = document.getElementById("voiceBtn");
const langToggle = document.getElementById("langToggle");
const engLabel   = document.getElementById("engLabel");
const hinLabel   = document.getElementById("hinLabel");

const chatView = document.getElementById("chatView");
const translatorView = document.getElementById("translatorView");
const tabChat = document.getElementById("tabChat");
const tabTranslator = document.getElementById("tabTranslator");

// Integrated detection elements (Repositioned)
const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const liveFeed = document.getElementById("live-feed");
const liveOverlay = document.getElementById("live-prediction-overlay");
const liveResultBox = document.getElementById("live-text-result");
const captureToChatBtn = document.getElementById("captureToChatBtn");
const recordingIndicator = document.getElementById("recording-indicator");
const pipCameraWrap = document.getElementById("pip-camera-wrap");

// Translator View elements
const transInput = document.getElementById("trans-input");
const transOutput = document.getElementById("trans-output");
const transSignBtn = document.getElementById("transSignBtn");
const transTranslateBtn = document.getElementById("transTranslateBtn");
const transFetchBtn = document.getElementById("transFetchBtn");
const transCopyBtn = document.getElementById("transCopyBtn");
const transToggleCameraBtn = document.getElementById("transToggleCameraBtn");
const transStopBtn = document.getElementById("transStopBtn");
const transVoiceBtn = document.getElementById("transVoiceBtn"); // Added

// ================= VIEW SWITCHER =================
window.switchView = (view) => {
    // Hide all
    chatView.classList.remove("active");
    translatorView.classList.remove("active");
    tabChat.classList.remove("active");
    tabTranslator.classList.remove("active");

    // Show selected
    if (view === 'chat') {
        chatView.classList.add("active");
        tabChat.classList.add("active");
    } else if (view === 'translator') {
        translatorView.classList.add("active");
        tabTranslator.classList.add("active");
    }
};

// Highlight active model label
function updateToggleLabels() {
    if (modelToggle.checked) {
        geminiLabel.classList.add("toggle-active");
        localLabel.classList.remove("toggle-active");
    } else {
        localLabel.classList.add("toggle-active");
        geminiLabel.classList.remove("toggle-active");
    }
}
updateToggleLabels();
modelToggle.addEventListener("change", updateToggleLabels);

function updateLangLabels() {
    if (langToggle.checked) {
        hinLabel.classList.add("toggle-active");
        engLabel.classList.remove("toggle-active");
        input.placeholder = "अपना संदेश टाइप करें...";
        if(transInput) transInput.placeholder = "साइन करने के लिए टेक्स्ट टाइप करें...";
    } else {
        engLabel.classList.add("toggle-active");
        hinLabel.classList.remove("toggle-active");
        input.placeholder = "Type your message...";
        if(transInput) transInput.placeholder = "Type text to convert to sign...";
    }
}
updateLangLabels();
langToggle.addEventListener("change", updateLangLabels);

let lastVideos = [];
let isProcessing = false;
let isCameraActive = false;
let detectionInterval;

// ================= HELPER =================
function smoothScroll() {
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth"
    });
}

// ================= CHAT UI =================
function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    
    let translateHtml = '';
    if (sender === 'bot') {
        translateHtml = `
            <button class="msg-translate-btn" title="Translate to Hindi" onclick="handleManualTranslate(this, '${text.replace(/'/g, "\\'")}')">
                Translate to HI 🌐
            </button>
        `;
    }

    msg.innerHTML = `
        <div class="msg-text">${text}</div>
        ${translateHtml}
        <div class="time">${new Date().toLocaleTimeString()}</div>
    `;
    chatBox.appendChild(msg);

    // Save chat to localStorage
    localStorage.setItem("chatHistory", chatBox.innerHTML);

    smoothScroll();
}

async function handleManualTranslate(button, originalText) {
    button.disabled = true;
    button.textContent = "Translating...";
    
    try {
        const translated = await translateText(originalText, "Hindi");
        const msgTextDiv = button.parentElement.querySelector(".msg-text");
        msgTextDiv.innerHTML += `<div class="translated-text" style="margin-top:8px; padding-top:8px; border-top:1px solid #eee; color:#6366f1; font-weight:500;">${translated}</div>`;
        button.remove(); // Remove button after translation
    } catch (e) {
        button.textContent = "Error ❌";
        button.disabled = false;
    }
}

// ================= NOTICE =================
function addNotice(text) {
    // Show in chat box
    const notice = document.createElement("div");
    notice.className = "notice";
    notice.textContent = text;
    chatBox.appendChild(notice);
    smoothScroll();
}

// Typing indicator
function showTyping() {
    const typing = document.createElement("div");
    typing.className = "message bot typing";
    typing.id = "typing-indicator";
    typing.innerHTML = `Typing...`;
    chatBox.appendChild(typing);
    smoothScroll();
}

function removeTyping() {
    const typing = document.getElementById("typing-indicator");
    if (typing) typing.remove();
}

// ================= TEXT → VIDEO =================
async function textToVideos(text) {
    if (!text) return [];

    text = text.toUpperCase().trim();
    const normalized = text.replace(/\s+/g, "_");
    const wordVideo = `${normalized}.mp4`;

    try {
        const res = await fetch(
            `/static/chatbot/avatar_videos/${wordVideo}`,
            { method: "HEAD" }
        );
        if (res.ok) return [wordVideo];
    } catch (e) {}

    const videos = [];
    for (let char of text) {
        if (char >= "A" && char <= "Z") {
            videos.push(`${char}.mp4`);
        }
    }
    return videos;
}

// ================= VIDEO PLAYER =================
function playVideoSequence(videos) {
    if (!videos || videos.length === 0) return;

    lastVideos = [...videos];
    let index = 0;

    videoContainer.style.display = "flex";
    videoEl.pause();
    videoEl.currentTime = 0;

    const playNext = () => {
        videoEl.classList.remove("fade-in");
        videoEl.classList.add("fade-out");

        setTimeout(() => {
            videoEl.src = `/static/chatbot/avatar_videos/${videos[index]}`;
            videoEl.load();

            videoEl.onloadeddata = () => {
                videoEl.classList.remove("fade-out");
                videoEl.classList.add("fade-in");
                videoEl.play();
            };
        }, 200);
    };

    playNext();

    videoEl.onended = () => {
        index++;
        if (index < videos.length) {
            playNext();
        } else {
            videoEl.onended = null;
        }
    };
}

// Stop Logic
stopBtn.onclick = () => {
    videoEl.pause();
    videoEl.onended = null;
    addNotice("🛑 Animation stopped.");
};

// ================= SEND (CHATBOT) =================
async function sendMessage() {
    if (isProcessing) return;

    let message = input.value.trim();
    if (!message) return;

    isProcessing = true;
    sendBtn.disabled = true;

    addMessage(message, "user");
    input.value = "";
    showTyping();

    try {
        // Translation if in Hindi mode
        if (langToggle.checked) {
            addNotice("⏳ Translating Hindi to English for Chatbot...");
            message = await translateText(message, "English");
        }

        const mode = modelToggle.checked ? "gemini" : "local";
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, mode })
        });

        const data = await res.json();

        removeTyping();
        addMessage(data.reply, "bot");

        const videos = await textToVideos(data.reply);
        playVideoSequence(videos);

    } catch (e) {
        removeTyping();
        addMessage("Server error. Please try again.", "bot");
    }

    sendBtn.disabled = false;
    isProcessing = false;
}

// Button click
sendBtn.onclick = sendMessage;

// Enter key support
input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// ================= INTEGRATED CAMERA DETECTION (PIP REPOSITIONED) =================
toggleCameraBtn.onclick = () => {
    if (!isCameraActive) {
        startLiveDetection();
    } else {
        stopLiveDetection();
    }
};

if (transToggleCameraBtn) {
    transToggleCameraBtn.onclick = () => {
        if (!isCameraActive) startLiveDetection();
        else stopLiveDetection();
    };
}

if (transStopBtn) {
    transStopBtn.onclick = () => {
        if (isCameraActive) stopLiveDetection();
    };
}

async function startLiveDetection() {
    isCameraActive = true;
    toggleCameraBtn.innerHTML = "⏹️";
    toggleCameraBtn.classList.replace("secondary-btn", "stop-btn");
    recordingIndicator.classList.replace("inactive", "active");
    
    // Start PIP video feed
    liveFeed.src = "/video_feed";
    pipCameraWrap.style.display = "block";
    captureToChatBtn.disabled = false;

    if (transToggleCameraBtn) {
        transToggleCameraBtn.innerHTML = "⏹️";
        transToggleCameraBtn.classList.replace("secondary-btn", "stop-btn");
    }
    
    // Start polling detection result
    detectionInterval = setInterval(pollDetection, 800);
    addNotice("🎥 Camera active.");
}

async function stopLiveDetection() {
    isCameraActive = false;
    toggleCameraBtn.innerHTML = "📷";
    toggleCameraBtn.classList.replace("stop-btn", "secondary-btn");
    recordingIndicator.classList.replace("active", "inactive");
    
    liveFeed.src = "";
    pipCameraWrap.style.display = "none";
    liveOverlay.style.display = "none";

    if (transToggleCameraBtn) {
        transToggleCameraBtn.innerHTML = "📷";
        transToggleCameraBtn.classList.replace("stop-btn", "secondary-btn");
    }
    
    clearInterval(detectionInterval);
    addNotice("📁 Camera stopped.");
}

async function pollDetection() {
    try {
        // Get character prediction
        const predRes = await fetch("/prediction");
        const predData = await predRes.json();
        if (predData.char) {
            liveOverlay.textContent = predData.char;
            liveOverlay.style.display = "block";
        } else {
            liveOverlay.style.display = "none";
        }

        // Get full sentence
        const sentRes = await fetch("/sentence");
        const sentData = await sentRes.json();
        let sentence = sentData.sentence || "";
        
        if (sentence.trim() !== "") {
            const displaySentence = langToggle.checked ? await translateText(sentence, "Hindi") : sentence;
            liveResultBox.textContent = displaySentence;
            if (transOutput) transOutput.textContent = displaySentence;
            captureToChatBtn.dataset.sentence = sentence;
        } else {
            liveResultBox.textContent = "Sign...";
            if (transOutput) transOutput.textContent = "Waiting for signs...";
        }
    } catch (e) {}
}

captureToChatBtn.onclick = () => {
    const rawText = captureToChatBtn.dataset.sentence || "";
    if (rawText) {
        input.value = rawText;
        addNotice("💬 Ready to send.");
        fetch("/clear_sentence", { method: "POST" });
        liveResultBox.textContent = "";
    }
};

// ================= TRANSLATOR HANDLERS =================
transSignBtn.onclick = async () => {
    const text = transInput.value.trim();
    if (!text) return;
    
    let textToSign = text;
    if (langToggle.checked) {
        addNotice("⏳ Translating...");
        textToSign = await translateText(text, "English");
    }

    const videos = await getSignVideos(textToSign);
    playVideoSequence(videos);
};

transTranslateBtn.onclick = async () => {
    const text = transInput.value.trim();
    if (!text) return;
    
    transTranslateBtn.disabled = true;
    transTranslateBtn.textContent = "...";
    
    try {
        const translated = await translateText(text, "Hindi");
        transInput.value = translated;
    } finally {
        transTranslateBtn.disabled = false;
        transTranslateBtn.textContent = "Translate to HI 🇮🇳";
    }
};

transFetchBtn.onclick = async () => {
    const res = await fetch("/sentence");
    const data = await res.json();
    if (data.sentence) {
        transOutput.textContent = langToggle.checked ? await translateText(data.sentence, "Hindi") : data.sentence;
    }
};

transCopyBtn.onclick = () => {
    input.value = transOutput.textContent;
    switchView('chat');
    addNotice("💬 Copied.");
};

// ================= SHARED HELPERS =================
async function getSignVideos(text) {
    const words = text.toUpperCase().split(/\s+/);
    const videos = [];
    for (const word of words) {
        const wordFile = `${word.toLowerCase()}.mp4`;
        try {
            const res = await fetch(`/static/chatbot/avatar_videos/${wordFile}`, { method: "HEAD" });
            if (res.ok) { videos.push(wordFile); continue; }
        } catch (e) {}
        for (const char of word) {
            if (char >= "A" && char <= "Z") videos.push(`${char.toLowerCase()}.mp4`);
        }
    }
    return videos;
}

async function translateText(text, target = "Hindi") {
    try {
        const res = await fetch("/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, target })
        });
        const data = await res.json();
        return data.translated || text;
    } catch (e) {
        return text;
    }
}

clearBtn.onclick = async () => {
    chatBox.innerHTML = "";
    input.value = "";
    if(transInput) transInput.value = "";
    videoEl.pause();
    localStorage.removeItem("chatHistory");
    fetch("/clear_sentence", { method: "POST" });
};

replayBtn.onclick = () => { if (lastVideos.length > 0) playVideoSequence(lastVideos); };

// ================= VOICE (STT) LOGIC =================
// Refactored to handle both Chatbot and Translator inputs
let mediaRecorder; 
let audioChunks = []; 
let isRecording = false;
let currentVoiceTarget = null; // 'chat' or 'translator'
let recordingTimeout;

function updateVoiceBtnUI(active, target, processing = false) {
    const btn = target === 'chat' ? voiceBtn : transVoiceBtn;
    if (processing) {
        btn.innerHTML = "⏳";
        btn.classList.remove("recording");
        btn.disabled = true;
    } else if (active) {
        btn.innerHTML = "⏹️";
        btn.classList.add("recording");
        btn.disabled = false;
    } else {
        btn.innerHTML = "🎙️";
        btn.classList.remove("recording");
        btn.disabled = false;
    }
}

async function startRecording(target) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        currentVoiceTarget = target;

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            uploadAudio(currentVoiceTarget);
        };
        
        mediaRecorder.start();
        isRecording = true;
        updateVoiceBtnUI(true, target);
        addNotice(`🎙️ Recording (${target})...`);

        // Automatically stop after 30 seconds
        recordingTimeout = setTimeout(() => {
            if (isRecording) {
                stopRecording();
                addNotice("⏱️ Auto-stopped recording.");
            }
        }, 30000);

    } catch (err) {
        addNotice("❌ Microphone access denied.");
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        clearTimeout(recordingTimeout);
        mediaRecorder.stop();
        isRecording = false;
        updateVoiceBtnUI(false, currentVoiceTarget, true); // Set to processing
    }
}

async function uploadAudio(target) {
    if (audioChunks.length === 0) {
        updateVoiceBtnUI(false, target);
        return;
    }
    
    addNotice("⏳ Processing audio...");
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('language_code', langToggle.checked ? "hin" : "eng");

    try {
        const res = await fetch("/stt", { method: "POST", body: formData });
        const data = await res.json();
        
        if (data.text) {
            if (target === 'chat') {
                // Chatflow: add message, translate if needed, and play
                input.value = data.text;
                sendMessage();
            } else if (target === 'translator') {
                // Translator flow: just put in textarea
                if (transInput) {
                    transInput.value = data.text;
                    addNotice("✨ Voice text captured in translator.");
                }
            }
        } else {
            addNotice("❌ Could not understand audio. Try again.");
        }
    } catch (err) {
        addNotice("❌ STT Error.");
    } finally {
        updateVoiceBtnUI(false, target); // Reset to default state
    }
}

// Attach event listeners
if (voiceBtn) {
    voiceBtn.onclick = () => {
        if (!isRecording) startRecording('chat');
        else stopRecording();
    };
}

if (transVoiceBtn) {
    transVoiceBtn.onclick = () => {
        if (!isRecording) startRecording('translator');
        else stopRecording();
    };
}
