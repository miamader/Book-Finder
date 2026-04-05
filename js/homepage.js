const HOME_API_BASE = "https://book-finder-production-5c8b.up.railway.app";
const POPULAR_BOOKS_LIMIT = 5;

document.addEventListener("DOMContentLoaded", async () => {
  const popularTrack = document.getElementById("popularNowTrack");
  if (!popularTrack) return;

  try {
    const response = await fetch(
      `${HOME_API_BASE}/api/books/top-rated?page=0&size=${POPULAR_BOOKS_LIMIT}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Could not load popular books.");
    }

    const pageData = await response.json();
    const books = Array.isArray(pageData?.content) ? pageData.content : [];

    renderPopularBooks(popularTrack, books);
  } catch (error) {
    console.error("Could not load homepage popular books:", error);
    popularTrack.innerHTML = `<p class="home-inline-status">Could not load popular books right now.</p>`;
  }
});

function renderPopularBooks(container, books) {
  container.innerHTML = "";

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = `<p class="home-inline-status">No published books available yet.</p>`;
    return;
  }

  books.forEach((book) => {
    const article = document.createElement("article");
    article.className = "book-tile";

    const coverLink = document.createElement("a");
    coverLink.className = "tile-cover-link";
    coverLink.href = `bookview.html?id=${book.bookId}`;

    const cover = document.createElement("div");
    cover.className = "tile-cover";

    if (book.coverUrl) {
      const img = document.createElement("img");
      img.src = book.coverUrl;
      img.alt = book.title || "Book cover";
      img.onerror = () => {
        cover.innerHTML = "";
        cover.appendChild(buildCoverFallback(book.title));
      };
      cover.appendChild(img);
    } else {
      cover.appendChild(buildCoverFallback(book.title));
    }

    coverLink.appendChild(cover);

    const title = document.createElement("p");
    title.className = "tile-title";
    title.textContent = book.title || "Untitled Book";

    const author = document.createElement("p");
    author.className = "tile-author";
    author.textContent = book.authorUsername || "Unknown author";

    article.appendChild(coverLink);
    article.appendChild(title);
    article.appendChild(author);

    container.appendChild(article);
  });
}

function buildCoverFallback(title) {
  const img = document.createElement("img");
  img.src = "svg_files/bookfinder logo.svg";
  img.alt = `${title ?? "Book"} default cover`;
  img.className = "tile-cover-default";
  return img;
}