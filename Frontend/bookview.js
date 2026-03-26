const BOOK_VIEW_API_BASE = "https://book-finder-production-5c8b.up.railway.app";
const REVIEWS_PAGE_SIZE = 4;

const state = {
  bookId: null,
  book: null,
  chapters: [],
  reviewsPage: 0,
  reviewsTotalPages: 0,
  reviewsLoaded: 0,
  reviewSummary: null
};

const refs = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheRefs();
  bindEvents();

  const params = new URLSearchParams(window.location.search);
  const rawBookId = params.get("id");
  const parsedBookId = Number.parseInt(rawBookId, 10);

  if (!Number.isFinite(parsedBookId) || parsedBookId <= 0) {
    showPageError("The book ID in the URL is invalid.");
    return;
  }

  state.bookId = parsedBookId;

  try {
    setPageLoading(true);

    const book = await fetchJson(`/api/books/${state.bookId}/details`);
    state.book = book;

    renderBookDetails(book);

    if (book.publicationStatus === "PUBLISHED") {
      const [chaptersResult, reviewsResult, summaryResult] = await Promise.allSettled([
        fetchJson(`/api/books/${state.bookId}/chapters/list?page=0&size=100`),
        fetchJson(`/api/books/${state.bookId}/reviews?page=0&size=${REVIEWS_PAGE_SIZE}`),
        fetchJsonOrNull(`/api/books/${state.bookId}/reviews/summary`)
      ]);

      if (chaptersResult.status === "fulfilled") {
        renderChapters(chaptersResult.value);
      } else {
        renderChapters(null);
      }

      if (reviewsResult.status === "fulfilled") {
        const reviewsPage = reviewsResult.value;
        const reviewSummary = summaryResult.status === "fulfilled" ? summaryResult.value : null;

        renderReviews(reviewsPage, false);
        renderReviewSummary(reviewSummary, reviewsPage);
      } else {
        renderReviews(null, false);
        renderReviewSummary(null, null);
      }
    } else {
      handleDraftBook();
    }

    refs.bookPage.hidden = false;
  } catch (error) {
    console.error("Could not load book view:", error);
    showPageError(error.message || "Could not load the book details.");
  } finally {
    setPageLoading(false);
  }
});

function cacheRefs() {
  refs.pageLoading = document.getElementById("pageLoading");
  refs.pageError = document.getElementById("pageError");
  refs.pageErrorText = document.getElementById("pageErrorText");
  refs.bookPage = document.getElementById("bookPage");

  refs.bookEyebrow = document.getElementById("bookEyebrow");
  refs.bookTitle = document.getElementById("bookTitle");
  refs.bookSubtitle = document.getElementById("bookSubtitle");
  refs.publicationBadge = document.getElementById("publicationBadge");

  refs.bookCoverImg = document.getElementById("bookCoverImg");
  refs.bookCoverFallback = document.getElementById("bookCoverFallback");

  refs.authorName = document.getElementById("authorName");
  refs.publishDate = document.getElementById("publishDate");
  refs.seriesName = document.getElementById("seriesName");
  refs.volumeNumber = document.getElementById("volumeNumber");
  refs.chapterCount = document.getElementById("chapterCount");
  refs.reviewCountInline = document.getElementById("reviewCountInline");

  refs.startReadingBtn = document.getElementById("startReadingBtn");
  refs.previewBtn = document.getElementById("previewBtn");
  refs.tocBtn = document.getElementById("tocBtn");
  refs.bookNotice = document.getElementById("bookNotice");

  refs.genreTags = document.getElementById("genreTags");
  refs.hashtagTags = document.getElementById("hashtagTags");
  refs.bookDescription = document.getElementById("bookDescription");

  refs.chaptersSection = document.getElementById("chaptersSection");
  refs.chaptersMeta = document.getElementById("chaptersMeta");
  refs.chaptersEmpty = document.getElementById("chaptersEmpty");
  refs.chaptersList = document.getElementById("chaptersList");

  refs.ratingStars = document.getElementById("ratingStars");
  refs.ratingAverage = document.getElementById("ratingAverage");
  refs.ratingCount = document.getElementById("ratingCount");
  refs.reviewsMeta = document.getElementById("reviewsMeta");
  refs.reviewsEmpty = document.getElementById("reviewsEmpty");
  refs.reviewsGrid = document.getElementById("reviewsGrid");
  refs.loadMoreReviewsBtn = document.getElementById("loadMoreReviewsBtn");
}

