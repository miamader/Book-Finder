const API_BASE = "https://book-finder-production-5c8b.up.railway.app";

// ----------------------------
// INTERNAL STATE
// ----------------------------
let token = localStorage.getItem("token");
let currentUser = null;

const listeners = new Set();

// ----------------------------
// HELPERS
// ----------------------------
function notify() {
    const state = auth.getState();
    listeners.forEach((cb) => cb(state));
}

// ----------------------------
// AUTH OBJECT
// ----------------------------
export const auth = {
    // ----------------------------
    // SUBSCRIBE (for navbar, etc.)
    // ----------------------------
    subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
    },

    // ----------------------------
    // STATE ACCESS
    // ----------------------------
    getState() {
        return {
            user: currentUser,
            token,
            isAuthenticated: !!currentUser,
        };
    },

    getToken() {
        return token;
    },

    // ----------------------------
    // INIT (validate token + load user)
    // ----------------------------
    async init() {
        if (!token) {
            currentUser = null;
            notify();
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error("Invalid token");

            currentUser = await res.json();
        } catch (err) {
            console.warn("Auth init failed:", err);

            token = null;
            currentUser = null;
            localStorage.removeItem("token");
        }

        notify();
    },

    // ----------------------------
    // LOGIN
    // ----------------------------
    async login(newToken) {
        token = newToken;
        localStorage.setItem("token", newToken);

        await this.init(); // fetch user + notify
    },

    // ----------------------------
    // LOGOUT
    // ----------------------------
    logout() {
        token = null;
        currentUser = null;

        localStorage.removeItem("token");

        notify();
    },
};