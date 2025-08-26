# 📜 ComicNarrate - Automated Comic Narration 🎙️📽️  

ComicNarrate is a project that automates the process of extracting comics from websites, generating descriptions, creating voiceovers, and producing videos for YouTube.  


## 🛠️ Tech Stack  
- **Node.js & Puppeteer**: Web scraping  
- **Python & NLP**: Description generation  
- **Pyttsx3**: Voiceover  
- **FFMPEG**: Video creation  
- **YouTube API**: Uploading videos  

## 📦 Installation  
1. Clone this repository:  
   ```bash
   git clone https://github.com/yourusername/ComicNarrate.git  
   cd ComicNarrate  
   ```
2. Install dependencies:  
   - **Node.js dependencies:**  
     ```bash
     npm install puppeteer  
     ```  
   - **Python dependencies:**  
     ```bash
     pip install pyttsx3
     ```  

## 🔥 Usage  
1. Run the scraper:  
   ```bash
   node scraper.js  
   ```  
2. Generate description:  
   ```bash
   python generate_description.py  
   ```  
3. Convert description to voiceover:  
   ```bash
   python text_to_speech.py  
   ```  
4. Create video:  
   ```bash
   python create_video.py  
   ```  
5. Upload to YouTube:  
   ```bash
   python upload_video.py  
   ```  

## 🛠️ Future Enhancements  
- Support for multiple comic sources  
- AI-generated summaries instead of simple extraction  
- Better voiceover with realistic AI voices  
- Customizable video templates  

## 📜 License  
This project is licensed under the MIT License.  

---

Let me know if you want to modify anything! 🚀
