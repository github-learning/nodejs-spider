const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

/**
 * 下载图片的函数
 * @param {*} url 图片的 URL
 * @param {*} filePath 保存的地址
 * @returns Promise
 */

/**
 * 确保目录存在
 * @param {string} dirPath
 */
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const progressFile = path.join(__dirname, "progress.json");

// TODO 为解决每次刷新
// 读取进度文件
function loadProgress() {
  if (fs.existsSync(progressFile)) {
    const data = fs.readFileSync(progressFile, "utf-8");
    return JSON.parse(data).i || 0;
  }
  return 0;
}

// 保存进度文件
function saveProgress(i) {
  fs.writeFileSync(progressFile, JSON.stringify({ i }), "utf-8");
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
  // 手动设置 iPhone X 的视口和用户代理
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1"
  );

  console.log("已切换到 iPhone X 模式");

  // TODO 没有做分页，暂时
  // https://m.kuaikanmanhua.com/tag/0?region=1&sort=1 总
  // https://m.kuaikanmanhua.com/tag/20?region=0&sort=1  恋爱
  // https://m.kuaikanmanhua.com/tag/85?region=0&sort=1  武侠
  // https://m.kuaikanmanhua.com/tag/0?region=1&sort=2 最热

  await page.goto("https://m.kuaikanmanhua.com/mobile/709/list/", {
    timeout: 600000,
  });

  const mainDir = path.join(__dirname, "comics");

  await page.waitForSelector(".page-head > .title", { timeout: 600000 });
  // 检查元素是否存在
  const elementExists = await page.$(".halfGuide");
  if (elementExists) {
    console.log("Element .halfGuide found!");

    // 使用 evaluate 在页面上下文中执行逻辑
    await page.evaluate(() => {
      const closeButton = document.querySelector(".close-warp > button");
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          console.log("弹框已关闭");
        });
        closeButton.click(); // 手动触发点击事件
      } else {
        console.log(".halfGuide 元素在页面上下文中未找到");
      }
    });
  } else {
    console.log(".halfGuide 元素未找到");
  }
  // description
  // 检查元素是否存在
  const descriptionExits = await page.$(".description");
  if (descriptionExits) {
    console.log("Element .halfGuide found!");

    await page.evaluate(() => {
      const closeButton = document.querySelector(".description > p > span");
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          console.log("弹框已关闭");
        });
        closeButton.click(); // 手动触发点击事件
      } else {
        console.log(".halfGuide 元素在页面上下文中未找到");
      }
    });
  }
  // return;
  const title = await page.$eval(
    ".page-head > .title",
    (title) => title.textContent
  );
  const desc = await page.$eval(".description > p", (desc) =>
    desc.textContent.trim()
  );

  // 获取所有 span 的文本内容
  const tags = await page.$$eval(
    ".description > .classifications > span",
    (elements) => elements.map((span) => span.textContent.trim())
  );
  // return;

  // 组合数据为 JSON 对象
  const data = {
    title,
    desc,
    tags,
  };

  // 定义二级目录
  const secondDir = path.join(mainDir, title);
  console.log("secondDir", secondDir);
  const filePath = path.join(secondDir, "desc.json");

  console.log("filePath", filePath);

  // 确保文件夹存在
  ensureDirExists(secondDir);

  // // 将数据写入 JSON 文件
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
})();
