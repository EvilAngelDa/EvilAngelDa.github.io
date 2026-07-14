# 文章目录

这里集中保存个人网站中的长文章。目录采用三位数字编号，按创建顺序排列；“我的文章”页面则按日期倒序展示，最新文章排在最前。

| 编号 | 日期 | 文章 | 文件 |
| --- | --- | --- | --- |
| 001 | 2026-07-14 | 把个人网站做成一座可进入的数字空间 | [阅读全文](./001-personal-site-design-evolution/index.html) · [MD 源文](./001-personal-site-design-evolution/index.md) |

## 目录约定

每篇文章使用独立文件夹：

```text
articles/
  001-article-name/
    index.md
    images/
      01-cover.svg
      02-diagram.svg
```

正文中的图片一律使用相对路径，保证本地浏览、GitHub 仓库和 GitHub Pages 都能找到对应资源。

修改 Markdown 后，在仓库根目录运行下面的命令即可重新生成美化阅读页：

```bash
node articles/build-articles.mjs
```

仓库根目录保留 `.nojekyll`，让 GitHub Pages 直接发布生成后的静态 HTML，避免再次处理 `index.md` 并覆盖阅读页。
