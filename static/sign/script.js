const sentenceBox = document.getElementById("sentence");
const spaceBtn = document.getElementById("spaceBtn");
const backspaceBtn = document.getElementById("backspaceBtn");
const clearBtn = document.getElementById("clearAllBtn");
const sendBtn = document.getElementById("sendBtn");
const langToggle = document.getElementById("langToggle");
const engLabel = document.getElementById("engLabel");
const hinLabel = document.getElementById("hinLabel");

let currentRawSentence = "";

// 🔁 Update Labels
function updateLangLabels() {
    if (langToggle.checked) {
        hinLabel.style.color = "#6366f1";
        hinLabel.style.fontWeight = "700";
        engLabel.style.color = "#9ca3af";
        engLabel.style.fontWeight = "500";
    } else {
        engLabel.style.color = "#6366f1";
        engLabel.style.fontWeight = "700";
        hinLabel.style.color = "#9ca3af";
        hinLabel.style.fontWeight = "500";
    }
}
langToggle.addEventListener("change", updateLangLabels);
updateLangLabels();

// 🔁 Poll backend sentence
async function fetchSentence() {
    try {
        const res = await fetch("/sentence");
        const data = await res.json();
        const sentence = data.sentence || "";
        
        if (sentence !== currentRawSentence) {
            currentRawSentence = sentence;
            
            if (langToggle.checked && sentence.trim()) {
                sentenceBox.textContent = "Translating...";
                const translated = await translateText(sentence, "Hindi");
                sentenceBox.textContent = translated;
            } else {
                sentenceBox.textContent = sentence || "Waiting for sign…";
            }
        }
    } catch {
        sentenceBox.textContent = "Camera not available";
    }
}
setInterval(fetchSentence, 1000); // Slower polling for translation stability

// Translation Helper
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

// ➕ Space
spaceBtn.onclick = async () => {
    await fetch("/add_space", { method: "POST" });
};

// ⬅️ Backspace
backspaceBtn.onclick = async () => {
    await fetch("/backspace", { method: "POST" });
};

// 🧹 Clear All
clearBtn.onclick = async () => {
    await fetch("/clear_sentence", { method: "POST" });
    sentenceBox.textContent = "Waiting for sign…";
};

sendBtn.onclick = async () => {
    window.location.href = "/chatbot";
};
