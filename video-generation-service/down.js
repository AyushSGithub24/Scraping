const axios = require("axios");
const fs = require("fs");
const path = require("path");

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

// Example usag
const help = async () => {
  const imageUrl =
    "https://s2.manhuatop.org/manga_dc178fa9b5d957ed1a329b10f535b396/chapter_0/ch_0_6.jpg";
  const saveDirectory = path.join(__dirname, "downloaded_images");
  const saveFilename = "downloaded_image.jpg";
  const savePath = path.join(saveDirectory, saveFilename);

  if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory, { recursive: true });
  }

  await downloadImage(imageUrl, savePath);
  console.log("✅ Download complete:", savePath);
};
help();
