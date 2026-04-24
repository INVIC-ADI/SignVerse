import os
import cv2
import pickle
import mediapipe as mp
import numpy as np
import atexit
import time
import base64
import io
from flask import Flask, render_template, Response, jsonify, request
from flask_cors import CORS
from PIL import Image
from chatbot.chatbot_logic import chatbot_response, translate_text
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = "hand2help_secret_key"
CORS(app) # Crucial for mobile app access

# ==========================
# ElevenLabs Setup
# ==========================
# Leave space for the user to paste their API key or use .env
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "sk_02c32ceb42bb4517649f643abc7e18ce120586d8f2700341")
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# ==========================
# Config & State
# ==========================
APPEND_COOLDOWN = 1.2 
last_append_time = 0
STABLE_THRESHOLD = 16

stable_char = ""
stable_count = 0
current_prediction = ""
sentence = ""
last_added_char = ""

# ==========================
# Load Model
# ==========================
model = pickle.load(open("model.p", "rb"))["model"]

# ==========================
# MediaPipe Setup
# ==========================
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.3
)

cap = None

# ==========================
# CORE PREDICTION LOGIC
# ==========================

def process_and_predict(frame):
    """
    Refined logic based on user snippet + stability & cooldown.
    Returns: (prediction, bbox_coords) where bbox_coords is (x1, y1, x2, y2, hand_landmarks) or None
    """
    global stable_char, stable_count, current_prediction, sentence, last_added_char, last_append_time
    
    x_, y_, data_aux = [], [], []
    prediction = ""
    bbox_info = None

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb)

    if results.multi_hand_landmarks:
        hand_landmarks = results.multi_hand_landmarks[0]

        # Get frame dimensions
        h, w, _ = frame.shape
        
        # Collect coordinates
        for lm in hand_landmarks.landmark:
            x_.append(lm.x)
            y_.append(lm.y)

        for lm in hand_landmarks.landmark:
            data_aux.append(lm.x - min(x_))
            data_aux.append(lm.y - min(y_))

        # Calculate Bounding Box
        x1, y1 = int(min(x_) * w) - 10, int(min(y_) * h) - 10
        x2, y2 = int(max(x_) * w) + 10, int(max(y_) * h) + 10
        bbox_info = (x1, y1, x2, y2, hand_landmarks)

        # Predict
        if len(data_aux) >= 42:
            data_aux = data_aux[:42]
            pred = model.predict([np.asarray(data_aux)])[0]

            if pred == stable_char:
                stable_count += 1
            else:
                stable_char = pred
                stable_count = 1

            if stable_count >= STABLE_THRESHOLD:
                prediction = stable_char
                now = time.time()
                # Apply last_added_char check AND APPEND_COOLDOWN
                if prediction != last_added_char and (now - last_append_time) > APPEND_COOLDOWN:
                    sentence += prediction
                    last_added_char = prediction
                    last_append_time = now
    else:
        stable_char = ""
        stable_count = 0
        last_added_char = ""
    
    current_prediction = prediction
    return prediction, bbox_info

# ==========================
# ROUTES
# ==========================

@app.route("/")
def index():
    return render_template("landing.html")

@app.route("/chatbot")
def chatbot_page():
    return render_template("chatbot.html")

@app.route("/landing")
def landing_page():
    return render_template("landing.html")

# ==========================
# VIDEO STREAM (Web View)
# ==========================

def generate_frames():
    global cap
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    while True:
        success, frame = cap.read()
        if not success:
            break

        # Unified logic to avoid double-processing MediaPipe
        pred, bbox_info = process_and_predict(frame)

        if bbox_info:
            x1, y1, x2, y2, hand_landmarks = bbox_info
            
            # Draw landmarks
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            # Draw bounding box (Black)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 3)

            # Draw prediction text just above the box (Green)
            if pred:
                cv2.putText(
                    frame, pred, (x1, y1 - 15), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3
                )

        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

# ==========================
# MOBILE API (Required for the App)
# ==========================

@app.route("/mobile/predict", methods=["POST"])
def mobile_predict():
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({"error": "No image data provided"}), 400
    
    try:
        img_data = base64.b64decode(data['image'])
        img = Image.open(io.BytesIO(img_data))
        frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        pred, _ = process_and_predict(frame)
        
        return jsonify({
            "prediction": pred,
            "sentence": sentence
        })
    except Exception as e:
        print(f"Mobile Predict Error: {e}")
        return jsonify({"error": str(e)}), 500

# ==========================
# SHARED APIs
# ==========================

@app.route("/prediction")
def get_prediction():
    return jsonify({"char": current_prediction})

@app.route("/sentence")
def get_sentence():
    return jsonify({"sentence": sentence})

@app.route("/clear_sentence", methods=["POST"])
def clear_sentence():
    global sentence, last_added_char
    sentence = ""
    last_added_char = ""
    return jsonify({"status": "cleared"})

@app.route("/add_space", methods=["POST"])
def add_space():
    global sentence
    sentence += " "
    return jsonify({"sentence": sentence})

@app.route("/backspace", methods=["POST"])
def backspace():
    global sentence, last_added_char
    sentence = sentence[:-1]
    last_added_char = ""
    return jsonify({"sentence": sentence})

# ==========================
# SPEECH TO TEXT API (ElevenLabs)
# ==========================

@app.route("/stt", methods=["POST"])
def speech_to_text():
    """
    Receives an audio file and returns transcribed text.
    Supports optional language_code (e.g., 'hin' or 'eng').
    """
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    language_code = request.form.get('language_code', 'eng')
    
    try:
        audio_data = io.BytesIO(audio_file.read())
        
        transcription = elevenlabs_client.speech_to_text.convert(
            file=audio_data,
            model_id="scribe_v2",
            tag_audio_events=True,
            language_code=language_code,
            diarize=False,
        )
        
        text = str(transcription.text) if hasattr(transcription, 'text') else str(transcription)
        
        return jsonify({
            "text": text
        })
    except Exception as e:
        print(f"STT Error: {e}")
        return jsonify({"error": str(e)}), 500

# ==========================
# TRANSLATION API
# ==========================

@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    text = data.get("text", "")
    target = data.get("target", "Hindi")
    
    translated = translate_text(text, target)
    return jsonify({"translated": translated})

# ==========================
# CHATBOT API
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "").strip()
    mode = data.get("mode", "local")
    response = chatbot_response(message, mode)
    return jsonify(response)

# ==========================
# CLEANUP
# ==========================

@atexit.register
def cleanup():
    global cap
    if cap and cap.isOpened():
        cap.release()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
