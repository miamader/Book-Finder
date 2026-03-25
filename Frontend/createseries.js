const SERIES_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

function getTokenOrRedirect() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in to manage a series.");
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

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("seriesForm");
  const coverInput = document.getElementById("seriesCoverInput");
  const coverName = document.getElementById("seriesCoverName");
  const coverPreview = document.getElementById("seriesCoverPreview");
  const coverPlaceholder = document.getElementById("seriesCoverPlaceholder");
  const seriesNameInput = document.getElementById("seriesName");
  const seriesDescInput = document.getElementById("seriesDesc");
  const formTitle = document.getElementById("seriesFormTitle");
  const submitBtn = document.getElementById("seriesSubmitBtn");
  const booksHelper = document.getElementById("seriesBooksHelper");
  const booksList = document.getElementById("seriesBooksList");
  const booksActions = document.getElementById("seriesBooksActions");
  const toggleAddBooksBtn = document.getElementById("toggleAddBooksBtn");
  const standaloneBooksPanel = document.getElementById("standaloneBooksPanel");
  const standaloneBooksList = document.getElementById("standaloneBooksList");

  if (!form) {
    console.error("Series form not found");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const seriesIdFromUrl = params.get("seriesId");
  const isEditMode = !!seriesIdFromUrl;

  let currentSeriesData = null;

  function setModeUI() {
    if (isEditMode) {
      document.title = "BookFinder | Edit Series";
      formTitle.textContent = "Edit Series";
      submitBtn.textContent = "Save Changes →";
      booksActions.hidden = false;
    } else {
      document.title = "BookFinder | Create a Series";
      formTitle.textContent = "Create Series";
      submitBtn.textContent = "Create Series →";
      setBooksSectionCreateMode();
    }
  }

  function showExistingCover(coverUrl) {
    if (!coverUrl) {
      coverPreview.src = "";
      coverPreview.style.display = "none";
      coverPlaceholder.style.display = "flex";
      coverName.textContent = "";
      return;
    }

    coverPreview.src = coverUrl;
    coverPreview.style.display = "block";
    coverPlaceholder.style.display = "none";
    coverName.textContent = "Current cover";
  }

  function setBooksSectionCreateMode() {
    booksHelper.textContent = "Save the series first to manage books.";
    booksHelper.hidden = false;
    booksList.hidden = true;
    booksList.innerHTML = "";
    booksActions.hidden = true;
    standaloneBooksPanel.hidden = true;
    standaloneBooksList.innerHTML = "";
  }

  function renderSeriesBooks(books) {
    booksList.innerHTML = "";

    if (!books || books.length === 0) {
      booksHelper.textContent = "This series does not have books yet.";
      booksHelper.hidden = false;
      booksList.hidden = true;
      booksActions.hidden = false;
      return;
    }

    booksHelper.hidden = true;
    booksList.hidden = false;
    booksActions.hidden = false;

    books.forEach((book) => {
      const card = document.createElement("div");
      card.className = "series-book-card";

      const left = document.createElement("div");
      left.className = "series-book-left";

      const cover = document.createElement("img");
      cover.className = "series-book-cover";
      cover.alt = `${book.title ?? "Book"} cover`;
      cover.src = book.coverUrl || "svg_files/bookfinder logo.svg";

      const meta = document.createElement("div");
      meta.className = "series-book-meta";

      const title = document.createElement("p");
      title.className = "series-book-title";
      title.textContent = book.title ?? "Untitled Book";

      const sub = document.createElement("p");
      sub.className = "series-book-sub";

      const volumeText =
        book.volumeNumber !== null && book.volumeNumber !== undefined
          ? `Volume ${book.volumeNumber}`
          : "No volume assigned";

      sub.textContent = volumeText;

      meta.appendChild(title);
      meta.appendChild(sub);

      left.appendChild(cover);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "series-book-right";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "series-book-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", async () => {
        await handleRemoveBookFromSeries(book.bookId);
      });

      right.appendChild(removeBtn);

      card.appendChild(left);
      card.appendChild(right);

      booksList.appendChild(card);
    });
  }

  function renderStandaloneBooks(books) {
    standaloneBooksList.innerHTML = "";

    if (!books || books.length === 0) {
      standaloneBooksList.innerHTML = `<p class="cb-note">You do not have standalone books available.</p>`;
      return;
    }

    books.forEach((book) => {
      const card = document.createElement("div");
      card.className = "series-book-card";

      const left = document.createElement("div");
      left.className = "series-book-left";

      const cover = document.createElement("img");
      cover.className = "series-book-cover";
      cover.alt = `${book.title ?? "Book"} cover`;
      cover.src = book.coverUrl || "svg_files/bookfinder logo.svg";

      const meta = document.createElement("div");
      meta.className = "series-book-meta";

      const title = document.createElement("p");
      title.className = "series-book-title";
      title.textContent = book.title ?? "Untitled Book";

      const sub = document.createElement("p");
      sub.className = "series-book-sub";
      sub.textContent = book.publicationStatus || "Draft";

      meta.appendChild(title);
      meta.appendChild(sub);

      left.appendChild(cover);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "series-book-right";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "series-book-btn series-book-btn-secondary";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", async () => {
        await handleAddBookToSeries(book.bookId);
      });

      right.appendChild(addBtn);

      card.appendChild(left);
      card.appendChild(right);

      standaloneBooksList.appendChild(card);
    });
  }

  async function fetchSeriesDetails(seriesId, token) {
    const response = await fetch(`${SERIES_API_BASE}/api/series/${seriesId}/details`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load series details"));
    }

    return response.json();
  }

  async function fetchStandaloneBooks(token) {
    const response = await fetch(`${SERIES_API_BASE}/api/books/me/standalone`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load standalone books"));
    }

    return response.json();
  }

  async function createSeries(payload, token) {
    const response = await fetch(`${SERIES_API_BASE}/api/series/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to create series"));
    }

    return response.json();
  }

  async function updateSeries(seriesId, payload, token) {
    const response = await fetch(`${SERIES_API_BASE}/api/series/${seriesId}/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to update series"));
    }

    return response.json();
  }

  async function getSeriesCoverUploadData(seriesId, selectedFile, token) {
    const fileType = getFileTypeEnum(selectedFile);

    if (!fileType) {
      throw new Error("Only PNG or JPEG images are allowed.");
    }

    const response = await fetch(
      `${SERIES_API_BASE}/api/series/${seriesId}/cover/upload-url?filename=${encodeURIComponent(selectedFile.name)}&fileType=${fileType}`,
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

  async function refreshSeriesBooks(token) {
    currentSeriesData = await fetchSeriesDetails(seriesIdFromUrl, token);
    renderSeriesBooks(currentSeriesData.booksInSeries ?? []);
  }

  async function refreshStandaloneBooks(token) {
    const standaloneBooks = await fetchStandaloneBooks(token);
    renderStandaloneBooks(standaloneBooks);
  }

  async function handleAddBookToSeries(bookId) {
    const token = getTokenOrRedirect();
    if (!token) return;

    try {
      const response = await fetch(
        `${SERIES_API_BASE}/api/books/${bookId}/assign-series/${seriesIdFromUrl}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(parseErrorText(errorText, "Failed to add book to series"));
      }

      await refreshSeriesBooks(token);
      await refreshStandaloneBooks(token);
    } catch (error) {
      console.error("Error adding book to series:", error);
      alert(error.message || "Could not add book to series.");
    }
  }

  async function handleRemoveBookFromSeries(bookId) {
    const token = getTokenOrRedirect();
    if (!token) return;

    try {
      const response = await fetch(
        `${SERIES_API_BASE}/api/books/${bookId}/remove-series`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(parseErrorText(errorText, "Failed to remove book from series"));
      }

      await refreshSeriesBooks(token);
      await refreshStandaloneBooks(token);
    } catch (error) {
      console.error("Error removing book from series:", error);
      alert(error.message || "Could not remove book from series.");
    }
  }

  function setupCoverPreview() {
    if (!coverInput) return;

    coverInput.addEventListener("change", () => {
      const file = coverInput.files[0];

      if (!file) {
        if (currentSeriesData?.coverUrl) {
          showExistingCover(currentSeriesData.coverUrl);
        } else {
          coverName.textContent = "";
          coverPreview.src = "";
          coverPreview.style.display = "none";
          coverPlaceholder.style.display = "flex";
        }
        return;
      }

      coverName.textContent = file.name;

      const previewUrl = URL.createObjectURL(file);
      coverPreview.src = previewUrl;
      coverPreview.style.display = "block";
      coverPlaceholder.style.display = "none";
    });
  }

  setModeUI();
  setupCoverPreview();

  if (isEditMode) {
    const token = getTokenOrRedirect();
    if (!token) return;

    try {
      currentSeriesData = await fetchSeriesDetails(seriesIdFromUrl, token);

      seriesNameInput.value = currentSeriesData.seriesName ?? "";
      seriesDescInput.value = currentSeriesData.seriesDescription ?? "";

      if (currentSeriesData.coverUrl) {
        showExistingCover(currentSeriesData.coverUrl);
      }

      renderSeriesBooks(currentSeriesData.booksInSeries ?? []);
      await refreshStandaloneBooks(token);
    } catch (error) {
      console.error("Could not load series data:", error);
      alert(error.message || "Could not load series data.");
    }
  }

  if (toggleAddBooksBtn) {
    toggleAddBooksBtn.addEventListener("click", async () => {
      const token = getTokenOrRedirect();
      if (!token || !isEditMode) return;

      const willShow = standaloneBooksPanel.hidden;
      standaloneBooksPanel.hidden = !willShow;

      if (willShow) {
        try {
          await refreshStandaloneBooks(token);
        } catch (error) {
          console.error("Could not refresh standalone books:", error);
          alert(error.message || "Could not load standalone books.");
        }
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = getTokenOrRedirect();
    if (!token) return;

    const seriesName = seriesNameInput.value.trim();
    const description = seriesDescInput.value.trim();
    const selectedFile = coverInput && coverInput.files.length > 0 ? coverInput.files[0] : null;

    if (!seriesName) {
      alert("Series name is required.");
      return;
    }

    try {
      const basePayload = {
        seriesName,
        description
      };

      let seriesId = seriesIdFromUrl;

      if (isEditMode) {
        basePayload.publishDate = currentSeriesData?.publishDate ?? getTodayDate();
      } else {
        const createPayload = {
          ...basePayload,
          publishDate: getTodayDate(),
          coverImageKey: null
        };

        const createdSeries = await createSeries(createPayload, token);
        seriesId = createdSeries.seriesId ?? createdSeries.id;

        if (!seriesId) {
          throw new Error("Series was created, but the ID was not returned correctly.");
        }

        if (!selectedFile) {
          alert("Series created successfully!");
          window.location.href = `createseries.html?seriesId=${seriesId}`;
          return;
        }
      }

      if (selectedFile) {
        const uploadData = await getSeriesCoverUploadData(seriesId, selectedFile, token);
        const { objectKey, uploadUrl } = uploadData;

        if (!objectKey || !uploadUrl) {
          throw new Error("Upload URL response is missing data.");
        }

        await uploadCoverToS3(uploadUrl, selectedFile);
        basePayload.coverImageKey = objectKey;
      }

      if (!basePayload.publishDate) {
        basePayload.publishDate = currentSeriesData?.publishDate ?? getTodayDate();
      }

      await updateSeries(seriesId, basePayload, token);

      if (isEditMode) {
        await refreshSeriesBooks(token);
        await refreshStandaloneBooks(token);

        if (selectedFile) {
          currentSeriesData = await fetchSeriesDetails(seriesId, token);
          if (currentSeriesData.coverUrl) {
            showExistingCover(currentSeriesData.coverUrl);
          }
        }

        alert("Series updated successfully!");
      } else {
        alert("Series created successfully!");
        window.location.href = `createseries.html?seriesId=${seriesId}`;
      }
    } catch (error) {
      console.error("Error saving series:", error);
      alert(error.message || "Error saving series.");
    }
  });
});