const READER_API_BASE = "https://book-finder-production-5c8b.up.railway.app";
const WORDS_PER_PAGE = 260;

const state = {
  bookId: null,
  chapterId: null,
  token: null,
  book: null,
  chapters: [],
  currentChapterIndex: -1,
  currentChapterContent: "",
  currentChapterType: "HTML",
  pages: [],
  currentPageIndex: 0
};

const refs = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheRefs();
  bindEvents();

  const params = new URLSearchParams(window.location.search);
  const bookId = Number.parseInt(params.get("bookId"), 10);
  const chapterId = Number.parseInt(params.get("chapterId"), 10);

  if (!Number.isFinite(bookId) || bookId <= 0) {
    showError("The book ID is missing or invalid.");
    return;
  }

  state.bookId = bookId;
  state.chapterId = Number.isFinite(chapterId) && chapterId > 0 ? chapterId : null;
  state.token = localStorage.getItem("token");

  try {
    setLoading(true);
    await loadReader();
  } catch (error) {
    console.error("Could not initialize chapter reader:", error);
    showError(error.message || "Could not load the reader.");
  } finally {
    setLoading(false);
  }
});

function cacheRefs() {
  refs.backBtn = document.getElementById("backBtn");
  refs.readerBookTitle = document.getElementById("readerBookTitle");
  refs.chapterTitle = document.getElementById("chapterTitle");
  refs.readerStatus = document.getElementById("readerStatus");

  refs.prevChapterBtn = document.getElementById("prevChapterBtn");
  refs.nextChapterBtn = document.getElementById("nextChapterBtn");
  refs.chapterSelect = document.getElementById("chapterSelect");

  refs.prevPageBtn = document.getElementById("prevPageBtn");
  refs.nextPageBtn = document.getElementById("nextPageBtn");
  refs.pageIndicator = document.getElementById("pageIndicator");

  refs.readerNotice = document.getElementById("readerNotice");
  refs.readerLoading = document.getElementById("readerLoading");
  refs.readerError = document.getElementById("readerError");
  refs.readerErrorText = document.getElementById("readerErrorText");
  refs.readerContent = document.getElementById("readerContent");

  refs.leftPage = document.getElementById("leftPage");
  refs.rightPage = document.getElementById("rightPage");
}

function bindEvents() {
  refs.backBtn.addEventListener("click", () => {
    window.location.href = `bookview.html?id=${state.bookId}`;
  });

  refs.chapterSelect.addEventListener("change", async (event) => {
    const nextChapterId = Number.parseInt(event.target.value, 10);
    if (!Number.isFinite(nextChapterId)) return;

    try {
      await loadChapterById(nextChapterId);
    } catch (error) {
      console.error("Could not switch chapter:", error);
      alert(error.message || "Could not switch chapters.");
      syncChapterSelect();
    }
  });

  refs.prevChapterBtn.addEventListener("click", async () => {
    const nextIndex = state.currentChapterIndex - 1;
    if (nextIndex < 0) return;

    try {
      await loadChapterByIndex(nextIndex);
    } catch (error) {
      console.error("Could not open previous chapter:", error);
      alert(error.message || "Could not open the previous chapter.");
    }
  });

  refs.nextChapterBtn.addEventListener("click", async () => {
    const nextIndex = state.currentChapterIndex + 1;
    if (nextIndex >= state.chapters.length) return;

    try {
      await loadChapterByIndex(nextIndex);
    } catch (error) {
      console.error("Could not open next chapter:", error);
      alert(error.message || "Could not open the next chapter.");
    }
  });

  refs.prevPageBtn.addEventListener("click", () => {
    if (state.currentPageIndex - 2 < 0) return;
    state.currentPageIndex -= 2;
    renderPages();
  });

  refs.nextPageBtn.addEventListener("click", () => {
    if (state.currentPageIndex + 2 >= state.pages.length) return;
    state.currentPageIndex += 2;
    renderPages();
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key === "ArrowLeft") {
      if (state.currentPageIndex - 2 >= 0) {
        state.currentPageIndex -= 2;
        renderPages();
      }
    }

    if (event.key === "ArrowRight") {
      if (state.currentPageIndex + 2 < state.pages.length) {
        state.currentPageIndex += 2;
        renderPages();
      }
    }
  });
}

