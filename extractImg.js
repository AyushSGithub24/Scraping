import puppeteer from "puppeteer";
import fs from "fs/promises"; // Use promises API for cleaner async/await
import WriteFileCustom from "./index.js";

// Main function
(async () => {
  try {
    const data = await fs.readFile("chapters.txt", "utf8");
    const obj = JSON.parse(data);
    const chaptersImageUrls = [];

    // Launch Puppeteer once and reuse it
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });

    for (let i = 0; i < 10; i++) {
      let chapterUrl = obj[`Chapter${i + 1}`];
      const chapterData = await getChapterImages(browser, chapterUrl, i + 1);
      chaptersImageUrls.push(chapterData);
    }

    await browser.close(); // Close browser after all tasks

    console.log(chaptersImageUrls);
    await WriteFileCustom(JSON.stringify(chaptersImageUrls, null, 2), "chaptersImageUrls");

    console.log("✅ Finished Scraping!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
})();

// Function to scrape all images from a chapter
async function getChapterImages(browser, url, chapterNumber) {
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

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.close();

  if (chapterImages.length > 0) {
    await getAllImages(chapterImages[0], chapterImages);
  }

  return { chapterNumber, images: chapterImages };
}

// Function to generate all image URLs for a chapter
async function getAllImages(baseUrl, chapterImages) {
  const basePath = baseUrl.replace("1.jpg", "");

  for (let i = 2; ; i++) {
    const imageUrl = `${basePath}${i}.jpg`;
    if (await checkImageExists(imageUrl)) {
      chapterImages.push(imageUrl);
    } else {
      break; // Stop when an image is not found
    }
  }
}

// Function to check if an image exists
async function checkImageExists(imageUrl) {
  try {
    const response = await fetch(imageUrl, { method: "HEAD" }); // Use HEAD for faster response
    return response.status === 200;
  } catch (error) {
    console.error(`Error fetching ${imageUrl}:`, error);
    return false;
  }
}
