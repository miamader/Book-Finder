const API_BASE = "https://book-finder-production-5c8b.up.railway.app";

const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = signupForm.querySelector('input[type="email"]').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password,
            })
        });

        if (response.ok) {
            alert("Sign up successful! Redirecting to login...");
            window.location.href = 'login.html';
        } else {
            const error = await response.json();
            alert("Error: " + (error.message || "Signup failed"));
        }
    } catch (err) {
        console.error("Signup error:", err);
    }
});
