document.addEventListener("DOMContentLoaded", () => {
    const store = window.DigitalKeysStore;
    const form = document.getElementById("auth-form");
    const email = document.getElementById("auth-email");
    const password = document.getElementById("auth-password");
    const alertBox = document.getElementById("auth-alert");
    const adminUser = "ADMIN";
    const adminPassword = "ADMIN0312";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const typedUser = email.value.trim().toUpperCase();
            const typedPassword = password.value.trim().toUpperCase();
            if (form.dataset.mode === "login" && typedUser === adminUser && typedPassword === adminPassword) {
                await store.loginAdmin(password.value);
                window.location.href = "adminpanelconfig.html";
                return;
            }

            if (form.dataset.mode === "register") {
                await store.registerUser(email.value, password.value);
            } else {
                await store.loginUser(email.value, password.value);
            }
            window.location.href = "dashboard.html";
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.classList.remove("hidden");
        }
    });
});
