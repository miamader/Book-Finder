const DASHBOARD_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const currentlyReadingTitle = document.getElementById("currentlyReadingTitle");
  const currentlyReadingList = document.getElementById("currentlyReadingList");
  const currentlyReadingEmpty = document.getElementById("currentlyReadingEmpty");

  const publishedBooksTitle = document.getElementById("publishedBooksTitle");
  const publishedBooksList = document.getElementById("publishedBooksList");
  const publishedBooksEmpty = document.getElementById("publishedBooksEmpty");

  const topRatedBtn = document.getElementById("topRatedBtn");
  const authorDiscoveryBtn = document.getElementById("authorDiscoveryBtn");
  const genreDiscoveryBtn = document.getElementById("genreDiscoveryBtn");
  const authorDiscoveryText = document.getElementById("authorDiscoveryText");
  const genreDiscoveryText = document.getElementById("genreDiscoveryText");

  let latestReadingBook = null;

  function parseErrorText(text, fallback) {
    return text && text.trim() ? text : fallback;
  }

  function formatDate(dateString) {
    if (!dateString) return "No publish date";

    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "No publish date";

    return date.toLocaleDateString();
  }

  async function fetchJson(path, requiresAuth = true) {
    const headers = {};

    if (requiresAuth) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${DASHBOARD_API_BASE}${path}`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, `Request failed (${response.status})`));
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function buildCover(bookTitle, coverUrl) {
    if (coverUrl) {
      const img = document.createElement("img");
      img.className = "cover-image";
      img.src = coverUrl;
      img.alt = `${bookTitle ?? "Book"} cover`;

      img.onerror = () => {
        img.replaceWith(buildCoverPlaceholder(bookTitle));
      };

      return img;
    }

    return buildCoverPlaceholder(bookTitle);
  }

  function buildCoverPlaceholder(title) {
    const img = document.createElement("img");
    img.className = "cover-image";
    img.src = "svg_files/bookfinder logo.svg";
    img.alt = `${title ?? "Book"} default cover`;
    return img;
  }

  function createBookItem(book, mode) {
    const item = document.createElement("a");
    item.className = "book-item";
    item.href = `bookview.html?id=${book.bookId}`;

    const coverWrap = document.createElement("div");
    coverWrap.className = "cover-wrap";
    coverWrap.appendChild(buildCover(book.title, book.coverUrl));

    const title = document.createElement("p");
    title.textContent = book.title || "Untitled Book";

    const subtitle = document.createElement("span");

    if (mode === "reading") {
      subtitle.textContent = `By ${book.authorUsername || "Unknown author"}`;
    } else {
      const parts = [];
      if (book.seriesName) parts.push(book.seriesName);
      if (book.publishDate) parts.push(formatDate(book.publishDate));
      subtitle.textContent = parts.length > 0 ? parts.join(" • ") : "Standalone";
    }

    item.appendChild(coverWrap);
    item.appendChild(title);
    item.appendChild(subtitle);

    return item;
  }

  function renderCurrentlyReading(books) {
    currentlyReadingList.innerHTML = "";

    const content = Array.isArray(books) ? books : [];
    currentlyReadingTitle.textContent = `Currently Reading Books (${content.length})`;
    latestReadingBook = content.length > 0 ? content[0] : null;

    if (content.length === 0) {
      currentlyReadingEmpty.hidden = false;
      authorDiscoveryText.textContent = "Start reading a book to discover more from the same author.";
      genreDiscoveryText.textContent = "Start reading a book to explore similar genres.";
      return;
    }

    currentlyReadingEmpty.hidden = true;

    authorDiscoveryText.textContent = `Find more books by ${latestReadingBook.authorUsername || "this author"}.`;
    genreDiscoveryText.textContent = `Explore books related to ${latestReadingBook.title || "your latest read"}.`;

    content.forEach((book) => {
      currentlyReadingList.appendChild(createBookItem(book, "reading"));
    });
  }

  function renderPublishedBooks(books) {
    publishedBooksList.innerHTML = "";

    const content = Array.isArray(books) ? books : [];
    publishedBooksTitle.textContent = `Published Books (${content.length})`;

    if (content.length === 0) {
      publishedBooksEmpty.hidden = false;
      return;
    }

    publishedBooksEmpty.hidden = true;

    content.forEach((book) => {
      publishedBooksList.appendChild(createBookItem(book, "published"));
    });
  }

  topRatedBtn.addEventListener("click", () => {
    window.location.href = "search.html?topRated=true";
  });

  authorDiscoveryBtn.addEventListener("click", () => {
    if (!latestReadingBook?.authorUsername) {
      window.location.href = "search.html";
      return;
    }

    window.location.href = `search.html?author=${encodeURIComponent(latestReadingBook.authorUsername)}`;
  });

  genreDiscoveryBtn.addEventListener("click", async () => {
    if (!latestReadingBook?.bookId) {
      window.location.href = "search.html";
      return;
    }

    try {
      const bookDetails = await fetchJson(`/api/books/${latestReadingBook.bookId}/details`, false);
      const genres = Array.isArray(bookDetails?.genres) ? bookDetails.genres : [];
      const firstGenre = genres[0];

      if (!firstGenre) {
        window.location.href = "search.html";
        return;
      }

      window.location.href = `search.html?genres=${encodeURIComponent(firstGenre)}`;
    } catch (error) {
      console.error("Could not load genre discovery details:", error);
      window.location.href = "search.html";
    }
  });

  try {
    const [currentlyReading, publishedBooks] = await Promise.all([
      fetchJson("/api/reading-progress/me/currently-reading"),
      fetchJson("/api/books/me/published")
    ]);

    renderCurrentlyReading(currentlyReading);
    renderPublishedBooks(publishedBooks);

  } catch (error) {
    console.error("Could not load dashboard data:", error);

    currentlyReadingTitle.textContent = "Currently Reading Books";
    publishedBooksTitle.textContent = "Published Books";

    currentlyReadingEmpty.hidden = false;
    publishedBooksEmpty.hidden = false;

    currentlyReadingEmpty.textContent = error.message || "Could not load currently reading books.";
    publishedBooksEmpty.textContent = error.message || "Could not load published books.";
  }
});