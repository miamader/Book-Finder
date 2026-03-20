const SERIES_API_BASE = "https://book-finder-production-5c8b.up.railway.app";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("seriesForm");
  const coverInput = document.getElementById("seriesCoverInput");
  const coverName = document.getElementById("seriesCoverName");

  if (!form) {
    console.error("Series form not found");
    return;
  }

  if (coverInput && coverName) {
    coverInput.addEventListener("change", () => {
      if (coverInput.files.length > 0) {
        coverName.textContent = coverInput.files[0].name;
      } else {
        coverName.textContent = "";
      }
    });
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
    const selectedFile = coverInput && coverInput.files.length > 0 ? coverInput.files[0] : null;

    if (!seriesName) {
      alert("Series name is required.");
      return;
    }

    try {
      // STEP 1: create the series first
      const createPayload = {
        seriesName: seriesName,
        description: description,
        publishDate: new Date().toISOString().split("T")[0],
        coverImageKey: null
      };

      const createResponse = await fetch(`${SERIES_API_BASE}/api/series/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(createPayload)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Create series failed:", errorText);
        alert("Failed to create series: " + errorText);
        return;
      }

      const createdSeries = await createResponse.json();
      console.log("Series created:", createdSeries);

      // If no image was selected, we're done
      if (!selectedFile) {
        alert("Series created successfully!");
        window.location.href = "dashboard.html";
        return;
      }

      // STEP 2: determine file type enum for backend
      let fileType;
      if (selectedFile.type === "image/png") {
        fileType = "PNG";
      } else if (selectedFile.type === "image/jpeg") {
        fileType = "JPEG";
      } else {
        alert("Only PNG or JPEG images are allowed.");
        return;
      }

      // Important: adjust this if your response uses another id field name
      const seriesId =
        createdSeries.seriesId ??
        createdSeries.id;

      if (!seriesId) {
        console.error("Could not find seriesId in response:", createdSeries);
        alert("Series was created, but the ID was not returned correctly.");
        return;
      }

      // STEP 3: ask backend for presigned upload URL
      const uploadUrlResponse = await fetch(
        `${SERIES_API_BASE}/api/series/${seriesId}/cover/upload-url?filename=${encodeURIComponent(selectedFile.name)}&fileType=${fileType}`,
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token
          }
        }
      );

      if (!uploadUrlResponse.ok) {
        const errorText = await uploadUrlResponse.text();
        console.error("Failed to get upload URL:", errorText);
        alert("Failed to get upload URL: " + errorText);
        return;
      }

      const uploadData = await uploadUrlResponse.json();
      console.log("Presigned upload response:", uploadData);

      const objectKey = uploadData.objectKey;
      const uploadUrl = uploadData.uploadUrl;

      if (!objectKey || !uploadUrl) {
        alert("Upload URL response is missing data.");
        return;
      }

      // STEP 4: upload directly to S3
      const s3UploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type
        },
        body: selectedFile
      });

      if (!s3UploadResponse.ok) {
        const s3ErrorText = await s3UploadResponse.text();
        console.error("S3 upload failed:", s3ErrorText);
        alert("Failed to upload cover image to S3.");
        return;
      }

      // STEP 5: update the series with the coverImageKey
      // backend route currently has typo: /api/series/{id}/update
      const updatePayload = {
        seriesName: seriesName,
        description: description,
        publishDate: new Date().toISOString().split("T")[0],
        coverImageKey: objectKey
      };

      const updateResponse = await fetch(`${SERIES_API_BASE}/api/series/${seriesId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(updatePayload)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Failed to update series with cover key:", errorText);
        alert("Cover uploaded, but failed to save it in the series.");
        return;
      }

      const updatedSeries = await updateResponse.json();
      console.log("Series updated with cover:", updatedSeries);

      alert("Series created successfully with cover!");
      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Error creating series:", error);
      alert("Error creating series.");
    }
  });
});