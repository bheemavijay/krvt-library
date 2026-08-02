import json
from bs4 import BeautifulSoup

def analyze_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    analysis = {}

    # 1. Novel Title
    analysis['novel_title'] = soup.select_one('h1.h3.fw-bold.mb-1').text.strip() if soup.select_one('h1.h3.fw-bold.mb-1') else None

    # 2. Alternative Title
    analysis['alternative_title'] = soup.select_one('p.text-secondary.fw-normal.mb-3').text.strip() if soup.select_one('p.text-secondary.fw-normal.mb-3') else None

    # 3. Author
    author_element = soup.select_one('a[href*="/novel?author="]')
    analysis['author'] = author_element.text.strip() if author_element else None

    # 4. Status
    status_element = soup.select_one('i.fas.fa-info-circle ~ span.text-body')
    analysis['status'] = status_element.text.strip() if status_element else None

    # 5. Genres
    genres_elements = soup.select('div.d-flex.flex-wrap.gap-2 a.badge')
    analysis['genres'] = [genre.text.strip() for genre in genres_elements]

    # 6. Tags - This site uses Genres as tags, so we'll list them as such.
    analysis['tags'] = analysis['genres']

    # 7. Description
    description_element = soup.select_one('div.mb-4[style="font-size: 1rem;"]')
    analysis['description'] = description_element.text.strip() if description_element else None

    # 8. Cover Image
    cover_image_element = soup.select_one('img[alt*="Refused SSS-Rank Profession"]')
    analysis['cover_image'] = cover_image_element['src'] if cover_image_element else None

    # 9. Rating
    rating_element = soup.select_one('div.d-flex.align-items-center.gap-2.text-warning strong.text-body')
    analysis['rating'] = rating_element.text.strip() if rating_element else None

    # 10. Views - Not directly available, but library count is.
    library_count_element = soup.select_one('i.fas.fa-bookmark ~ span.text-body')
    analysis['library_count'] = library_count_element.text.strip() if library_count_element else None
    analysis['views'] = 'Not directly available on the page.'

    # 11. Chapter Count
    chapter_count_element = soup.select_one('i.fas.fa-book ~ span.text-body')
    analysis['chapter_count'] = chapter_count_element.text.strip() if chapter_count_element else None

    # 12. First Chapter
    first_chapter_element = soup.select_one('a[data-sa-event="novel-detail:read-first"]')
    analysis['first_chapter_url'] = first_chapter_element['href'] if first_chapter_element else None
    analysis['first_chapter_title'] = first_chapter_element.text.strip() if first_chapter_element else None

    # 13. Last Chapter - Not directly available on the main page, requires inspecting the chapter list.
    last_chapter_element = soup.select_one('div.accordion-item:last-of-type tr:last-of-type a')
    analysis['last_chapter_url'] = last_chapter_element['href'] if last_chapter_element else 'Not directly available on main page'
    analysis['last_chapter_title'] = last_chapter_element.text.strip() if last_chapter_element else 'Not directly available on main page'


    # 14. Chapter URL Pattern
    if analysis['first_chapter_url']:
        analysis['chapter_url_pattern'] = analysis['first_chapter_url'].rsplit('/', 1)[0] + '/{chapter_slug}'
    else:
        analysis['chapter_url_pattern'] = 'Not determinable from the page.'

    # 15. Pagination
    analysis['pagination'] = 'Chapter list is within accordions, not traditional pagination.'

    # 16. Breadcrumb
    breadcrumb_elements = soup.select('ol.breadcrumb li.breadcrumb-item a')
    analysis['breadcrumb'] = [bc.text.strip() for bc in breadcrumb_elements]

    # 17. Every JSON-LD block
    json_ld_elements = soup.select('script[type="application/ld+json"]')
    analysis['json_ld'] = [json.loads(json_ld.text) for json_ld in json_ld_elements]

    # 18. Every script containing serialized data
    analysis['serialized_data_scripts'] = []
    for script in soup.find_all('script'):
        if 'sa_metadata' in script.text:
            analysis['serialized_data_scripts'].append(script.text.strip())

    # 19. All meta tags
    analysis['meta_tags'] = {meta.get('name') or meta.get('property'): meta.get('content') for meta in soup.find_all('meta') if meta.get('content')}

    # 20. All OpenGraph tags
    analysis['opengraph_tags'] = {og.get('property'): og.get('content') for og in soup.find_all('meta') if og.get('property', '').startswith('og:')}

    # 21. List every important CSS selector
    analysis['css_selectors'] = {
        'title': 'h1.h3.fw-bold.mb-1',
        'alternative_title': 'p.text-secondary.fw-normal.mb-3',
        'author': 'a[href*="/novel?author="]',
        'status': 'i.fas.fa-info-circle ~ span.text-body',
        'genres': 'div.d-flex.flex-wrap.gap-2 a.badge',
        'description': 'div.mb-4[style="font-size: 1rem;"]',
        'cover_image': 'div.position-relative.shadow-sm.rounded.overflow-hidden img',
        'rating': 'div.d-flex.align-items-center.gap-2.text-warning strong.text-body',
        'library_count': 'i.fas.fa-bookmark ~ span.text-body',
        'chapter_count': 'i.fas.fa-book ~ span.text-body',
        'first_chapter_button': 'a[data-sa-event="novel-detail:read-first"]',
        'chapter_list_accordions': 'div.accordion-item',
        'chapter_list_links': 'div.accordion-body a.text-decoration-none.text-primary',
        'breadcrumb': 'ol.breadcrumb li.breadcrumb-item a',
    }

    return analysis

def format_as_markdown(analysis):
    md = "# DOM Analysis for ReadNovelMTL\n\n"
    md += "This document specifies the important DOM elements and data structures found on a ReadNovelMTL novel page.\n\n"

    for key, value in analysis.items():
        md += f"## {key.replace('_', ' ').title()}\n\n"
        if isinstance(value, dict):
            md += "```json\n"
            md += json.dumps(value, indent=2)
            md += "\n```\n\n"
        elif isinstance(value, list) and value and isinstance(value[0], dict):
            md += "```json\n"
            md += json.dumps(value, indent=2)
            md += "\n```\n\n"
        elif isinstance(value, list):
            for item in value:
                md += f"- {item}\n"
            md += "\n"
        else:
            md += f"```\n{value}\n```\n\n"

    return md

if __name__ == "__main__":
    analysis_result = analyze_html_file('debug/output.html')
    markdown_output = format_as_markdown(analysis_result)
    with open('analysis.md', 'w', encoding='utf-8') as f:
        f.write(markdown_output)
    print("Analysis complete. See analysis.md")

