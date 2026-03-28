const API_BASE = "https://book-finder-production-5c8b.up.railway.app";

const state = {
  token: localStorage.getItem("token"),
  profile: null,
  isOwnProfile: false,
  isEditing: false,
  viewedUsername: null
};

const refs = {};

function initProfilePage() {
  try {
    cacheRefs();
    validateRefs();
    bindEvents();
    loadProfile();
  } catch (error) {
    console.error("Profile init error:", error);
    safeShowError(error.message || "Profile page failed to initialize.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfilePage);
} else {
  initProfilePage();
}

function cacheRefs() {
  refs.profileLoading = document.getElementById("profileLoading");
  refs.profileError = document.getElementById("profileError");
  refs.profileErrorText = document.getElementById("profileErrorText");
  refs.profileContent = document.getElementById("profileContent");

  refs.profileAvatar = document.getElementById("profileAvatar");
  refs.profileEyebrow = document.getElementById("profileEyebrow");
  refs.profileUsername = document.getElementById("profileUsername");
  refs.profileFullname = document.getElementById("profileFullname");
  refs.profileJoined = document.getElementById("profileJoined");
  refs.profileEmailCard = document.getElementById("profileEmailCard");
  refs.profileEmail = document.getElementById("profileEmail");
  refs.profileBookCount = document.getElementById("profileBookCount");
  refs.profileNotice = document.getElementById("profileNotice");
  refs.profileBio = document.getElementById("profileBio");

  refs.editProfileBtn = document.getElementById("editProfileBtn");
  refs.editSection = document.getElementById("editSection");
  refs.profileForm = document.getElementById("profileForm");
  refs.firstNameInput = document.getElementById("firstNameInput");
  refs.lastNameInput = document.getElementById("lastNameInput");
  refs.bioInput = document.getElementById("bioInput");
  refs.saveProfileBtn = document.getElementById("saveProfileBtn");
  refs.cancelEditBtn = document.getElementById("cancelEditBtn");

  refs.booksMeta = document.getElementById("booksMeta");
  refs.booksEmpty = document.getElementById("booksEmpty");
  refs.booksGrid = document.getElementById("booksGrid");
}

function validateRefs() {
  const requiredIds = [
    "profileLoading",
    "profileError",
    "profileErrorText",
    "profileContent",
    "profileAvatar",
    "profileEyebrow",
    "profileUsername",
    "profileFullname",
    "profileJoined",
    "profileEmailCard",
    "profileEmail",
    "profileBookCount",
    "profileNotice",
    "profileBio",
    "editProfileBtn",
    "editSection",
    "profileForm",
    "firstNameInput",
    "lastNameInput",
    "bioInput",
    "saveProfileBtn",
    "cancelEditBtn",
    "booksMeta",
    "booksEmpty",
    "booksGrid"
  ];

  requiredIds.forEach((id) => {
    if (!refs[id]) {
      throw new Error(`Missing required element in profile.html: ${id}`);
    }
  });
}

function bindEvents() {
  refs.editProfileBtn.addEventListener("click", () => {
    state.isEditing = true;
    fillEditForm();
    renderEditState();
  });

  refs.cancelEditBtn.addEventListener("click", () => {
    state.isEditing = false;
    renderEditState();
  });

  refs.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.isOwnProfile || !state.token) {
      return;
    }

    refs.saveProfileBtn.disabled = true;

    try {
      const updatedProfile = await fetchJson("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({
          firstName: refs.firstNameInput.value.trim() || null,
          lastName: refs.lastNameInput.value.trim() || null,
          bio: refs.bioInput.value.trim() || null
        })
      });

      state.profile = updatedProfile;
      state.isEditing = false;
      renderProfile();
      renderEditState();
      setNotice("Profile updated successfully.");
    } catch (error) {
      console.error("Could not update profile:", error);
      alert(error.message || "Could not update the profile.");
    } finally {
      refs.saveProfileBtn.disabled = false;
    }
  });
}

