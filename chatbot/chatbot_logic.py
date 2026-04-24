import requests
from google import genai
from google.genai import types

# ==========================
# CONFIG — paste your Gemini API key here
# ==========================
GEMINI_API_KEY = "AIzaSyARVFvUYE-orX5KtSahg1AsVEGNQmvfDpQ"
GEMINI_MODEL   = "gemini-2.5-flash-lite"

# Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

# ==========================
# Local LLM conversation history
# ==========================
conversation = [
    {
        "role": "system",
        "content": """You are SignVerse, a helpful sign language assistant.

Rules:
- Answer directly and relevantly
- No punctuation
- Do not overthink
- If My Name is asked say SignVerse
"""
    }
]

gemini_conversation = []

SYSTEM_PROMPT = (
    "You are SignVerse, an intelligent, friendly, and helpful sign language assistant. "
    "Always provide clear, concise, and helpful answers. "
    "Maintain a friendly tone. "
    "Do NOT use punctuation in short answers unless absolutely necessary for clarity, "
    "but for longer explanations, format them nicely."
)


# ==========================
# Gemini (global model)
# ==========================
def gemini_chatbot_response(user_text):
    global gemini_conversation

    if not user_text.strip():
        return {"reply": "Unknown"}

    user_lower = user_text.lower().strip()

    # Keep fast rule-based overrides
    if "your name" in user_lower:
        return {"reply": "My name SignVerse"}
    if "pccoe" in user_lower or "address" in user_lower:
        return {"reply": "PCCOE Pune Maharashtra"}

    gemini_conversation.append(user_text)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=gemini_conversation,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.5,
                top_p=0.9,
                max_output_tokens=300
            )
        )
        
        reply = response.text.strip()
        print("GEMINI RAW:", reply)
        gemini_conversation.append(reply)

    except Exception as e:
        print("GEMINI ERROR:", e)
        reply = "Gemini error try again"
        gemini_conversation.pop() # Remove the user text if failed

    return {"reply": reply}


# ==========================
# Local LLM (Ollama / llama3)
# ==========================
def local_chatbot_response(user_text):
    global conversation

    if not user_text.strip():
        return {"reply": "Unknown"}

    user_lower = user_text.lower().strip()

    if "your name" in user_lower:
        return {"reply": "My name SignVerse"}
    if "pccoe" in user_lower or "address" in user_lower:
        return {"reply": "Pimpri Pune Maharashtra"}

    conversation.append({"role": "user", "content": user_text})

    try:
        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "llama3",
                "messages": conversation,
                "stream": False,
                "options": {
                    "temperature": 0.5,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1
                }
            },
            timeout=30
        )

        print("LOCAL RAW:", response.text)

        data  = response.json()
        reply = data["message"]["content"].strip()

        reply = reply.split("\n")[0]
        reply = " ".join(reply.split()[:6])

        conversation.append({"role": "assistant", "content": reply})

    except Exception as e:
        print("LOCAL ERROR:", e)
        reply = "Server error try again"

    return {"reply": reply}


# ==========================
# Unified entry point
# ==========================
def chatbot_response(user_text, mode="local"):
    if mode == "gemini":
        return gemini_chatbot_response(user_text)
    return local_chatbot_response(user_text)

# ==========================
# Translation logic (Gemini)
# ==========================
def translate_text(text, target_lang="Hindi"):
    if not text.strip():
        return ""
    
    prompt = f"Translate the following text to {target_lang}. Return ONLY the translated text, no explanation or punctuation unless necessary. Text: {text}"
    
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=100
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"Translation Error: {e}")
        return text # Return original if fails
