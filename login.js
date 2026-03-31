const API_BASE = "https://book-finder-production-5c8b.up.railway.app";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_BASE}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();

      localStorage.setItem("token", data.accessToken || data.token);
      localStorage.setItem("username", data.username);

      alert("Log in successful! Redirecting to dashboard...");
      window.location.href = "dashboard.html";
    } else {
      const errorText = await response.text();
      let errorMessage = "Login failed";

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch (e) {
        errorMessage = `Error ${response.status}: Forbidden by server`;
      }

      alert(errorMessage);
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Unexpected error: " + err.message);
  }
});
