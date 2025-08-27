# 📽️ Comic-to-Video Generator

This project converts **comic chapters into narrated videos** using scraping, text-to-speech, and video generation pipelines. It uses a **microservice architecture** with Redis queues for async job processing.

---

## 🚀 Features

* Scrape comic chapters and extract text + images
* Generate voiceovers from extracted text
* Stitch images and voice into a video with FFmpeg
* Job queue system using **BullMQ + Redis**
* Frontend for submitting comic URLs and downloading final videos
* Progress tracking for long-running jobs
---

## 🎥 Demo Video

Check out a generated sample video here:  
👉 [Watch on YouTube](https://www.youtube.com/watch?v=aTSPIdDlEs8)


---

## 🛠️ Tech Stack

* **Backend**: Node.js (Express, BullMQ, Redis)
* **Services**:

  * `Scrapping-service` → extracts images and chapter text
  * `text-extraction-voice-service` → text-to-speech (Python `pyttsx3`)
  * `video-generation-service` → combines assets into final video with FFmpeg
* **Database/Queue**: Redis
* **Frontend**: HTML, CSS, JavaScript (served from `public/`)
* **External Tools**: FFmpeg

---

## 📂 Project Structure

```
├── Scrapping-service/            # Extracts chapter data
├── text-extraction-voice-service # TTS generation service
├── video-generation-service/     # Video rendering service
├── public/                       # Frontend (HTML, CSS, JS)
├── app.js                        # API Gateway
├── redis.js                      # Redis connection config
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Setup

### 1. Clone the Repo

```bash
git clone https://github.com/AyushSGithub24/WebComic-Narration.git
cd WebComic-Narration
```

### 2. Install Dependencies

For all services (root + each microservice):

```bash
npm install
```

For text-to-speech service:

```bash
pip install pyttsx3
```

### 3. Install FFmpeg

* Linux: `sudo apt install ffmpeg`
* Mac: `brew install ffmpeg`
* Windows: Download from [ffmpeg.org](https://ffmpeg.org/) and add to PATH

### 4. Setup Redis (via Docker)

```bash
docker run --name redis -p 6379:6379 -d redis
```

---

## 🔑 Environment Variables

Create a `.env` file in root:

```env
PORT=3000
GEMINI_API_KEY=""
URL="https://manhuatop.org/wp-admin/admin-ajax.php"
```

---

## ▶️ Run the Services

### Start Redis

```bash
docker start redis
```

### Start API Gateway

```bash
node app.js
```

### Start Microservices

In separate terminals:
Install dependency
```bash
cd Scrapping-service && npm i 
cd text-extraction-voice-service && npm i  
cd video-generation-service && npm i ]
```
Start All services
```bash
node ./Scrapping-service/index.js 
node ./text-extraction-voice-service/index.js 
node ./video-generation-service/index.js
```

---

## 🌐 Frontend Usage

1. Open `http://localhost:3000`
2. Enter comic URL / chapter number
3. Click **Generate Video**
4. Wait for job completion (status is polled automatically)
5. Download / play the generated video

---

## 📊 Job Tracking

* Job queue: Redis + BullMQ
* API `/api/generate-video` → enqueue job
* API `/api/job-status/:id` → check progress
* Videos are saved to `output/` folder and served via backend

---

## 🧹 Cleanup (Storage Management)

* Temporary images/audio stored locally
* Auto-delete old files (recommended) or clear manually from `/output/`

---

## ✅ Future Improvements

* Authentication (JWT / OAuth)
* WebSocket-based progress updates
* Cloud storage (S3, Cloudinary, Supabase) instead of local
* React frontend for better UX

---

## 👨‍💻 Author

Developed by **AyushSGithub24**

---
