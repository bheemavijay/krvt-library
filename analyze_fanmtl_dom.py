import json
from bs4 import BeautifulSoup

def analyze_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    analysis = {}

    # --- Metadata ---
    analysis['novel_title'] = {'selector': 'h1.novel-title', 'text': soup.select_one('h1.novel-title').text.strip() if soup.select_one('h1.novel-title') else 'Not Found'}
    analysis['alternative_title'] = {'selector': 'h2.alternative-title', 'text': soup.select_one('h2.alternative-title').text.strip() if soup.select_one('h2.alternative-title') else 'Not Found'}
    analysis['author'] = {'selector': 'div.author span[itemprop="author"]', 'text': soup.select_one('div.author span[itemprop="author"]').text.strip() if soup.select_one('div.author span[itemprop="author"]') else 'Not Found'}
    analysis['cover_image'] = {'selector': 'figure.cover img', 'src': soup.select_one('figure.cover img')['src'] if soup.select_one('figure.cover img') else 'Not Found'}

    stats = soup.select('.header-stats span strong')
    analysis['chapter_count'] = {'selector': '.header-stats span:nth-of-type(1) strong', 'text': stats[0].text.strip() if len(stats) > 0 else 'Not Found'}
    analysis['status'] = {'selector': '.header-stats span:nth-of-type(2) strong', 'text': stats[1].text.strip() if len(stats) > 1 else 'Not Found'}

    analysis['genres'] = {'selector': '.categories ul li a.property-item', 'count': len(soup.select('.categories ul li a.property-item'))}
    analysis['tags'] = {'selector': '.categories ul li a.tag', 'count': len(soup.select('.categories ul li a.tag'))}
    analysis['description'] = {'selector': '.summary .content', 'text_length': len(soup.select_one('.summary .content').text.strip()) if soup.select_one('.summary .content') else 0}

    # --- Chapter List ---
    analysis['first_chapter_link'] = {'selector': '#readchapterbtn', 'href': soup.select_one('#readchapterbtn')['href'] if soup.select_one('#readchapterbtn') else 'Not Found'}
    analysis['chapter_list_items'] = {'selector': 'ul.chapter-list li a', 'count': len(soup.select('ul.chapter-list li a'))}

    # --- Other ---
    analysis['meta_tags'] = {meta.get('name') or meta.get('property'): meta.get('content') for meta in soup.find_all('meta') if meta.get('content')}
    analysis['opengraph_tags'] = {og.get('property'): og.get('content') for og in soup.find_all('meta') if og.get('property', '').startswith('og:')}

    return analysis

def format_as_markdown(analysis):
    md = "# Novel Page DOM Analysis for FanMTL\n\n"
    for key, value in analysis.items():
        md += f"## {key.replace('_', ' ').title()}\n\n"
        md += "```json\n"
        md += json.dumps(value, indent=2)
        md += "\n```\n\n"
    return md

if __name__ == "__main__":
    analysis_result = analyze_html_file('debug/fanmtl_novel.html')
    markdown_output = format_as_markdown(analysis_result)
    with open('fanmtl_analysis.md', 'w', encoding='utf-8') as f:
        f.write(markdown_output)
    print("FanMTL novel analysis complete. See fanmtl_analysis.md")
