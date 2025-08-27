import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import removeMd from "remove-markdown";
import { Worker, Queue } from "bullmq";
const __dirname = path.resolve();
import IORedis from "ioredis";
const redis = new IORedis({ host: "127.0.0.1", port: 6379 });

async function updatePipelineStatus(parentJobId, step, progress, message) {
  await redis.hmset(`video_pipeline:${parentJobId}`, {
    step,
    progress,
    message
  });
}


async function main(data) {
  try {
    const chapters = data;
    const PanelWiseChapterDialog = [];

    for (let i = 0; i < chapters.length; i++) {
      let obj = {};
      obj["chapterName"] = chapters[i].chapterName;
      obj["images"] = [];

      // ensure output folder exists
      const chapterDir = path.join(
        "output",
        chapters[i].chapterName.replace(/\s+/g, "_")
      );
      await fs.promises.mkdir(chapterDir, { recursive: true });

      for (let j = 1; j < chapters[i].images.length; j++) {
        const imageUrl = chapters[i].images[j];
        const outputAudioPath = path.join(chapterDir, `panel_${j + 1}.mp3`);

        const imgObj = await processImage(imageUrl, outputAudioPath);
        obj["images"].push(imgObj);
      }

      PanelWiseChapterDialog.push(obj);
    }

    // save final structured data
    await fs.promises.writeFile(
      "output/PanelWiseChapterDialog.json",
      JSON.stringify(PanelWiseChapterDialog, null, 2),
      "utf-8"
    );

    console.log(
      "✅ Processing complete. Data saved to output/PanelWiseChapterDialog.json"
    );
    return PanelWiseChapterDialog;
  } catch (err) {
    console.error("❌ Error reading file:", err);
  }
}

async function processImage(imageUrl, outputAudioPath) {
  try {
    const apiKey = process.env.apiKey;
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a comic book analyst. Extract all dialogue and narrative text from this image and describe briefly the scenes. Return the text in reading order as a single, coherent string. If there is no text, return an empty string.  don't start like here is the extracted text from scene description or reference image make it like a movie script continous with scene and dialogs`;
    const response = await fetch(imageUrl);
    const imageArrayBuffer = await response.arrayBuffer();
    const base64ImageData = Buffer.from(imageArrayBuffer).toString("base64");

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64ImageData,
          },
        },
        { text: prompt },
      ],
    });

    const narrationText = result.text.trim();
    if (!narrationText) {
      console.log(`-- No text found for ${imageUrl}. Skipping audio.`);
      return { imageUrl, narration: "", audioPath: null };
    }
    let cleanText = removeMd(narrationText);
    // Replace "Scene:" with natural phrase plus newline for pause
    cleanText = cleanText.replace(/Scene:/g, "We see");

    // Optional: Add double newlines after narrator lines for pause
    cleanText = cleanText.replace(
      /NARRATOR \(V\.O\.\)/g,
      "\nNARRATOR (Voice Over):\n"
    );

    // Generate audio using gTTS
    await generateAudioWithPython(cleanText, outputAudioPath);

    const absoluteAudioPath = path.resolve(outputAudioPath);

    console.log(`-- Audio saved for ${imageUrl} -> ${absoluteAudioPath}`);
    return { imageUrl, narration: cleanText, audioPath: absoluteAudioPath };
  } catch (error) {
    console.error(`❌ Failed to process image ${imageUrl}:`, error.message);
    return { imageUrl, narration: "Error", audioPath: null };
  }
}

/**
 * Generates audio by spawning a Python script.
 * @param {string} text The text to convert to speech.
 * @param {string} outputAudioPath The full path to save the output .wav file.
 * @returns {Promise<void>} A promise that resolves when the audio is generated, or rejects on error.
 */
function generateAudioWithPython(text, outputAudioPath) {
  return new Promise((resolve, reject) => {
    // Define the path to your Python script
    let pth=__dirname.split("\\");
    let pythonScriptPath;
    if(pth[pth.length-1]==="Scraping"){
      pythonScriptPath = path.join(__dirname, "text-extraction-voice-service/main.py");
    }else if(pth[pth.length-1]==="text-extraction-voice-service"){
      pythonScriptPath = path.join(__dirname, "main.py");
    }

    // Arguments to pass to the Python script
    const args = [pythonScriptPath, text, outputAudioPath];

    // Spawn the child process. Use 'python3' if your system requires it.
    const pythonProcess = spawn("python", args);

    // Listen for data from the Python script's standard output
    pythonProcess.stdout.on("data", (data) => {
      console.log(`Python stdout: ${data}`);
    });

    // Listen for data from the Python script's standard error
    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python stderr: ${data}`);
    });

    // Handle process exit
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        // Success
        console.log("Python script finished successfully.");
        resolve();
      } else {
        // Error
        reject(new Error(`Python script exited with code ${code}`));
      }
    });

    // Handle spawn errors (e.g., 'python' command not found)
    pythonProcess.on("error", (err) => {
      reject(err);
    });
  });
}

const videoQueue = new Queue("video-generation", { connection: {
      host: "127.0.0.1", // or "redis" if using docker-compose service name
      port: 6379,
    }, });

new Worker("voice-generation",async(job)=>{
   const parentJobId = job.data.parentJobId || job.id;
     await updatePipelineStatus(parentJobId, "voice", 50, "Voice generation started");
    console.log("Processing Images" , job.data);
    // console.log(job.data.data)
    const data=await main(job.data.data);
    await updatePipelineStatus(parentJobId, "voice-done", 70, "Voice generation completed");

  return await videoQueue.add("generate-voice", {data:data,parentJobId});
},  
{
    connection: {
      host: "127.0.0.1", // or "redis" if using docker-compose service name
      port: 6379,
    },
  }
)
