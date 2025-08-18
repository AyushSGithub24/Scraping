import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import gTTS from "gtts";
import path from "node:path";

async function main() {
  try {
    const data = await fs.promises.readFile(
      "../sssclass-suicide-hunter.txt",
      "utf-8"
    );
    const chapters = JSON.parse(data);

    const PanelWiseChapterDialog = [];

    for (let i = 0; i < chapters.length; i++) {
      let obj = {};
      obj["chapterName"] = chapters[i].chapterName;
      obj["images"] = [];

      // ensure output folder exists
      const chapterDir = path.join("output", chapters[i].chapterName.replace(/\s+/g, "_"));
      await fs.promises.mkdir(chapterDir, { recursive: true });

      for (let j = 0; j < chapters[i].images.length; j++) {
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

    console.log("✅ Processing complete. Data saved to output/PanelWiseChapterDialog.json");
  } catch (err) {
    console.error("❌ Error reading file:", err);
  }
}

async function processImage(imageUrl, outputAudioPath) {
  try {
    const apiKey = process.env.apiKey;
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a comic book analyst. Extract all dialogue and narrative text from this image and describe the scene. Return the text in reading order as a single, coherent string. If there is no text, return an empty string. if don't start like here is the extracted text from scene description or reference image make it like a movie script continous with scene and dialogs`;
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

    // Generate audio using gTTS
    const speech = new gTTS(narrationText, "en");
    await new Promise((resolve, reject) => {
      speech.save(outputAudioPath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    console.log(`-- Audio saved for ${imageUrl} -> ${outputAudioPath}`);
    return { imageUrl, narration: narrationText, audioPath: outputAudioPath };
  } catch (error) {
    console.error(`❌ Failed to process image ${imageUrl}:`, error.message);
    return { imageUrl, narration: "Error", audioPath: null };
  }
}
main();
