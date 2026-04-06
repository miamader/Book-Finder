const BOOKS_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const bookIdFromUrl = params.get("bookId");
  const isEditMode = !!bookIdFromUrl;

  const form = document.getElementById("bookForm");
  const titleInput = document.getElementById("title");
  const descInput = document.getElementById("desc");
  const categorySelect = document.getElementById("category");
  const seriesSelect = document.getElementById("series");
  const seriesCardList = document.getElementById("seriesCardList");
  const tagInput = document.getElementById("tagInput");
  const addTagBtn = document.getElementById("addTagBtn");
  const tagList = document.getElementById("tagList");
  const submitBtn = document.getElementById("bookSubmitBtn");
  const coverInput = document.getElementById("bookCoverInput");
  const coverPreview = document.getElementById("bookCoverPreview");
  const coverPlaceholder = document.getElementById("bookCoverPlaceholder");
  const coverName = document.getElementById("bookCoverName");

  const formTitle = document.getElementById("bookFormTitle");
  const formSubtitle = document.getElementById("bookFormSubtitle");
  const formNote = document.getElementById("bookFormNote");
  const statusRow = document.getElementById("bookStatusRow");
  const statusBadge = document.getElementById("bookStatusBadge");

  let selectedFile = null;
  let tags = [];
  let allSeries = [];
  let selectedSeriesId = null;
  let currentBookData = null;
  let prefilledGenreId = null;

  function getTodayDate() {
    return new Date().toISOString().split("T")[0];
  }

  function getFileTypeEnum(file) {
    if (!file) return null;
    if (file.type === "image/png") return "PNG";
    if (file.type === "image/jpeg") return "JPEG";
    return null;
  }

  function slugifyFileName(fileName) {
    const lastDot = fileName.lastIndexOf(".");
    const name = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName;
    const ext = lastDot >= 0 ? fileName.substring(lastDot) : "";
    const safeName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    return `${safeName || "cover"}${ext.toLowerCase()}`;
  }

  function parseErrorText(text, fallbackMessage) {
    if (!text || !text.trim()) return fallbackMessage;

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "string") return parsed;
      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
      return fallbackMessage;
    } catch {
      return text;
    }
  }

  function renderTags() {
    tagList.innerHTML = "";

    tags.forEach((tag) => {
      const chip = document.createElement("div");
      chip.className = "cb-chip";
      chip.innerHTML = `
        <span>#${tag}</span>
        <button type="button" class="cb-chip-remove" aria-label="Remove tag">&times;</button>
      `;

      chip.querySelector(".cb-chip-remove").addEventListener("click", () => {
        tags = tags.filter((value) => value !== tag);
        renderTags();
      });

      tagList.appendChild(chip);
    });
  }

  function addTag() {
    const value = tagInput.value.trim().replace(/^#/, "").toLowerCase();

    if (!value) return;
    if (tags.includes(value)) {
      tagInput.value = "";
      return;
    }

    tags.push(value);
    tagInput.value = "";
    renderTags();
  }

  function setCoverPreview(src, labelText = "") {
    if (!src) {
      coverPreview.style.display = "none";
      coverPreview.removeAttribute("src");
      coverPlaceholder.style.display = "flex";
      coverName.textContent = "";
      return;
    }

    coverPreview.src = src;
    coverPreview.style.display = "block";
    coverPlaceholder.style.display = "none";
    coverName.textContent = labelText;
  }

  function populateGenres(genres) {
    categorySelect.innerHTML = `<option value="" selected disabled>Select a category</option>`;

    genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre.genreId;
      option.textContent = genre.genreName;
      categorySelect.appendChild(option);
    });
  }

  function populateSeriesSelect(seriesList) {
    const safeSeriesList = Array.isArray(seriesList) ? seriesList : [];

    seriesSelect.innerHTML = `<option value="">Standalone book</option>`;

    safeSeriesList.forEach((series) => {
      const option = document.createElement("option");
      option.value = series.seriesId;
      option.textContent = series.seriesName;
      seriesSelect.appendChild(option);
    });
  }

  function renderSeriesCards() {
    seriesCardList.innerHTML = "";

    const standaloneBtn = document.createElement("button");
    standaloneBtn.type = "button";
    standaloneBtn.className = `cb-series-card cb-series-card-standalone ${
      selectedSeriesId === null ? "is-selected" : ""
    }`;
    standaloneBtn.innerHTML = `
      <img class="cb-series-card-cover" src="svg_files/bookfinder logo.svg" alt="Standalone book" />
      <div class="cb-series-card-meta">
        <p class="cb-series-card-title">Standalone Book</p>
        <p class="cb-series-card-sub">Not part of a series</p>
      </div>
    `;
    standaloneBtn.addEventListener("click", () => {
      selectedSeriesId = null;
      seriesSelect.value = "";
      renderSeriesCards();
    });
    seriesCardList.appendChild(standaloneBtn);

    allSeries.forEach((series) => {
      const isSelected = selectedSeriesId === Number(series.seriesId);

      const card = document.createElement("button");
      card.type = "button";
      card.className = `cb-series-card ${isSelected ? "is-selected" : ""}`;
      card.innerHTML = `
        <img
          class="cb-series-card-cover"
          src="${series.coverUrl || "svg_files/bookfinder logo.svg"}"
          alt="${series.seriesName ?? "Series"} cover"
        />
        <div class="cb-series-card-meta">
          <p class="cb-series-card-title">${series.seriesName ?? "Untitled Series"}</p>
          <p class="cb-series-card-sub">${series.totalBooks ?? 0} books</p>
        </div>
      `;

      card.addEventListener("click", () => {
        selectedSeriesId = Number(series.seriesId);
        seriesSelect.value = String(series.seriesId);
        renderSeriesCards();
      });

      seriesCardList.appendChild(card);
    });
  }

  function applyBookData(book) {
    currentBookData = book;

    titleInput.value = book.title ?? "";
    descInput.value = book.summary ?? "";

    tags = Array.isArray(book.hashtags)
      ? [...book.hashtags].map((tag) => String(tag).toLowerCase())
      : [];
    renderTags();

    selectedSeriesId = book.seriesId ?? null;
    seriesSelect.value = selectedSeriesId !== null ? String(selectedSeriesId) : "";
    renderSeriesCards();

    const genreIds = Array.isArray(book.genreIds) ? book.genreIds.map(Number) : [];
    if (genreIds.length > 0) {
      prefilledGenreId = genreIds[0];
      categorySelect.value = String(prefilledGenreId);
    }

    if (book.coverUrl) {
      setCoverPreview(book.coverUrl, "Current cover");
    } else {
      setCoverPreview(null);
    }

    statusRow.hidden = false;
    statusBadge.textContent = book.publicationStatus ?? "DRAFT";

    document.title = "BookFinder | Edit Book";
    formTitle.textContent = "Edit Book";
    formSubtitle.textContent = "Update your book details, cover, tags, and series assignment.";
    formNote.textContent = "You can update your draft or published book from here.";
    submitBtn.textContent = "Save Changes →";
  }

  function buildGenreIdsForSubmit() {
    const selectedGenreId = Number(categorySelect.value);
    if (!selectedGenreId) return [];

    const existingGenreIds = Array.isArray(currentBookData?.genreIds)
      ? currentBookData.genreIds.map(Number)
      : [];

    if (
      isEditMode &&
      existingGenreIds.length > 1 &&
      prefilledGenreId !== null &&
      selectedGenreId === Number(prefilledGenreId)
    ) {
      return existingGenreIds;
    }

    return [selectedGenreId];
  }

  function buildPayload({ includeCoverImageKey = false, coverImageKey = null } = {}) {
    const payload = {
      title: titleInput.value.trim(),
      summary: descInput.value.trim(),
      publishDate: isEditMode
        ? (currentBookData?.publishDate ?? getTodayDate())
        : getTodayDate(),
      genreIds: buildGenreIdsForSubmit(),
      hashtags: tags
    };

    if (selectedSeriesId !== null) {
      payload.seriesId = selectedSeriesId;
    }

    if (includeCoverImageKey) {
      payload.coverImageKey = coverImageKey;
    }

    return payload;
  }

  async function loadGenres() {
    const response = await fetch(`${BOOKS_API_BASE}/api/genres`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load genres"));
    }

    const genres = await response.json();
    populateGenres(genres);
  }

  async function loadMySeries() {
    const response = await fetch(`${BOOKS_API_BASE}/api/series/me?page=0&size=100`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load your series"));
    }

    const data = await response.json();
    allSeries = Array.isArray(data) ? data : (data.content ?? []);
    populateSeriesSelect(allSeries);
    renderSeriesCards();
  }

  async function fetchBookDetails(bookId) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/${bookId}/details`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load book details"));
    }

    return response.json();
  }

  async function createBook(payload) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to create book"));
    }

    return response.json();
  }

  async function updateBook(bookId, payload) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/${bookId}/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to update book"));
    }

    return response.json();
  }

  async function removeBookFromSeries(bookId) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/${bookId}/remove-series`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to remove book from series"));
    }

    return response.json();
  }

  async function requestCoverUpload(bookId, file) {
    const safeFileName = slugifyFileName(file.name);
    const fileType = getFileTypeEnum(file);

    if (!fileType) {
      throw new Error("Only PNG and JPEG cover images are supported.");
    }

    const response = await fetch(
      `${BOOKS_API_BASE}/api/books/${bookId}/cover/upload-url?filename=${encodeURIComponent(safeFileName)}&fileType=${fileType}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to request cover upload"));
    }

    return response.json();
  }

  async function uploadFileToPresignedUrl(uploadUrl, file) {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type
      },
      body: file
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to upload file to storage"));
    }
  }

  addTagBtn.addEventListener("click", addTag);

  tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  });

  coverInput.addEventListener("change", () => {
    const file = coverInput.files?.[0];
    selectedFile = file || null;

    if (!file) {
      if (currentBookData?.coverUrl) {
        setCoverPreview(currentBookData.coverUrl, "Current cover");
      } else {
        setCoverPreview(null);
      }
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl, file.name);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const summary = descInput.value.trim();
    const genreIds = buildGenreIdsForSubmit();

    if (!title) {
      alert("Please enter a title.");
      titleInput.focus();
      return;
    }

    if (!summary) {
      alert("Please enter a description.");
      descInput.focus();
      return;
    }

    if (genreIds.length === 0) {
      alert("Please select a category.");
      categorySelect.focus();
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = isEditMode ? "Saving..." : "Creating...";

    try {
      if (isEditMode) {
        let coverImageKey = null;

        if (selectedFile) {
          const uploadData = await requestCoverUpload(bookIdFromUrl, selectedFile);
          const { objectKey, uploadUrl } = uploadData;

          if (!objectKey || !uploadUrl) {
            throw new Error("Cover upload response is missing data.");
          }

          await uploadFileToPresignedUrl(uploadUrl, selectedFile);
          coverImageKey = objectKey;
        }

        const originalSeriesId = currentBookData?.seriesId ?? null;

        if (originalSeriesId !== null && selectedSeriesId === null) {
          await removeBookFromSeries(bookIdFromUrl);
        }

        const payload = buildPayload({
          includeCoverImageKey: !!coverImageKey,
          coverImageKey
        });

        await updateBook(bookIdFromUrl, payload);

        alert("Book updated successfully.");
        window.location.href = "managebooks.html";
        return;
      }

      const createPayload = buildPayload({
        includeCoverImageKey: false
      });

      const createdBook = await createBook(createPayload);

      if (selectedFile) {
        const uploadData = await requestCoverUpload(createdBook.bookId, selectedFile);
        const { objectKey, uploadUrl } = uploadData;

        if (!objectKey || !uploadUrl) {
          throw new Error("Cover upload response is missing data.");
        }

        await uploadFileToPresignedUrl(uploadUrl, selectedFile);

        const updatePayload = buildPayload({
          includeCoverImageKey: true,
          coverImageKey: objectKey
        });

        await updateBook(createdBook.bookId, updatePayload);
      }

      alert("Book created successfully.");
      window.location.href = `writebook.html?bookId=${createdBook.bookId}`;
    } catch (error) {
      console.error(error);
      alert(error.message || (isEditMode ? "Could not update the book." : "Could not create the book."));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  try {
    await Promise.all([loadGenres(), loadMySeries()]);

    if (isEditMode) {
      const book = await fetchBookDetails(bookIdFromUrl);
      applyBookData(book);
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not load the book form.");
  }
});