async function loadProfile() {
  try {
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const usernameParam = params.get("username")?.trim() || null;

    let myProfile = null;

    if (state.token) {
      myProfile = await fetchJsonOrNull("/api/users/me", {
        headers: {
          Authorization: `Bearer ${state.token}`
        }
      });
    }

    if (!usernameParam) {
      if (!myProfile) {
        throw new Error("You need to log in to view your profile.");
      }

      state.profile = myProfile;
      state.isOwnProfile = true;
      state.viewedUsername = myProfile.username;
      renderProfile();
      refs.profileContent.hidden = false;
      return;
    }

    if (myProfile && myProfile.username.toLowerCase() === usernameParam.toLowerCase()) {
      state.profile = myProfile;
      state.isOwnProfile = true;
      state.viewedUsername = myProfile.username;
      renderProfile();
      refs.profileContent.hidden = false;
      return;
    }

    const publicProfile = await fetchJson(`/api/users/profile/${encodeURIComponent(usernameParam)}`);

    state.profile = publicProfile;
    state.isOwnProfile = false;
    state.viewedUsername = publicProfile.username;
    renderProfile();
    refs.profileContent.hidden = false;
  } catch (error) {
    console.error("Could not load profile:", error);
    safeShowError(error.message || "Could not load the profile.");
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  refs.profileLoading.hidden = !isLoading;
}

function safeShowError(message) {
  if (refs.profileLoading) refs.profileLoading.hidden = true;
  if (refs.profileContent) refs.profileContent.hidden = true;
  if (refs.profileError) refs.profileError.hidden = false;
  if (refs.profileErrorText) refs.profileErrorText.textContent = message;
}

function setNotice(message = "") {
  if (!message) {
    refs.profileNotice.hidden = true;
    refs.profileNotice.textContent = "";
    return;
  }

  refs.profileNotice.hidden = false;
  refs.profileNotice.textContent = message;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString();
}

function buildAvatarFallback(username) {
  const first = (username || "U").trim().charAt(0).toUpperCase();
  return first || "U";
}

function buildFullName(profile) {
  const parts = [];

  if (profile.firstName) parts.push(profile.firstName);
  if (profile.lastName) parts.push(profile.lastName);

  return parts.length > 0 ? parts.join(" ") : "No name added yet";
}

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText && errorText.trim() ? errorText : `Request failed (${response.status})`);
    }

    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out while loading the profile.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonOrNull(path, options = {}) {
  try {
    return await fetchJson(path, options);
  } catch (error) {
    return null;
  }
}

function renderProfile() {
  const profile = state.profile;
  const books = Array.isArray(profile?.books) ? profile.books : [];

  refs.profileAvatar.textContent = buildAvatarFallback(profile?.username);
  refs.profileEyebrow.textContent = state.isOwnProfile ? "My Profile" : "Author Profile";
  refs.profileUsername.textContent = profile?.username || "Unknown User";
  refs.profileFullname.textContent = buildFullName(profile || {});
  refs.profileJoined.textContent = formatDate(profile?.joinDate);
  refs.profileBookCount.textContent = String(books.length);

  refs.profileBio.textContent = profile?.bio && profile.bio.trim()
    ? profile.bio
    : "User hasn't created a bio yet.";
  refs.profileBio.classList.toggle("is-empty", !(profile?.bio && profile.bio.trim()));

  refs.profileEmailCard.hidden = !state.isOwnProfile;
  refs.profileEmail.textContent = state.isOwnProfile ? (profile?.email || "—") : "—";

  refs.editProfileBtn.hidden = !state.isOwnProfile;

  setNotice(state.isOwnProfile ? "This is how your public author profile will appear to other users." : "");

  renderBooks(books);
  renderEditState();
}

function fillEditForm() {
  refs.firstNameInput.value = state.profile?.firstName || "";
  refs.lastNameInput.value = state.profile?.lastName || "";
  refs.bioInput.value = state.profile?.bio || "";
}

function renderEditState() {
  refs.editSection.hidden = !(state.isOwnProfile && state.isEditing);
  refs.editProfileBtn.hidden = !state.isOwnProfile || state.isEditing;
}

function renderBooks(books) {
  refs.booksGrid.innerHTML = "";

  if (!Array.isArray(books) || books.length === 0) {
    refs.booksEmpty.hidden = false;
    refs.booksMeta.textContent = "No published books to show.";
    return;
  }

  refs.booksEmpty.hidden = true;
  refs.booksMeta.textContent = `${books.length} published book${books.length === 1 ? "" : "s"}.`;

  books.forEach((book) => {
    const link = document.createElement("a");
    link.className = "pf-book-card";
    link.href = `bookview.html?id=${book.bookId}`;

    const cover = document.createElement("div");
    cover.className = "pf-book-cover";

    const img = document.createElement("img");
    img.src = book.coverUrl || "svg_files/bookfinder logo.svg";
    img.alt = book.title || "Book cover";
    img.onerror = () => {
      img.src = "svg_files/bookfinder logo.svg";
    };
    cover.appendChild(img);

    const title = document.createElement("p");
    title.className = "pf-book-title";
    title.textContent = book.title || "Untitled Book";

    const meta = document.createElement("p");
    meta.className = "pf-book-meta";

    const metaParts = [];
    if (book.seriesName) metaParts.push(book.seriesName);
    if (book.publishDate) metaParts.push(formatDate(book.publishDate));
    meta.textContent = metaParts.length > 0 ? metaParts.join(" • ") : "Standalone";

    link.appendChild(cover);
    link.appendChild(title);
    link.appendChild(meta);

    refs.booksGrid.appendChild(link);
  });
}