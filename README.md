# Bulk PageSpeed & Core Web Vitals Checker (No API Key)

[![Run on Apify](https://apify.com/ext/run-on-apify.png)](https://apify.com/mirumiru_miru17/page-speed-core-web-vitals)

**Run it in the cloud with no setup: [apify.com/mirumiru_miru17/page-speed-core-web-vitals](https://apify.com/mirumiru_miru17/page-speed-core-web-vitals)**


Test the speed of many pages at once with **Google Lighthouse**, the same engine behind PageSpeed Insights. Paste a list of URLs and get performance, SEO, accessibility and best-practices scores, the **Core Web Vitals** (LCP, CLS, TBT, FCP, Speed Index) with good / needs-improvement / poor ratings, and the **top fixes** ranked by time saved.

**No API key, no quota, no setup.** Mobile, desktop or both. Report in English or Japanese.

## Why use it

- **Bulk testing**: check 20, 100 or 500 URLs in one run instead of one by one in PageSpeed Insights.
- **Weekly monitoring**: schedule it and catch speed regressions after a deploy.
- **Client reports**: get a color-coded HTML report to share.
- **No Google API key**: Lighthouse runs inside the Actor.

## Input

| Field | Description |
| --- | --- |
| `urls` | Pages to test, one full URL per line. |
| `device` | `mobile` (default), `desktop` or `both`. |
| `maxUrls` | Safety limit (default 20). |
| `language` | `en` or `ja`. |

## Output

One row per URL and device:

```json
{
  "url": "https://example.com",
  "device": "mobile",
  "performanceScore": 72,
  "seoScore": 92,
  "accessibilityScore": 88,
  "lcpMs": 3120, "lcpRating": "needs-improvement",
  "cls": 0.04, "clsRating": "good",
  "tbtMs": 410, "tbtRating": "needs-improvement",
  "topOpportunities": [{ "title": "Reduce unused JavaScript", "estimatedSavingsMs": 900 }]
}
```

Plus `REPORT.html` in the key-value store.

## Pricing

Pay per tested page (one URL on one device). Failed URLs are not charged.

## Good to know

- Results are **lab data** (simulated device and network), like the Lighthouse tab in PageSpeed Insights. Scores vary a little between runs.
- Test pages you own or manage.

## More tools from the same author

- [SEO Audit & AI Search Readiness Checker](https://apify.com/mirumiru_miru17/seo-ai-readiness-audit): full-site SEO audit, AI search readiness score and llms.txt generator
- [Japanese OCR: Image, PDF, Receipt & Invoice to Text](https://apify.com/mirumiru_miru17/image-pdf-ocr-japanese): text from images and scanned PDFs, Japanese incl. vertical
- [Audio & Video to Text Transcriber (Whisper)](https://apify.com/mirumiru_miru17/audio-video-transcriber): transcripts and SRT subtitles in Japanese and 90+ languages

---

## 日本語

URLのリストを入れるだけで、Google Lighthouseでページの表示速度をまとめて計測します。速度スコア、SEO・アクセシビリティのスコア、Core Web Vitals（LCP・CLS・TBTなど）と、効果の大きい改善点を出力します。APIキーは不要です。`language` を「日本語」にすると、改善点とレポートが日本語になります。

## License

MIT
