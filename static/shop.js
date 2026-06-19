document.addEventListener("DOMContentLoaded", async () => {
    const store = window.DigitalKeysStore;
    const productsGrid = document.getElementById("products-grid");
    const searchInput = document.getElementById("search-input");
    const cartCount = document.getElementById("cart-count");
    const balanceEl = document.getElementById("header-balance");
    const accountLink = document.getElementById("account-link");
    const loginLink = document.getElementById("login-link");
    const registerLink = document.getElementById("register-link");
    const platformFilters = document.getElementById("platform-filters");
    const filterButtons = platformFilters ? platformFilters.querySelectorAll(".platform-pill") : [];
    const shortcutButtons = document.querySelectorAll("[data-search-shortcut]");

    let allProducts = await store.getProducts();
    let currentFilter = "all";

    function platformMatches(product, filter) {
        const platform = product.platform.toLowerCase();
        const name = product.name.toLowerCase();
        if (filter === "all") return true;
        if (filter === "tarjeta") {
            return ["tarjeta", "roblox", "fortnite", "amazon", "netflix", "apple", "free fire", "otro"]
                .some((entry) => platform.includes(entry) || name.includes(entry));
        }
        if (filter === "playstation") {
            return platform.includes("playstation") || platform.includes("psn");
        }
        return platform.includes(filter);
    }

    function filterAndDisplay() {
        const searchTerm = (searchInput?.value || "").trim().toLowerCase();
        const filtered = allProducts.filter((product) => {
            const target = `${product.name} ${product.platform} ${product.duration}`.toLowerCase();
            return target.includes(searchTerm) && platformMatches(product, currentFilter);
        });
        displayProducts(filtered);
    }

    function displayProducts(products) {
        productsGrid.innerHTML = "";
        if (products.length === 0) {
            productsGrid.innerHTML = `<div class="empty-state">No hay productos para este filtro.</div>`;
            return;
        }

        products.forEach((product) => {
            const productCard = document.createElement("article");
            productCard.className = "product-card";
            const hasDiscount = product.price_before && Number(product.price_before) > Number(product.price);
            const discount = hasDiscount
                ? Math.round(((product.price_before - product.price) / product.price_before) * 100)
                : 0;

            productCard.innerHTML = `
                ${hasDiscount ? `<div class="discount-badge">-${discount}%</div>` : ""}
                <div class="stock-badge">${product.stock} uds</div>
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-platform">
                            <i class="fa-solid fa-gamepad"></i>
                            <span>${product.platform} | ${product.duration}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="price-box">
                            ${hasDiscount ? `<span class="price-old">${store.formatMoney(product.price_before)}</span>` : ""}
                            <span class="price-new">${store.formatMoney(product.price)}</span>
                        </div>
                        <button class="btn-card-add" type="button" data-id="${product.id}" aria-label="Agregar ${product.name}">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
            `;
            productsGrid.appendChild(productCard);
        });
    }

    async function updateHeader() {
        const cart = store.getCart();
        const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        if (cartCount) cartCount.textContent = totalItems;
        if (balanceEl) balanceEl.textContent = store.formatMoney(await store.getBalance());
        const logged = await store.isAuthenticated();
        accountLink?.classList.toggle("hidden", !logged);
        loginLink?.classList.toggle("hidden", logged);
        registerLink?.classList.toggle("hidden", logged);
    }

    filterButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterButtons.forEach((item) => item.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.platform;
            filterAndDisplay();
        });
    });

    shortcutButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (!searchInput) return;
            searchInput.value = btn.dataset.searchShortcut;
            currentFilter = "all";
            filterButtons.forEach((item) => item.classList.toggle("active", item.dataset.platform === "all"));
            filterAndDisplay();
            document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    searchInput?.addEventListener("input", filterAndDisplay);

    productsGrid.addEventListener("click", async (event) => {
        const button = event.target.closest(".btn-card-add");
        if (!button) return;
        const product = await store.addToCart(button.dataset.id);
        if (!product) return;
        await updateHeader();
        const previous = button.innerHTML;
        button.innerHTML = `<i class="fa-solid fa-check"></i>`;
        button.style.backgroundColor = "var(--green)";
        setTimeout(() => {
            button.innerHTML = previous;
            button.style.backgroundColor = "";
        }, 850);
    });

    window.addEventListener("storage", async () => {
        allProducts = await store.getProducts();
        await updateHeader();
        filterAndDisplay();
    });

    await updateHeader();
    filterAndDisplay();
});
