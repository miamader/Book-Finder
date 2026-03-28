/* =========================
   Chapter Reader Engine
   2-page spread system
   Works with HTML or Markdown
   ========================= */

let pages = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  initReader();
  bindControls();
});

/* =========================
   INIT
   ========================= */
function initReader() {
  const title = localStorage.getItem("activeChapterTitle") || "Chapter";
  const content = localStorage.getItem("activeChapterContent") || "";
  const type = localStorage.getItem("activeChapterType") || "HTML";

  document.getElementById("chapterTitle").innerText = title;

  const cleaned = normalizeContent(content, type);
  pages = paginate(cleaned, 260);

  currentIndex = 0;
  render();
}

/* =========================
   CONTENT NORMALIZATION
   HTML → plain text blocks
   ========================= */
function normalizeContent(content, type) {
  if (!content) return "";

  // HTML chapter (your case from S3)
  if (type === "HTML") {
    const div = document.createElement("div");
    div.innerHTML = content;

    const blocks = div.querySelectorAll("p, h1, h2, h3, li");

    return Array.from(blocks)
      .map(el => el.innerText.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  // Markdown or fallback
  return content;
}

/* =========================
   PAGINATION ENGINE
   Splits into "page chunks"
   ========================= */
function paginate(text, maxWordsPerPage = 260) {
  const words = text.split(/\s+/);

  const result = [];
  let buffer = [];

  for (let i = 0; i < words.length; i++) {
    buffer.push(words[i]);

    if (buffer.length >= maxWordsPerPage) {
      result.push(buffer.join(" "));
      buffer = [];
    }
  }

  if (buffer.length) {
    result.push(buffer.join(" "));
  }

  return result;
}

/* =========================
   RENDER 2-PAGE SPREAD
   ========================= */
function render() {
  const left = document.getElementById("leftPage");
  const right = document.getElementById("rightPage");

  left.innerText = pages[currentIndex] || "";
  right.innerText = pages[currentIndex + 1] || "";

  updateControls();
}

/* =========================
   NAVIGATION CONTROLS
   ========================= */
function bindControls() {
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentIndex + 2 < pages.length) {
      currentIndex += 2;
      render();
    }
  });

  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentIndex - 2 >= 0) {
      currentIndex -= 2;
      render();
    }
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    window.history.back();
  });

  // optional keyboard support
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      if (currentIndex + 2 < pages.length) {
        currentIndex += 2;
        render();
      }
    }

    if (e.key === "ArrowLeft") {
      if (currentIndex - 2 >= 0) {
        currentIndex -= 2;
        render();
      }
    }
  });
}

/* =========================
   UI STATE
   ========================= */
function updateControls() {
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");

  prev.disabled = currentIndex === 0;
  next.disabled = currentIndex + 2 >= pages.length;
}