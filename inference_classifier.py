import pickle
import cv2
import mediapipe as mp
import numpy as np
import string
import os

# =========================
# Load trained model
# =========================
model_dict = pickle.load(open(os.path.join(os.path.dirname(__file__), 'model.p'), 'rb'))
model = model_dict['model']

# =========================
# Class labels: A–Z + 0–9
# =========================
CLASSES = list(string.ascii_uppercase) + [str(i) for i in range(10)]
labels_dict = {i: CLASSES[i] for i in range(len(CLASSES))}

# =========================
# MediaPipe setup
# =========================
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.3
)

# =========================
# Camera
# =========================
cap = cv2.VideoCapture(0)
stable_char = ""
stable_count = 0
STABLE_THRESHOLD = 8   # you can change to 5–10


while True:
    ret, frame = cap.read()
    if not ret:
        continue

    H, W, _ = frame.shape
    data_aux, x_, y_ = [], [], []

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(frame_rgb)

    if results.multi_hand_landmarks:
        hand_landmarks = results.multi_hand_landmarks[0]

        # Draw landmarks
        mp_drawing.draw_landmarks(
            frame,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS,
            mp_drawing_styles.get_default_hand_landmarks_style(),
            mp_drawing_styles.get_default_hand_connections_style()
        )

        for lm in hand_landmarks.landmark:
            x_.append(lm.x)
            y_.append(lm.y)

        for lm in hand_landmarks.landmark:
            data_aux.append(lm.x - min(x_))
            data_aux.append(lm.y - min(y_))

        if len(data_aux) == 42:
            prediction = model.predict([np.asarray(data_aux)])
            current_char = prediction[0]
            if current_char == stable_char:
                stable_count += 1
            else:
                stable_char = current_char
                stable_count = 1

            if stable_count >= STABLE_THRESHOLD:
                predicted_character = stable_char
            else:
                predicted_character = ""


            x1 = int(min(x_) * W) - 10
            y1 = int(min(y_) * H) - 10
            x2 = int(max(x_) * W) + 10
            y2 = int(max(y_) * H) + 10

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 4)
            if predicted_character != "":
                cv2.putText(frame, predicted_character, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3,
                            cv2.LINE_AA)


    cv2.imshow('frame', frame)

    if cv2.waitKey(1) & 0xFF == 27:  # ESC to exit
        break

cap.release()
cv2.destroyAllWindows()
hands.close()
