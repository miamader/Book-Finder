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

  function parseErrorText(text, fallback) {
    return text && text.trim() ? text : fallback;
  }

  function formatDate(dateString) {
    if (!dateString) return "No publish date";

    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "No publish date";

    return date.toLocaleDateString();
  }

  async function fetchJson(path) {
    const response = await fetch(`${DASHBOARD_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
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
    const placeholder = document.createElement("div");
    placeholder.className = "cover cover-placeholder";
    placeholder.textContent = (title ?? "B").trim().charAt(0).toUpperCase() || "B";
    return placeholder;
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

    if (content.length === 0) {
      currentlyReadingEmpty.hidden = false;
      return;
    }

    currentlyReadingEmpty.hidden = true;

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