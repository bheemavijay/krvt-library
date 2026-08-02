# Chapter DOM Analysis for ReadNovelMTL

This document specifies the DOM structure for a chapter page.

## Chapter Title

```json
{
  "text": "Not Found",
  "selector": "h1.mb-4"
}
```

## Main Content Container

```json
{
  "selector": "div#chapter-content",
  "exists": false
}
```

## Paragraph Selector

```json
{
  "selector": "div#chapter-content p",
  "count": 0
}
```

## Ads

```json
{
  "selector": "div#chapter-content div.text-center",
  "count": 0,
  "notes": "These appear to be ad containers inside the main content."
}
```

## Navigation

```json
{
  "previous_button_selector": "a.btn[rel=\"prev\"]",
  "previous_button_url": "Not Found",
  "next_button_selector": "a.btn[rel=\"next\"]",
  "next_button_url": "Not Found"
}
```

## Json Ld

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Book",
    "aggregateRating": {
      "@type": "AggregateRating",
      "bestRating": 5,
      "ratingValue": 3,
      "reviewCount": 1,
      "worstRating": 1
    },
    "alternateName": "\u62d2\u7d55SSS\u7d1a\u8077\u696d\u540e\uff0c\u6211\u5316\u8eab\u6700\u5f37BUG",
    "author": "\u7121\u6575\u66b4\u9f8d",
    "dateModified": "2025-07-03T11:00:42Z",
    "datePublished": "2025-07-03T11:00:42Z",
    "description": "At the annual awakening ceremony,Li Yang actually gave up the SSS-rank profession [Scourge of the...",
    "genre": [
      "Action",
      "Fantasy",
      "For Male",
      "Leveling",
      "System",
      "Urban"
    ],
    "image": [
      "https://public.readnovelmtl.com/uploads/cover/refused-sss-rank-profession-i-became-the-strongest-bug-1751540441905.webp"
    ],
    "name": "Refused SSS-Rank Profession, I Became the Strongest BUG",
    "publisher": {
      "@type": "Organization",
      "name": "ReadNovelMTL",
      "url": "https://readnovelmtl.com/"
    },
    "url": "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "item": "https://readnovelmtl.com/",
        "name": "Home",
        "position": 1
      },
      {
        "@type": "ListItem",
        "item": "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe",
        "name": "Refused SSS-Rank Profession, I Became the Strongest BUG",
        "position": 2
      }
    ]
  }
]
```

## Meta Tags

```json
{
  "charset": "UTF-8",
  "viewport": "width=device-width, initial-scale=1.0",
  "description": "Read Refused SSS-Rank Profession, I Became the Strongest BUG, \u62d2\u7d55SSS\u7d1a\u8077\u696d\u540e\uff0c\u6211\u5316\u8eab\u6700\u5f37BUG Novel MTL Free. At the annual awakening ceremony,Li Yang actually gave up the SSS-rank profession [Scourge of the...",
  "robots": "index, follow",
  "og:type": "book",
  "og:title": "Refused SSS-Rank Profession, I Became the Strongest BUG | ReadNovelMTL",
  "og:description": "Read Refused SSS-Rank Profession, I Became the Strongest BUG, \u62d2\u7d55SSS\u7d1a\u8077\u696d\u540e\uff0c\u6211\u5316\u8eab\u6700\u5f37BUG Novel MTL Free. At the annual awakening ceremony,Li Yang actually gave up the SSS-rank profession [Scourge of the...",
  "og:image": "https://public.readnovelmtl.com/uploads/cover/refused-sss-rank-profession-i-became-the-strongest-bug-1751540441905.webp",
  "twitter:card": "summary",
  "twitter:title": "Refused SSS-Rank Profession, I Became the Strongest BUG | ReadNovelMTL",
  "twitter:description": "Read Refused SSS-Rank Profession, I Became the Strongest BUG, \u62d2\u7d55SSS\u7d1a\u8077\u696d\u540e\uff0c\u6211\u5316\u8eab\u6700\u5f37BUG Novel MTL Free. At the annual awakening ceremony,Li Yang actually gave up the SSS-rank profession [Scourge of the...",
  "twitter:image": "https://public.readnovelmtl.com/uploads/cover/refused-sss-rank-profession-i-became-the-strongest-bug-1751540441905.webp",
  "clckd": "0251005b8dd36dccd956b3c9ec8f3c87",
  "og:url": "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe",
  "og:site_name": "ReadNovelMTL",
  "twitter:url": "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe",
  "article:published_time": "2025-07-03T11:00:42Z",
  "article:modified_time": "2025-07-03T11:00:42Z",
  "google": "nopagereadaloud"
}
```

## Opengraph Tags

```json
{
  "og:type": "book",
  "og:title": "Refused SSS-Rank Profession, I Became the Strongest BUG | ReadNovelMTL",
  "og:description": "Read Refused SSS-Rank Profession, I Became the Strongest BUG, \u62d2\u7d55SSS\u7d1a\u8077\u696d\u540e\uff0c\u6211\u5316\u8eab\u6700\u5f37BUG Novel MTL Free. At the annual awakening ceremony,Li Yang actually gave up the SSS-rank profession [Scourge of the...",
  "og:image": "https://public.readnovelmtl.com/uploads/cover/refused-sss-rank-profession-i-became-the-strongest-bug-1751540441905.webp",
  "og:url": "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe",
  "og:site_name": "ReadNovelMTL"
}
```

