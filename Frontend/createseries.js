const API_BASE = "https://book-finder-production-5c8b.up.railway.app";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("seriesForm");

  if (!form) {
    console.error("Series form not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to create a series.");
      window.location.href = "login.html";
      return;
    }

    const seriesName = document.getElementById("seriesName").value.trim();
    const description = document.getElementById("seriesDesc").value.trim();

    if (!seriesName) {
      alert("Series name is required.");
      return;
    }

    const seriesData = {
      seriesName: seriesName,
      description: description,
      publishDate: new Date().toISOString().split("T")[0],
      coverImageKey: null
    };

    try {
      const response = await fetch(`${API_BASE}/api/series/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(seriesData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create series failed:", errorText);
        throw new Error("Failed to create series");
      }

      const data = await response.json();
      console.log("Series created:", data);

      alert("Series created successfully!");
      window.location.href = "dashboard.html";

    } catch (error) {
      console.error(error);
      alert("Error creating series.");
    }
  });
});