import os
import pickle
import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands

hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.3
)

DATA_DIR = './data'

data = []
labels = []

for dir_ in sorted(os.listdir(DATA_DIR)):

    class_dir = os.path.join(DATA_DIR, dir_)
    if not os.path.isdir(class_dir):
        continue

    for img_path in os.listdir(class_dir):

        data_aux = []
        x_ = []
        y_ = []

        img = cv2.imread(os.path.join(class_dir, img_path))
        if img is None:
            continue

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = hands.process(img_rgb)

        if not results.multi_hand_landmarks:
            continue

        hand_landmarks = results.multi_hand_landmarks[0]

        for lm in hand_landmarks.landmark:
            x_.append(lm.x)
            y_.append(lm.y)

        for lm in hand_landmarks.landmark:
            data_aux.append(lm.x - min(x_))
            data_aux.append(lm.y - min(y_))

        if len(data_aux) == 42:
            data.append(data_aux)
            labels.append(dir_)

hands.close()

save_path = os.path.join(os.path.dirname(__file__), 'data.pickle')
with open(save_path, 'wb') as f:
    pickle.dump({'data': data, 'labels': labels}, f)

print("data.pickle saved at:", save_path)
print("Total samples:", len(data))
