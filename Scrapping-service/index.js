import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";


puppeteer.use(StealthPlugin());

const CHAPTER_LIST_URL = "https://manhuatop.org/manhua/sssclass-suicide-hunter/";
const CHAPTER_LIST_SELECTOR = ".wp-manga-chapter";

/**
 * Launch Puppeteer
 */
async function launchBrowser() {
  return puppeteer.launch({
    headless: false,
    defaultViewport: null,
     executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
  });
}

/**
 * Scrape all chapters (name + link)
 */
async function scrapeChapters(url, selector) {
  const browser = await launchBrowser();
  let chapterData = [];

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(selector, { timeout: 30000 });

    chapterData = await page.evaluate((sel) => {
      const chapterElements = document.querySelectorAll(sel);
      return Array.from(chapterElements).map((el) => {
        const anchor = el.querySelector("a");
        return {
          name: anchor?.textContent.trim() || "Unknown",
          link: anchor?.href || "",
        };
      });
    }, selector);
  } catch (error) {
    console.error("❌ Scraping failed:", error);
  } finally {
    await browser.close();
  }

  return chapterData;
}

/**
 * Save JSON to file
 */
export default function saveToFile(data, fileName) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(`${fileName}.txt`, jsonData);
    console.log(`✅ File written: ${fileName}.txt`);
  } catch (err) {
    console.error("❌ Error writing file:", err);
  }
}

/**
 * Get all chapter images
 */
async function getImageUrls(chapters) {
  const browser = await launchBrowser();
  let chaptersImageUrls = [];

  try {
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterData = await getChapterImages(browser, chapter.link, chapter.name);
      chaptersImageUrls.push(chapterData);
    }
  } catch (e) {
    console.error("❌ Image scraping failed:", e);
  } finally {
    await browser.close();
  }

  return chaptersImageUrls;
}

/**
 * Scrape images from a single chapter
 */
async function getChapterImages(browser, url, chapterName) {
  const page = await browser.newPage();
  let chapterImages = [];

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const requestUrl = request.url();
    if (requestUrl.endsWith("1.jpg")) {
      chapterImages.push(requestUrl);
    }
    request.continue();
  });

  await page.goto(url, { waitUntil: "domcontentloaded" }); // wait for all requests
  await setTimeout(()=>{},5000)// small buffer
  await page.close();

  if (chapterImages.length > 0) {
    await getAllImages(chapterImages[0], chapterImages);
  }

  return { chapterName, images: chapterImages };
}

/**
 * Generate all images from 1.jpg base
 */
async function getAllImages(baseUrl, chapterImages) {
  const basePath = baseUrl.replace("1.jpg", "");
  for (let i = 2; ; i++) {
    const imageUrl = `${basePath}${i}.jpg`;
    if (await checkImageExists(imageUrl)) {
      chapterImages.push(imageUrl);
    } else {
      break;
    }
  }
}

/**
 * Check if image exists
 */
async function checkImageExists(imageUrl) {
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    return response.status === 200;
  } catch (error) {
    console.error(`Error fetching ${imageUrl}:`, error);
    return false;
  }
}

/**
 * Main
 */
async function main() {
  
  console.log("⏳ Starting scrape...");
  let chapters = await scrapeChapters(CHAPTER_LIST_URL, CHAPTER_LIST_SELECTOR);

  // Sort numerically
  chapters = chapters.sort((a, b) => {
    const numA = parseFloat(a.name.match(/[\d.]+/));
    const numB = parseFloat(b.name.match(/[\d.]+/));
    return numA - numB;
  });

  // Get images for each chapter
  const chaptersWithImages = await getImageUrls(chapters.slice(0, 5)); // first 5 chapters

  // Save result
  saveToFile(chaptersWithImages, "sssclass-suicide-hunter");

  console.log("✅ Done.");
}

main();

/*
working image and audio code

Step 1: Get the audio duration
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "D:\Ayush\Web\Projects\scraping\Scraping\text-extraction-service\output\Chapter_1\panel_6.mp3"

Step 2: Use the duration in FFmpeg command (replace 173.42 with your actual duration):
ffmpeg -loop 1 -i "D:\Ayush\Web\Projects\scraping\Scraping\video-generation-service\downloaded_images\downloaded_image.jpg" -i "D:\Ayush\Web\Projects\scraping\Scraping\text-extraction-voice-service\output\Chapter_1\panel_6.mp3" -filter_complex "[0:v]scale=1280:-1[scaled];[scaled]crop=1280:720:0:'t*((ih-720)/173.42)'[cropped];[cropped]format=yuv420p[v]" -map "[v]" -map 1:a -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 128k -shortest "output2.mp4"
*/