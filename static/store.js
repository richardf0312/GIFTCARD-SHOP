(function () {
    const STORAGE_KEYS = {
        products: "dk_products_v2",
        cart: "dk_cart_v2",
        orders: "dk_orders_v2",
        topups: "dk_topups_v2",
        users: "arzkeys_users_v1",
        balance: "dk_balance_v2",
        session: "dk_session_v2",
        adminSession: "arzkeys_admin_session_v1",
        pendingPayment: "dk_pending_payment_v2"
    };

    const SUPABASE_CONFIG = window.ARZKEYS_SUPABASE || {};
    const POCKETBASE_CONFIG = window.ARZKEYS_POCKETBASE || {};
    const PB_AUTH_KEY = "arzkeys_pb_auth_v1";
    let supabaseClient = null;

    function hasSupabase() {
        return Boolean(
            window.supabase &&
            SUPABASE_CONFIG.url &&
            SUPABASE_CONFIG.anonKey
        );
    }

    function db() {
        if (!hasSupabase()) return null;
        if (!supabaseClient) {
            supabaseClient = window.supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );
        }
        return supabaseClient;
    }

    function hasPocketBase() {
        return Boolean(POCKETBASE_CONFIG.url);
    }

    function pbBaseUrl() {
        return String(POCKETBASE_CONFIG.url || "").replace(/\/+$/, "");
    }

    function pbAuth() {
        return readJson(PB_AUTH_KEY, null);
    }

    function setPbAuth(auth) {
        writeJson(PB_AUTH_KEY, auth);
        return auth;
    }

    function clearPbAuth() {
        localStorage.removeItem(PB_AUTH_KEY);
    }

    function pbHeaders(json = true) {
        const auth = pbAuth();
        const headers = json ? { "Content-Type": "application/json" } : {};
        if (auth?.token) headers.Authorization = auth.token;
        return headers;
    }

    async function pbRequest(path, options = {}) {
        const isForm = options.body instanceof FormData;
        const response = await fetch(`${pbBaseUrl()}${path}`, {
            ...options,
            headers: {
                ...pbHeaders(!isForm && options.body !== undefined),
                ...(options.headers || {})
            }
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
            throw new Error(friendlyAuthError(data?.message || data?.data?.message || response.statusText));
        }
        return data;
    }

    function pbFileUrl(collection, recordId, fileName) {
        if (!fileName) return "";
        return `${pbBaseUrl()}/api/files/${collection}/${recordId}/${encodeURIComponent(fileName)}`;
    }

    function normalizeUser(record) {
        return {
            id: record.id,
            email: record.email,
            balance: Number(record.balance || 0),
            is_admin: Boolean(record.is_admin),
            created_at: record.created || record.created_at
        };
    }

    function sameId(left, right) {
        return String(left) === String(right);
    }

    function normalizeProduct(row) {
        return {
            id: row.id,
            name: row.name,
            platform: row.platform,
            duration: row.duration,
            price: Number(row.price || 0),
            price_before: row.price_before === null || row.price_before === undefined ? null : Number(row.price_before),
            stock: Number(row.stock || 0),
            image_url: row.image_url
        };
    }

    function normalizeOrder(row) {
        return {
            id: row.id,
            order_id_str: row.order_id_str,
            customer_email: row.customer_email,
            items_json: row.items_json,
            items_count: row.items_count || 0,
            total: Number(row.total_cost || row.total || 0),
            payment_method: row.payment_method || "balance",
            status: row.status,
            type: "order",
            created_at: row.created || row.created_at
        };
    }

    function normalizeTopup(row) {
        const proofFile = row.proof || "";
        const proofUrl = row.proof_url || (proofFile ? pbFileUrl(row.collectionName || "topups", row.id, proofFile) : "");
        return {
            id: row.id,
            order_id_str: row.order_id_str,
            customer_email: row.customer_email,
            items_count: 1,
            total: Number(row.amount_usd || row.total || 0),
            amount_usd: Number(row.amount_usd || row.total || 0),
            payment_method: row.payment_method,
            crypto_amount: row.crypto_amount,
            wallet_address: row.wallet_address,
            proof_path: row.proof_path || proofFile,
            proof_url: proofUrl,
            status: row.status,
            type: "topup",
            created_at: row.created || row.created_at
        };
    }

    const wallets = {
        btc: {
            label: "Bitcoin",
            ticker: "BTC",
            rate: 110222.77,
            address: "1MC2jeNmzoZKpimtspj7MTXBteu4gZbehe"
        },
        ltc: {
            label: "Litecoin",
            ticker: "LTC",
            rate: 97.33,
            address: "LghCzBcyxCAqcG587u7oYuoFvBsBBhqM77"
        },
        usdt: {
            label: "USDT BSC / BNB Smart Chain",
            ticker: "USDT",
            rate: 1,
            address: "0x1142Fb00612E26D2212DE3ca60130B06Ed063Cb6 | Red: BSC / BNB Smart Chain"
        },
        eth: {
            label: "Ethereum",
            ticker: "ETH",
            rate: 3866.14,
            address: "0x1142Fb00612E26D2212DE3ca60130B06Ed063Cb6"
        },
        bank: {
            label: "Transferencia MX",
            ticker: "MXN",
            rate: 18.56,
            address: "CLABE: 710969000168453085 | Nombre: Victor Manuel Hernandez Sanchez | Banco: NVIO"
        }
    };

    const seedProducts = [
        {
            id: 1,
            name: "Roblox - 2300 Robux Key GLOBAL",
            platform: "Roblox",
            duration: "2300 Robux",
            price: 6.99,
            price_before: 19.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/NeSQ0os6pb64cS9YeLahlDBdexLuF2qmaZhjsDmb5rA/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9M/MzVWMXpUZEhPNEZw/bFFYbnUtZ3FULWZa/bjVLNnJaWUE0M1Aw/bWJlRmV3LmpwZw"
        },
        {
            id: 2,
            name: "Roblox - 11,000 Robux Key GLOBAL",
            platform: "Tarjeta",
            duration: "11,000",
            price: 25.99,
            price_before: 99.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/NeSQ0os6pb64cS9YeLahlDBdexLuF2qmaZhjsDmb5rA/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9M/MzVWMXpUZEhPNEZw/bFFYbnUtZ3FULWZa/bjVLNnJaWUE0M1Aw/bWJlRmV3LmpwZw"
        },
        {
            id: 3,
            name: "Roblox - 5250 Robux Key GLOBAL",
            platform: "Tarjeta",
            duration: "5250",
            price: 12.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/NeSQ0os6pb64cS9YeLahlDBdexLuF2qmaZhjsDmb5rA/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9M/MzVWMXpUZEhPNEZw/bFFYbnUtZ3FULWZa/bjVLNnJaWUE0M1Aw/bWJlRmV3LmpwZw"
        },
        {
            id: 4,
            name: "PlayStation Plus Premium: 12 Months PSN codigo GLOBAL",
            platform: "PlayStation",
            duration: "12 Months",
            price: 19.99,
            price_before: 99.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/K5iVZe4JSG98qsYZIjS0Lf3lR9BZAr-edk6EUgsFodg/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9u/Q1JSXzR3ZzhoRTBh/Q2N1ZEozem9HRU0w/ZUhyUzg5Wm44cWsx/MzNHVUkwLmpwZw"
        },
        {
            id: 5,
            name: "PlayStation Plus Premium: 6 Months PSN codigo GLOBAL",
            platform: "PlayStation",
            duration: "6 Months",
            price: 12.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/K5iVZe4JSG98qsYZIjS0Lf3lR9BZAr-edk6EUgsFodg/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9u/Q1JSXzR3ZzhoRTBh/Q2N1ZEozem9HRU0w/ZUhyUzg5Wm44cWsx/MzNHVUkwLmpwZw"
        },
        {
            id: 6,
            name: "PlayStation Plus Premium: 3 Months PSN codigo GLOBAL",
            platform: "PlayStation",
            duration: "3 Months",
            price: 6.99,
            price_before: 25.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/K5iVZe4JSG98qsYZIjS0Lf3lR9BZAr-edk6EUgsFodg/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9u/Q1JSXzR3ZzhoRTBh/Q2N1ZEozem9HRU0w/ZUhyUzg5Wm44cWsx/MzNHVUkwLmpwZw"
        },
        {
            id: 7,
            name: "Xbox Game Pass Ultimate - 12 Month Subscription GLOBAL",
            platform: "Xbox",
            duration: "12 Month",
            price: 18.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/uI_93AuPHwkeSOqRwk23PjPM96BzPJ1y_bAfE9AbZdg/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9L/RFVyVTRjQ1d4LVlw/b1VtYlM4T1B1MmpR/NlNHNG5fcWhneEN3/SktSRVhFLmpwZWc"
        },
        {
            id: 8,
            name: "Xbox Game Pass Ultimate - 6 Month Subscription GLOBAL",
            platform: "Xbox",
            duration: "6 Month",
            price: 12.99,
            price_before: 35.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/ii7AvqZABGIwK79JwU83RsFKnjx0-lwr7nCeosVNNl0/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9m/V2xiSmM5VDZYLXhF/d2llbmRkNEhiODYz/S3d6SDdfaTVQWElU/c3ZqYTU0LmpwZWc"
        },
        {
            id: 9,
            name: "Xbox Game Pass Ultimate - 3 Month Subscription GLOBAL",
            platform: "Xbox",
            duration: "3 Month",
            price: 5.99,
            price_before: 12.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/Jsh3xEtikh92v1k8-OBwq8xsokyc4Bvh2AxgXznfxKY/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9Z/Wk0tODFtRnc0cVZF/SjdKekoweW1IdWR4/VlFYMnB3UTRWRjJS/UG9Pa2tNLmpwZWc"
        },
        {
            id: 10,
            name: "Tarjeta Regalo Steam 100 USD codigo GLOBAL",
            platform: "Steam",
            duration: "100 USD",
            price: 14.99,
            price_before: 100,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/nyins11bh_gOXYPOhFHOfbJJomR9PUQjN7thfWG7dXo/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9B/enMzWURNLTBuTmNn/c0w0TVFJdFlXeE1z/a3RGMl9XelIyQXdv/NVdCcHR3LmpwZWc"
        },
        {
            id: 11,
            name: "Tarjeta Regalo Steam 80 USD codigo GLOBAL",
            platform: "Steam",
            duration: "80 USD",
            price: 12.99,
            price_before: 80,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/nyins11bh_gOXYPOhFHOfbJJomR9PUQjN7thfWG7dXo/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9B/enMzWURNLTBuTmNn/c0w0TVFJdFlXeE1z/a3RGMl9XelIyQXdv/NVdCcHR3LmpwZWc"
        },
        {
            id: 12,
            name: "Tarjeta Regalo Steam 50 USD codigo GLOBAL",
            platform: "Steam",
            duration: "50 USD",
            price: 8.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/hQ2zS0No9tA2EtJ0nCYH8u0hcPf3xcW4byI2XGJGAtI/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9w/VWh5X0hLQU9mamto/NllsaG5VNmVBRFVa/Y3BCbU1XOUp5cDBR/b1NtcHJvLmpwZWc"
        },
        {
            id: 13,
            name: "Garena Free Fire - 12,300 Diamonds Key GLOBAL",
            platform: "Tarjeta",
            duration: "12,300 Diamonds",
            price: 15.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/_41ih9hcfGcWFojkQm6fymb_sEWgEwSPOacibFcXJXA/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9h/QndQaWgtbVdHVG5r/ekZzbmJCVElpOXpM/N1dvNWI4a1doQmwy/YU9JRW5FLmpwZw"
        },
        {
            id: 14,
            name: "Garena Free Fire - 5250 Diamonds Key GLOBAL",
            platform: "Tarjeta",
            duration: "5250 Diamonds",
            price: 10.99,
            price_before: 35.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/_41ih9hcfGcWFojkQm6fymb_sEWgEwSPOacibFcXJXA/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9h/QndQaWgtbVdHVG5r/ekZzbmJCVElpOXpM/N1dvNWI4a1doQmwy/YU9JRW5FLmpwZw"
        },
        {
            id: 15,
            name: "Garena Free Fire - 2585 Diamonds Key GLOBAL",
            platform: "Tarjeta",
            duration: "2585 Diamonds",
            price: 7.99,
            price_before: 25.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/_41ih9hcfGcWFojkQm6fymb_sEWgEwSPOacibFcXJXA/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9h/QndQaWgtbVdHVG5r/ekZzbmJCVElpOXpM/N1dvNWI4a1doQmwy/YU9JRW5FLmpwZw"
        },
        {
            id: 16,
            name: "Fortnite - 13500 V-Bucks Gift Card codigo GLOBAL",
            platform: "Tarjeta",
            duration: "13500 V-Bucks",
            price: 15.99,
            price_before: 89.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/Hgi9frwSDw3TSd93Hay7e0N_wJELplS4Pbbe6pgyHzE/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9Y/S3h1VEE5cHAxclBM/VVVUUW5ZcWtMRWFl/R0ptQTFja2VRZkxN/aFBJTEV3LmpwZWc"
        },
        {
            id: 17,
            name: "Fortnite - 5000 V-Bucks Gift Card codigo GLOBAL",
            platform: "Tarjeta",
            duration: "5000 V-Bucks",
            price: 9.99,
            price_before: 36.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/JWfZIePeWAaoKg_QwOwfY1t4Npk_3FwsKT5vQMv96oQ/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy80/cVQwQW5IZW9vMGc3/Sk9ITmhNWVRYSDdG/M2pVaGtwLVd6Q3FI/LUVMblY0LmpwZWc"
        },
        {
            id: 18,
            name: "Fortnite - 2800 V-Bucks Gift Card codigo GLOBAL",
            platform: "Otro",
            duration: "2800 V-Bucks",
            price: 6.99,
            price_before: 22.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/e5xmi0_LG0bHnt9yRD76u9FvWe5mh_rgI3IeFGGds9s/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9L/bk5nalN0V2RHcmxV/cmhWLUZ4LU84dXBu/aUVkLU9wdnZqNTJR/TUY0OUo4LmpwZWc"
        },
        {
            id: 19,
            name: "Netflix Gift Card 100 USD Key UNITED STATES",
            platform: "Tarjeta",
            duration: "100 USD",
            price: 18.99,
            price_before: 99.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/FMSoZU9O-9viWhnme7tnw8SXv3B55hlrCzl9-G_9XG8/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9z/SUVUSGVXMmFEV1RO/WU5YdU9VcURGeTRD/TXRTTW5uSE8tLTl6/c1dQSGNJLmpwZWc"
        },
        {
            id: 20,
            name: "Netflix Gift Card 50 USD Key UNITED STATES",
            platform: "Tarjeta",
            duration: "50 USD",
            price: 12.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/FMSoZU9O-9viWhnme7tnw8SXv3B55hlrCzl9-G_9XG8/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9z/SUVUSGVXMmFEV1RO/WU5YdU9VcURGeTRD/TXRTTW5uSE8tLTl6/c1dQSGNJLmpwZWc"
        },
        {
            id: 21,
            name: "Netflix Gift Card 30 USD Key UNITED STATES",
            platform: "Tarjeta",
            duration: "30 USD",
            price: 7.99,
            price_before: 29.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/j4TxKD9OmbLGJPIjMWk9MOm9Vd-j-QC25F1lT7d335U/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9f/cGx4TmJNWHRxQ0lj/UmtEX3BOVW1DYVRr/dVJVb19xWHVlbE4t/Rl9iSXpFLmpwZWc"
        },
        {
            id: 22,
            name: "Amazon Gift Card 30 USD GLOBAL",
            platform: "Tarjeta",
            duration: "30 USD",
            price: 6.99,
            price_before: 29.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/JBUvsta5af0tSzLEnYlBPq8TpibqWfmiNGCKwqn_p4k/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9O/bHpjV1Q0Yk1aMnFJ/aHVuZlRiSW5kcjZD/dFNUS1lDNEs2SEpu/MEFuYi04LmpwZWc"
        },
        {
            id: 23,
            name: "Amazon Gift Card 50 USD GLOBAL",
            platform: "Tarjeta",
            duration: "50 USD",
            price: 8.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/-QDjbRbynpF095XsRbelbZVz2VDUgiu8foqz-uTH5eU/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy94/ajR2QzloVVBzM01L/eFczV3BER0tZTndU/ZlQ3cjNKUUtOdndS/QzRhQkFZLnBuZw"
        },
        {
            id: 24,
            name: "Amazon Gift Card 100 USD GLOBAL",
            platform: "Tarjeta",
            duration: "100 USD",
            price: 29.99,
            price_before: 99.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/G5PfTBQIoTES6qtnifUEvTGDpmKG_MJmS_f31S8-5cg/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy8w/Z1VEcE84ZkVOUXBi/NnM3TkNCLW51THJy/S0RyNjQ5N045azhG/bFhFQmx3LnBuZw"
        },
        {
            id: 25,
            name: "Minecraft: Java & Bedrock Edition (PC) Key GLOBAL",
            platform: "Steam",
            duration: "PC",
            price: 5.99,
            price_before: 17.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/NAxumYCfQfUoZDK0_uB3TQyhAYElVKZs45DMfaGO2iI/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9E/YmR4N2loekprNDhi/QVNpX0cwakhFZ3gy/b2JmR1lFX3ROeVdz/anRKNGE0LnBuZw"
        },
        {
            id: 26,
            name: "Apple Gift Card 80 USD Key GLOBAL",
            platform: "Tarjeta",
            duration: "80 USD",
            price: 12.99,
            price_before: 80.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/-pTUgiFZs5RZKQ79Tk2TvKzZ1ODA1hpdWNscqsrUiBE/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9y/X2l5MzVfX25OaE9L/cFN3UTFOX2JWUHF6/X0x1T3UxZmJNdnlK/R0hKaXgwLmpwZw"
        },
        {
            id: 27,
            name: "Apple Gift Card 30 USD Key GLOBAL",
            platform: "Tarjeta",
            duration: "30 USD",
            price: 6.99,
            price_before: 30.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/-pTUgiFZs5RZKQ79Tk2TvKzZ1ODA1hpdWNscqsrUiBE/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9y/X2l5MzVfX25OaE9L/cFN3UTFOX2JWUHF6/X0x1T3UxZmJNdnlK/R0hKaXgwLmpwZw"
        },
        {
            id: 28,
            name: "Apple Gift Card 50 USD Key GLOBAL",
            platform: "Tarjeta",
            duration: "50 USD",
            price: 8.99,
            price_before: 49.99,
            stock: 10,
            image_url: "https://imgproxy.eneba.games/-pTUgiFZs5RZKQ79Tk2TvKzZ1ODA1hpdWNscqsrUiBE/rs:fit:700/ar:1/czM6Ly9wcm9kdWN0/cy5lbmViYS5nYW1l/cy9wcm9kdWN0cy9y/X2l5MzVfX25OaE9L/cFN3UTFOX2JWUHF6/X0x1T3UxZmJNdnlK/R0hKaXgwLmpwZw"
        }
    ];

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn("Storage read failed", error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        return value;
    }

    function nextId(items) {
        return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    }

    function ensureProducts() {
        const existing = readJson(STORAGE_KEYS.products, null);
        if (!existing || existing.length === 0) {
            writeJson(STORAGE_KEYS.products, seedProducts);
        }
    }

    async function getProducts() {
        if (hasPocketBase()) {
            const data = await pbRequest("/api/collections/products/records?sort=-created&perPage=200");
            return data.items && data.items.length ? data.items.map(normalizeProduct) : [];
        }
        if (hasSupabase()) {
            const { data, error } = await db()
                .from("products")
                .select("id,name,platform,duration,price,price_before,stock,image_url")
                .order("id", { ascending: false });
            if (error) throw error;
            return data && data.length ? data.map(normalizeProduct) : seedProducts;
        }
        ensureProducts();
        return readJson(STORAGE_KEYS.products, seedProducts);
    }

    async function saveProducts(products) {
        if (hasPocketBase()) {
            return products;
        }
        if (hasSupabase()) {
            const rows = products.map(({ id, ...product }) => product);
            const { error } = await db().from("products").insert(rows);
            if (error) throw error;
            return products;
        }
        return writeJson(STORAGE_KEYS.products, products);
    }

    function getCart() {
        return readJson(STORAGE_KEYS.cart, []);
    }

    function saveCart(cart) {
        return writeJson(STORAGE_KEYS.cart, cart);
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function friendlyAuthError(error) {
        const message = String(error?.message || error || "");
        const lower = message.toLowerCase();
        if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
            return "No se pudo conectar con la base de datos del VPS. Revisa que PocketBase este activo y tenga HTTPS.";
        }
        if (lower.includes("failed to authenticate") || lower.includes("invalid login")) {
            return "Email o contrasena incorrectos.";
        }
        if (lower.includes("validation")) {
            return "Revisa que los campos y reglas de PocketBase esten bien configurados.";
        }
        if (lower.includes("email rate limit") || lower.includes("over_email_send_rate_limit")) {
            return "Supabase bloqueo temporalmente los registros porque se alcanzo el limite de emails. Desactiva la confirmacion de email en Supabase o configura SMTP propio.";
        }
        if (lower.includes("email not confirmed")) {
            return "Ese email todavia no esta confirmado. Desactiva la confirmacion de email en Supabase o confirma el correo.";
        }
        if (lower.includes("for security purposes")) {
            return "Espera un minuto antes de volver a intentarlo. Supabase esta limitando solicitudes repetidas.";
        }
        if (lower.includes("already registered") || lower.includes("user already registered")) {
            return "Ese email ya tiene cuenta. Inicia sesion.";
        }
        return message || "No se pudo completar la autenticacion.";
    }

    async function getUsers() {
        if (hasPocketBase()) {
            const data = await pbRequest("/api/collections/users/records?sort=-created&perPage=200");
            return (data.items || []).map(normalizeUser);
        }
        if (hasSupabase()) {
            const { data, error } = await db()
                .from("profiles")
                .select("id,email,balance,is_admin,created_at")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []).map((user) => ({
                id: user.id,
                email: user.email,
                balance: Number(user.balance || 0),
                is_admin: user.is_admin,
                created_at: user.created_at
            }));
        }
        return readJson(STORAGE_KEYS.users, []);
    }

    function saveUsers(users) {
        return writeJson(STORAGE_KEYS.users, users);
    }

    async function getSession() {
        if (hasPocketBase()) {
            const auth = pbAuth();
            return auth?.record ? { id: auth.record.id, email: normalizeEmail(auth.record.email) } : null;
        }
        if (hasSupabase()) {
            const { data } = await db().auth.getUser();
            return data.user ? { id: data.user.id, email: normalizeEmail(data.user.email) } : null;
        }
        return readJson(STORAGE_KEYS.session, null);
    }

    function setSession(session) {
        if (hasPocketBase()) return session;
        return writeJson(STORAGE_KEYS.session, {
            email: normalizeEmail(session.email)
        });
    }

    async function clearSession() {
        if (hasPocketBase()) {
            clearPbAuth();
        }
        if (hasSupabase()) {
            await db().auth.signOut();
        }
        localStorage.removeItem(STORAGE_KEYS.session);
    }

    async function getCurrentUser() {
        if (hasPocketBase()) {
            const auth = pbAuth();
            if (!auth?.token || !auth?.record?.id) return null;
            try {
                const record = await pbRequest(`/api/collections/users/records/${auth.record.id}`);
                setPbAuth({ ...auth, record });
                return normalizeUser(record);
            } catch (error) {
                clearPbAuth();
                return null;
            }
        }
        if (hasSupabase()) {
            const { data: authData } = await db().auth.getUser();
            if (!authData.user) return null;
            let { data: profile, error } = await db()
                .from("profiles")
                .select("id,email,balance,is_admin,created_at")
                .eq("id", authData.user.id)
                .maybeSingle();
            if (error) throw error;
            if (!profile) {
                const payload = {
                    id: authData.user.id,
                    email: normalizeEmail(authData.user.email),
                    balance: 0
                };
                const inserted = await db().from("profiles").insert(payload).select().single();
                if (inserted.error) throw inserted.error;
                profile = inserted.data;
            }
            return {
                id: profile.id,
                email: profile.email,
                balance: Number(profile.balance || 0),
                is_admin: profile.is_admin,
                created_at: profile.created_at
            };
        }
        const session = await getSession();
        if (!session || !session.email) return null;
        return (await getUsers()).find((user) => normalizeEmail(user.email) === normalizeEmail(session.email)) || null;
    }

    async function isAuthenticated() {
        return Boolean(await getCurrentUser());
    }

    async function registerUser(email, password) {
        const cleanEmail = normalizeEmail(email);
        const cleanPassword = String(password || "");
        if (!cleanEmail || !cleanPassword) {
            throw new Error("Completa email y contrasena.");
        }
        if (hasPocketBase()) {
            await pbRequest("/api/collections/users/records", {
                method: "POST",
                body: JSON.stringify({
                    email: cleanEmail,
                    password: cleanPassword,
                    passwordConfirm: cleanPassword,
                    balance: 0,
                    is_admin: false,
                    emailVisibility: true
                })
            });
            return loginUser(cleanEmail, cleanPassword);
        }
        if (hasSupabase()) {
            const { data, error } = await db().auth.signUp({
                email: cleanEmail,
                password: cleanPassword
            });
            if (error) throw new Error(friendlyAuthError(error));
            if (!data.session) {
                throw new Error("Cuenta creada. Pero Supabase pide confirmar email. Desactiva la confirmacion de email para que el cliente pueda entrar al momento.");
            }
            await getCurrentUser();
            return data.user;
        }
        const users = await getUsers();
        if (users.some((user) => normalizeEmail(user.email) === cleanEmail)) {
            throw new Error("Ese email ya tiene cuenta.");
        }
        const user = {
            id: Date.now(),
            email: cleanEmail,
            password: cleanPassword,
            balance: 0,
            created_at: new Date().toISOString()
        };
        users.push(user);
        saveUsers(users);
        setSession({ email: cleanEmail });
        return user;
    }

    async function loginUser(email, password) {
        const cleanEmail = normalizeEmail(email);
        if (hasPocketBase()) {
            const data = await pbRequest("/api/collections/users/auth-with-password", {
                method: "POST",
                body: JSON.stringify({
                    identity: cleanEmail,
                    password: String(password || "")
                })
            });
            setPbAuth({ token: data.token, record: data.record });
            return normalizeUser(data.record);
        }
        if (hasSupabase()) {
            const { data, error } = await db().auth.signInWithPassword({
                email: cleanEmail,
                password: String(password || "")
            });
            if (error) throw new Error(friendlyAuthError(error));
            await getCurrentUser();
            return data.user;
        }
        const user = (await getUsers()).find((item) => normalizeEmail(item.email) === cleanEmail);
        if (!user || user.password !== String(password || "")) {
            throw new Error("Email o contrasena incorrectos.");
        }
        setSession({ email: cleanEmail });
        return user;
    }

    function setAdminSession() {
        writeJson(STORAGE_KEYS.adminSession, {
            user: "ADMIN",
            logged_at: new Date().toISOString()
        });
        return true;
    }

    async function loginAdmin(password) {
        if (hasPocketBase()) {
            const adminEmail = normalizeEmail(POCKETBASE_CONFIG.adminEmail || "admin@arzkeys.local");
            const data = await pbRequest("/api/collections/users/auth-with-password", {
                method: "POST",
                body: JSON.stringify({
                    identity: adminEmail,
                    password: String(password || "")
                })
            });
            const user = normalizeUser(data.record);
            if (!user.is_admin) {
                clearPbAuth();
                throw new Error("Ese usuario no tiene permisos de admin en PocketBase.");
            }
            setPbAuth({ token: data.token, record: data.record });
            setAdminSession();
            return true;
        }
        if (hasSupabase()) {
            const adminEmail = normalizeEmail(SUPABASE_CONFIG.adminEmail);
            if (!adminEmail) throw new Error("Falta adminEmail en supabase-config.js.");
            const { error } = await db().auth.signInWithPassword({
                email: adminEmail,
                password: String(password || "")
            });
            if (error) throw new Error("Credenciales de admin incorrectas.");
            const user = await getCurrentUser();
            if (!user || !user.is_admin) {
                await db().auth.signOut();
                throw new Error("Ese usuario no tiene permisos de admin en Supabase.");
            }
            setAdminSession();
            return true;
        }
        if (String(password || "").trim().toUpperCase() !== "ADMIN0312") {
            throw new Error("Credenciales de admin incorrectas.");
        }
        return setAdminSession();
    }

    async function logoutAdmin() {
        if (hasPocketBase()) {
            clearPbAuth();
        }
        if (hasSupabase()) {
            await db().auth.signOut();
        }
        localStorage.removeItem(STORAGE_KEYS.adminSession);
    }

    async function isAdminAuthenticated() {
        if (hasPocketBase()) {
            const user = await getCurrentUser();
            return Boolean(user && user.is_admin);
        }
        if (hasSupabase()) {
            const user = await getCurrentUser();
            return Boolean(user && user.is_admin);
        }
        const session = readJson(STORAGE_KEYS.adminSession, null);
        return Boolean(session && session.user === "ADMIN");
    }

    async function requireAuth(redirectTo = "login.html") {
        if (!(await isAuthenticated())) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    async function requireAdmin(redirectTo = "admin-login.html") {
        if (!(await isAdminAuthenticated())) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    async function getBalance() {
        const user = await getCurrentUser();
        return user ? Number(user.balance || 0) : 0;
    }

    async function setBalance(amount) {
        const user = await getCurrentUser();
        if (!user) return 0;
        const value = Number(amount) || 0;
        if (hasPocketBase()) {
            const record = await pbRequest(`/api/collections/users/records/${user.id}`, {
                method: "PATCH",
                body: JSON.stringify({ balance: value })
            });
            const auth = pbAuth();
            if (auth?.record?.id === user.id) setPbAuth({ ...auth, record });
            return value;
        }
        if (hasSupabase()) {
            const { error } = await db()
                .from("profiles")
                .update({ balance: value })
                .eq("id", user.id);
            if (error) throw error;
            return value;
        }
        const users = (await getUsers()).map((item) => {
            if (normalizeEmail(item.email) !== normalizeEmail(user.email)) return item;
            return { ...item, balance: value };
        });
        saveUsers(users);
        return value;
    }

    async function setUserBalance(userId, amount) {
        const value = Number(amount) || 0;
        if (hasPocketBase()) {
            await pbRequest(`/api/collections/users/records/${userId}`, {
                method: "PATCH",
                body: JSON.stringify({ balance: value })
            });
            return value;
        }
        if (hasSupabase()) {
            const { error } = await db()
                .from("profiles")
                .update({ balance: value })
                .eq("id", userId);
            if (error) throw error;
            return value;
        }
        const users = (await getUsers()).map((item) => {
            if (String(item.id) !== String(userId)) return item;
            return { ...item, balance: value };
        });
        saveUsers(users);
        return value;
    }

    async function getOrders() {
        if (hasPocketBase()) {
            const data = await pbRequest("/api/collections/orders/records?sort=-created&perPage=200");
            return (data.items || []).map(normalizeOrder);
        }
        if (hasSupabase()) {
            const { data, error } = await db()
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []).map(normalizeOrder);
        }
        return readJson(STORAGE_KEYS.orders, []);
    }

    function saveOrders(orders) {
        return writeJson(STORAGE_KEYS.orders, orders);
    }

    async function getTopups() {
        if (hasPocketBase()) {
            const data = await pbRequest("/api/collections/topups/records?sort=-created&perPage=200");
            return (data.items || []).map(normalizeTopup);
        }
        if (hasSupabase()) {
            const { data, error } = await db()
                .from("topups")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []).map(normalizeTopup);
        }
        return readJson(STORAGE_KEYS.topups, []);
    }

    function saveTopups(topups) {
        return writeJson(STORAGE_KEYS.topups, topups);
    }

    function formatMoney(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    async function addProduct(product) {
        if (hasPocketBase()) {
            const payload = {
                name: product.name.trim(),
                platform: product.platform.trim(),
                duration: product.duration.trim(),
                price: Number(product.price) || 0,
                price_before: product.price_before ? Number(product.price_before) : null,
                stock: Number(product.stock) || 0,
                image_url: product.image_url.trim()
            };
            const record = await pbRequest("/api/collections/products/records", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            return normalizeProduct(record);
        }
        if (hasSupabase()) {
            const payload = {
                name: product.name.trim(),
                platform: product.platform.trim(),
                duration: product.duration.trim(),
                price: Number(product.price) || 0,
                price_before: product.price_before ? Number(product.price_before) : null,
                stock: Number(product.stock) || 0,
                image_url: product.image_url.trim()
            };
            const { data, error } = await db().from("products").insert(payload).select().single();
            if (error) throw error;
            return normalizeProduct(data);
        }
        const products = await getProducts();
        const record = {
            id: nextId(products),
            name: product.name.trim(),
            platform: product.platform.trim(),
            duration: product.duration.trim(),
            price: Number(product.price) || 0,
            price_before: product.price_before ? Number(product.price_before) : null,
            stock: Number(product.stock) || 0,
            image_url: product.image_url.trim()
        };
        products.unshift(record);
        saveProducts(products);
        return record;
    }

    async function updateProduct(id, product) {
        if (hasPocketBase()) {
            const payload = {
                name: product.name.trim(),
                platform: product.platform.trim(),
                duration: product.duration.trim(),
                price: Number(product.price) || 0,
                price_before: product.price_before ? Number(product.price_before) : null,
                stock: Number(product.stock) || 0,
                image_url: product.image_url.trim()
            };
            const record = await pbRequest(`/api/collections/products/records/${id}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });
            return normalizeProduct(record);
        }
        if (hasSupabase()) {
            const payload = {
                name: product.name.trim(),
                platform: product.platform.trim(),
                duration: product.duration.trim(),
                price: Number(product.price) || 0,
                price_before: product.price_before ? Number(product.price_before) : null,
                stock: Number(product.stock) || 0,
                image_url: product.image_url.trim()
            };
            const { data, error } = await db()
                .from("products")
                .update(payload)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return normalizeProduct(data);
        }
        const products = await getProducts();
        const updated = products.map((item) => {
            if (!sameId(item.id, id)) return item;
            return {
                ...item,
                name: product.name.trim(),
                platform: product.platform.trim(),
                duration: product.duration.trim(),
                price: Number(product.price) || 0,
                price_before: product.price_before ? Number(product.price_before) : null,
                stock: Number(product.stock) || 0,
                image_url: product.image_url.trim()
            };
        });
        saveProducts(updated);
        return updated.find((item) => sameId(item.id, id));
    }

    async function deleteProduct(id) {
        if (hasPocketBase()) {
            await pbRequest(`/api/collections/products/records/${id}`, { method: "DELETE" });
            return true;
        }
        if (hasSupabase()) {
            const { error } = await db().from("products").delete().eq("id", id);
            if (error) throw error;
            return true;
        }
        const products = (await getProducts()).filter((item) => !sameId(item.id, id));
        saveProducts(products);
    }

    async function addToCart(productId) {
        const products = await getProducts();
        const product = products.find((item) => sameId(item.id, productId));
        if (!product) return null;
        const cart = getCart();
        const existing = cart.find((item) => sameId(item.id, productId));
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        saveCart(cart);
        return product;
    }

    function removeFromCart(productId) {
        saveCart(getCart().filter((item) => !sameId(item.id, productId)));
    }

    async function createOrder(cart) {
        if (!(await isAuthenticated())) {
            throw new Error("Inicia sesion para comprar.");
        }
        if (hasPocketBase()) {
            const products = await getProducts();
            const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
            const balance = await getBalance();
            const user = await getCurrentUser();
            if (cart.length === 0) {
                throw new Error("Tu carrito esta vacio.");
            }
            if (balance < total) {
                throw new Error("Saldo insuficiente.");
            }
            cart.forEach((item) => {
                const product = products.find((entry) => sameId(entry.id, item.id));
                if (!product || Number(product.stock || 0) < Number(item.quantity || 0)) {
                    throw new Error(`Stock insuficiente: ${item.name}`);
                }
            });
            await setBalance(balance - total);
            const order = await pbRequest("/api/collections/orders/records", {
                method: "POST",
                body: JSON.stringify({
                    user: user.id,
                    customer_email: user.email,
                    order_id_str: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
                    items_json: cart.map((item) => `${item.quantity}x ${item.name}`).join(", "),
                    items_count: cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
                    total_cost: total,
                    payment_method: "balance",
                    status: "completed"
                })
            });
            saveCart([]);
            return normalizeOrder(order);
        }
        if (hasSupabase()) {
            const { data, error } = await db().rpc("place_order", {
                cart_items: cart.map((item) => ({
                    id: item.id,
                    quantity: item.quantity
                }))
            });
            if (error) {
                const message = error.message || "";
                if (message.includes("insufficient_balance")) throw new Error("Saldo insuficiente.");
                if (message.includes("insufficient_stock")) throw new Error("Stock insuficiente.");
                throw error;
            }
            saveCart([]);
            return normalizeOrder(data);
        }
        const products = await getProducts();
        const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
        const balance = await getBalance();
        if (cart.length === 0) {
            throw new Error("Tu carrito esta vacio.");
        }
        if (balance < total) {
            throw new Error("Saldo insuficiente.");
        }
        cart.forEach((item) => {
            const product = products.find((entry) => sameId(entry.id, item.id));
            if (!product || product.stock < item.quantity) {
                throw new Error(`Stock insuficiente: ${item.name}`);
            }
        });
        cart.forEach((item) => {
            const product = products.find((entry) => sameId(entry.id, item.id));
            product.stock -= item.quantity;
        });
        saveProducts(products);
        await setBalance(balance - total);
        const order = {
            id: Date.now(),
            order_id_str: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
            customer_email: (await getCurrentUser()).email,
            items_json: cart.map((item) => `${item.quantity}x ${item.name}`).join(", "),
            items_count: cart.reduce((sum, item) => sum + item.quantity, 0),
            total,
            payment_method: "balance",
            status: "completed",
            type: "order",
            created_at: new Date().toISOString()
        };
        saveOrders([order, ...getOrders()]);
        saveCart([]);
        return order;
    }

    async function uploadProof(orderId, proofFile) {
        if (!hasSupabase()) return { proof_path: "", proof_url: "" };
        if (!proofFile) throw new Error("Sube una foto del comprobante.");
        const { data: authData } = await db().auth.getUser();
        if (!authData.user) throw new Error("Inicia sesion para subir comprobantes.");
        const cleanName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${authData.user.id}/${orderId}-${Date.now()}-${cleanName}`;
        const bucket = SUPABASE_CONFIG.proofBucket || "payment-proofs";
        const { error } = await db().storage.from(bucket).upload(path, proofFile, {
            cacheControl: "3600",
            upsert: false
        });
        if (error) throw error;
        const { data } = db().storage.from(bucket).getPublicUrl(path);
        return {
            proof_path: path,
            proof_url: data.publicUrl || ""
        };
    }

    async function createTopup(amount, method) {
        if (!(await isAuthenticated())) {
            throw new Error("Inicia sesion para recargar.");
        }
        const config = wallets[method] || wallets.btc;
        const numericAmount = Number(amount);
        const exactAmount = method === "bank"
            ? (numericAmount * config.rate).toFixed(2)
            : method === "usdt"
                ? numericAmount.toFixed(2)
                : (numericAmount / config.rate).toFixed(8);
        const orderId = `TOP-${Math.floor(100000 + Math.random() * 900000)}`;
        if (hasPocketBase()) {
            const user = await getCurrentUser();
            const data = await pbRequest("/api/collections/topups/records", {
                method: "POST",
                body: JSON.stringify({
                    user: user.id,
                    customer_email: user.email,
                    order_id_str: orderId,
                    amount_usd: numericAmount,
                    payment_method: config.label,
                    crypto_amount: exactAmount,
                    wallet_address: config.address,
                    status: "pending"
                })
            });
            const payment = {
                orderId,
                topupId: data.id,
                paymentAddress: config.address,
                exactAmount,
                currency: config.ticker,
                methodLabel: config.label,
                amountUsd: numericAmount,
                proofUrl: "",
                proofUploaded: false
            };
            writeJson(STORAGE_KEYS.pendingPayment, payment);
            return payment;
        }
        if (hasSupabase()) {
            const user = await getCurrentUser();
            const payload = {
                user_id: user.id,
                customer_email: user.email,
                order_id_str: orderId,
                amount_usd: numericAmount,
                payment_method: config.label,
                crypto_amount: exactAmount,
                wallet_address: config.address,
                proof_path: "",
                proof_url: "",
                status: "pending"
            };
            const { data, error } = await db().from("topups").insert(payload).select().single();
            if (error) throw error;
            const payment = {
                orderId,
                topupId: data.id,
                paymentAddress: config.address,
                exactAmount,
                currency: config.ticker,
                methodLabel: config.label,
                amountUsd: numericAmount,
                proofUrl: "",
                proofUploaded: false
            };
            writeJson(STORAGE_KEYS.pendingPayment, payment);
            return payment;
        }
        const topup = {
            id: Date.now(),
            order_id_str: orderId,
            customer_email: (await getCurrentUser()).email,
            items_count: 1,
            total: numericAmount,
            amount_usd: numericAmount,
            payment_method: config.label,
            crypto_amount: exactAmount,
            wallet_address: config.address,
            proof_path: "",
            proof_url: "",
            status: "pending",
            type: "topup",
            created_at: new Date().toISOString()
        };
        saveTopups([topup, ...getTopups()]);
        const payment = {
            orderId: topup.order_id_str,
            topupId: topup.id,
            paymentAddress: config.address,
            exactAmount,
            currency: config.ticker,
            methodLabel: config.label,
            amountUsd: numericAmount,
            proofUrl: "",
            proofUploaded: false
        };
        writeJson(STORAGE_KEYS.pendingPayment, payment);
        return payment;
    }

    function getPendingPayment() {
        return readJson(STORAGE_KEYS.pendingPayment, null);
    }

    async function attachTopupProof(topupId, orderId, proofFile) {
        if (!(await isAuthenticated())) {
            throw new Error("Inicia sesion para subir el comprobante.");
        }
        if (!topupId || !orderId) {
            throw new Error("No se encontro la orden pendiente.");
        }
        if (!proofFile) {
            throw new Error("Selecciona la foto del comprobante.");
        }

        if (hasPocketBase()) {
            const formData = new FormData();
            formData.append("proof", proofFile);
            formData.append("status", "pending");
            const data = await pbRequest(`/api/collections/topups/records/${topupId}`, {
                method: "PATCH",
                body: formData
            });
            const topup = normalizeTopup(data);
            const payment = getPendingPayment();
            if (payment && sameId(payment.topupId, topupId)) {
                writeJson(STORAGE_KEYS.pendingPayment, {
                    ...payment,
                    proofUrl: topup.proof_url,
                    proofUploaded: true
                });
            }
            return topup;
        }

        if (hasSupabase()) {
            const proof = await uploadProof(orderId, proofFile);
            const { data, error } = await db().rpc("attach_topup_proof", {
                topup_id: Number(topupId),
                uploaded_proof_path: proof.proof_path,
                uploaded_proof_url: proof.proof_url
            });
            if (error) throw error;
            const payment = getPendingPayment();
            if (payment && sameId(payment.topupId, topupId)) {
                writeJson(STORAGE_KEYS.pendingPayment, {
                    ...payment,
                    proofUrl: proof.proof_url,
                    proofUploaded: true
                });
            }
            return normalizeTopup(data);
        }

        const topups = await getTopups();
        const topup = topups.find((item) => sameId(item.id, topupId));
        if (!topup) {
            throw new Error("No se encontro la orden pendiente.");
        }
        topup.proof_path = proofFile.name;
        topup.proof_url = "";
        saveTopups(topups);
        const payment = getPendingPayment();
        if (payment && sameId(payment.topupId, topupId)) {
            writeJson(STORAGE_KEYS.pendingPayment, {
                ...payment,
                proofUploaded: true
            });
        }
        return topup;
    }

    async function approveTopup(id) {
        if (hasPocketBase()) {
            const rawTopup = await pbRequest(`/api/collections/topups/records/${id}`);
            const topup = normalizeTopup(rawTopup);
            if (topup.status !== "pending") return topup;
            const userRecord = await pbRequest(`/api/collections/users/records/${rawTopup.user}`);
            await pbRequest(`/api/collections/users/records/${rawTopup.user}`, {
                method: "PATCH",
                body: JSON.stringify({
                    balance: Number(userRecord.balance || 0) + Number(topup.amount_usd || topup.total || 0)
                })
            });
            const updated = await pbRequest(`/api/collections/topups/records/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "completed" })
            });
            return normalizeTopup(updated);
        }
        if (hasSupabase()) {
            const { data, error } = await db().rpc("approve_topup", { topup_id: Number(id) });
            if (error) throw error;
            return normalizeTopup(data);
        }
        const topups = await getTopups();
        const topup = topups.find((item) => sameId(item.id, id));
        if (!topup || topup.status !== "pending") return null;
        topup.status = "completed";
        const users = (await getUsers()).map((user) => {
            if (normalizeEmail(user.email) !== normalizeEmail(topup.customer_email)) return user;
            return { ...user, balance: Number(user.balance || 0) + Number(topup.amount_usd || topup.total || 0) };
        });
        saveUsers(users);
        saveTopups(topups);
        return topup;
    }

    async function deleteHistoryItem(type, id) {
        if (hasPocketBase()) {
            const table = type === "topup" ? "topups" : "orders";
            await pbRequest(`/api/collections/${table}/records/${id}`, { method: "DELETE" });
            return true;
        }
        if (hasSupabase()) {
            const table = type === "topup" ? "topups" : "orders";
            const { error } = await db().from(table).delete().eq("id", id);
            if (error) throw error;
            return true;
        }
        if (type === "topup") {
            saveTopups((await getTopups()).filter((item) => !sameId(item.id, id)));
        }
        if (type === "order") {
            saveOrders((await getOrders()).filter((item) => !sameId(item.id, id)));
        }
    }

    async function getHistory() {
        return [...(await getTopups()), ...(await getOrders())].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    async function getStats() {
        const products = await getProducts();
        const orders = await getOrders();
        return {
            total_products: products.length,
            total_orders: orders.length,
            total_revenue: orders.reduce((sum, item) => sum + Number(item.total || 0), 0)
        };
    }

    async function resetProducts() {
        if (hasPocketBase()) {
            const current = await pbRequest("/api/collections/products/records?perPage=500");
            await Promise.all((current.items || []).map((item) => pbRequest(`/api/collections/products/records/${item.id}`, { method: "DELETE" })));
            for (const { id, ...product } of seedProducts) {
                await pbRequest("/api/collections/products/records", {
                    method: "POST",
                    body: JSON.stringify(product)
                });
            }
            return getProducts();
        }
        if (hasSupabase()) {
            await db().from("products").delete().neq("id", 0);
            const rows = seedProducts.map(({ id, ...product }) => product);
            const { error } = await db().from("products").insert(rows);
            if (error) throw error;
            return getProducts();
        }
        saveProducts(seedProducts);
        return getProducts();
    }

    async function getUserOrders() {
        const user = await getCurrentUser();
        if (!user) return [];
        return (await getOrders()).filter((order) => normalizeEmail(order.customer_email) === normalizeEmail(user.email));
    }

    async function getUserTopups() {
        const user = await getCurrentUser();
        if (!user) return [];
        return (await getTopups()).filter((topup) => normalizeEmail(topup.customer_email) === normalizeEmail(user.email));
    }

    window.DigitalKeysStore = {
        wallets,
        seedProducts,
        getProducts,
        saveProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        resetProducts,
        getCart,
        saveCart,
        addToCart,
        removeFromCart,
        createOrder,
        getBalance,
        setBalance,
        setUserBalance,
        getUsers,
        getCurrentUser,
        isAuthenticated,
        registerUser,
        loginUser,
        clearSession,
        loginAdmin,
        setAdminSession,
        logoutAdmin,
        isAdminAuthenticated,
        requireAuth,
        requireAdmin,
        getOrders,
        getTopups,
        getUserOrders,
        getUserTopups,
        getHistory,
        createTopup,
        getPendingPayment,
        attachTopupProof,
        approveTopup,
        deleteHistoryItem,
        getStats,
        getSession,
        setSession,
        hasPocketBase,
        hasSupabase,
        formatMoney
    };
})();
