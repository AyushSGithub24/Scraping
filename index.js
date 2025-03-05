import puppeteer from "puppeteer";
import fs from "fs";
let chapters={};
const ChapterListURL="https://manhuatop.org/manhua/infinite-mage/";
const getChapter = async () => {

    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });

    const page = await browser.newPage();
  
    await page.goto(ChapterListURL, {
      waitUntil: "domcontentloaded",
    });

    chapters=await page.evaluate(()=>{
        const chapterclass=document.querySelectorAll(".wp-manga-chapter");
        let chapterMap={};
        for(let i of chapterclass){
        const nameAndLink=i.querySelector("a");
        let name=nameAndLink.innerText;
        let link=nameAndLink.href;
        let newStr = name.replace(/\s/g, '');
            chapterMap[newStr]=link
        }
        return chapterMap;
    })
   
//  console.log(chapters);

    // Close the browser
    await browser.close();
  };


  
async function main() {
    await getChapter();
    const dataString = JSON.stringify(chapters, null, 2); 
   WriteFileCustom(dataString)

}

export default async function WriteFileCustom(dataString,fileName) {
    try {
        fs.writeFileSync(`${fileName}.txt`, dataString);
        // console.log('File has been written successfully.');
    } catch (err) {
        console.error('Error writing file:', err);
    }
}


main()
