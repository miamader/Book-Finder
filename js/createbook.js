const BOOKS_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

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

  let selectedFile = null;
  let tags = [];
  let allSeries = [];
  let selectedSeriesId = null;

  function getImageFormat(file) {
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
    const value = tagInput.value.trim().replace(/^#/, "");

    if (!value) return;
    if (tags.includes(value)) {
      tagInput.value = "";
      return;
    }

    tags.push(value);
    tagInput.value = "";
    renderTags();
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
      coverPreview.style.display = "none";
      coverPreview.removeAttribute("src");
      coverPlaceholder.style.display = "flex";
      coverName.textContent = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    coverPreview.src = objectUrl;
    coverPreview.style.display = "block";
    coverPlaceholder.style.display = "none";
    coverName.textContent = file.name;
  });

  function parseErrorText(text, fallbackMessage) {
    if (!text) return fallbackMessage;

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "string") return parsed;
      if (parsed.message) return parsed.message;
      return fallbackMessage;
    } catch {
      return text;
    }
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
    populateGenres(genres);
  }

  async function loadMySeries() {
    const response = await fetch(`${BOOKS_API_BASE}/api/series/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load your series"));
    }

    allSeries = await response.json();
    populateSeriesSelect(allSeries);
    renderSeriesCards();
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

  async function createBook(payload) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books`, {
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

  async function requestCoverUpload(bookId, file) {
    const safeFileName = slugifyFileName(file.name);
    const imageFormat = getImageFormat(file);

    if (!imageFormat) {
      throw new Error("Only PNG and JPEG cover images are supported.");
    }

    const response = await fetch(`${BOOKS_API_BASE}/api/books/${bookId}/cover-upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fileName: safeFileName,
        imageFormat
      })
    });

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

  async function updateBookCover(bookId, coverImageKey) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/${bookId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        genreIds: [Number(categorySelect.value)],
        hashtagNames: tags,
        seriesId: selectedSeriesId,
        coverImageKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to save cover image"));
    }

    return response.json();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const genreId = Number(categorySelect.value);

    if (!title) {
      alert("Please enter a title.");
      titleInput.focus();
      return;
    }

    if (!description) {
      alert("Please enter a description.");
      descInput.focus();
      return;
    }

    if (!genreId) {
      alert("Please select a category.");
      categorySelect.focus();
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Creating...";

    try {
      const createdBook = await createBook({
        title,
        description,
        genreIds: [genreId],
        hashtagNames: tags,
        seriesId: selectedSeriesId
      });

      if (selectedFile) {
        const uploadData = await requestCoverUpload(createdBook.bookId, selectedFile);
        await uploadFileToPresignedUrl(uploadData.uploadUrl, selectedFile);
        await updateBookCover(createdBook.bookId, uploadData.coverImageKey);
      }

      alert("Book created successfully.");
      window.location.href = `writebook.html?bookId=${createdBook.bookId}`;
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not create the book.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  try {
    await Promise.all([loadGenres(), loadMySeries()]);
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not load the create book form.");
  }
});