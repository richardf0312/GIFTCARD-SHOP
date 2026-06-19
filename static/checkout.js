document.addEventListener("DOMContentLoaded", async () => {
    const store = window.DigitalKeysStore;
    if (!(await store.requireAuth("login.html"))) return;
    const cartItemsList = document.getElementById("cart-items-list");
    const totalEl = document.getElementById("summary-total");
    const payBtn = document.getElementById("pay-balance-btn");
    const errorBox = document.getElementById("balance-error");
    const currentBalance = document.getElementById("current-balance");

    let cart = store.getCart();
    let totalAmount = 0;

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function loadCartItems() {
        cartItemsList.innerHTML = "";
        totalAmount = 0;
        currentBalance.textContent = store.formatMoney(await store.getBalance());

        if (cart.length === 0) {
            cartItemsList.innerHTML = `<div class="empty-state">Tu carrito esta vacio.</div>`;
            payBtn.disabled = true;
            totalEl.textContent = "$0.00";
            return;
        }

        payBtn.disabled = false;
        cart.forEach((item) => {
            const itemElement = document.createElement("div");
            itemElement.className = "cart-item";
            itemElement.innerHTML = `
                <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                <div class="item-info">
                    <p>${escapeHtml(item.name)}</p>
                    <span class="item-price">${store.formatMoney(item.price)} x ${item.quantity}</span>
                </div>
                <div class="item-total">${store.formatMoney(item.price * item.quantity)}</div>
                <button class="remove-item-btn" type="button" data-id="${item.id}" aria-label="Quitar">&times;</button>
            `;
            cartItemsList.appendChild(itemElement);
            totalAmount += Number(item.price) * Number(item.quantity);
        });

        totalEl.textContent = store.formatMoney(totalAmount);
    }

    cartItemsList.addEventListener("click", async (event) => {
        const button = event.target.closest(".remove-item-btn");
        if (!button) return;
        store.removeFromCart(button.dataset.id);
        cart = store.getCart();
        await loadCartItems();
    });

    payBtn.addEventListener("click", async () => {
        payBtn.disabled = true;
        payBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando`;
        errorBox.classList.add("hidden");

        try {
            await store.createOrder(cart);
            alert("Compra realizada con exito.");
            window.location.href = "dashboard.html";
        } catch (error) {
            errorBox.innerHTML = `${escapeHtml(error.message)} <a href="topup.html">Recargar ahora</a>`;
            errorBox.classList.remove("hidden");
            payBtn.disabled = false;
            payBtn.innerHTML = `<i class="fa-solid fa-wallet"></i> Pagar con saldo`;
        }
    });

    await loadCartItems();
});
