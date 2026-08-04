import json
from bs4 import BeautifulSoup

def analyze_chapter_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    analysis = {}

    # 1. Chapter Title
    title_tag = soup.select_one('header.chapter-header h2')
    analysis['chapter_title'] = {
        "selector": "header.chapter-header h2",
        "text": title_tag.text.strip() if title_tag else "Not Found"
    }

    # 2. Main Content Container
    content_container = soup.select_one('div.chapter-content')
    analysis['main_content_container'] = {
        "selector": "div.chapter-content",
        "exists": content_container is not None
    }

    # 3. Paragraph Selector
    paragraphs = content_container.select('p') if content_container else []
    analysis['paragraph_selector'] = {
        "selector": "div.chapter-content p",
        "count": len(paragraphs)
    }

    # 4. Ads / Promotional Blocks
    ads = content_container.select('div.TPuhiHlg') if content_container else []
    analysis['ads'] = {
        "selector": "div.chapter-content div.TPuhiHlg",
        "count": len(ads),
        "notes": "These appear to be the primary ad containers inside the content."
    }

    # 5. Previous/Next Buttons
    prev_button = soup.select_one('a.chnav.prev')
    next_button = soup.select_one('a.chnav.next')
    analysis['navigation'] = {
        "previous_button_selector": 'a.chnav.prev',
        "previous_button_url": prev_button['href'] if prev_button and prev_button.has_attr('href') else "Not Found",
        "next_button_selector": 'a.chnav.next',
        "next_button_url": next_button['href'] if next_button and next_button.has_attr('href') else "Not Found"
    }

    # 6. JSON-LD
    json_ld_scripts = soup.select('script[type="application/ld+json"]')
    analysis['json_ld'] = [json.loads(script.text) for script in json_ld_scripts] if json_ld_scripts else "Not Found"

    return analysis

def format_as_markdown(analysis):
    md = "# Chapter Page DOM Analysis for FanMTL\n\n"
    for key, value in analysis.items():
        md += f"## {key.replace('_', ' ').title()}\n\n"
        md += "```json\n"
        md += json.dumps(value, indent=2)
        md += "\n```\n\n"
    return md

if __name__ == "__main__":
    analysis_result = analyze_chapter_html('debug/fanmtl_chapter.html')
    markdown_output = format_as_markdown(analysis_result)
    with open('fanmtl_chapter_analysis.md', 'w', encoding='utf-8') as f:
        f.write(markdown_output)
    print("FanMTL chapter analysis complete. See fanmtl_chapter_analysis.md")
