const WRITE_BOOK_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

function getTokenOrRedirect() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in to write chapters.");
    window.location.href = "login.html";
    return null;
  }

  return token;
}

function parseErrorText(text, fallback) {
  return text && text.trim() ? text : fallback;
}

function getFileTypeFromFile(file) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".html")) return "HTML";
  return "MARKDOWN";
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = getTokenOrRedirect();
  if (!token) return;

  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("bookId");

  if (!bookId) {
    alert("Missing bookId.");
    window.location.href = "managebooks.html";
    return;
  }

  const bookSubtitle = document.getElementById("bookSubtitle");
  const chaptersSummary = document.getElementById("chaptersSummary");
  const chapterList = document.getElementById("chapterList");
  const chapterListEmpty = document.getElementById("chapterListEmpty");
  const chapterForm = document.getElementById("chapterForm");
  const newChapterBtn = document.getElementById("newChapterBtn");

  const editorModeTitle = document.getElementById("editorModeTitle");
  const editorModeSubtitle = document.getElementById("editorModeSubtitle");

  const chapterNumberInput = document.getElementById("chapterNumber");
  const chapterTitleInput = document.getElementById("chapterTitle");
  const chapterFileTypeSelect = document.getElementById("chapterFileType");
  const chapterContentTextarea = document.getElementById("chapterContent");
  const chapterImportInput = document.getElementById("chapterImportInput");
  const saveChapterBtn = document.getElementById("saveChapterBtn");
  const deleteChapterBtn = document.getElementById("deleteChapterBtn");

  let bookData = null;
  let chapterListData = [];
  let selectedChapterId = null;
  let isCreatingNewChapter = false;

  async function fetchBookDetails() {
    const response = await fetch(`${WRITE_BOOK_API_BASE}/api/books/${bookId}/details`, {
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

  async function fetchManagedChapters() {
    const response = await fetch(`${WRITE_BOOK_API_BASE}/api/books/${bookId}/chapters/manage`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load chapters"));
    }

    return response.json();
  }

  async function fetchChapterForEditor(chapterId) {
    const response = await fetch(`${WRITE_BOOK_API_BASE}/api/chapters/${chapterId}/editor`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load chapter"));
    }

    return response.json();
  }

  async function createChapter(payload) {
    const response = await fetch(`${WRITE_BOOK_API_BASE}/api/books/${bookId}/chapters/editor-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to create chapter"));
    }

    return response.json();
  }

  async function saveChapter(chapterId, payload) {
    const response = await fetch(`${WRITE_BOOK_API_BASE}/api/chapters/${chapterId}/editor-save`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to save chapter"));
    }

    return response.json();
  }

  async function deleteChapter(chapterId) {
    const response = await fetch(`${WRITE_BOOK_API_BASE}/api/chapters/${chapterId}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to delete chapter"));
    }
  }

  function setBookHeader() {
    if (!bookData) return;

    bookSubtitle.textContent = `${bookData.title ?? "Untitled Book"} · ${bookData.publicationStatus ?? "DRAFT"}`;
  }

  function resetFormForNewChapter() {
    selectedChapterId = null;
    isCreatingNewChapter = true;

    editorModeTitle.textContent = "New Chapter";
    editorModeSubtitle.textContent = "Create a new chapter for this book.";

    chapterNumberInput.value = getSuggestedNextChapterNumber();
    chapterTitleInput.value = "";
    chapterFileTypeSelect.value = "MARKDOWN";
    chapterContentTextarea.value = "";

    deleteChapterBtn.hidden = true;
    renderChapterList();
  }

  function fillFormWithChapter(chapter) {
    selectedChapterId = chapter.chapterId;
    isCreatingNewChapter = false;

    editorModeTitle.textContent = `Editing Chapter ${chapter.chapterNumber}`;
    editorModeSubtitle.textContent = "Update the content and save your changes.";

    chapterNumberInput.value = chapter.chapterNumber ?? "";
    chapterTitleInput.value = chapter.title ?? "";
    chapterFileTypeSelect.value = chapter.fileType ?? "MARKDOWN";
    chapterContentTextarea.value = chapter.content ?? "";

    deleteChapterBtn.hidden = false;
    renderChapterList();
  }

  function getSuggestedNextChapterNumber() {
    if (!chapterListData.length) return 1;

    const maxNumber = Math.max(...chapterListData.map((chapter) => chapter.chapterNumber || 0));
    return maxNumber + 1;
  }

  function renderChapterList() {
    chapterList.innerHTML = "";
    chaptersSummary.textContent = `${chapterListData.length} ${chapterListData.length === 1 ? "chapter" : "chapters"}`;

    if (!chapterListData.length) {
      chapterListEmpty.hidden = false;
      return;
    }

    chapterListEmpty.hidden = true;

    chapterListData.forEach((chapter) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `wb-chapter-card ${selectedChapterId === chapter.chapterId ? "is-selected" : ""}`;

      card.innerHTML = `
        <p class="wb-chapter-number">Chapter ${chapter.chapterNumber}</p>
        <div class="wb-chapter-top">
          <p class="wb-chapter-title">${chapter.title ?? `Chapter ${chapter.chapterNumber}`}</p>
        </div>
        <div class="wb-chapter-meta">
          <span class="wb-chip">${chapter.fileType ?? "MARKDOWN"}</span>
          ${chapter.preview ? `<span class="wb-chip">Preview</span>` : ""}
        </div>
      `;

      card.addEventListener("click", async () => {
        try {
          const chapterDetails = await fetchChapterForEditor(chapter.chapterId);
          fillFormWithChapter(chapterDetails);
        } catch (error) {
          console.error("Could not open chapter:", error);
          alert(error.message || "Could not open chapter.");
        }
      });

      chapterList.appendChild(card);
    });
  }

  function buildPayload() {
    const chapterNumber = Number(chapterNumberInput.value);
    const title = chapterTitleInput.value.trim();
    const fileType = chapterFileTypeSelect.value;
    const content = chapterContentTextarea.value;

    if (!chapterNumber || chapterNumber <= 0) {
      throw new Error("Chapter number must be greater than 0.");
    }

    return {
      chapterNumber,
      title,
      fileType,
      content
    };
  }

  async function loadInitialData() {
    try {
      const [book, chapters] = await Promise.all([
        fetchBookDetails(),
        fetchManagedChapters()
      ]);

      bookData = book;
      chapterListData = chapters;

      setBookHeader();
      renderChapterList();

      if (chapterListData.length > 0) {
        const firstChapter = await fetchChapterForEditor(chapterListData[0].chapterId);
        fillFormWithChapter(firstChapter);
      } else {
        resetFormForNewChapter();
      }
    } catch (error) {
      console.error("Could not load writer screen:", error);
      alert(error.message || "Could not load book writer.");
      window.location.href = "managebooks.html";
    }
  }

  newChapterBtn.addEventListener("click", () => {
    resetFormForNewChapter();
  });

  chapterImportInput.addEventListener("change", async () => {
    const file = chapterImportInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      chapterContentTextarea.value = text;
      chapterFileTypeSelect.value = getFileTypeFromFile(file);
    } catch (error) {
      console.error("Could not import file:", error);
      alert("Could not import the selected file.");
    } finally {
      chapterImportInput.value = "";
    }
  });

  chapterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      saveChapterBtn.disabled = true;

      const payload = buildPayload();

      if (isCreatingNewChapter || !selectedChapterId) {
        const createdChapter = await createChapter(payload);
        alert("Chapter created successfully!");

        chapterListData = await fetchManagedChapters();
        const refreshedChapter = await fetchChapterForEditor(createdChapter.chapterId);
        fillFormWithChapter(refreshedChapter);
        renderChapterList();
        return;
      }

      const savedChapter = await saveChapter(selectedChapterId, payload);
      alert("Chapter saved successfully!");

      chapterListData = await fetchManagedChapters();
      fillFormWithChapter(savedChapter);
      renderChapterList();
    } catch (error) {
      console.error("Could not save chapter:", error);
      alert(error.message || "Could not save chapter.");
    } finally {
      saveChapterBtn.disabled = false;
    }
  });

  deleteChapterBtn.addEventListener("click", async () => {
    if (!selectedChapterId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this chapter?\n\nThis action cannot be undone."
    );

    if (!confirmed) return;

    try {
      deleteChapterBtn.disabled = true;
      await deleteChapter(selectedChapterId);
      alert("Chapter deleted successfully!");

      chapterListData = await fetchManagedChapters();

      if (chapterListData.length > 0) {
        const firstChapter = await fetchChapterForEditor(chapterListData[0].chapterId);
        fillFormWithChapter(firstChapter);
      } else {
        resetFormForNewChapter();
      }

      renderChapterList();
    } catch (error) {
      console.error("Could not delete chapter:", error);
      alert(error.message || "Could not delete chapter.");
    } finally {
      deleteChapterBtn.disabled = false;
    }
  });

  await loadInitialData();
});