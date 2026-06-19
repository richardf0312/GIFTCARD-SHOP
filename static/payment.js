document.addEventListener("DOMContentLoaded", async () => {
    const store = window.DigitalKeysStore;
    if (!(await store.requireAuth("login.html"))) return;
    const paymentData = store.getPendingPayment();
    const qrContainer = document.getElementById("qrcode");
    const copyButton = document.getElementById("copy-button");
    const walletInput = document.getElementById("wallet-address");
    const qrLabel = document.querySelector(".qr-label");
    const proofForm = document.getElementById("proof-form");
    const proofInput = document.getElementById("proof-file");
    const proofButton = document.getElementById("proof-button");
    const proofStatus = document.getElementById("proof-status");

    if (!paymentData) {
        document.querySelector(".payment-card").innerHTML = `
            <div class="card-body">
                <h1>No hay una orden pendiente</h1>
                <a href="topup.html" class="cta-button" style="margin-top:18px;">Crear recarga</a>
            </div>
        `;
        return;
    }

    document.getElementById("order-id").textContent = paymentData.orderId;
    document.getElementById("exact-amount").textContent = paymentData.exactAmount;
    document.getElementById("currency-ticker").textContent = paymentData.currency;
    walletInput.value = paymentData.paymentAddress;

    function markProofUploaded() {
        proofStatus.className = "proof-status success";
        proofStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Comprobante enviado. Tu recarga queda pendiente de aprobacion.`;
        proofButton.disabled = true;
        proofButton.innerHTML = `<i class="fa-solid fa-check"></i> Comprobante enviado`;
        proofInput.disabled = true;
    }

    if (paymentData.proofUploaded || paymentData.proofUrl) {
        markProofUploaded();
    }

    qrContainer.innerHTML = "";
    if (paymentData.currency === "MXN") {
        qrContainer.style.display = "none";
        qrLabel.style.display = "none";
    } else if (window.QRCode) {
        new QRCode(qrContainer, {
            text: paymentData.paymentAddress,
            width: 160,
            height: 160,
            colorDark: "#121318",
            colorLight: "#ffffff"
        });
    }

    copyButton.addEventListener("click", async () => {
        walletInput.select();
        walletInput.setSelectionRange(0, 99999);
        try {
            await navigator.clipboard.writeText(walletInput.value);
            copyButton.innerHTML = `<i class="fa-solid fa-check"></i>`;
            setTimeout(() => {
                copyButton.innerHTML = `<i class="fa-solid fa-copy"></i>`;
            }, 1600);
        } catch (error) {
            document.execCommand("copy");
        }
    });

    proofForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = proofInput.files && proofInput.files[0];
        if (!file) {
            proofStatus.className = "proof-status error";
            proofStatus.textContent = "Selecciona la foto del comprobante.";
            proofInput.focus();
            return;
        }
        proofButton.disabled = true;
        proofButton.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Subiendo`;
        proofStatus.className = "proof-status";
        proofStatus.textContent = "Subiendo comprobante...";
        try {
            await store.attachTopupProof(paymentData.topupId, paymentData.orderId, file);
            markProofUploaded();
        } catch (error) {
            proofButton.disabled = false;
            proofButton.innerHTML = `<i class="fa-solid fa-upload"></i> Enviar comprobante`;
            proofStatus.className = "proof-status error";
            proofStatus.textContent = error.message || "No se pudo subir el comprobante.";
        }
    });
});
