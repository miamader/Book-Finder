const MANAGE_SERIES_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

function getTokenOrRedirect() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in to manage your series.");
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
  const sortFilter = document.getElementById("sortFilter");
  const seriesGrid = document.getElementById("seriesGrid");
  const seriesEmpty = document.getElementById("seriesEmpty");
  const seriesSummary = document.getElementById("seriesSummary");

  const statTotalSeries = document.getElementById("statTotalSeries");
  const statTotalBooks = document.getElementById("statTotalBooks");
  const statEmptySeries = document.getElementById("statEmptySeries");
  const statWithCovers = document.getElementById("statWithCovers");

  let allSeries = [];

  async function fetchMySeries() {
    const response = await fetch(`${MANAGE_SERIES_API_BASE}/api/series/me?page=0&size=100`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to load your series"));
    }

    const data = await response.json();
    return data.content ?? [];
  }

  async function deleteSeries(series) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${series.seriesName ?? "this series"}"?\n\nWARNING: This will also delete all books inside this series.\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    const response = await fetch(`${MANAGE_SERIES_API_BASE}/api/series/${series.seriesId}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorText(errorText, "Failed to delete series"));
    }
  }

  function updateStats(seriesList) {
    const totalBooks = seriesList.reduce((sum, series) => sum + (series.totalBooks ?? 0), 0);
    const emptySeries = seriesList.filter((series) => (series.totalBooks ?? 0) === 0).length;
    const withCovers = seriesList.filter((series) => !!series.coverUrl).length;

    statTotalSeries.textContent = seriesList.length;
    statTotalBooks.textContent = totalBooks;
    statEmptySeries.textContent = emptySeries;
    statWithCovers.textContent = withCovers;
  }

  function getFilteredSeries() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const sortValue = sortFilter.value;

    const filtered = [...allSeries].filter((series) => {
      if (!searchValue) return true;

      const name = (series.seriesName ?? "").toLowerCase();
      const description = (series.description ?? "").toLowerCase();

      return name.includes(searchValue) || description.includes(searchValue);
    });

    filtered.sort((a, b) => {
      if (sortValue === "NAME_ASC") {
        return (a.seriesName ?? "").localeCompare(b.seriesName ?? "");
      }

      if (sortValue === "BOOKS_DESC") {
        return (b.totalBooks ?? 0) - (a.totalBooks ?? 0);
      }

      const dateA = a.publishDate ? new Date(`${a.publishDate}T00:00:00`).getTime() : 0;
      const dateB = b.publishDate ? new Date(`${b.publishDate}T00:00:00`).getTime() : 0;

      if (sortValue === "OLDEST") {
        return dateA - dateB;
      }

      return dateB - dateA;
    });

    return filtered;
  }

  function renderSeries() {
    const filteredSeries = getFilteredSeries();

    seriesGrid.innerHTML = "";
    seriesSummary.textContent = `Showing ${filteredSeries.length} of ${allSeries.length} series.`;

    if (filteredSeries.length === 0) {
      seriesEmpty.hidden = false;
      seriesGrid.hidden = true;
      return;
    }

    seriesEmpty.hidden = true;
    seriesGrid.hidden = false;

    filteredSeries.forEach((series) => {
      const card = document.createElement("article");
      card.className = "ms-card";

      const coverWrap = document.createElement("div");
      coverWrap.className = "ms-cover-wrap";

      const cover = document.createElement("img");
      cover.className = "ms-cover";
      cover.alt = `${series.seriesName ?? "Series"} cover`;
      cover.src = series.coverUrl || "svg_files/bookfinder logo.svg";

      coverWrap.appendChild(cover);

      const body = document.createElement("div");
      body.className = "ms-card-body";

      const name = document.createElement("h3");
      name.className = "ms-series-name";
      name.textContent = series.seriesName ?? "Untitled Series";

      const description = document.createElement("p");
      description.className = "ms-description";
      description.textContent = series.description || "No description yet.";

      const meta = document.createElement("div");
      meta.className = "ms-meta";

      const publishDate = document.createElement("p");
      publishDate.className = "ms-meta-row";
      publishDate.innerHTML = `<span class="ms-meta-label">Date:</span> ${formatDate(series.publishDate)}`;

      const totalBooks = document.createElement("p");
      totalBooks.className = "ms-meta-row";
      totalBooks.innerHTML = `<span class="ms-meta-label">Books:</span> ${series.totalBooks ?? 0}`;

      const badge = document.createElement("span");
      badge.className = "ms-badge";
      badge.textContent = `${series.totalBooks ?? 0} ${(series.totalBooks ?? 0) === 1 ? "book" : "books"}`;

      meta.appendChild(publishDate);
      meta.appendChild(totalBooks);
      meta.appendChild(badge);

      const actions = document.createElement("div");
      actions.className = "ms-actions";

      const editLink = document.createElement("a");
      editLink.className = "ms-btn ms-btn-primary";
      editLink.href = `createseries.html?seriesId=${series.seriesId}`;
      editLink.textContent = "Edit";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "ms-btn ms-btn-danger";
      deleteBtn.textContent = "Delete";

      deleteBtn.addEventListener("click", async () => {
        try {
          deleteBtn.disabled = true;
          await deleteSeries(series);
          await loadSeries();
        } catch (error) {
          console.error("Could not delete series:", error);
          alert(error.message || "Could not delete the series.");
        } finally {
          deleteBtn.disabled = false;
        }
      });

      actions.appendChild(editLink);
      actions.appendChild(deleteBtn);

      body.appendChild(name);
      body.appendChild(description);
      body.appendChild(meta);
      body.appendChild(actions);

      card.appendChild(coverWrap);
      card.appendChild(body);

      seriesGrid.appendChild(card);
    });
  }

  async function loadSeries() {
    try {
      seriesSummary.textContent = "Loading series...";
      allSeries = await fetchMySeries();
      updateStats(allSeries);
      renderSeries();
    } catch (error) {
      console.error("Could not load series:", error);
      seriesGrid.innerHTML = "";
      seriesGrid.hidden = true;
      seriesEmpty.hidden = false;
      seriesSummary.textContent = "Could not load series.";
      seriesEmpty.innerHTML = `
        <p class="ms-empty-title">Something went wrong</p>
        <p class="ms-empty-text">${error.message || "Could not load your series."}</p>
        <a class="ms-empty-btn" href="createseries.html">Create Series</a>
      `;
    }
  }

  searchInput.addEventListener("input", renderSeries);
  sortFilter.addEventListener("change", renderSeries);

  await loadSeries();
});