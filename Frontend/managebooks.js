const MANAGE_BOOKS_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

function getTokenOrRedirect() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in to manage your books.");
    window.location.href = "login.html";
    return null;
  }

  return token;
}

function parseErrorText(text, fallback) {
  return text && text.trim() ? text : fallback;
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString();
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = getTokenOrRedirect();
  if (!token) return;

  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const seriesFilter = document.getElementById("seriesFilter");
  const booksGrid = document.getElementById("booksGrid");
  const booksEmpty = document.getElementById("booksEmpty");
  const booksSummary = document.getElementById("booksSummary");

  const statTotal = document.getElementById("statTotal");
  const statDrafts = document.getElementById("statDrafts");
  const statPublished = document.getElementById("statPublished");
  const statStandalone = document.getElementById("statStandalone");

  let allBooks = [];

  async function fetchMyBooks() {
    const response = await fetch(`${MANAGE_BOOKS_API_BASE}/api/books/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load your books"));
    }

    return response.json();
  }

  async function togglePublishStatus(book) {
    const endpoint =
      book.publicationStatus === "PUBLISHED"
        ? `/api/books/${book.bookId}/unpublish`
        : `/api/books/${book.bookId}/publish`;

    const response = await fetch(`${MANAGE_BOOKS_API_BASE}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to update book status"));
    }
  }

  function updateStats(books) {
    const draftCount = books.filter((book) => book.publicationStatus === "DRAFT").length;
    const publishedCount = books.filter((book) => book.publicationStatus === "PUBLISHED").length;
    const standaloneCount = books.filter((book) => !book.seriesName).length;

    statTotal.textContent = books.length;
    statDrafts.textContent = draftCount;
    statPublished.textContent = publishedCount;
    statStandalone.textContent = standaloneCount;
  }

  function populateSeriesFilter(books) {
    const currentValue = seriesFilter.value;
    const uniqueSeries = [...new Set(
      books
        .map((book) => book.seriesName)
        .filter((name) => !!name)
    )].sort((a, b) => a.localeCompare(b));

    seriesFilter.innerHTML = `
      <option value="ALL">All Series</option>
      <option value="STANDALONE">Standalone Only</option>
    `;

    uniqueSeries.forEach((seriesName) => {
      const option = document.createElement("option");
      option.value = seriesName;
      option.textContent = seriesName;
      seriesFilter.appendChild(option);
    });

    const canRestore = [...seriesFilter.options].some((option) => option.value === currentValue);
    seriesFilter.value = canRestore ? currentValue : "ALL";
  }

  function getFilteredBooks() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const statusValue = statusFilter.value;
    const seriesValue = seriesFilter.value;

    return [...allBooks]
      .filter((book) => {
        if (!searchValue) return true;

        return (book.title ?? "").toLowerCase().includes(searchValue);
      })
      .filter((book) => {
        if (statusValue === "ALL") return true;
        return book.publicationStatus === statusValue;
      })
      .filter((book) => {
        if (seriesValue === "ALL") return true;
        if (seriesValue === "STANDALONE") return !book.seriesName;
        return book.seriesName === seriesValue;
      })
      .sort((a, b) => {
        const dateA = a.publishDate ? new Date(`${a.publishDate}T00:00:00`).getTime() : 0;
        const dateB = b.publishDate ? new Date(`${b.publishDate}T00:00:00`).getTime() : 0;

        if (dateB !== dateA) return dateB - dateA;
        return (a.title ?? "").localeCompare(b.title ?? "");
      });
  }

  function renderBooks() {
    const filteredBooks = getFilteredBooks();

    booksGrid.innerHTML = "";

    booksSummary.textContent = `Showing ${filteredBooks.length} of ${allBooks.length} books.`;

    if (filteredBooks.length === 0) {
      booksEmpty.hidden = false;
      booksGrid.hidden = true;
      return;
    }

    booksEmpty.hidden = true;
    booksGrid.hidden = false;

    filteredBooks.forEach((book) => {
      const card = document.createElement("article");
      card.className = "mb-card";

      const coverWrap = document.createElement("div");
      coverWrap.className = "mb-cover-wrap";

      const cover = document.createElement("img");
      cover.className = "mb-cover";
      cover.alt = `${book.title ?? "Book"} cover`;
      cover.src = book.coverUrl || "svg_files/bookfinder logo.svg";

      coverWrap.appendChild(cover);

      const body = document.createElement("div");
      body.className = "mb-card-body";

      const top = document.createElement("div");
      top.className = "mb-card-top";

      const title = document.createElement("h3");
      title.className = "mb-book-title";
      title.textContent = book.title ?? "Untitled Book";

      const status = document.createElement("span");
      status.className =
        book.publicationStatus === "PUBLISHED"
          ? "mb-status mb-status-published"
          : "mb-status mb-status-draft";
      status.textContent = book.publicationStatus ?? "DRAFT";

      top.appendChild(title);
      top.appendChild(status);

      const meta = document.createElement("div");
      meta.className = "mb-meta";

      const publishDate = document.createElement("p");
      publishDate.className = "mb-meta-row";
      publishDate.innerHTML = `<span class="mb-meta-label">Date:</span> ${formatDate(book.publishDate)}`;

      const series = document.createElement("p");
      series.className = "mb-meta-row";
      series.innerHTML = `<span class="mb-meta-label">Series:</span> ${book.seriesName || "Standalone"}`;

      meta.appendChild(publishDate);
      meta.appendChild(series);

      if (book.volumeNumber !== null && book.volumeNumber !== undefined) {
        const volume = document.createElement("span");
        volume.className = "mb-volume";
        volume.textContent = `Volume ${book.volumeNumber}`;
        meta.appendChild(volume);
      }

      const actions = document.createElement("div");
      actions.className = "mb-actions";

      const editLink = document.createElement("a");
      editLink.className = "mb-btn mb-btn-primary";
      editLink.href = `createbook.html?bookId=${book.bookId}`;
      editLink.textContent = "Edit";

      const publishBtn = document.createElement("button");
      publishBtn.type = "button";
      publishBtn.className = "mb-btn mb-btn-secondary";
      publishBtn.textContent =
        book.publicationStatus === "PUBLISHED" ? "Unpublish" : "Publish";

      publishBtn.addEventListener("click", async () => {
        try {
          publishBtn.disabled = true;
          await togglePublishStatus(book);
          await loadBooks();
        } catch (error) {
          console.error("Could not update publish status:", error);
          alert(error.message || "Could not update the book status.");
        } finally {
          publishBtn.disabled = false;
        }
      });

      actions.appendChild(editLink);
      actions.appendChild(publishBtn);

      body.appendChild(top);
      body.appendChild(meta);
      body.appendChild(actions);

      card.appendChild(coverWrap);
      card.appendChild(body);

      booksGrid.appendChild(card);
    });
  }

  async function loadBooks() {
    try {
      booksSummary.textContent = "Loading books...";
      allBooks = await fetchMyBooks();
      updateStats(allBooks);
      populateSeriesFilter(allBooks);
      renderBooks();
    } catch (error) {
      console.error("Could not load books:", error);
      booksGrid.innerHTML = "";
      booksGrid.hidden = true;
      booksEmpty.hidden = false;
      booksSummary.textContent = "Could not load books.";
      booksEmpty.innerHTML = `
        <p class="mb-empty-title">Something went wrong</p>
        <p class="mb-empty-text">${error.message || "Could not load your books."}</p>
        <a class="mb-empty-btn" href="createbook.html">Create Book</a>
      `;
    }
  }

  searchInput.addEventListener("input", renderBooks);
  statusFilter.addEventListener("change", renderBooks);
  seriesFilter.addEventListener("change", renderBooks);

  await loadBooks();
});