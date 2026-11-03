/* Visual interactions never infer payment success or change a financial amount. */
(() => {
  "use strict";
  const root = document.querySelector("[data-payment-app]");
  if (!root) return;
  const messages =
    document.querySelector("[data-interaction-messages]")?.dataset || {};
  const tr = (key, fallback) => messages[key] || fallback;
  window.lucide?.createIcons({
    attrs: { "stroke-width": 1.7, "aria-hidden": "true" },
  });
  const assetNavigation = root.querySelector(".pay-assets");
  const selectedAsset = assetNavigation?.querySelector("[aria-current]");
  function alignSelectedAsset() {
    if (!selectedAsset) return;
    const box = selectedAsset.getBoundingClientRect();
    const parent = assetNavigation.getBoundingClientRect();
    assetNavigation.scrollLeft +=
      box.left - parent.left - (parent.width - box.width) / 2;
  }
  alignSelectedAsset();
  if (assetNavigation && "ResizeObserver" in window) {
    new ResizeObserver(alignSelectedAsset).observe(assetNavigation);
  } else {
    window.addEventListener("resize", alignSelectedAsset);
  }
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
      hidden
        ? tr("showValues", "Show balances")
        : tr("hideValues", "Hide balances"),
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
          note(tr("copySuccess", "Copied successfully."));
        } catch (_) {
          if (target) {
            target.focus();
            target.select();
          }
          note(
            target
              ? tr("manualCopy", "Select and copy the code manually.")
              : tr(
                  "copyLink",
                  "Copy the payment page address from your browser.",
                ),
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
            ? tr(
                "statusRecorded",
                "Status recorded. Continuous verification is active.",
              )
            : tr(
                "statusWaiting",
                "Waiting for server confirmation. Automatic updates are active.",
              );
      } catch (_) {
        if (statusText)
          statusText.textContent = tr(
            "statusError",
            "Unable to refresh now. The previous status has been kept.",
          );
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
