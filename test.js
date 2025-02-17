const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const https = require("https");
// Helper function to download image from URL
function downloadImage(url, folderPath, filename) {
  const filePath = path.join(folderPath, filename);

  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(filePath);
          response.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close(resolve); // Close file stream when done
          });
        } else {
          reject(`Failed to download image: ${response.statusCode}`);
        }
      })
      .on("error", (err) => {
        reject(`Error: ${err.message}`);
      });
  });
}
(async () => {
  // console.log('22', puppeteer);
  // 启动 Puppeteer
  // const browser = await puppeteer.launch({ headless: true });
  // const page = await browser.newPage();

  // // 导航到目标网站
  // await page.goto('https://m.kuaikanmanhua.com/tag/0?region=1&sort=1', {
  //   waitUntil: 'networkidle2',
  // });
  // 启动puppeteer
  const broswer = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: false,
    ignoreDefaultArgs: "--enable-automation", // 关闭提示
  });
  const page = await broswer.newPage();
  await page.goto("https://m.kuaikanmanhua.com/tag/85?region=0&sort=1", {
    timeout: 100000,
  });
  await page.setViewport({
    width: 375,
    height: 1080,
  });

  // 等待页面加载完成
  await page.waitForSelector(".field-comic");
  // 获取所有漫画数据
  const list = await page.$$eval(".field-comic > a", (elements) => {
    return elements.map((comic) => {
      const title = comic.querySelector("h3.title").innerText; // 获取 title
      const imgElement = comic.querySelector("img");
      const imgSrc =
        imgElement?.getAttribute("data-src") || imgElement?.src || ""; // Try data-src first, fallback to src

      return { title, imgSrc };
    });
  });

  console.log(list);

  // 打印爬取的结果
  console.log(list);

  const mainDirectory = "comics"; // 定义主目录名称

  // 创建主目录（如果不存在）
  const mainDirPath = path.join(__dirname, mainDirectory);
  if (!fs.existsSync(mainDirPath)) {
    fs.mkdirSync(mainDirPath); // 创建主目录
  }
  // / 遍历漫画列表，创建文件夹并下载图片
  for (const comic of list) {
    const { title, imgSrc } = comic;

    // 创建以 title 为名称的文件夹
    const folderPath = path.join(mainDirPath, title);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath); // 创建文件夹
    }

    // 下载图片并保存为 cover.jpg
    console.log("folderPath", folderPath);
    console.log("imgSrc", imgSrc);
    try {
      await downloadImage(imgSrc, folderPath, "cover.jpg");
      console.log(`Downloaded cover for: ${title}`);
    } catch (err) {
      console.error(`Failed to download image for ${title}: ${err}`);
    }
  }
  // 关闭浏览器
  // await browser.close();
})();
