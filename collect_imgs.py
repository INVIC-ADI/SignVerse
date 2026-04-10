import os
import cv2
import string

# =====================
# CONFIG
# =====================
DATA_DIR = './data'
os.makedirs(DATA_DIR, exist_ok=True)

# A–Z + 0–9  → 36 classes
CLASSES = list(string.ascii_uppercase) + [str(i) for i in range(10)]
dataset_size = 100

cap = cv2.VideoCapture(0)

for label in CLASSES:
    class_dir = os.path.join(DATA_DIR, label)
    os.makedirs(class_dir, exist_ok=True)

    print(f'Collecting data for class {label}')

    # ---------- Ready Screen ----------
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        cv2.putText(
            frame,
            f'Ready for {label}? Press Q',
            (50, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2,
            cv2.LINE_AA
        )

        cv2.imshow('frame', frame)
        if cv2.waitKey(25) == ord('q'):
            break

    # ---------- Image Capture ----------
    counter = 0
    while counter < dataset_size:
        ret, frame = cap.read()
        if not ret:
            continue

        cv2.imshow('frame', frame)
        cv2.imwrite(os.path.join(class_dir, f'{counter}.jpg'), frame)
        cv2.waitKey(25)
        counter += 1

cap.release()
cv2.destroyAllWindows()
