document.addEventListener("DOMContentLoaded", () => {
    const store = window.DigitalKeysStore;
    const form = document.getElementById("admin-auth-form");
    const username = document.getElementById("admin-username");
    const password = document.getElementById("admin-password");
    const alertBox = document.getElementById("admin-auth-alert");
    const adminUser = "ADMIN";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const typedUser = username.value.trim().toUpperCase();
            if (typedUser !== adminUser) {
                throw new Error("Credenciales de admin incorrectas.");
            }
            await store.loginAdmin(password.value);
            window.location.assign("adminpanelconfig.html");
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.classList.remove("hidden");
        }
    });
});
