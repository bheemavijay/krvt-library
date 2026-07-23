import { openDB, BOOKMARKS_STORE } from "@/storage/db/indexeddb";

type Bookmark = {
  novelId: string;
  chapterIndex: number;
  createdAt: number;
};

export async function addBookmark(novelId: string, chapterIndex: number) {
  const db = await openDB();
  const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
  const store = tx.objectStore(BOOKMARKS_STORE);

  await requestToPromise(
    store.put({
      novelId,
      chapterIndex,
      createdAt: Date.now(),
    } satisfies Bookmark),
  );
}

export async function removeBookmark(novelId: string, chapterIndex: number) {
  const db = await openDB();
  const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
  await requestToPromise(tx.objectStore(BOOKMARKS_STORE).delete([novelId, chapterIndex]));
}

export async function getBookmarks(novelId: string): Promise<Bookmark[]> {
  const db = await openDB();
  const tx = db.transaction(BOOKMARKS_STORE, "readonly");
  const store = tx.objectStore(BOOKMARKS_STORE);
  const index = store.index("novelId");

  try {
    return await requestToPromise<Bookmark[]>(index.getAll(novelId));
  } catch {
    return [];
  }
}

function requestToPromise<T = unknown>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
