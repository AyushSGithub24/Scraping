const fs = require("fs");
const util=require("util");
const path = require("path");
const { spawn,exec } = require("child_process");
const execAsync = util.promisify(exec);
const si =require("systeminformation");
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const redis = new IORedis({ host: "127.0.0.1", port: 6379 });

async function updatePipelineStatus(parentJobId, step, progress, message) {
  await redis.hmset(`video_pipeline:${parentJobId}`, {
    step,
    progress,
    message
  });
}


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

  await downloadImage(imageUrl,tempImagePath);
  const audioDuration=await getAudioDuration(audioPath);

  await runFFmpeg(tempImagePath,audioPath,audioDuration,outputPath);

  return outputPath;

  
}
async function getAudioDuration(audioPath) {
    try {
        const { stdout } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
        );
        return parseFloat(stdout.trim());
    } catch (error) {
        console.error(`❌ Error getting duration for ${audioPath}:`, error.message);
        throw error;
    }
}

async function runFFmpeg(imagePath,audioPath,audioDuration,outputPath) {
   const vendor = await detectGpuVendor();
  const encoder = getFfmpegEncoder(vendor);
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-loop", "1",
      "-i", `${imagePath}`,
      "-i", `${audioPath}`,
      "-filter_complex", `[0:v]scale=1280:-1,crop=1280:720:0:t*((ih-720)/${audioDuration}),format=yuv420p[v]`,
      "-map", "[v]", "-map", "1:a",
      "-c:v", encoder, "-preset", "fast", "-b:v", "5M",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest",
      `${outputPath}`
    ]);

    // Capture logs
    ffmpeg.stderr.on("data", (data) => {
      console.log(`FFmpeg log: ${data}`);
    });

    // When finished
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Video processing completed successfully!");
        resolve();
      } else {
        reject(new Error(`❌ FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

async function detectGpuVendor() {
  try {
    const graphics = await si.graphics();
    const gpus = graphics.controllers.map(g => g.vendor.toLowerCase());

    if (gpus.some(v => v.includes("nvidia"))) {
      return "nvidia";
    } else if (gpus.some(v => v.includes("intel"))) {
      return "intel";
    } else if (gpus.some(v => v.includes("amd") || v.includes("advanced micro devices"))) {
      return "amd"; // optional if you want to add support later
    } else {
      return "cpu";
    }
  } catch (err) {
    console.error("Failed to detect GPU:", err);
    return "cpu";
  }
}

function getFfmpegEncoder(vendor) {
  switch (vendor) {
    case "nvidia":
      return "h264_nvenc"; // or "hevc_nvenc"
    case "intel":
      return "h264_qsv";   // or "hevc_qsv"
    default:
      return "libx264";    // CPU fallback
  }
}





async function downloadImage(imageUrl, savePath) {
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to download image. Status: ${response.status}`);
    }

    // Get the image data as a Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write the buffer to a local file
    await fs.promises.writeFile(savePath, buffer);
    console.log(`Image downloaded successfully to ${savePath}`);
  } catch (err) {
    console.error(`❌ Failed to download ${imageUrl}:`, err.message);
    throw err;
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
        
     // Create a temp folder for concat list
    const tempDir = path.join("temp", "concat");
    fs.mkdirSync(tempDir, { recursive: true });

    const fileListPath = path.join(tempDir, "video_list.txt");

    // Generate file list for ffmpeg
    const fileList = clipPaths
        .map(clipPath => `file '${path.resolve(clipPath)}'`)
        .join("\n");

    await fs.promises.writeFile(fileListPath, fileList);

        
        const concatCmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', `"${fileListPath}"`,
            '-c', 'copy',
            `"${finalVideoPath}"`
        ].join(' ');
        
        await execAsync(concatCmd);
}


/**
 * 3. THE MAIN ORCHESTRATOR: Puts everything together.
 */
