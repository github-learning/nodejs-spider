const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const https = require("https");
let previousDir = null; // 记录上一个目录

/**
 * 下载图片的函数
 * @param {*} url 图片的 URL
 * @param {*} filePath 保存的地址
 * @returns Promise
 */

const downloadImage = (url, filePath) => {
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
};

/**
 * 确保目录存在
 * @param {string} dirPath
 */
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * 模拟滚动页面，确保图片加载
 * @param {*} page Puppeteer page 对象
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let distance = 2000;
      const delay = 800;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, delay);
    });
  });
}

// 分组函数：每组 20 个
function groupImagesBy20(images) {
  const grouped = [];
  for (let i = 0; i < images.length; i += 20) {
    grouped.push(images.slice(i, i + 20)); // 每 20 个一组
  }
  return grouped;
}

// sleep
const sleep = (ms = 1000) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
(async () => {
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: false,
    ignoreDefaultArgs: ["--enable-automation"], // 关闭提示
  });

  const page = await browser.newPage();
  // TODO 没有做分页，暂时
  // https://m.kuaikanmanhua.com/tag/0?region=1&sort=1 总
  // https://m.kuaikanmanhua.com/tag/20?region=0&sort=1  恋爱
  // https://m.kuaikanmanhua.com/tag/85?region=0&sort=1  武侠
  // https://m.kuaikanmanhua.com/tag/0?region=1&sort=2 最热
  await page.goto("https://m.kuaikanmanhua.com/tag/0?region=1&sort=2", {
    timeout: 600000,
  });

  await page.setViewport({
    width: 375,
    height: 1080,
  });

  const mainDir = path.join(__dirname, "comics");

  // 等待页面加载完成
  await page.waitForSelector(".field-comic");

  // 获取所有漫画元素
  let comics = await page.$$(".field-comic > a");

  let i = 0; // 漫画计数器

  while (i < comics.length) {
    const comic = comics[i];

    // 点击漫画元素，等待页面跳转
    await Promise.all([
      comic.click(), // 点击漫画
      page.waitForNavigation({ waitUntil: "load" }), // 等待页面加载完成
    ]);

    // 获取前三个漫画详情
    const details = await page.$$(".episode-title > .title-item");

    await page.waitForSelector(".right > .title", { timeout: 600000 });
    const secondePath = await page.$eval(
      ".right > .title",
      (title) => title.textContent
    );
    console.log("secondePath", secondePath);
    // const imageCover = await page.$eval(".imgCover", (img) => img.src);
    const imageCover = await page.$eval(
      ".imgCover",
      (img) => img.getAttribute("data-src") || img.src
    );
    console.log("imageCover", imageCover);

    // 定义二级目录
    const secondDir = path.join(mainDir, secondePath);
    console.log("secondDir", secondDir);
    // 创建以 secondDir 为名称的文件夹
    ensureDirExists(secondDir);

    // 下载图片并保存为 cover.jpg
    try {
      await downloadImage(imageCover, path.join(secondDir, "cover.jpg"));
      console.log(`Downloaded cover for: ${imageCover}`);
    } catch (err) {
      console.error(`Failed to download image for ${imageCover}: ${err}`);
    }
    // return;

    let k = 0; // 详情计数器
    let groupCounter = 0; // 全局计数器，用于文件夹分组索引
    let imageCounter = 0; // 全局图片计数器，保证编号连续
    while (k < 3) {
      // 处理最多3个详情
      const detail = details[k];

      try {
        const currentUrl = page.url();
        console.log("Before click:", currentUrl);

        // 监听新标签页的打开
        const newPagePromise = new Promise((resolve) =>
          browser.once("targetcreated", resolve)
        );

        // 点击详情页
        await detail.click();

        // 获取新打开的标签页
        const target = await newPagePromise;
        const newPage = await target.page();

        // 切换到新标签页
        await newPage.bringToFront();

        console.log("点击成功");
        const newUrl = newPage.url();
        console.log("After click:", newUrl);

        // 等待图片列表加载完成
        await newPage.waitForSelector(".imgList > .img-box", {
          timeout: 600000,
        });
        await sleep(6000);

        // TODO 这里模拟滚动，会block down 流程？但不滚动，元素有可能为空
        // await autoScroll(newPage);

        const comicTitle = await newPage.$eval(
          ".imgList > .img-box img",
          (img) => img.alt
        );
        // TODO 空内容暂时没有过滤
        const infos = await newPage.$$eval(
          ".imgList > .img-box",
          (elements) => {
            return elements.map((comic) => {
              const imgElement = comic.querySelector("img");
              return (
                imgElement?.getAttribute("data-src") || imgElement?.src || ""
              );
            });
          }
        );
        console.log("infos", infos);
        console.dir(infos, { depth: 10000, colors: true });
        // 将图片数组分组，每组 20 个
        const groupedInfos = groupImagesBy20(infos);
        console.log("groupedInfos", groupedInfos);

        // 使用外部 groupCounter 而不是 groupIndex
        for (
          let groupIndex = 0;
          groupIndex < groupedInfos.length;
          groupIndex++
        ) {
          const group = groupedInfos[groupIndex];

          // 使用 groupCounter 生成文件夹名称
          const thirdDir = path.join(
            secondDir,
            `${groupCounter.toString().padStart(4, "0")}`
          );
          console.log("thirdDir", thirdDir);

          // 确保文件夹存在
          ensureDirExists(thirdDir);

          // 下载每一组中的图片
          for (let j = 0; j < group.length; j++) {
            const imageUrl = group[j];
            // 使用 imageCounter 来生成连续的文件名
            const imageFileName = `${imageCounter
              .toString()
              .padStart(4, "0")}.jpg`;
            const savePath = path.join(thirdDir, imageFileName);

            try {
              await downloadImage(imageUrl, savePath);
              console.log("当前章节", comicTitle);
              console.log(`Downloaded: ${savePath}`);
            } catch (error) {
              console.error(`Failed to download ${imageUrl}:`, error);
            }

            imageCounter++; // 每下载一张图片，递增一次，以保持编号连续
          }
          // 更新 previousDir 和 groupCounter
          previousDir = thirdDir;
          groupCounter++; // 累加 groupCounter，以保证唯一性
        }

        // 关闭新页面, 返回到原页面
        await newPage.close();
        k++; // 增加详情计数器
      } catch (error) {
        console.error("Error during navigation:", error);
        break; // 出现错误时退出内层循环
      }
    }

    // 返回到原页面
    await page.goBack();

    // 重新获取漫画元素列表，以防止元素丢失
    comics = await page.$$(".field-comic > a");

    // 继续处理下一个漫画
    i++; // 增加漫画计数器
  }
})();