function bindEvents() {
  refs.startReadingBtn.addEventListener("click", handleStartReading);
  refs.previewBtn.addEventListener("click", handleOpenPreview);
  refs.tocBtn.addEventListener("click", () => {
    refs.chaptersSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  refs.loadMoreReviewsBtn.addEventListener("click", async () => {
    const nextPage = state.reviewsPage + 1;
    if (nextPage >= state.reviewsTotalPages) return;

    refs.loadMoreReviewsBtn.disabled = true;

    try {
      const pageData = await fetchJson(
        `/api/books/${state.bookId}/reviews?page=${nextPage}&size=${REVIEWS_PAGE_SIZE}`
      );
      renderReviews(pageData, true);
    } catch (error) {
      console.error("Could not load more reviews:", error);
      alert(error.message || "Could not load more reviews.");
    } finally {
      refs.loadMoreReviewsBtn.disabled = false;
    }
  });
}

function getToken() {
  return localStorage.getItem("token");
}

function parseErrorText(text, fallback) {
  return text && text.trim() ? text : fallback;
}

function setPageLoading(isLoading) {
  refs.pageLoading.hidden = !isLoading;
}

function showPageError(message) {
  refs.pageLoading.hidden = true;
  refs.bookPage.hidden = true;
  refs.pageError.hidden = false;
  refs.pageErrorText.textContent = message;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${BOOK_VIEW_API_BASE}${path}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseErrorText(errorText, `Request failed (${response.status})`));
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchJsonOrNull(path, options = {}) {
  try {
    const response = await fetch(`${BOOK_VIEW_API_BASE}${path}`, options);
    if (!response.ok) return null;
    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    return null;
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString();
}

function buildFallbackLetter(title) {
  const first = (title ?? "B").trim().charAt(0).toUpperCase();
  return first || "B";
}

function createChip(text, extraClass = "") {
  const chip = document.createElement("span");
  chip.className = `bv-chip ${extraClass}`.trim();
  chip.textContent = text;
  return chip;
}

function renderChipList(container, values, emptyText) {
  container.innerHTML = "";

  if (!Array.isArray(values) || values.length === 0) {
    container.appendChild(createChip(emptyText, "bv-chip-muted"));
    return;
  }

  values.forEach((value) => {
    container.appendChild(createChip(value));
  });
}

function renderStars(container, ratingValue) {
  container.innerHTML = "";

  const rating = Number.isFinite(ratingValue) ? ratingValue : 0;

  for (let i = 1; i <= 5; i += 1) {
    const star = document.createElement("span");
    star.className = "bv-star";
    star.textContent = "★";

    if (rating >= i - 0.49) {
      star.classList.add("is-filled");
    }

    container.appendChild(star);
  }
}

function renderBookDetails(book) {
  refs.bookTitle.textContent = book.title || "Untitled Book";

  const subtitleParts = [];
  if (book.authorUsername) subtitleParts.push(`By ${book.authorUsername}`);
  if (book.seriesName) subtitleParts.push(`Series: ${book.seriesName}`);
  if (book.volumeNumber !== null && book.volumeNumber !== undefined) {
    subtitleParts.push(`Volume ${book.volumeNumber}`);
  }

  refs.bookSubtitle.textContent = subtitleParts.length > 0
    ? subtitleParts.join(" • ")
    : "Book details";

  refs.publicationBadge.textContent = book.publicationStatus || "Unknown";
  refs.publicationBadge.classList.remove("is-draft", "is-published");
  refs.publicationBadge.classList.add(
    book.publicationStatus === "PUBLISHED" ? "is-published" : "is-draft"
  );

  refs.authorName.textContent = book.authorUsername || "—";
  refs.publishDate.textContent = formatDate(book.publishDate);
  refs.seriesName.textContent = book.seriesName || "Standalone";
  refs.volumeNumber.textContent =
    book.volumeNumber !== null && book.volumeNumber !== undefined
      ? `Volume ${book.volumeNumber}`
      : "Standalone / N/A";

  refs.bookDescription.textContent =
    book.summary && book.summary.trim()
      ? book.summary
      : "No description has been added yet.";

  if (book.coverUrl) {
    refs.bookCoverImg.src = book.coverUrl;
    refs.bookCoverImg.hidden = false;
    refs.bookCoverFallback.hidden = true;

    refs.bookCoverImg.addEventListener("error", () => {
      refs.bookCoverImg.hidden = true;
      refs.bookCoverFallback.hidden = false;
      refs.bookCoverFallback.textContent = buildFallbackLetter(book.title);
    }, { once: true });
  } else {
    refs.bookCoverImg.hidden = true;
    refs.bookCoverFallback.hidden = false;
    refs.bookCoverFallback.textContent = buildFallbackLetter(book.title);
  }

  renderChipList(
    refs.genreTags,
    Array.isArray(book.genres) ? book.genres : [],
    "No genres"
  );

  const hashtagValues = Array.isArray(book.hashtags)
    ? book.hashtags.map((tag) => `#${tag}`)
    : [];

  renderChipList(
    refs.hashtagTags,
    hashtagValues,
    "No hashtags"
  );
}

function handleDraftBook() {
  refs.bookNotice.hidden = false;
  refs.bookNotice.textContent =
    "This book is not published yet. Public chapters and public reviews are not available right now.";

  refs.startReadingBtn.disabled = true;
  refs.previewBtn.hidden = true;
  refs.tocBtn.disabled = true;

  refs.chaptersMeta.textContent = "This book is still in draft.";
  refs.chaptersEmpty.hidden = false;
  refs.chaptersEmpty.textContent = "Public chapter list is unavailable for draft books.";

  refs.reviewsMeta.textContent = "Reviews are only available for published books.";
  refs.reviewsEmpty.hidden = false;
  refs.reviewsEmpty.textContent = "No public reviews are available for draft books.";
}

function renderChapters(pageData) {
  refs.chaptersList.innerHTML = "";

  const chapters = pageData?.content ?? [];
  state.chapters = chapters;

  refs.chapterCount.textContent = String(chapters.length);
  refs.chaptersMeta.textContent =
    chapters.length > 0
      ? `${chapters.length} chapter${chapters.length === 1 ? "" : "s"} available`
      : "No public chapters yet.";

  if (chapters.length === 0) {
    refs.chaptersEmpty.hidden = false;
    refs.previewBtn.hidden = true;
    refs.startReadingBtn.disabled = true;
    refs.tocBtn.disabled = true;
    return;
  }

  refs.chaptersEmpty.hidden = true;
  refs.startReadingBtn.disabled = false;
  refs.tocBtn.disabled = false;

  const hasPreview = chapters.some((chapter) => chapter.preview === true || chapter.isPreview === true);
  refs.previewBtn.hidden = !hasPreview;

  chapters.forEach((chapter) => {
    const card = document.createElement("div");
    card.className = "bv-chapter-card";

    const main = document.createElement("div");
    main.className = "bv-chapter-main";

    const top = document.createElement("div");
    top.className = "bv-chapter-top";

    const number = document.createElement("span");
    number.className = "bv-chapter-number";
    number.textContent = `Chapter ${chapter.chapterNumber}`;

    const title = document.createElement("span");
    title.className = "bv-chapter-title";
    title.textContent = chapter.title || `Chapter ${chapter.chapterNumber}`;

    top.appendChild(number);
    top.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "bv-chapter-meta";

    const typePill = document.createElement("span");
    typePill.className = "bv-pill";
    typePill.textContent = chapter.fileType || "File";

    meta.appendChild(typePill);

    if (chapter.preview === true || chapter.isPreview === true) {
      const previewPill = document.createElement("span");
      previewPill.className = "bv-pill bv-pill-preview";
      previewPill.textContent = "Preview available";
      meta.appendChild(previewPill);
    }

    main.appendChild(top);
    main.appendChild(meta);

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "bv-btn bv-btn-secondary";

    const token = getToken();
    const isPreview = chapter.preview === true || chapter.isPreview === true;

    if (token) {
      actionBtn.textContent = "Open Chapter";
    } else if (isPreview) {
      actionBtn.textContent = "Read Preview";
    } else {
      actionBtn.textContent = "Login to Read";
    }

    actionBtn.addEventListener("click", async () => {
      if (!token && !isPreview) {
        alert("Please log in to read this chapter.");
        window.location.href = "login.html";
        return;
      }

      await openChapter(chapter);
    });

    card.appendChild(main);
    card.appendChild(actionBtn);

    refs.chaptersList.appendChild(card);
  });
}

function renderReviewSummary(summary, reviewsPage) {
  let totalReviews = 0;
  let averageRating = null;

  if (summary && typeof summary.totalReviews === "number") {
    totalReviews = summary.totalReviews;
    averageRating = typeof summary.averageRating === "number"
      ? summary.averageRating
      : null;
  } else if (reviewsPage) {
    totalReviews = reviewsPage.totalElements ?? 0;
  }

  refs.reviewCountInline.textContent = String(totalReviews);
  refs.ratingCount.textContent = `${totalReviews} review${totalReviews === 1 ? "" : "s"}`;

  if (averageRating !== null) {
    refs.ratingAverage.textContent = averageRating.toFixed(1);
    renderStars(refs.ratingStars, averageRating);
  } else {
    refs.ratingAverage.textContent = "—";
    renderStars(refs.ratingStars, 0);
  }
}

function renderReviews(pageData, append) {
  if (!append) {
    refs.reviewsGrid.innerHTML = "";
  }

  const reviews = pageData?.content ?? [];

  if (!pageData || reviews.length === 0) {
    if (!append) {
      refs.reviewsEmpty.hidden = false;
      refs.reviewsMeta.textContent = "No reviews yet.";
      refs.loadMoreReviewsBtn.hidden = true;
    }
    return;
  }

  refs.reviewsEmpty.hidden = true;

  state.reviewsPage = pageData.number ?? 0;
  state.reviewsTotalPages = pageData.totalPages ?? 0;
  state.reviewsLoaded += reviews.length;

  refs.reviewsMeta.textContent = `Showing ${state.reviewsLoaded} of ${pageData.totalElements ?? reviews.length} reviews.`;

  reviews.forEach((review) => {
    const card = document.createElement("article");
    card.className = "bv-review-card";

    const user = document.createElement("p");
    user.className = "bv-review-user";
    user.textContent = review.username || "Anonymous";

    const stars = document.createElement("div");
    stars.className = "bv-stars";
    renderStars(stars, review.rating || 0);

    const text = document.createElement("p");
    text.className = "bv-review-text";
    text.textContent =
      review.comment && review.comment.trim()
        ? review.comment
        : "This user left a rating without a written comment.";

    card.appendChild(user);
    card.appendChild(stars);
    card.appendChild(text);

    refs.reviewsGrid.appendChild(card);
  });

  refs.loadMoreReviewsBtn.hidden = state.reviewsPage >= state.reviewsTotalPages - 1;
}

async function getReadableChapterUrl(chapter) {
  const token = getToken();

  if (token) {
    const fullChapter = await fetchJsonOrNull(`/api/chapters/${chapter.chapterId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (fullChapter?.fullUrl) {
      return fullChapter.fullUrl;
    }
  }

  const isPreview = chapter.preview === true || chapter.isPreview === true;

  if (isPreview) {
    const previewChapter = await fetchJsonOrNull(`/api/chapters/${chapter.chapterId}/preview`);
    if (previewChapter?.previewUrl) {
      return previewChapter.previewUrl;
    }
  }

  return null;
}

async function openChapter(chapter) {
  const url = await getReadableChapterUrl(chapter);

  if (!url) {
    alert("Could not open this chapter.");
    return;
  }

  window.location.href = url;
}

async function handleOpenPreview() {
  const previewChapter = state.chapters.find(
    (chapter) => chapter.preview === true || chapter.isPreview === true
  );

  if (!previewChapter) {
    alert("This book does not have a public preview chapter.");
    return;
  }

  const previewData = await fetchJsonOrNull(`/api/chapters/${previewChapter.chapterId}/preview`);

  if (!previewData?.previewUrl) {
    alert("Could not open the preview.");
    return;
  }

  window.location.href = previewData.previewUrl;
}

async function handleStartReading() {
  if (!state.book || state.chapters.length === 0) {
    alert("No readable chapters are available yet.");
    return;
  }

  const token = getToken();

  let targetChapter = null;

  if (token) {
    targetChapter = state.chapters[0];
  } else {
    targetChapter = state.chapters.find(
      (chapter) => chapter.preview === true || chapter.isPreview === true
    );
  }

  if (!targetChapter) {
    alert("Please log in to start reading this book.");
    window.location.href = "login.html";
    return;
  }

  if (token && state.book.publicationStatus === "PUBLISHED") {
    try {
      await fetch(`${BOOK_VIEW_API_BASE}/api/reading-progress/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookId: state.book.bookId
        })
      });
    } catch (error) {
      console.warn("Could not save reading progress:", error);
    }
  }

  await openChapter(targetChapter);
}