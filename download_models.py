import os
import urllib.request

files = {
    "vendor/vision_bundle.mjs": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs",
    "vendor/vision_wasm_internal.js": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_wasm_internal.js",
    "vendor/vision_wasm_internal.wasm": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_wasm_internal.wasm",
    "vendor/face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    "vendor/hand_landmarker.task": "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
    "vendor/face-api.min.js": "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js",
    "models/tiny_face_detector_model-weights_manifest.json": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
    "models/tiny_face_detector_model-shard1": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1",
    "models/face_recognition_model-weights_manifest.json": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json",
    "models/face_recognition_model-shard1": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1",
    "models/face_recognition_model-shard2": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2",
    "models/face_landmark_68_model-weights_manifest.json": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json",
    "models/face_landmark_68_model-shard1": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1",
    "models/face_landmark_68_tiny_model-weights_manifest.json": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_tiny_model-weights_manifest.json",
    "models/face_landmark_68_tiny_model-shard1": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_tiny_model-shard1"
}

for path, url in files.items():
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        print(f"Downloading {path}...")
        try:
            urllib.request.urlretrieve(url, path)
        except Exception as e:
            print(f"Failed to download {path}: {e}")

print("Downloads complete.")