function setLoading(isLoading) {
  refs.readerLoading.hidden = !isLoading;
  refs.readerContent.hidden = isLoading;

  if (isLoading) {
    refs.readerError.hidden = true;
  }
}

function showError(message) {
  refs.readerLoading.hidden = true;
  refs.readerContent.hidden = true;
  refs.readerError.hidden = false;
  refs.readerErrorText.textContent = message;
}

function clearError() {
  refs.readerError.hidden = true;
}

function setNotice(message = "") {
  if (!message) {
    refs.readerNotice.hidden = true;
    refs.readerNotice.textContent = "";
    return;
  }

  refs.readerNotice.hidden = false;
  refs.readerNotice.textContent = message;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${READER_API_BASE}${path}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText && errorText.trim() ? errorText : `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchJsonOrNull(path, options = {}) {
  try {
    const response = await fetch(`${READER_API_BASE}${path}`, options);
    if (!response.ok) return null;
    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    return null;
  }
}

async function loadReader() {
  const [book, chaptersPage] = await Promise.all([
    fetchJson(`/api/books/${state.bookId}/details`),
    fetchJson(`/api/books/${state.bookId}/chapters/list?page=0&size=100`)
  ]);

  state.book = book;
  state.chapters = chaptersPage?.content ?? [];

  refs.readerBookTitle.textContent = book?.title || "Book";

  renderChapterOptions();

  if (state.chapters.length === 0) {
    throw new Error("This book does not have public chapters yet.");
  }

  const initialIndex = resolveInitialChapterIndex();
  await loadChapterByIndex(initialIndex);
}

function resolveInitialChapterIndex() {
  if (state.chapterId) {
    const foundIndex = state.chapters.findIndex((chapter) => chapter.chapterId === state.chapterId);
    if (foundIndex >= 0) {
      return foundIndex;
    }
  }

  if (state.token) {
    return 0;
  }

  const previewIndex = state.chapters.findIndex(
    (chapter) => chapter.preview === true || chapter.isPreview === true
  );

  return previewIndex >= 0 ? previewIndex : 0;
}

function renderChapterOptions() {
  refs.chapterSelect.innerHTML = "";

  state.chapters.forEach((chapter) => {
    const option = document.createElement("option");
    const isPreview = chapter.preview === true || chapter.isPreview === true;
    const isLocked = !state.token && !isPreview;

    option.value = String(chapter.chapterId);
    option.textContent = isLocked
      ? `Chapter ${chapter.chapterNumber}: ${chapter.title} (login required)`
      : `Chapter ${chapter.chapterNumber}: ${chapter.title}`;

    refs.chapterSelect.appendChild(option);
  });
}

function syncChapterSelect() {
  const currentChapter = state.chapters[state.currentChapterIndex];
  if (!currentChapter) return;

  refs.chapterSelect.value = String(currentChapter.chapterId);
}

async function loadChapterByIndex(index) {
  const chapter = state.chapters[index];
  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  await loadChapterById(chapter.chapterId);
}

async function loadChapterById(chapterId) {
  const nextIndex = state.chapters.findIndex((chapter) => chapter.chapterId === chapterId);
  if (nextIndex < 0) {
    throw new Error("Chapter not found in this book.");
  }

  const chapter = state.chapters[nextIndex];
  const isPreview = chapter.preview === true || chapter.isPreview === true;

  if (!state.token && !isPreview) {
    window.location.href = "login.html";
    return;
  }

  setLoading(true);
  clearError();

  try {
    const rawContent = await fetchChapterContent(chapter);

    state.currentChapterIndex = nextIndex;
    state.chapterId = chapter.chapterId;
    state.currentChapterContent = rawContent;
    state.currentChapterType = chapter.fileType || "HTML";
    state.currentPageIndex = 0;
    state.pages = paginate(normalizeContent(rawContent, state.currentChapterType), WORDS_PER_PAGE);

    renderChapterMeta();
    renderPages();
    updateChapterControls();
    syncChapterSelect();

    const params = new URLSearchParams({
      bookId: String(state.bookId),
      chapterId: String(chapter.chapterId)
    });
    window.history.replaceState({}, "", `chapter-reader.html?${params.toString()}`);

    setNotice(isPreview && !state.token ? "You are reading the public preview." : "");
  } finally {
    setLoading(false);
  }
}

async function fetchChapterContent(chapter) {
  const readableUrl = await getReadableChapterUrl(chapter);

  if (!readableUrl) {
    throw new Error("This chapter is not available right now.");
  }

  const response = await fetch(readableUrl);
  if (!response.ok) {
    throw new Error("Could not download chapter content.");
  }

  return response.text();
}

async function getReadableChapterUrl(chapter) {
  const isPreview = chapter.preview === true || chapter.isPreview === true;

  if (state.token) {
    const fullChapter = await fetchJsonOrNull(`/api/chapters/${chapter.chapterId}`, {
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });

    if (fullChapter?.fullUrl) {
      return fullChapter.fullUrl;
    }
  }

  if (isPreview) {
    const previewChapter = await fetchJsonOrNull(`/api/chapters/${chapter.chapterId}/preview`);
    if (previewChapter?.previewUrl) {
      return previewChapter.previewUrl;
    }
  }

  return null;
}

function renderChapterMeta() {
  const currentChapter = state.chapters[state.currentChapterIndex];
  if (!currentChapter) return;

  refs.chapterTitle.textContent = currentChapter.title || `Chapter ${currentChapter.chapterNumber}`;
  refs.readerStatus.textContent = `Chapter ${currentChapter.chapterNumber} of ${state.chapters.length}`;
}

function normalizeContent(content, type) {
  if (!content) return "";

  if (type === "HTML") {
    const div = document.createElement("div");
    div.innerHTML = content;

    const blocks = div.querySelectorAll("p, h1, h2, h3, h4, li, blockquote");

    const normalized = Array.from(blocks)
      .map((element) => element.innerText.trim())
      .filter(Boolean)
      .join("\n\n");

    return normalized || div.innerText.trim();
  }

  return content;
}

function paginate(text, maxWordsPerPage = 260) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return ["This chapter is empty."];
  }

  const result = [];
  let buffer = [];

  for (let i = 0; i < words.length; i += 1) {
    buffer.push(words[i]);

    if (buffer.length >= maxWordsPerPage) {
      result.push(buffer.join(" "));
      buffer = [];
    }
  }

  if (buffer.length) {
    result.push(buffer.join(" "));
  }

  return result;
}

function renderPages() {
  refs.leftPage.textContent = state.pages[state.currentPageIndex] || "";
  refs.rightPage.textContent = state.pages[state.currentPageIndex + 1] || "";

  const leftNumber = state.currentPageIndex + 1;
  const rightNumber = Math.min(state.currentPageIndex + 2, state.pages.length);

  refs.pageIndicator.textContent =
    state.pages.length <= 1
      ? `Page 1 of 1`
      : `Pages ${leftNumber}-${rightNumber} of ${state.pages.length}`;

  updatePageControls();
}

function updatePageControls() {
  refs.prevPageBtn.disabled = state.currentPageIndex === 0;
  refs.nextPageBtn.disabled = state.currentPageIndex + 2 >= state.pages.length;
}

function updateChapterControls() {
  refs.prevChapterBtn.disabled = state.currentChapterIndex <= 0;
  refs.nextChapterBtn.disabled = state.currentChapterIndex >= state.chapters.length - 1;
}