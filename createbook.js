const BOOKS_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

function getTokenOrRedirect() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in to create or edit a book.");
    window.location.href = "login.html";
    return null;
  }

  return token;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getFileTypeEnum(file) {
  if (file.type === "image/png") return "PNG";
  if (file.type === "image/jpeg") return "JPEG";
  return null;
}

function parseErrorText(text, fallback) {
  return text && text.trim() ? text : fallback;
}

function normalizeSeriesId(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("bookForm");
  const coverInput = document.getElementById("bookCoverInput");
  const coverName = document.getElementById("bookCoverName");
  const coverPreview = document.getElementById("bookCoverPreview");
  const coverPlaceholder = document.getElementById("bookCoverPlaceholder");
  const categorySelect = document.getElementById("category");
  const seriesSelect = document.getElementById("series");
  const seriesCardList = document.getElementById("seriesCardList");
  const tagInput = document.getElementById("tagInput");
  const addTagBtn = document.getElementById("addTagBtn");
  const tagList = document.getElementById("tagList");

  const formTitle = document.getElementById("bookFormTitle");
  const formSubtitle = document.getElementById("bookFormSubtitle");
  const formNote = document.getElementById("bookFormNote");
  const submitBtn = document.getElementById("bookSubmitBtn");
  const statusRow = document.getElementById("bookStatusRow");
  const statusBadge = document.getElementById("bookStatusBadge");

  if (!form) {
    console.error("Book form not found");
    return;
  }

  const token = getTokenOrRedirect();
  if (!token) return;

  const params = new URLSearchParams(window.location.search);
  const bookIdFromUrl = params.get("bookId");
  const isEditMode = !!bookIdFromUrl;

  let allGenres = [];
  let allSeries = [];
  let currentBookData = null;
  let existingPublishDate = getTodayDate();
  let existingCoverUrl = null;
  let originalSeriesId = null;
  let selectedSeriesId = null;

  const tagSet = new Set();

  function setModeUI() {
    if (isEditMode) {
      document.title = "BookFinder | Edit Book";
      formTitle.textContent = "Edit Book";
      formSubtitle.textContent = "Update your book details, cover, tags, and series assignment.";
      formNote.textContent = "You can save changes here and publish or unpublish from Manage Books.";
      submitBtn.textContent = "Save Changes →";
    } else {
      document.title = "BookFinder | Create a Book";
      formTitle.textContent = "Book Details";
      formSubtitle.textContent = "Create a new book draft and organize it however you want.";
      formNote.textContent = "Books are created as drafts first. You can publish them after creation.";
      submitBtn.textContent = "Create Book →";
    }
  }

  function renderTags() {
    tagList.innerHTML = "";

    [...tagSet].forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "cb-chip";

      const text = document.createElement("span");
      text.textContent = tag;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "cb-chip-remove";
      removeBtn.setAttribute("aria-label", `Remove tag ${tag}`);
      removeBtn.textContent = "×";

      removeBtn.addEventListener("click", () => {
        tagSet.delete(tag);
        renderTags();
      });

      chip.appendChild(text);
      chip.appendChild(removeBtn);
      tagList.appendChild(chip);
    });
  }

  function addTag(rawValue) {
    const cleaned = rawValue.trim().replace(/^#/, "").toLowerCase();

    if (!cleaned) return;

    tagSet.add(cleaned);
    tagInput.value = "";
    renderTags();
  }

  function setStatusBadge(publicationStatus) {
    if (!publicationStatus) {
      statusRow.hidden = true;
      return;
    }

    statusRow.hidden = false;
    statusBadge.textContent = publicationStatus;
    statusBadge.className =
      publicationStatus === "PUBLISHED"
        ? "cb-status-badge cb-status-published"
        : "cb-status-badge cb-status-draft";
  }

  function showCover(url, labelText = "") {
    if (!url) {
      coverPreview.src = "";
      coverPreview.style.display = "none";
      coverPlaceholder.style.display = "flex";
      coverName.textContent = "";
      return;
    }

    coverPreview.src = url;
    coverPreview.style.display = "block";
    coverPlaceholder.style.display = "none";
    coverName.textContent = labelText;
  }

  function setupCoverPreview() {
    if (!coverInput) return;

    coverInput.addEventListener("change", () => {
      const file = coverInput.files[0];

      if (!file) {
        if (existingCoverUrl) {
          showCover(existingCoverUrl, "Current cover");
        } else {
          showCover(null);
        }
        return;
      }

      coverName.textContent = file.name;

      const previewUrl = URL.createObjectURL(file);
      showCover(previewUrl, file.name);
    });
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
    seriesSelect.innerHTML = `<option value="">Standalone book</option>`;

    seriesList.forEach((series) => {
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
    standaloneBtn.className = `cb-series-card cb-series-card-standalone ${selectedSeriesId === null ? "is-selected" : ""}`;
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

  async function loadGenres() {
    const response = await fetch(`${BOOKS_API_BASE}/api/genres`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load genres"));
    }

    const genres = await response.json();
    allGenres = genres;
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
      throw new Error(parseErrorText(errorText, "Could not load your series"));
    }

    const data = await response.json();
    const seriesList = data.content ?? [];

    allSeries = seriesList;
    populateSeriesSelect(seriesList);
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
      throw new Error(parseErrorText(errorText, "Could not load book details"));
    }

    return response.json();
  }

  function applyBookData(book) {
    currentBookData = book;

    document.getElementById("title").value = book.title ?? "";
    document.getElementById("desc").value = book.summary ?? "";

    existingPublishDate = book.publishDate ?? getTodayDate();
    existingCoverUrl = book.coverUrl ?? null;
    originalSeriesId = normalizeSeriesId(book.seriesId);
    selectedSeriesId = normalizeSeriesId(book.seriesId);

    if (book.genreIds && book.genreIds.length > 0) {
      categorySelect.value = String(book.genreIds[0]);
    } else if (book.genres && book.genres.length > 0) {
      const matchingGenre = allGenres.find(
        (genre) => genre.genreName === book.genres[0]
      );
      if (matchingGenre) {
        categorySelect.value = String(matchingGenre.genreId);
      }
    }

    tagSet.clear();
    (book.hashtags ?? []).forEach((tag) => tagSet.add(String(tag).toLowerCase()));
    renderTags();

    seriesSelect.value = selectedSeriesId !== null ? String(selectedSeriesId) : "";
    renderSeriesCards();

    if (existingCoverUrl) {
      showCover(existingCoverUrl, "Current cover");
    } else {
      showCover(null);
    }

    setStatusBadge(book.publicationStatus);
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

  async function getBookCoverUploadData(bookId, selectedFile) {
    const fileType = getFileTypeEnum(selectedFile);

    if (!fileType) {
      throw new Error("Only PNG or JPEG images are allowed.");
    }

    const response = await fetch(
      `${BOOKS_API_BASE}/api/books/${bookId}/cover/upload-url?filename=${encodeURIComponent(selectedFile.name)}&fileType=${fileType}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to get upload URL"));
    }

    return response.json();
  }

  async function uploadCoverToS3(uploadUrl, selectedFile) {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": selectedFile.type
      },
      body: selectedFile
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to upload cover to S3"));
    }
  }

  async function updateBookCoverKey(bookId, objectKey) {
    return updateBook(bookId, {
      coverImageKey: objectKey
    });
  }

  async function assignBookToSeries(bookId, seriesId) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/${bookId}/assign-series/${seriesId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to assign book to series"));
    }
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
  }

  async function syncSeriesAssignment(bookId) {
    const original = normalizeSeriesId(originalSeriesId);
    const selected = normalizeSeriesId(selectedSeriesId);

    if (original === selected) {
      return;
    }

    if (selected === null) {
      await removeBookFromSeries(bookId);
    } else {
      await assignBookToSeries(bookId, selected);
    }

    originalSeriesId = selected;
  }

  function buildBasePayload() {
    const title = document.getElementById("title").value.trim();
    const summary = document.getElementById("desc").value.trim();
    const genreId = categorySelect.value;

    if (tagInput.value.trim()) {
      addTag(tagInput.value);
    }

    if (!title) {
      throw new Error("Book title is required.");
    }

    if (!summary) {
      throw new Error("Book description is required.");
    }

    if (!genreId) {
      throw new Error("Please select a category.");
    }

    return {
      title,
      summary,
      publishDate: existingPublishDate || getTodayDate(),
      genreIds: [parseInt(genreId, 10)],
      hashtags: [...tagSet]
    };
  }

  addTagBtn.addEventListener("click", () => {
    addTag(tagInput.value);
  });

  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput.value);
    }
  });

  setModeUI();
  setupCoverPreview();

  try {
    await Promise.all([loadGenres(), loadMySeries()]);

    if (isEditMode) {
      const bookDetails = await fetchBookDetails(bookIdFromUrl);
      applyBookData(bookDetails);
    }
  } catch (error) {
    console.error("Error loading form data:", error);
    alert(error.message || "Could not load the book form.");
    if (isEditMode) {
      window.location.href = "managebooks.html";
    }
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      submitBtn.disabled = true;

      const basePayload = buildBasePayload();
      const selectedFile =
        coverInput && coverInput.files.length > 0
          ? coverInput.files[0]
          : null;

      if (!isEditMode) {
        const createPayload = {
          ...basePayload,
          publishDate: getTodayDate(),
          seriesId: selectedSeriesId,
          coverImageKey: null
        };

        const createdBook = await createBook(createPayload);
        const bookId = createdBook.bookId ?? createdBook.id;

        if (!bookId) {
          throw new Error("Book was created, but no book ID was returned.");
        }

        if (selectedFile) {
          const uploadData = await getBookCoverUploadData(bookId, selectedFile);
          const { objectKey, uploadUrl } = uploadData;

          if (!objectKey || !uploadUrl) {
            throw new Error("Upload URL response is missing data.");
          }

          await uploadCoverToS3(uploadUrl, selectedFile);
          await updateBookCoverKey(bookId, objectKey);
        }

        alert("Book created successfully!");
        window.location.href = "managebooks.html";
        return;
      }

      const updatePayload = {
        ...basePayload
      };

      if (selectedFile) {
        const uploadData = await getBookCoverUploadData(bookIdFromUrl, selectedFile);
        const { objectKey, uploadUrl } = uploadData;

        if (!objectKey || !uploadUrl) {
          throw new Error("Upload URL response is missing data.");
        }

        await uploadCoverToS3(uploadUrl, selectedFile);
        updatePayload.coverImageKey = objectKey;
      }

      await updateBook(bookIdFromUrl, updatePayload);
      await syncSeriesAssignment(bookIdFromUrl);

      alert("Book updated successfully!");
      window.location.href = "managebooks.html";
    } catch (error) {
      console.error("Error saving book:", error);
      alert(error.message || "Error saving book");
    } finally {
      submitBtn.disabled = false;
    }
  });
});