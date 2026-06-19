document.addEventListener("DOMContentLoaded", async () => {
    const store = window.DigitalKeysStore;
    if (!(await store.requireAdmin())) return;
    const addFormContainer = document.getElementById("add-product-container");
    const showAddFormBtn = document.getElementById("show-add-form-btn");
    const cancelAddBtn = document.getElementById("cancel-add-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const editModal = document.getElementById("edit-modal");
    const resetProductsBtn = document.getElementById("reset-products-btn");
    const logoutBtn = document.getElementById("admin-logout-btn");

    const addImgInput = document.getElementById("add-image_url");
    const addImgPreview = document.getElementById("add-preview-img");
    const addImgPlaceholder = document.getElementById("add-preview-placeholder");
    const editImgInput = document.getElementById("edit-image_url");
    const editImgPreview = document.getElementById("edit-preview-img");

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid fa-circle-info toast-icon"></i><span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 240);
        }, 2800);
    }

    function updatePreview(input, imgElement, placeholderElement = null) {
        const url = input.value.trim();
        if (url) {
            imgElement.src = url;
            imgElement.classList.remove("hidden");
            placeholderElement?.classList.add("hidden");
        } else {
            imgElement.classList.add("hidden");
            placeholderElement?.classList.remove("hidden");
        }
    }

    function productFrom(prefix) {
        return {
            name: document.getElementById(`${prefix}-name`).value,
            platform: document.getElementById(`${prefix}-platform`).value,
            duration: document.getElementById(`${prefix}-duration`).value,
            image_url: document.getElementById(`${prefix}-image_url`).value,
            price: parseFloat(document.getElementById(`${prefix}-price`).value),
            price_before: document.getElementById(`${prefix}-price_before`).value
                ? parseFloat(document.getElementById(`${prefix}-price_before`).value)
                : null,
            stock: parseInt(document.getElementById(`${prefix}-stock`).value, 10)
        };
    }

    async function loadStats() {
        const stats = await store.getStats();
        document.getElementById("stat-products").textContent = stats.total_products;
        document.getElementById("stat-orders").textContent = stats.total_orders;
        document.getElementById("stat-revenue").textContent = store.formatMoney(stats.total_revenue);
    }

    async function loadProducts() {
        const list = document.getElementById("products-list");
        const products = await store.getProducts();
        list.innerHTML = "";
        if (products.length === 0) {
            list.innerHTML = `<tr><td colspan="6" class="text-center">No hay productos.</td></tr>`;
            return;
        }
        products.forEach((product) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><img src="${escapeHtml(product.image_url)}" alt="" class="table-product-image"></td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.platform)}</td>
                <td>${store.formatMoney(product.price)}</td>
                <td>${Number(product.stock || 0)}</td>
                <td class="text-right">
                    <button class="icon-btn edit-btn" type="button" data-id="${product.id}" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn delete-btn" type="button" data-id="${product.id}" title="Eliminar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });
    }

    async function loadOrders() {
        const list = document.getElementById("orders-list");
        const history = await store.getHistory();
        list.innerHTML = "";
        if (history.length === 0) {
            list.innerHTML = `<tr><td colspan="7" class="text-center">No hay historial todavia.</td></tr>`;
            return;
        }

        history.forEach((entry) => {
            const tr = document.createElement("tr");
            const details = entry.type === "topup" ? "Recarga de saldo" : escapeHtml(entry.items_json || "Compra");
            const proofLink = entry.proof_url
                ? `<a class="button-secondary" href="${escapeHtml(entry.proof_url)}" target="_blank" rel="noopener" style="min-height:34px; padding:0 10px;">Comprobante</a>`
                : "";
            const approveButton = entry.type === "topup" && entry.status === "pending"
                ? `<button class="cta-button approve-btn" type="button" data-id="${entry.id}" style="min-height:34px; padding:0 10px;">Aprobar</button>`
                : "";
            tr.innerHTML = `
                <td><strong>${escapeHtml(entry.order_id_str)}</strong></td>
                <td>${escapeHtml(entry.customer_email || "")}</td>
                <td>${details}</td>
                <td>${store.formatMoney(entry.total || entry.amount_usd)}</td>
                <td><span class="payment-tag">${escapeHtml(entry.payment_method)}</span></td>
                <td><span class="status-tag status-${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</span></td>
                <td class="text-right">
                    ${proofLink}
                    ${approveButton}
                    <button class="icon-btn delete-req-btn" type="button" data-id="${entry.id}" data-type="${entry.type}" title="Borrar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });
    }

    async function loadUsers() {
        const list = document.getElementById("users-list");
        const users = await store.getUsers();
        list.innerHTML = "";
        if (users.length === 0) {
            list.innerHTML = `<tr><td colspan="4" class="text-center">No hay usuarios todavia.</td></tr>`;
            return;
        }
        users.forEach((user) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${escapeHtml(user.email)}</td>
                <td>${store.formatMoney(user.balance)}</td>
                <td>${user.is_admin ? "Admin" : "Cliente"}</td>
                <td class="text-right">
                    <button class="cta-button edit-balance-btn" type="button" data-id="${escapeHtml(user.id)}" data-email="${escapeHtml(user.email)}" data-balance="${Number(user.balance || 0)}" style="min-height:34px; padding:0 10px;">Editar saldo</button>
                </td>
            `;
            list.appendChild(tr);
        });
    }

    async function loadAll() {
        await loadStats();
        await loadUsers();
        await loadProducts();
        await loadOrders();
    }

    addImgInput.addEventListener("input", () => updatePreview(addImgInput, addImgPreview, addImgPlaceholder));
    editImgInput.addEventListener("input", () => updatePreview(editImgInput, editImgPreview));

    showAddFormBtn.addEventListener("click", () => {
        addFormContainer.classList.remove("hidden");
        showAddFormBtn.classList.add("hidden");
        document.getElementById("add-name").focus();
    });

    cancelAddBtn.addEventListener("click", () => {
        addFormContainer.classList.add("hidden");
        showAddFormBtn.classList.remove("hidden");
        document.getElementById("add-product-form").reset();
        addImgPreview.classList.add("hidden");
        addImgPlaceholder.classList.remove("hidden");
    });

    cancelEditBtn.addEventListener("click", () => editModal.classList.add("hidden"));
    editModal.addEventListener("click", (event) => {
        if (event.target === editModal) editModal.classList.add("hidden");
    });

    document.getElementById("add-product-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        await store.addProduct(productFrom("add"));
        showToast("Producto agregado", "success");
        cancelAddBtn.click();
        await loadAll();
    });

    document.getElementById("products-list").addEventListener("click", async (event) => {
        const deleteBtn = event.target.closest(".delete-btn");
        if (deleteBtn) {
            if (!confirm("Eliminar este producto?")) return;
            await store.deleteProduct(deleteBtn.dataset.id);
            showToast("Producto eliminado", "success");
            await loadAll();
            return;
        }

        const editBtn = event.target.closest(".edit-btn");
        if (!editBtn) return;
        const product = (await store.getProducts()).find((item) => String(item.id) === String(editBtn.dataset.id));
        if (!product) return;
        document.getElementById("edit-id").value = product.id;
        document.getElementById("edit-name").value = product.name;
        document.getElementById("edit-platform").value = product.platform;
        document.getElementById("edit-duration").value = product.duration;
        document.getElementById("edit-price").value = product.price;
        document.getElementById("edit-price_before").value = product.price_before || "";
        document.getElementById("edit-stock").value = product.stock;
        editImgInput.value = product.image_url;
        updatePreview(editImgInput, editImgPreview);
        editModal.classList.remove("hidden");
    });

    document.getElementById("edit-product-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = document.getElementById("edit-id").value;
        await store.updateProduct(id, productFrom("edit"));
        editModal.classList.add("hidden");
        showToast("Producto actualizado", "success");
        await loadAll();
    });

    document.getElementById("orders-list").addEventListener("click", async (event) => {
        const approveBtn = event.target.closest(".approve-btn");
        if (approveBtn) {
            await store.approveTopup(approveBtn.dataset.id);
            showToast("Recarga aprobada y saldo actualizado", "success");
            await loadAll();
            return;
        }

        const deleteBtn = event.target.closest(".delete-req-btn");
        if (!deleteBtn) return;
        if (!confirm("Borrar este registro del historial?")) return;
        await store.deleteHistoryItem(deleteBtn.dataset.type, deleteBtn.dataset.id);
        showToast("Registro eliminado", "success");
        await loadAll();
    });

    document.getElementById("users-list").addEventListener("click", async (event) => {
        const button = event.target.closest(".edit-balance-btn");
        if (!button) return;
        const nextBalance = prompt(`Nuevo saldo para ${button.dataset.email}:`, button.dataset.balance);
        if (nextBalance === null) return;
        const parsed = Number(nextBalance);
        if (Number.isNaN(parsed) || parsed < 0) {
            showToast("Saldo invalido", "error");
            return;
        }
        await store.setUserBalance(button.dataset.id, parsed);
        showToast("Saldo actualizado", "success");
        await loadAll();
    });

    resetProductsBtn.addEventListener("click", async () => {
        if (!confirm("Restaurar el catalogo original?")) return;
        await store.resetProducts();
        showToast("Catalogo restaurado", "success");
        await loadAll();
    });

    logoutBtn.addEventListener("click", async () => {
        await store.logoutAdmin();
        window.location.href = "admin-login.html";
    });

    await loadAll();
});
