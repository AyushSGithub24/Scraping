# 📜 ComicNarrate - Automated Comic Narration 🎙️📽️  

ComicNarrate is a project that automates the process of extracting comics from websites, generating descriptions, creating voiceovers, and producing videos for YouTube.  

## 🚀 Features  
- 🌐 **Web Scraping**: Uses Node.js and Puppeteer to extract comic images from websites. ✅ (Completed)  
- 📝 **Description Generation**: Uses Python and NLP to extract and generate a description of the comic. ✅ (Completed)  
- 🔊 **Voiceover Generation**: Uses Google Text-to-Speech (gTTS) to convert the description into audio. ⏳ (In Progress)  
- 🎬 **Video Creation**: Uses Python to generate a video combining comic images, text, and voiceover. ⏳ (Pending)  
- 📤 **YouTube Upload**: Automates video upload to YouTube. ⏳ (Pending)  

## 🛠️ Tech Stack  
- **Node.js & Puppeteer**: Web scraping  
- **Python & NLP**: Description generation  
- **Google Text-to-Speech (gTTS)**: Voiceover  
- **Python & OpenCV/PIL**: Video creation  
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
     pip install gtts opencv-python youtube-upload
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
