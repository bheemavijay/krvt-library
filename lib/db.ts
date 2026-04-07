import type { Novel, NovelSummary } from "@/types";

const novels: Novel[] = [
  {
    id: "echoes-of-rain",
    title: "Echoes of Rain",
    author: "Mira Solenne",
    chapters: [
      {
        id: "chapter-1",
        order: 1,
        title: "The House That Listened",
        content: [
          "When the rain began, the old hill house answered with a language of wood and glass. Every beam sighed. Every shutter rattled like a careful warning. Elian stood in the entrance hall and listened as if the storm had come carrying a message meant only for him.",
          "He had inherited the place without ever truly knowing it. The corridors held portraits turned toward the walls, drawers lined with pressed flowers, and clocks that ticked in different rhythms as if the house kept more than one version of time.",
          "At the end of the first night, he found a notebook hidden beneath a loose board in the study. The first page contained only a sentence written in a narrow, precise hand: Some stories wake when the rain remembers them.",
        ],
      },
      {
        id: "chapter-2",
        order: 2,
        title: "Ink Under Candlelight",
        content: [
          "The notebook did not read like a diary. It unfolded like a map. Certain entries described rooms that no longer existed, while others mentioned a woman in a blue coat who left wet footprints across the library carpet and vanished before dawn.",
          "Elian copied the symbols from the margins onto scrap paper and pinned them beside the fireplace. Under candlelight they looked less like decoration and more like instructions. A pattern. A sequence. The beginning of a key.",
          "Outside, the storm deepened. Inside, the house settled around him with strange approval, as though it had been waiting for someone patient enough to read what the walls could not say aloud.",
        ],
      },
      {
        id: "chapter-3",
        order: 3,
        title: "The Locked Conservatory",
        content: [
          "By morning, Elian had discovered a narrow service stair behind the pantry shelves. It led down to a conservatory swallowed by ivy and shadow, a room of broken glass ceilings and iron benches silvered by damp.",
          "There, at the center table, waited a brass key wrapped in blue ribbon. No dust touched it. No rust had found it. The key was warm in his palm, as if another hand had placed it there only moments before.",
          "He looked up through the fractured roof and watched the clouds drift apart. For the first time since arriving, the house fell silent. It had delivered its first answer. Now it wanted his.",
        ],
      },
    ],
  },
  {
    id: "the-last-lantern-keeper",
    title: "The Last Lantern Keeper",
    author: "Soren Vale",
    chapters: [
      {
        id: "chapter-1",
        order: 1,
        title: "Embers at Dusk",
        content: [
          "The harbor city lit itself each night with a thousand lanterns, but only one person still knew the ritual that kept them burning until dawn. Mara climbed the seawall with salt in her hair and a flame cup balanced in both hands.",
          "Below, the markets were folding shut. Fishermen dragged their nets into alleys. Musicians packed away their brass instruments. Yet across the darkening bay, the tide carried a line of unlit lanterns toward the mouth of the channel, drifting like a procession without a guide.",
          "Her grandmother had once said that every lantern either welcomed the living home or warned the lost away. Mara had never asked what happened when a lantern chose the wrong soul.",
        ],
      },
      {
        id: "chapter-2",
        order: 2,
        title: "A Name in Soot",
        content: [
          "At the tower kiln, Mara found fresh soot across the brick floor and a single name drawn through it with deliberate care. It was not hers, and yet she knew at once that it had been written for her to find.",
          "She fed the kiln cedar resin, watching the old mechanism wake in groans and sparks. The flame rose blue instead of gold. Every story she had been told about the lantern craft insisted that blue fire belonged to storms, shipwrecks, and unfinished vows.",
          "When she touched the name, ash lifted into the air and spun around her wrist like a bracelet. Somewhere beyond the harbor bell, a horn answered from the fog.",
        ],
      },
    ],
  },
];

export function getLibraryNovels(): Novel[] {
  return novels;
}

export function getNovels(): NovelSummary[] {
  return getLibraryNovels().map((novel) => ({
    id: novel.id,
    title: novel.title,
    author: novel.author,
    chapterCount: novel.chapters.length,
  }));
}

export function getNovelById(id: string): Novel | undefined {
  return getLibraryNovels().find((novel) => novel.id === id);
}
