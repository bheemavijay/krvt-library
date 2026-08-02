import re
from ..models.enums import PageType

class PageDetector:
    def _is_real_page(self, html_lower: str) -> bool:
        """
        Checks for positive signs of a real novel page using a scoring system.
        """
        real_content_indicators = {
            "has_h1_tag": "<h1",
            "has_author_info": "author",
            "has_genres_info": "genres",
            "has_rating_info": "rating",
            "has_description_info": "description",
            "has_chapter_list": "chapter",
            "has_breadcrumb": "breadcrumb",
            "has_novel_title": "refused sss-rank profession"
        }

        score = 0
        matched_rules = []
        for rule_name, pattern in real_content_indicators.items():
            if pattern in html_lower:
                score += 1
                matched_rules.append(rule_name)

        # A threshold of 4 is a good starting point.
        is_real = score >= 4

        if is_real:
            print(f"\n[Detector] Positive match: Real page detected with score {score}.")
            print(f"[Detector] Matched positive rules: {matched_rules}")

        return is_real

    def _is_challenge_page(self, html_lower: str) -> bool:
        """
        Checks for unambiguous signs of a Cloudflare challenge page and provides debug context.
        """
        challenge_rules = {
            "contains_just_a_moment": r"just a moment\.\.\.",
            "contains_cf_chl_opt": r"_cf_chl_opt",
            "contains_challenge_platform": r"challenge-platform",
            "contains_verify_you_are_human": r"verify you are human",
        }

        for rule_name, pattern in challenge_rules.items():
            match = re.search(pattern, html_lower)
            if match:
                context_start = max(0, match.start() - 50)
                context_end = match.end() + 50
                context = html_lower[context_start:context_end]

                print(f"\n[Detector] Matched challenge rule: '{rule_name}'")
                print(f"[Detector] Matching substring: '{match.group(0)}'")
                print(f"[Detector] Context: ...{context.strip()}...")
                return True

        ambiguous_match = re.search(r"cloudflare", html_lower)
        if ambiguous_match:
            # A real page is much larger than a challenge page.
            # If the page is small, it's likely a challenge. Otherwise, it's a false positive.
            if len(html_lower) < 10000:
                context_start = max(0, ambiguous_match.start() - 50)
                context_end = ambiguous_match.end() + 50
                context = html_lower[context_start:context_end]
                print(f"\n[Detector] Matched challenge rule: 'contains_cloudflare' on a small page.")
                print(f"[Detector] Matching substring: '{ambiguous_match.group(0)}'")
                print(f"[Detector] Context: ...{context.strip()}...")
                return True

        return False

    def detect(self, html: str) -> PageType:
        """
        Detects the type of page by first checking for real content, then for challenges.
        """
        html_lower = html.lower()

        if self._is_real_page(html_lower):
            return PageType.REAL_PAGE

        if self._is_challenge_page(html_lower):
            return PageType.CLOUDFLARE

        return PageType.UNKNOWN
