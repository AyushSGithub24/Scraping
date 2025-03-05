import os
import requests
import cv2
import pytesseract
from gtts import gTTS
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_audioclips
import moviepy.editor as mp

# ✅ Set Tesseract OCR Path (Windows only, else comment this)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ✅ Step 1: Download Images from URLs
image_urls = [
   "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_1.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_2.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_3.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_4.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_5.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_6.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_7.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_8.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_9.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_10.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_11.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_12.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_13.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_14.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_15.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_16.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_17.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_18.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_19.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_20.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_21.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_22.jpg",
      "https://s2.manhuatop.org/manga_e7c1fdaad24fe62577ae5ed261115ba1/chapter_0/ch_0_23.jpg"
]

os.makedirs("images", exist_ok=True)
image_paths = []

for idx, url in enumerate(image_urls):
    image_path = f"images/image_{idx}.jpg"
    response = requests.get(url)
    if response.status_code == 200:
        with open(image_path, "wb") as file:
            file.write(response.content)
        image_paths.append(image_path)

print("✅ Images downloaded:", image_paths)

# ✅ Step 2: Extract Text from Images (OCR)
def extract_text(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)  # Convert to grayscale for better OCR
    text = pytesseract.image_to_string(gray).strip()
    return text if text else "No readable text found."

image_texts = [extract_text(img) for img in image_paths]
print("✅ Extracted Text:", image_texts)

# ✅ Step 3: Generate AI-Based Descriptions using BLIP
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

def generate_description(image_path):
    image = Image.open(image_path).convert("RGB")
    inputs = processor(image, return_tensors="pt")
    out = model.generate(**inputs)
    return processor.decode(out[0], skip_special_tokens=True)

image_descriptions = [generate_description(img) for img in image_paths]
print("✅ AI-Generated Descriptions:", image_descriptions)

# ✅ Step 4: Combine Text & Description for Voiceover
voiceover_texts = [
    f"The image contains the text: '{text}'. Additionally, it appears to be: {desc}."
    for text, desc in zip(image_texts, image_descriptions)
]
print("✅ Final Voiceover Texts:", voiceover_texts)

# ✅ Step 5: Generate Voiceover
os.makedirs("audio", exist_ok=True)
audio_paths = []

for idx, text in enumerate(voiceover_texts):
    tts = gTTS(text=text, lang="en")
    audio_path = f"audio/audio_{idx}.mp3"
    tts.save(audio_path)
    audio_paths.append(audio_path)

print("✅ Voiceover generated:", audio_paths)

# ✅ Step 6: Create Video from Images
frame_width, frame_height = 1280, 720
fps = 1  # 1 second per image

video_path = "output_video.avi"
fourcc = cv2.VideoWriter_fourcc(*"XVID")
video = cv2.VideoWriter(video_path, fourcc, fps, (frame_width, frame_height))

for img_path in image_paths:
    img = cv2.imread(img_path)
    img = cv2.resize(img, (frame_width, frame_height))
    video.write(img)

video.release()
print(f"✅ Video created: {video_path}")

# ✅ Step 7: Merge Audio with Video
video_clip = VideoFileClip(video_path)

# Load audio files
audio_clips = [AudioFileClip(audio) for audio in audio_paths]

# Concatenate them into one track
final_audio = concatenate_audioclips(audio_clips)

# Set final video duration
final_video = video_clip.set_audio(final_audio)
final_video.write_videofile("final_video.mp4", codec="libx264", fps=1)

print("✅ Final video with voiceover saved as final_video.mp4 🎉")
