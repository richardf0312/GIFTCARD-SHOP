document.addEventListener("DOMContentLoaded", async () => {
    const store = window.DigitalKeysStore;
    if (!(await store.requireAuth("login.html"))) return;
    const balanceEl = document.getElementById("dashboard-balance");
    const ordersCountEl = document.getElementById("dashboard-orders");
    const pendingEl = document.getElementById("dashboard-pending");
    const ordersList = document.getElementById("orders-list");
    const topupsList = document.getElementById("topups-list");
    const logoutBtn = document.getElementById("logout-btn");

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) return "";
        return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    }

    async function renderOrders() {
        const orders = await store.getUserOrders();
        ordersList.innerHTML = "";
        if (orders.length === 0) {
            ordersList.innerHTML = `<div class="empty-state">No hay compras registradas.</div>`;
            return;
        }
        orders.forEach((order) => {
            const item = document.createElement("div");
            item.className = "history-item";
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(order.order_id_str)}</strong>
                    <span>${escapeHtml(order.items_json)} | ${formatDate(order.created_at)}</span>
                </div>
                <strong>${store.formatMoney(order.total)}</strong>
            `;
            ordersList.appendChild(item);
        });
    }

    async function renderTopups() {
        const topups = await store.getUserTopups();
        topupsList.innerHTML = "";
        if (topups.length === 0) {
            topupsList.innerHTML = `<div class="empty-state">No hay recargas.</div>`;
            return;
        }
        topups.forEach((topup) => {
            const item = document.createElement("div");
            item.className = "history-item";
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(topup.order_id_str)}</strong>
                    <span>${escapeHtml(topup.payment_method)} | ${formatDate(topup.created_at)}</span>
                </div>
                <div class="text-right">
                    <strong>${store.formatMoney(topup.amount_usd)}</strong>
                    <span class="status-tag status-${escapeHtml(topup.status)}">${escapeHtml(topup.status)}</span>
                </div>
            `;
            topupsList.appendChild(item);
        });
    }

    const orders = await store.getUserOrders();
    const topups = await store.getUserTopups();
    balanceEl.textContent = store.formatMoney(await store.getBalance());
    ordersCountEl.textContent = orders.length;
    pendingEl.textContent = topups.filter((topup) => topup.status === "pending").length;
    logoutBtn.addEventListener("click", async () => {
        await store.clearSession();
        window.location.href = "index.html";
    });
    await renderOrders();
    await renderTopups();
});
