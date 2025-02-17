# 漫画网站爬取

- https://m.kuaikanmanhua.com/tag/0?region=0&sort=1

- 技术栈 puppeteer， nodemon 做监控 node 服务

## 安装依赖

### npm install

## 运行项目

### npm run dev

## 说明

中途不可退出，等待浏览器操作即可。

## 移动端网页数据抓取

### npm run dev:mobile

### 先清空 progressFile

### 10.27 chore

1. 每个章节下的图片数量应保持在 10-20 张
2. 章节数不少于 10

#### fix:

- 检查上一个目录中的文件数
- 如果上一个目录的文件数少于 20，则先填充上一个目录，并从当前组中取出图片
- 如果当前组仍有剩余图片，则创建新目录并保存
- 将剩余图片存入新目录

## 漫画数据爬取

### code

```
pnpm dev:comic
```
