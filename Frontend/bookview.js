const BOOKS_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

function getTokenOrRedirect() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You must be logged in to create a book.");
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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookForm");
  const coverInput = document.getElementById("bookCoverInput");
  const coverName = document.getElementById("bookCoverName");
  const coverPreview = document.getElementById("bookCoverPreview");
  const coverPlaceholder = document.getElementById("bookCoverPlaceholder");
  const categorySelect = document.getElementById("category");
  const seriesSelect = document.getElementById("series");
  const tagInput = document.getElementById("tagInput");
  const addTagBtn = document.getElementById("addTagBtn");
  const tagList = document.getElementById("tagList");

  if (!form) {
    console.error("Book form not found");
    return;
  }

  const tagSet = new Set();

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

  async function loadGenres() {
    try {
      const response = await fetch(`${BOOKS_API_BASE}/api/genres`);
      if (!response.ok) {
        throw new Error("Failed to load genres");
      }

      const genres = await response.json();
      genres.forEach((genre) => {
        const option = document.createElement("option");
        option.value = genre.genreId;
        option.textContent = genre.genreName;
        categorySelect.appendChild(option);
      });
    } catch (error) {
      console.error("Could not load genres:", error);
      alert("Could not load genres for the book form.");
    }
  }

  async function loadMySeries() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${BOOKS_API_BASE}/api/series/me?page=0&size=100`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.warn("Could not load user series");
        return;
      }

      const data = await response.json();
      const seriesList = data.content ?? [];

      seriesList.forEach((series) => {
        const option = document.createElement("option");
        option.value = series.seriesId;
        option.textContent = series.seriesName;
        seriesSelect.appendChild(option);
      });
    } catch (error) {
      console.warn("Could not load series:", error);
    }
  }

  function setupCoverPreview() {
    if (!coverInput) return;

    coverInput.addEventListener("change", () => {
      const file = coverInput.files[0];

      if (!file) {
        coverName.textContent = "";
        coverPreview.src = "";
        coverPreview.style.display = "none";
        coverPlaceholder.style.display = "flex";
        return;
      }

      coverName.textContent = file.name;
      const previewUrl = URL.createObjectURL(file);
      coverPreview.src = previewUrl;
      coverPreview.style.display = "block";
      coverPlaceholder.style.display = "none";
    });
  }

  async function createBook(payload, token) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to create book"));
    }

    return response.json();
  }

  async function getBookCoverUploadData(bookId, selectedFile, token) {
    const fileType = getFileTypeEnum(selectedFile);
    if (!fileType) {
      throw new Error("Only PNG or JPEG images are allowed.");
    }

    const response = await fetch(
      `${BOOKS_API_BASE}/api/books/${bookId}/cover/upload-url?filename=${encodeURIComponent(selectedFile.name)}&fileType=${fileType}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
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

  async function updateBookCoverKey(bookId, objectKey, token) {
    const response = await fetch(`${BOOKS_API_BASE}/api/books/${bookId}/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        coverImageKey: objectKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Cover uploaded, but failed to save it in the book"));
    }

    return response.json();
  }

  addTagBtn.addEventListener("click", () => addTag(tagInput.value));

  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput.value);
    }
  });

  setupCoverPreview();
  loadGenres();
  loadMySeries();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = getTokenOrRedirect();
    if (!token) return;

    if (tagInput.value.trim()) {
      addTag(tagInput.value);
    }

    const title = document.getElementById("title").value.trim();
    const summary = document.getElementById("desc").value.trim();
    const genreId = categorySelect.value;
    const seriesId = seriesSelect.value;
    const selectedFile = coverInput && coverInput.files.length > 0 ? coverInput.files[0] : null;

    if (!title) {
      alert("Book title is required.");
      return;
    }

    if (!summary) {
      alert("Book description is required.");
      return;
    }

    if (!genreId) {
      alert("Please select a category.");
      return;
    }

    const createPayload = {
      title,
      summary,
      publishDate: getTodayDate(),
      seriesId: seriesId ? parseInt(seriesId, 10) : null,
      genreIds: [parseInt(genreId, 10)],
      hashtags: [...tagSet],
      coverImageKey: null
    };

    try {
      const createdBook = await createBook(createPayload, token);
      const bookId = createdBook.bookId ?? createdBook.id;

      if (!bookId) {
        throw new Error("Book was created, but no book ID was returned.");
      }

      if (selectedFile) {
        const uploadData = await getBookCoverUploadData(bookId, selectedFile, token);
        const { objectKey, uploadUrl } = uploadData;

        if (!objectKey || !uploadUrl) {
          throw new Error("Upload URL response is missing data.");
        }

        await uploadCoverToS3(uploadUrl, selectedFile);
        await updateBookCoverKey(bookId, objectKey, token);
      }

      alert("Book created successfully!");
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Error creating book:", error);
      alert(error.message || "Error creating book");
    }
  });
});