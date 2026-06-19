document.addEventListener("DOMContentLoaded", async () => {
    const store = window.DigitalKeysStore;
    if (!(await store.requireAuth("login.html"))) return;
    const amountInput = document.getElementById("custom-amount");
    const minMsg = document.getElementById("min-msg");
    const form = document.getElementById("topup-form");
    const proceedBtn = document.getElementById("proceed-btn");
    const methodOptions = document.querySelectorAll(".payment-option");
    const quickButtons = document.querySelectorAll("[data-amount]");

    function validateAmount() {
        const amount = Number(amountInput.value);
        const valid = amount >= 5;
        minMsg.style.display = valid ? "none" : "block";
        amountInput.style.borderColor = valid ? "" : "var(--danger)";
        return valid;
    }

    quickButtons.forEach((button) => {
        button.addEventListener("click", () => {
            amountInput.value = button.dataset.amount;
            validateAmount();
        });
    });

    methodOptions.forEach((option) => {
        option.addEventListener("click", () => {
            methodOptions.forEach((item) => item.classList.remove("selected"));
            option.classList.add("selected");
            option.querySelector("input").checked = true;
        });
    });

    amountInput.addEventListener("input", validateAmount);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const amount = Number(amountInput.value);
        const method = document.querySelector('input[name="payment"]:checked').value;
        if (!validateAmount()) {
            amountInput.focus();
            return;
        }
        proceedBtn.disabled = true;
        proceedBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generando`;
        try {
            await store.createTopup(amount, method);
            window.location.href = "payment-instruction.html";
        } catch (error) {
            alert(error.message || "No se pudo crear la recarga.");
            proceedBtn.disabled = false;
            proceedBtn.innerHTML = `Generar orden <i class="fa-solid fa-arrow-right"></i>`;
        }
    });
});
