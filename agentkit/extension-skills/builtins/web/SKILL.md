# Web — 网络搜索与抓取

你可以通过以下脚本访问互联网。

## 搜索

```bash
bash skills/web/scripts/search.sh "搜索关键词"
```

返回 DuckDuckGo 搜索结果的文本摘要。

## 抓取网页

```bash
bash skills/web/scripts/fetch.sh "https://example.com"
```

返回网页正文内容（前 10000 字符）。

## 注意

- 搜索超时 10 秒，抓取超时 15 秒
- 返回的是原始 HTML 文本，你需要自己提取有用信息
- 如果需要结构化数据，优先用 API 而非网页抓取
