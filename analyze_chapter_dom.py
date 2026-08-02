import json
from bs4 import BeautifulSoup

def analyze_chapter_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    analysis = {}

    # 1. Chapter Title
    title_tag = soup.select_one('h1.mb-4')
    analysis['chapter_title'] = {
        "text": title_tag.text.strip() if title_tag else "Not Found",
        "selector": "h1.mb-4"
    }

    # 2. Main Content Container
    content_container = soup.select_one('div#chapter-content')
    analysis['main_content_container'] = {
        "selector": "div#chapter-content",
        "exists": content_container is not None
    }

    # 3. Paragraph Selector
    paragraphs = content_container.select('p') if content_container else []
    analysis['paragraph_selector'] = {
        "selector": "div#chapter-content p",
        "count": len(paragraphs)
    }

    # 4. Ads / Promotional Blocks
    ads = content_container.select('div.text-center') if content_container else []
    analysis['ads'] = {
        "selector": "div#chapter-content div.text-center",
        "count": len(ads),
        "notes": "These appear to be ad containers inside the main content."
    }

    # 5. Previous/Next Buttons
    prev_button = soup.select_one('a.btn[rel="prev"]')
    next_button = soup.select_one('a.btn[rel="next"]')
    analysis['navigation'] = {
        "previous_button_selector": 'a.btn[rel="prev"]',
        "previous_button_url": prev_button['href'] if prev_button else "Not Found",
        "next_button_selector": 'a.btn[rel="next"]',
        "next_button_url": next_button['href'] if next_button else "Not Found"
    }

    # 6. JSON-LD
    json_ld_scripts = soup.select('script[type="application/ld+json"]')
    analysis['json_ld'] = [json.loads(script.text) for script in json_ld_scripts]

    # 7. Meta/OpenGraph Tags
    analysis['meta_tags'] = {meta.get('name') or meta.get('property'): meta.get('content') for meta in soup.find_all('meta') if meta.get('content')}
    analysis['opengraph_tags'] = {og.get('property'): og.get('content') for og in soup.find_all('meta') if og.get('property', '').startswith('og:')}

    return analysis

def format_as_markdown(analysis):
    md = "# Chapter DOM Analysis for ReadNovelMTL\n\n"
    md += "This document specifies the DOM structure for a chapter page.\n\n"
    for key, value in analysis.items():
        md += f"## {key.replace('_', ' ').title()}\n\n"
        if isinstance(value, dict):
            md += "```json\n"
            md += json.dumps(value, indent=2)
            md += "\n```\n\n"
        elif isinstance(value, list):
            md += "```json\n"
            md += json.dumps(value, indent=2)
            md += "\n```\n\n"
        else:
            md += f"```\n{value}\n```\n\n"
    return md

if __name__ == "__main__":
    analysis_result = analyze_chapter_html('debug/chapter.html')
    markdown_output = format_as_markdown(analysis_result)
    with open('chapter_analysis.md', 'w', encoding='utf-8') as f:
        f.write(markdown_output)
    print("Chapter analysis complete. See chapter_analysis.md")
