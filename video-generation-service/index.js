const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const util=require("util");
const axios=require("axios");
const path = require("path");
const { getAudioDurationInSeconds } = require("get-audio-duration");
const { imageSize } = require("image-size");

const ffmpegPath=require('@ffmpeg-installer/ffmpeg').path

const ffprobePath=require('@ffprobe-installer/ffprobe').path;



ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

const DATA="../text-extraction-voice-service/output/PanelWiseChapterDialog.json";


// Promisify the image-size function for async/await usage
const sizeOf = util.promisify(imageSize);

/**
 * 1. THE CORE FUNCTION: Creates a vertically panned video clip.
 * This is the heart of our script. It handles one panel at a time.
 * @param {string} imageUrl - URL of the tall comic panel image.
 * @param {string} audioPath - Local path to the narration MP3.
 * @param {string} outputPath - Path to save the output MP4 clip.
 * @returns {Promise<string>} The path to the created clip.
 */
async function createPannedClip(imageUrl, audioPath, outputPath) {
  const tempImageDir = path.join("temp", "images");
  fs.mkdirSync(tempImageDir, { recursive: true });
  const tempImagePath = path.join(tempImageDir, path.basename(imageUrl));

  try {
    // STEP A: Download the image to a temporary file
    console.log(`-- 📥 Downloading image: ${path.basename(imageUrl)}`);
    const response=await fetch(imageUrl,{
        method:"GET"
    })
    if (!response.ok) {
        throw new Error(`Failed to download image. Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write the buffer to a local file
    await fs.promises.writeFile(tempImagePath, buffer);
   

    // STEP B: Get all necessary media information
    const audioDuration = await getAudioDurationInSeconds(audioPath);
    const dimensions = await sizeOf(tempImagePath);
    const imageHeight = dimensions.height;
    
    // We'll create a standard 16:9 video frame (e.g., 1920x1080).
    // Let's set the output frame height.
    const frameHeight = 1080; 

    console.log(`-- 🎬 Creating panned clip (${audioDuration.toFixed(2)}s)`);

    // STEP C: Build and run the FFmpeg command
    return new Promise((resolve, reject) => {
      // This complex filter creates the slow pan-down effect.
      // It crops the tall image into a 1080p frame and animates the 'y' position
      // from the top (0) to the bottom (imageHeight - frameHeight) over the audio's duration.
      const cropFilter = `crop=w=iw:h=${frameHeight}:x=0:y='(ih-${frameHeight})*(t/${audioDuration})'`;

      ffmpeg()
        .input(tempImagePath) // The downloaded image
        .inputFPS(24)
        .input(audioPath)     // The narration audio
        .complexFilter([
          // First, we ensure the image width is an even number (required by some codecs)
          { filter: 'scale', options: 'trunc(iw/2)*2:ih', inputs: '0:v', outputs: 'scaled' },
          // Then, we apply our animated crop filter
          { filter: cropFilter, inputs: 'scaled', outputs: 'cropped' }
        ])
        .outputOptions([
          '-map [cropped]',    // Use the output of our filter as the video stream
          '-map 1:a',          // Use the second input (audioPath) as the audio stream
          '-c:v libx264',      // A standard high-quality video codec
          '-preset medium',
          '-crf 23',
          '-c:a aac',          // A standard audio codec
          '-movflags +faststart',
          '-shortest'          // Ensures the video ends exactly when the audio does
        ])
        .toFormat('mp4')
        .save(outputPath)
        .on('end', () => {
          console.log(`-- ✅ Clip saved: ${path.basename(outputPath)}`);
          resolve(outputPath); // Resolve the promise when done
        })
        .on('error', (err) => {
          console.error(`-- ❌ FFmpeg error:`, err.message);
          reject(err);
        });
    });
  } catch (error) {
    console.error(`-- ❌ Failed to process clip for ${imageUrl}:`, error);
    throw error; // Propagate the error up
  } finally {
    // STEP D: Clean up the temporary downloaded image
    if (fs.existsSync(tempImagePath)) {
      await fs.promises.unlink(tempImagePath);
    }
  }
}

/**
 * 2. THE CONCATENATOR: Stitches multiple video clips together.
 * @param {string[]} clipPaths - An array of paths to the video clips.
 * @param {string} finalVideoPath - The path to save the final merged video.
 */
async function concatenateClips(clipPaths, finalVideoPath) {
    if (clipPaths.length === 0) {
        console.log("No clips to concatenate.");
        return;
    }
    console.log(`\n🎞️ Stitching ${clipPaths.length} clips together...`);
    return new Promise((resolve, reject) => {
        const merger = ffmpeg();
        clipPaths.forEach(clip => merger.input(clip));
        
        merger
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .mergeToFile(finalVideoPath, path.join("temp", "merging"));
      });
}


/**
 * 3. THE MAIN ORCHESTRATOR: Puts everything together.
 */
async function main() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA, "utf-8"));

    for (const chapter of data) {
      const chapterNameSafe = chapter.chapterName.replace(/[^a-z0-9]/gi, '_');
      const tempClipDir = path.join("temp", "clips", chapterNameSafe);
      fs.mkdirSync(tempClipDir, { recursive: true });

      const createdClipPaths = [];

      console.log(`\n\n🎬🎬🎬 Starting video creation for: ${chapter.chapterName} 🎬🎬🎬`);
      
      // We will process clips sequentially to avoid overwhelming the system
      for (let i = 0; i < chapter.images.length; i++) {
        const panel = chapter.images[i];
        if (!panel.audioPath || !panel.imageUrl) continue;

        const panelNumber = path.basename(panel.audioPath, '.mp3');
        const clipPath = path.join(tempClipDir, `${panelNumber}.mp4`);
        
        try {
            await createPannedClip(panel.imageUrl, panel.audioPath, clipPath);
            createdClipPaths.push(clipPath);
        } catch(e) {
            console.log(`Skipping panel ${panelNumber} due to an error.`);
        }
      }
      
      // Concatenate all the generated clips for this chapter
    //   const finalVideoPath = path.join("output", `${chapterNameSafe}.mp4`);
    //   await concatenateClips(createdClipPaths, finalVideoPath);

      console.log(`✅✅✅ Final video saved for ${chapter.chapterName}: ${finalVideoPath} ✅✅✅`);
      
      // Clean up the individual clips after merging
      if (fs.existsSync(tempClipDir)) {
        fs.rmSync(tempClipDir, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error("❌ A critical error occurred in the main process:", err);
  } finally {
      // Clean up all temporary files
    //   if (fs.existsSync('temp')) {
    //     fs.rmSync('temp', { recursive: true, force: true });
    //     console.log("\n🧹 Cleaned up all temporary files.")
    //   }
  }
}


main();