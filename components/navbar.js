import { auth } from "../js/auth.js";

class BookFinderNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="nav-bar">
        <div class="nav-left">

          <a class="nav-brand" href="index.html">
            <img src="svg_files/bookfinder logo.svg" alt="BookFinder Logo" class="nav-logo">
            <span class="nav-brand-text">BookFinder</span>
          </a>

          <nav class="nav-links" aria-label="Primary">
            <a class="nav-link" href="index.html">Home</a>
            <a class="nav-link" href="dashboard.html">My Books</a>
            <a class="nav-link" href="search.html">Browse</a>
          </nav>

        </div>

        <div class="nav-center">
          <div class="nav-search">
            <span class="nav-search-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" stroke-width="2"/>
                <path d="M16.2 16.2L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>

            <input class="nav-search-input" type="text" placeholder="Search for Books" />

            <button class="nav-filter" type="button" aria-label="Filter">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M4 7h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" stroke="currentColor" stroke-width="2"/>
                <path d="M8 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="nav-right">

          <!-- GUEST -->
          <div class="nav-guest">
            <a class="nav-btn" href="login.html">Log in</a>
            <a class="nav-btn nav-btn-solid" href="signup.html">Sign up</a>
          </div>

          <!-- AUTH -->
          <div class="nav-auth">

            <div class="nav-write-wrapper">
              <button class="nav-write-btn nav-write-toggle" type="button">
                Write
              </button>

              <div class="nav-write-dropdown" hidden>
                <a href="createbook.html">Create New Book</a>
                <a href="createseries.html">Create New Series</a>
                <a href="managebooks.html">Manage Books</a>
                <a href="manageseries.html">Manage Series</a>
              </div>
            </div>

            <div class="nav-avatar-wrapper">
              <div class="nav-avatar"></div>

              <div class="nav-dropdown" hidden>
                <div class="nav-dropdown-name">User</div>

                <div class="nav-dropdown-divider"></div>

                <a class="nav-dropdown-item" href="dashboard.html">Dashboard</a>
                <a class="nav-dropdown-item" href="profile.html">Profile</a>

                <div class="nav-dropdown-divider"></div>

                <button id="signout-btn" class="nav-dropdown-item nav-signout">
                  Sign out
                </button>
              </div>

            </div>

          </div>

        </div>
      </header>
    `;

    this.highlightActive();
    this.setupWriteDropdown();
    this.setupProfileDropdown();
    this.setupSearchNavigation();
    this.setupGlobalDropdownClose();

    // ✅ Subscribe to auth state
    this.unsubscribe = auth.subscribe((state) => {
      this.updateAuthUI(state);
    });

    // ✅ Initialize auth
    auth.init();
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  // ----------------------------
  // ACTIVE LINK
  // ----------------------------
  highlightActive() {
    const activePage = this.getAttribute("active");

    const map = {
      home: "index.html",
      mybooks: "dashboard.html",
      browse: "search.html",
    };

    const file = map[activePage];
    if (!file) return;

    const link = this.querySelector(`a[href="${file}"]`);
    if (link) link.classList.add("active");
  }

  // ----------------------------
  // AUTH STATE (UPDATED)
  // ----------------------------
  updateAuthUI(state) {
    const guest = this.querySelector(".nav-guest");
    const authUI = this.querySelector(".nav-auth");
    const nameEl = this.querySelector(".nav-dropdown-name");

    if (!guest || !authUI) return;

    if (state.isAuthenticated) {
      guest.style.display = "none";
      authUI.style.display = "flex";

      const user = state.user;

      const displayName = user?.firstName
          ? `${user.firstName} ${user.lastName ?? ""}`.trim()
          : user?.username;

      if (nameEl) {
        nameEl.textContent = displayName || "User";
      }
    } else {
      guest.style.display = "flex";
      authUI.style.display = "none";
    }
  }

  // ----------------------------
  // WRITE DROPDOWN
  // ----------------------------
  setupWriteDropdown() {
    const toggle = this.querySelector(".nav-write-toggle");
    const menu = this.querySelector(".nav-write-dropdown");

    if (!toggle || !menu) return;

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      toggle.setAttribute("aria-expanded", String(!menu.hidden));
    });
  }

  // ----------------------------
  // PROFILE DROPDOWN
  // ----------------------------
  setupProfileDropdown() {
    const avatar = this.querySelector(".nav-avatar");
    const dropdown = this.querySelector(".nav-dropdown");

    if (!avatar || !dropdown) return;

    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
      avatar.setAttribute("aria-expanded", String(!dropdown.hidden));
    });

    const signoutBtn = this.querySelector("#signout-btn");
    signoutBtn?.addEventListener("click", () => {
      auth.logout(); // ✅ CLEAN
    });
  }

  // ----------------------------
  // CLOSE ALL DROPDOWNS
  // ----------------------------
  setupGlobalDropdownClose() {
    document.addEventListener("click", () => {
      const writeMenu = this.querySelector(".nav-write-dropdown");
      const profileMenu = this.querySelector(".nav-dropdown");

      const writeBtn = this.querySelector(".nav-write-toggle");
      const avatar = this.querySelector(".nav-avatar");

      if (writeMenu) writeMenu.hidden = true;
      if (profileMenu) profileMenu.hidden = true;

      writeBtn?.setAttribute("aria-expanded", "false");
      avatar?.setAttribute("aria-expanded", "false");
    });
  }

  // ----------------------------
  // SEARCH
  // ----------------------------
  setupSearchNavigation() {
    const input = this.querySelector(".nav-search-input");
    const btn = this.querySelector(".nav-filter");

    if (!input) return;

    const go = () => {
      const q = input.value.trim();
      window.location.href = q
          ? `search.html?q=${encodeURIComponent(q)}`
          : "search.html";
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        go();
      }
    });

    btn?.addEventListener("click", go);

    const params = new URLSearchParams(window.location.search);
    input.value = params.get("q") ?? "";
  }
}

customElements.define("bf-navbar", BookFinderNav);