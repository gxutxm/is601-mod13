// Dashboard — fetches the authenticated user via GET /users/me.
(function () {
  const statusEl = document.getElementById("status");
  const logoutBtn = document.getElementById("logout-btn");

  async function loadUser() {
    if (!api.getToken()) {
      window.location.href = "/login";
      return;
    }

    try {
      const { ok, status, data } = await api.request("/users/me", {
        auth: true,
      });

      if (ok && data) {
        document.getElementById("username").textContent = data.username;
        document.getElementById("user-id").textContent = data.id;
        document.getElementById("user-email").textContent = data.email;
        document.getElementById("user-created").textContent = new Date(
          data.created_at
        ).toLocaleString();
      } else if (status === 401) {
        // Token is expired or invalid — force a fresh login.
        api.clearToken();
        window.location.href = "/login";
      } else {
        api.showStatus(
          statusEl,
          data?.detail || "Failed to load your profile.",
          "error"
        );
      }
    } catch (err) {
      api.showStatus(statusEl, "Network error loading profile.", "error");
    }
  }

  logoutBtn.addEventListener("click", () => {
    api.clearToken();
    window.location.href = "/login";
  });

  loadUser();
})();