async function main(DATA) {
  try {
    const data = DATA;
    fs.mkdirSync("output", { recursive: true });
    const BATCH_SIZE = 3; 
    for (const chapter of data) {
      const chapterNameSafe = chapter.chapterName.replace(/[^a-z0-9]/gi, '_');
      const tempClipDir = path.join("temp", "clips", chapterNameSafe);
      fs.mkdirSync(tempClipDir, { recursive: true });

      const createdClipPaths = [];

      console.log(`\n\n🎬🎬🎬 Starting video creation for: ${chapter.chapterName} 🎬🎬🎬`);
      
      // We will process clips sequentially to avoid overwhelming the system
      for (let i = 0; i < chapter.images.length; i+=BATCH_SIZE) {
        const batch = chapter.images.slice(i, i + BATCH_SIZE);
        console.log(`\n🔥 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}... (Panels ${i + 1} to ${i + batch.length})`);
        // 1. Create an array of promises for the current batch
                const batchPromises = batch.map(panel => {
                    if (!panel.audioPath || !panel.imageUrl) {
                        return Promise.resolve(null); // Skip invalid panels
                    }

                    const panelNumber = path.basename(panel.audioPath, '.mp3');
                    const clipPath = path.join(tempClipDir, `${panelNumber}.mp4`);
                    
                    // Return the promise, DON'T await it here.
                    // We add a .catch to handle individual promise failures,
                    // so one failed clip doesn't stop the whole batch.
                    return createPannedClip(panel.imageUrl, panel.audioPath, clipPath)
                        .catch(err => {
                            console.error(`❌ Error processing panel ${panelNumber}:`, err.message);
                            return null; // Return null on failure
                        });
                });

               // 2. Wait for all promises in the current batch to settle
                const resultsFromBatch = await Promise.all(batchPromises);

                // 3. Collect the valid paths from the completed batch
                // The .filter(Boolean) removes any 'null' values from failed or skipped promises
                createdClipPaths.push(...resultsFromBatch.filter(Boolean));
        
      }

      console.log("\n✅ All batches processed. Generated clips:");
      console.log(createdClipPaths);
      
      // Concatenate all the generated clips for this chapter
      const finalVideoPath = path.join("output", `${chapterNameSafe}.mp4`);
      await concatenateClips(createdClipPaths, finalVideoPath);


      console.log(`✅✅✅ Final video saved for ${chapter.chapterName}: ${finalVideoPath} ✅✅✅`);
      
      // // Clean up the individual clips after merging
      // if (fs.existsSync(tempClipDir)) {
      //   fs.rmSync(tempClipDir, { recursive: true, force: true });
      // }
      return finalVideoPath;
    }
  } catch (err) {
    console.error("❌ A critical error occurred in the main process:", err);
  } finally {
      // Clean up all temporary files
      // if (fs.existsSync('temp')) {
      //   fs.rmSync('temp', { recursive: true, force: true });
      //   console.log("\n🧹 Cleaned up all temporary files.")
      // }
  }
}

const worker = new Worker("video-generation",async(job)=>{
  const parentJobId = job.data.parentJobId || job.id;
  console.log("Processing Images" , job.data);
  await updatePipelineStatus(parentJobId, "video", 80, "Video rendering started");
  const data=await main(job.data.data);
  console.log(data);
   await updatePipelineStatus(parentJobId, "video-done", 100, "Video generation completed");
   let url=data.split("\\");
  return {url:url[url.length-1],parentJobId};
},
  {
    connection: {
      host: "127.0.0.1", // or "redis" if using docker-compose service name
      port: 6379,
    },
  }
)



/*

ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "D:\Ayush\Web\Projects\scraping\Scraping\text-extraction-voice-service\output\Chapter_1\panel_9.mp3"

ffmpeg -loop 1 -i "D:\Ayush\Web\Projects\scraping\Scraping\video-generation-service\downloaded_images\downloaded_image.jpg" -i "D:\Ayush\Web\Projects\scraping\Scraping\text-extraction-voice-service\output\Chapter_1\panel_9.mp3" `
-filter_complex "[0:v]scale=1280:-1,crop=1280:720:0:`"t*((ih-720)/96.984)`",format=yuv420p[v]" `
-map "[v]" -map 1:a `
-c:v h264_qsv -preset fast -b:v 5M `
-c:a aac -b:a 128k -shortest "output.mp4"

*/