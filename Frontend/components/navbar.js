const API_BASE = "https://book-finder-production-5c8b.up.railway.app";

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
            <a class="nav-link" href="index.html"     data-page="home">Home</a>
            <a class="nav-link" href="dashboard.html"   data-page="mybooks">My Books</a>
            <a class="nav-link" href="search.html" data-page="browse">Browse</a>
            <!-- <a class="nav-link" href="community.html" data-page="community">Community</a> -->
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
          <a class="nav-write-btn" href="createbook.html">Write</a>
          <a class="nav-write-btn" href="createseries.html">New Series</a>

          <button class="nav-icon-btn" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Z" fill="currentColor"/>
              <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </button>

          <div class="nav-avatar-wrapper">
            <div class="nav-avatar" role="button" aria-label="Profile menu" aria-expanded="false"></div>

            <div class="nav-dropdown" hidden>
              <div class="nav-dropdown-name">User</div>
              <div class="nav-dropdown-divider"></div>
              <a class="nav-dropdown-item" href="profile.html">My Profile</a>
              <!-- <a class="nav-dropdown-item" href="settings.html">Account Settings</a> -->
              <div class="nav-dropdown-divider"></div>
              <button class="nav-dropdown-item nav-signout" id="signout-btn">Sign Out</button>
            </div>
          </div>

        </div>
      </header>
    `;

    this.highlightActive();
    this.setupDropdown();
    this.loadCurrentUser();
  }

  highlightActive() {
    const activePage = this.getAttribute("active");
    if (activePage) {
      const activeLink = this.querySelector(`[data-page="${activePage}"]`);
      if (activeLink) activeLink.classList.add("active");
    }
  }

  setupDropdown() {
    const avatar   = this.querySelector('.nav-avatar');
    const dropdown = this.querySelector('.nav-dropdown');

    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !dropdown.hidden;
      dropdown.hidden = isOpen;
      avatar.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', () => {
      dropdown.hidden = true;
      avatar.setAttribute('aria-expanded', 'false');
    });

    this.querySelector('#signout-btn').addEventListener('click', () => {
      localStorage.removeItem('username');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    });
  }

  async loadCurrentUser() {
    const nameEl = this.querySelector('.nav-dropdown-name');
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/users/me`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return;
      }

      const user = await response.json();

      const displayName = user.firstName
        ? `${user.firstName} ${user.lastName ?? ''}`.trim()
        : user.username;

      nameEl.textContent = displayName;
      localStorage.setItem('username', displayName);

    } catch (err) {
      console.warn('Could not load current user:', err);
    }
  }
}

customElements.define("bf-navbar", BookFinderNav);
