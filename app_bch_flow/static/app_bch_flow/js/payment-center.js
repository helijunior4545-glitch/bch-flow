/* Visual interactions never infer payment success or change a financial amount. */
(() => {
  "use strict";
  const root = document.querySelector("[data-payment-app]");
  if (!root) return;
  window.lucide?.createIcons({
    attrs: { "stroke-width": 1.7, "aria-hidden": "true" },
  });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let returnFocus = null,
    toastTimer;
  root.querySelectorAll("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById(button.dataset.openDialog);
      if (!dialog) return;
      returnFocus = button;
      dialog.showModal();
    });
  });
  root.querySelectorAll("dialog").forEach((dialog) => {
    dialog
      .querySelector("[data-close-dialog]")
      ?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => returnFocus?.focus());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        dialog.close();
    });
    if (dialog.hasAttribute("data-show-errors")) dialog.showModal();
  });
  root.querySelectorAll("[data-submit-feedback]").forEach((form) => {
    form.addEventListener("submit", () => {
      form.dataset.busy = "true";
      form.setAttribute("aria-busy", "true");
      // Capture the real form values before disabling controls.
      setTimeout(
        () =>
          form
            .querySelectorAll("button[type=submit]")
            .forEach((b) => (b.disabled = true)),
        0,
      );
    });
  });
  const toggle = root.querySelector("[data-balance-toggle]");
  toggle?.addEventListener("click", () => {
    const hidden = root.classList.toggle("pay-values-hidden");
    toggle.setAttribute("aria-pressed", String(hidden));
    toggle.setAttribute(
      "aria-label",
      hidden ? "Mostrar valores" : "Ocultar valores",
    );
    root.querySelectorAll("[data-private-value]").forEach((el) => {
      if (!el.dataset.originalValue) el.dataset.originalValue = el.textContent;
      el.textContent = hidden ? "••••••" : el.dataset.originalValue;
    });
  });
  function note(message) {
    const toast = root.querySelector(".pay-toast");
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => (toast.hidden = true), 4500);
  }
  root
    .querySelectorAll("[data-copy-value],[data-copy-link]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const target = button.dataset.copyValue
          ? document.getElementById(button.dataset.copyValue)
          : null;
        const value =
          target?.value ||
          (button.dataset.copyLink
            ? new URL(button.dataset.copyLink, location.origin).href
            : "");
        try {
          if (!value || !navigator.clipboard || !isSecureContext)
            throw new Error();
          await navigator.clipboard.writeText(value);
          note("Copiado com sucesso.");
        } catch (_) {
          if (target) {
            target.focus();
            target.select();
          }
          note(
            target
              ? "Selecione e copie o código manualmente."
              : "Copie o endereço da página de pagamento pelo navegador.",
          );
        }
      });
    });
  if (!reduced.matches) {
    const balance = root.querySelector(".pay-balance-card");
    balance?.setAttribute("data-value-pulse", "");
  }
  const statusUrl = root.dataset.statusUrl;
  const statusText = root.querySelector(".pay-poll-status");
  const terminal = ["paid", "overpaid", "review"];
  if (!statusUrl) return;
  let stopped = false;
  window.addEventListener("pagehide", () => (stopped = true), { once: true });
  async function poll() {
    if (stopped) return;
    if (!document.hidden) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(statusUrl, {
          signal: controller.signal,
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error();
        const state = await response.json();
        if (
          state.status !== root.dataset.initialStatus ||
          state.received !== root.dataset.received ||
          state.expired !== (root.dataset.expired === "true")
        ) {
          stopped = true;
          location.reload();
          return;
        }
        if (statusText)
          statusText.textContent = terminal.includes(state.status)
            ? "Status registrado. Verificação contínua ativa."
            : "Aguardando confirmação do servidor. Atualização automática ativa.";
      } catch (_) {
        if (statusText)
          statusText.textContent =
            "Não foi possível atualizar agora. O status anterior foi mantido.";
      } finally {
        clearTimeout(timer);
      }
    }
    if (!stopped)
      setTimeout(
        poll,
        terminal.includes(root.dataset.initialStatus) ? 15000 : 5000,
      );
  }
  poll();
})();
