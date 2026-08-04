# This set contains all known genres.
# Any label from a provider that is in this set will be classified as a genre.
# Everything else will be classified as a tag.
# This centralizes genre management, so we don't need to edit every provider
# when we want to re-classify a label.

KNOWN_GENRES = {
    "Action",
    "Adventure",
    "Comedy",
    "Cultivation",
    "Drama",
    "Fantasy",
    "Game",
    "Historical",
    "Horror",
    "Martial Arts",
    "Military",
    "Mystery",
    "Romance",
    "School Life",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Tragedy",
    "Urban",
    "Xianxia",
    "Xuanhuan",
}
