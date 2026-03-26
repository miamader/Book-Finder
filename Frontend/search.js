const SEARCH_API_BASE = "https://book-finder-production-5c8b.up.railway.app";
const SEARCH_PAGE_SIZE = 12;

document.addEventListener("DOMContentLoaded", async () => {
  const searchForm = document.getElementById("searchForm");
  const keywordInput = document.getElementById("keywordInput");
  const authorInput = document.getElementById("authorInput");
  const seriesSelect = document.getElementById("seriesSelect");
  const genreOptions = document.getElementById("genreOptions");
  const hashtagInput = document.getElementById("hashtagInput");
  const addHashtagBtn = document.getElementById("addHashtagBtn");
  const hashtagList = document.getElementById("hashtagList");
  const applyBtn = document.getElementById("applyFiltersBtn");
  const clearBtn = document.getElementById("clearFiltersBtn");

  const resultsSummary = document.getElementById("resultsSummary");
  const resultsMeta = document.getElementById("resultsMeta");
  const resultsGrid = document.getElementById("resultsGrid");
  const resultsEmpty = document.getElementById("resultsEmpty");
  const loadingState = document.getElementById("loadingState");

  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageIndicator = document.getElementById("pageIndicator");

  if (!searchForm) {
    console.error("Search form not found.");
    return;
  }

  const state = {
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    initialSeriesId: "",
    initialGenres: [],
    initialPage: 0,
    isLoading: false
  };

  const hashtagSet = new Set();

  function syncNavbarSearch(value) {
    document.dispatchEvent(
      new CustomEvent("browse:sync-keyword", {
        detail: { keyword: value ?? "" }
      })
    );
  }

  function parseErrorText(text, fallback) {
    return text && text.trim() ? text : fallback;
  }

  function formatDate(dateString) {
    if (!dateString) return "No publish date";

    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "No publish date";

    return date.toLocaleDateString();
  }

  function normalizeHashtag(rawValue) {
    return rawValue.trim().replace(/^#/, "").toLowerCase();
  }

  function renderHashtags() {
    hashtagList.innerHTML = "";

    if (hashtagSet.size === 0) {
      const helper = document.createElement("p");
      helper.className = "sr-chip-helper";
      helper.textContent = "No hashtags added yet.";
      hashtagList.appendChild(helper);
      return;
    }

    [...hashtagSet].forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "sr-chip";

      const chipText = document.createElement("span");
      chipText.textContent = `#${tag}`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "sr-chip-remove";
      removeBtn.setAttribute("aria-label", `Remove hashtag ${tag}`);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        hashtagSet.delete(tag);
        renderHashtags();
      });

      chip.appendChild(chipText);
      chip.appendChild(removeBtn);
      hashtagList.appendChild(chip);
    });
  }

  function addHashtag(rawValue) {
    const cleaned = normalizeHashtag(rawValue);
    if (!cleaned) return;

    hashtagSet.add(cleaned);
    hashtagInput.value = "";
    renderHashtags();
  }

  function addPendingHashtagInput() {
    if (hashtagInput.value.trim()) {
      addHashtag(hashtagInput.value);
    }
  }

  function getSelectedGenres() {
    return [...genreOptions.querySelectorAll('input[type="checkbox"]:checked')].map(
      (checkbox) => checkbox.value
    );
  }

  function setLoading(isLoading) {
    state.isLoading = isLoading;
    loadingState.hidden = !isLoading;
    applyBtn.disabled = isLoading;
    prevPageBtn.disabled = isLoading || state.currentPage <= 0;
    nextPageBtn.disabled = isLoading || state.currentPage >= state.totalPages - 1;
  }

  function buildSearchPayload(page = 0) {
    addPendingHashtagInput();

    const keyword = keywordInput.value.trim();
    const authorName = authorInput.value.trim();
    const seriesId = seriesSelect.value.trim();
    const genres = getSelectedGenres();
    const hashtags = [...hashtagSet];

    return {
      keyword: keyword || null,
      authorName: authorName || null,
      seriesId: seriesId ? Number(seriesId) : null,
      genres: genres.length > 0 ? genres : null,
      hashtags: hashtags.length > 0 ? hashtags : null,
      page,
      size: SEARCH_PAGE_SIZE
    };
  }

  function updateUrl(page = 0) {
    const params = new URLSearchParams();
    const keyword = keywordInput.value.trim();
    const authorName = authorInput.value.trim();
    const seriesId = seriesSelect.value.trim();
    const genres = getSelectedGenres();
    const hashtags = [...hashtagSet];

    if (keyword) params.set("q", keyword);
    if (authorName) params.set("author", authorName);
    if (seriesId) params.set("seriesId", seriesId);
    if (genres.length > 0) params.set("genres", genres.join(","));
    if (hashtags.length > 0) params.set("hashtags", hashtags.join(","));
    if (page > 0) params.set("page", String(page + 1));

    const nextUrl = params.toString() ? `search.html?${params.toString()}` : "search.html";
    window.history.replaceState({}, "", nextUrl);
  }

  function renderGenres(genres) {
    genreOptions.innerHTML = "";

    if (!Array.isArray(genres) || genres.length === 0) {
      genreOptions.innerHTML = '<p class="sr-field-note">No genres available right now.</p>';
      return;
    }

    const sortedGenres = [...genres].sort((a, b) =>
      (a.genreName ?? "").localeCompare(b.genreName ?? "")
    );

    sortedGenres.forEach((genre) => {
      const label = document.createElement("label");
      label.className = "sr-check-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = genre.genreName;
      checkbox.checked = state.initialGenres.includes((genre.genreName ?? "").toLowerCase());

      const text = document.createElement("span");
      text.textContent = genre.genreName;

      label.appendChild(checkbox);
      label.appendChild(text);
      genreOptions.appendChild(label);
    });
  }

  function renderSeries(seriesPage) {
    const content = Array.isArray(seriesPage) ? seriesPage : (seriesPage?.content ?? []);

    seriesSelect.innerHTML = '<option value="">All Series</option>';

    const sortedSeries = [...content].sort((a, b) =>
      (a.seriesName ?? "").localeCompare(b.seriesName ?? "")
    );

    sortedSeries.forEach((series) => {
      const option = document.createElement("option");
      option.value = series.seriesId;
      option.textContent = series.seriesName;
      seriesSelect.appendChild(option);
    });

    if (state.initialSeriesId) {
      const exists = [...seriesSelect.options].some(
        (option) => option.value === state.initialSeriesId
      );
      seriesSelect.value = exists ? state.initialSeriesId : "";
    }
  }

  function buildCoverPlaceholder(title) {
    const placeholder = document.createElement("div");
    placeholder.className = "sr-card-cover sr-card-cover-placeholder";
    placeholder.textContent = (title ?? "B").trim().charAt(0).toUpperCase() || "B";
    return placeholder;
  }

  function createBookCard(book) {
    const card = document.createElement("article");
    card.className = "sr-card";

    const coverLink = document.createElement("a");
    coverLink.className = "sr-card-cover-link";
    coverLink.href = `bookview.html?id=${book.bookId}`;
    coverLink.setAttribute("aria-label", `Open ${book.title ?? "book"}`);

    if (book.coverUrl) {
      const cover = document.createElement("img");
      cover.className = "sr-card-cover";
      cover.alt = `${book.title ?? "Book"} cover`;
      cover.src = book.coverUrl;
      cover.addEventListener("error", () => {
        cover.replaceWith(buildCoverPlaceholder(book.title));
      });
      coverLink.appendChild(cover);
    } else {
      coverLink.appendChild(buildCoverPlaceholder(book.title));
    }

    const body = document.createElement("div");
    body.className = "sr-card-body";

    if (book.volumeNumber !== null && book.volumeNumber !== undefined) {
      const volume = document.createElement("p");
      volume.className = "sr-volume";
      volume.textContent = `Volume ${book.volumeNumber}`;
      body.appendChild(volume);
    }

    const titleLink = document.createElement("a");
    titleLink.className = "sr-card-title";
    titleLink.href = `bookview.html?id=${book.bookId}`;
    titleLink.textContent = book.title ?? "Untitled Book";

    const author = document.createElement("p");
    author.className = "sr-card-author";
    author.textContent = `By ${book.authorUsername ?? "Unknown author"}`;

    const meta = document.createElement("div");
    meta.className = "sr-card-meta";

    const series = document.createElement("span");
    series.className = "sr-meta-pill";
    series.textContent = book.seriesName || "Standalone";

    const publishDate = document.createElement("span");
    publishDate.className = "sr-meta-text";
    publishDate.textContent = formatDate(book.publishDate);

    meta.appendChild(series);
    meta.appendChild(publishDate);

    const actionRow = document.createElement("div");
    actionRow.className = "sr-card-actions";

    const openBtn = document.createElement("a");
    openBtn.className = "sr-open-btn";
    openBtn.href = `bookview.html?id=${book.bookId}`;
    openBtn.textContent = "View Details";

    actionRow.appendChild(openBtn);

    body.appendChild(titleLink);
    body.appendChild(author);
    body.appendChild(meta);
    body.appendChild(actionRow);

    card.appendChild(coverLink);
    card.appendChild(body);

    return card;
  }

  function renderResults(pageData, payload) {
    const books = pageData?.content ?? [];

    resultsGrid.innerHTML = "";
    state.currentPage = pageData?.number ?? payload.page ?? 0;
    state.totalPages = pageData?.totalPages ?? 0;
    state.totalElements = pageData?.totalElements ?? books.length;

    const activeKeyword = payload.keyword?.trim();
    resultsSummary.textContent = activeKeyword
      ? `Results for “${activeKeyword}”`
      : "Browse published books";

    resultsMeta.textContent = `Showing ${books.length} of ${state.totalElements} books.`;

    if (books.length === 0) {
      resultsEmpty.hidden = false;
      resultsGrid.hidden = true;
    } else {
      resultsEmpty.hidden = true;
      resultsGrid.hidden = false;
      books.forEach((book) => resultsGrid.appendChild(createBookCard(book)));
    }

    const currentPageLabel = state.totalPages > 0 ? state.currentPage + 1 : 0;
    pageIndicator.textContent = `Page ${currentPageLabel} of ${state.totalPages}`;

    prevPageBtn.disabled = state.isLoading || state.currentPage <= 0;
    nextPageBtn.disabled = state.isLoading || state.currentPage >= state.totalPages - 1;
  }

  async function loadFilters() {
    const [genresResponse, seriesResponse] = await Promise.all([
      fetch(`${SEARCH_API_BASE}/api/genres`),
      fetch(`${SEARCH_API_BASE}/api/series/list?page=0&size=100`)
    ]);

    if (!genresResponse.ok) {
      const errorText = await genresResponse.text();
      throw new Error(parseErrorText(errorText, "Failed to load genres"));
    }

    if (!seriesResponse.ok) {
      const errorText = await seriesResponse.text();
      throw new Error(parseErrorText(errorText, "Failed to load series"));
    }

    const genres = await genresResponse.json();
    const series = await seriesResponse.json();

    renderGenres(genres);
    renderSeries(series);
  }

  async function searchBooks(page = 0) {
    const payload = buildSearchPayload(page);

    try {
      setLoading(true);
      updateUrl(page);
      syncNavbarSearch(keywordInput.value.trim());

      const response = await fetch(`${SEARCH_API_BASE}/api/books/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(parseErrorText(errorText, "Failed to search books"));
      }

      const pageData = await response.json();
      renderResults(pageData, payload);
    } catch (error) {
      console.error("Could not search books:", error);
      resultsGrid.innerHTML = "";
      resultsGrid.hidden = true;
      resultsEmpty.hidden = false;
      resultsSummary.textContent = "Could not load books";
      resultsMeta.textContent = error.message || "Please try again.";
      pageIndicator.textContent = "Page 0 of 0";
    } finally {
      setLoading(false);
    }
  }

  function hydrateFromUrl() {
    const params = new URLSearchParams(window.location.search);

    keywordInput.value = params.get("q") ?? "";
    authorInput.value = params.get("author") ?? "";
    state.initialSeriesId = params.get("seriesId") ?? "";
    state.initialGenres = (params.get("genres") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const initialHashtags = (params.get("hashtags") ?? "")
      .split(",")
      .map(normalizeHashtag)
      .filter(Boolean);

    initialHashtags.forEach((tag) => hashtagSet.add(tag));

    const requestedPage = Number.parseInt(params.get("page") ?? "1", 10);
    state.initialPage = Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage - 1
      : 0;

    renderHashtags();
    syncNavbarSearch(keywordInput.value.trim());
  }

  addHashtagBtn.addEventListener("click", () => addHashtag(hashtagInput.value));

  hashtagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addHashtag(hashtagInput.value);
    }
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchBooks(0);
  });

  clearBtn.addEventListener("click", () => {
    searchForm.reset();
    state.initialSeriesId = "";
    state.initialGenres = [];
    hashtagSet.clear();
    renderHashtags();
    keywordInput.focus();
    syncNavbarSearch("");
    searchBooks(0);
  });

  keywordInput.addEventListener("input", () => {
    syncNavbarSearch(keywordInput.value.trim());
  });

  prevPageBtn.addEventListener("click", () => {
    if (state.currentPage <= 0) return;
    searchBooks(state.currentPage - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  nextPageBtn.addEventListener("click", () => {
    if (state.currentPage >= state.totalPages - 1) return;
    searchBooks(state.currentPage + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  hydrateFromUrl();

  try {
    await loadFilters();
    await searchBooks(state.initialPage);
  } catch (error) {
    console.error("Could not initialize browse page:", error);
    resultsSummary.textContent = "Could not load browse filters";
    resultsMeta.textContent = error.message || "Please refresh the page.";
    resultsGrid.hidden = true;
    resultsEmpty.hidden = false;
  }
});