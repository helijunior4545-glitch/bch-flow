/* Interface controls only. No payment or tenant state is modified. */
(() => {
  "use strict";
  const paint = () =>
    window.lucide?.createIcons({
      attrs: { "stroke-width": 1.7, "aria-hidden": "true" },
    });
  paint();
  const shell = document.querySelector("[data-dashboard-shell]");
  if (!shell) return;
  const mobile = matchMedia("(max-width:760px)");
  const buttons = shell.querySelectorAll("[data-sidebar-toggle]");
  try {
    shell.classList.toggle(
      "is-collapsed",
      localStorage.getItem("bch.sidebar.collapsed") === "true",
    );
  } catch (_) {}
  function sync() {
    const expanded = mobile.matches
      ? shell.classList.contains("is-mobile-open")
      : !shell.classList.contains("is-collapsed");
    buttons.forEach((button) => {
      button.setAttribute("aria-expanded", String(expanded));
      button.setAttribute(
        "aria-label",
        expanded ? "Recolher menu" : "Expandir menu",
      );
    });
    shell.querySelectorAll(".flow-side-item").forEach((link) => {
      if (!link.dataset.navigationLabel)
        link.dataset.navigationLabel = link.textContent.trim();
      link.setAttribute("aria-label", link.dataset.navigationLabel);
      link.title = link.dataset.navigationLabel;
    });
  }
  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      if (mobile.matches) {
        shell.classList.toggle("is-mobile-open");
        if (shell.classList.contains("is-mobile-open"))
          shell.querySelector(".flow-sidebar-toggle")?.focus();
        else shell.querySelector(".flow-mobile-menu")?.focus();
      } else {
        shell.classList.toggle("is-collapsed");
        try {
          localStorage.setItem(
            "bch.sidebar.collapsed",
            String(shell.classList.contains("is-collapsed")),
          );
        } catch (_) {}
      }
      sync();
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shell.classList.contains("is-mobile-open")) {
      shell.classList.remove("is-mobile-open");
      sync();
      shell.querySelector(".flow-mobile-menu")?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (
      mobile.matches &&
      shell.classList.contains("is-mobile-open") &&
      !event.target.closest(".flow-sidebar,[data-sidebar-toggle]")
    ) {
      shell.classList.remove("is-mobile-open");
      sync();
    }
  });
  mobile.addEventListener("change", () => {
    shell.classList.remove("is-mobile-open");
    sync();
  });
  sync();
})();
