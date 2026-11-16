import { animate, stagger } from "motion";
/* Presentation only. Settlement and authorization stay on the server. */
(() => {
  "use strict";
  const root = document.querySelector("[data-financial-workspace]");
  if (!root) return;
  const q = (selector) => root.querySelector(selector);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const controllers = new Set();
  let chart,
    series,
    chartRequest,
    timer,
    days = 7,
    disposed = false,
    fitted = false;
  const plot = q("[data-chart]"),
    panel = q("[data-chart-panel]"),
    status = q("[data-chart-status]");
  const currency = root.dataset.asset;
  const money = new Intl.NumberFormat(document.documentElement.lang || "en", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
  });
  let rows = [];
  const C = window.LightweightCharts;
  if (C && plot) {
    chart = C.createChart(plot, {
      width: plot.clientWidth,
      height: plot.clientHeight,
      layout: {
        background: { type: "solid", color: "#16191d" },
        textColor: "#a3aab3",
        fontFamily: "Inter,system-ui,sans-serif",
      },
      grid: {
        vertLines: { color: "#ffffff07" },
        horzLines: { color: "#ffffff0d" },
      },
      rightPriceScale: { borderColor: "#343a42" },
      timeScale: { borderColor: "#343a42", timeVisible: true },
      crosshair: {
        vertLine: { color: "#ff990066" },
        horzLine: { color: "#ff990066" },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });
    series = chart.addSeries(
      currency === "BRL" ? C.HistogramSeries : C.CandlestickSeries,
      currency === "BRL"
        ? {
            color: "#ff9900",
            priceFormat: { type: "price", precision: 2, minMove: 0.01 },
          }
        : {
            upColor: "#28cb96",
            downColor: "#f08087",
            wickUpColor: "#28cb96",
            wickDownColor: "#f08087",
            borderVisible: false,
          },
    );
  }
  function fit() {
    chart?.timeScale().fitContent();
  }
  const observer = new ResizeObserver(() => {
    if (chart && !disposed) chart.resize(plot.clientWidth, plot.clientHeight);
  });
  if (chart) observer.observe(plot);
  async function json(url, controller) {
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw Error("unavailable");
      return await response.json();
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
    }
  }
  async function load(range, reset = true) {
    days = range;
    root
      .querySelectorAll("[data-chart-days]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.chartDays) === days),
        ),
      );
    chartRequest?.abort();
    const controller = new AbortController();
    chartRequest = controller;
    panel.dataset.loading = "true";
    panel.setAttribute("aria-busy", "true");
    status.textContent = root.dataset.loading;
    try {
      if (currency === "BRL") {
        const source = JSON.parse(q("#fw-pix-data")?.textContent || "[]");
        const byDay = new Map(source.map((item) => [item.time, item.value]));
        rows = Array.from({ length: days }, (_, i) => {
          const date = new Date(root.dataset.chartToday + "T00:00:00Z");
          date.setUTCDate(date.getUTCDate() - days + 1 + i);
          const time = date.toISOString().slice(0, 10);
          return { time, value: byDay.get(time) || 0 };
        });
        q("[data-market-price]").textContent = money.format(
          rows.reduce((sum, row) => sum + row.value, 0),
        );
        status.textContent = root.dataset.pixLabel;
      } else {
        const url = new URL(root.dataset.ohlcUrl, location.origin);
        url.searchParams.set("asset", currency);
        url.searchParams.set("days", String(days));
        const payload = await json(url, controller);
        if (disposed || controller.signal.aborted) return;
        if (
          !payload.available ||
          payload.source !== "CoinGecko" ||
          !Array.isArray(payload.candles)
        )
          throw Error("unverified");
        const valid = payload.candles.filter(
          (r) =>
            Number.isSafeInteger(r.time) &&
            ["open", "high", "low", "close"].every(
              (key) =>
                typeof r[key] === "number" &&
                Number.isFinite(r[key]) &&
                r[key] > 0,
            ) &&
            r.low <= r.open &&
            r.open <= r.high &&
            r.low <= r.close &&
            r.close <= r.high,
        );
        rows = [...new Map(valid.map((r) => [r.time, r])).values()].sort(
          (a, b) => a.time - b.time,
        );
        if (rows.length < 2) throw Error("empty");
        q("[data-market-price]").textContent = money.format(rows.at(-1).close);
        status.textContent =
          "CoinGecko · " + currency + "/USD · " + root.dataset.marketLabel;
      }
      if (!chart) throw Error("chart-library");
      series.setData(rows);
      if (reset || !fitted) {
        fit();
        fitted = true;
      }
    } catch (error) {
      if (disposed || chartRequest !== controller) return;
      status.textContent = root.dataset.unavailable;
      q("[data-market-price]").textContent = "—";
      series?.setData([]);
    } finally {
      if (chartRequest === controller) {
        delete panel.dataset.loading;
        panel.removeAttribute("aria-busy");
      }
    }
  }
  async function rates() {
    if (disposed) return;
    try {
      const payload = await json(root.dataset.ratesUrl, new AbortController());
      if (!payload.available || disposed) return;
      const usd = new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: "USD",
      });
      for (const asset of ["BTC", "BCH"]) {
        const value = Number(payload.rates?.[asset]?.prices?.USD);
        if (typeof value === "number" && Number.isFinite(value) && value > 0)
          q('[data-rate="' + asset + '"]').textContent = usd.format(value);
      }
    } catch (_) {
      root.querySelectorAll("[data-rate]").forEach((el) => {
        el.textContent = "—";
      });
    }
  }
  function zoom(factor) {
    if (!chart) return;
    const scale = chart.timeScale(),
      range = scale.getVisibleLogicalRange();
    if (!range) return;
    const center = (range.from + range.to) / 2,
      width = Math.max(3, (range.to - range.from) * factor);
    scale.setVisibleLogicalRange({
      from: center - width / 2,
      to: center + width / 2,
    });
  }
  function expanded(on) {
    panel.classList.toggle("is-expanded", on);
    if (on) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", root.dataset.marketLabel);
    } else {
      panel.removeAttribute("role");
      panel.removeAttribute("aria-modal");
      panel.removeAttribute("aria-label");
    }
    root.classList.toggle("fw-expanded", on);
    q("[data-chart-expand]").setAttribute("aria-expanded", String(on));
    if (on) plot.focus();
    else q("[data-chart-expand]").focus();
  }
  let lastFocus;
  const dialogOrigins = new WeakMap();
  function openDialog(dialog, button) {
    if (!dialog) return;
    dialogOrigins.set(dialog, button || document.activeElement);
    if (!dialog.open) dialog.showModal();
    dialog
      .querySelector(
        '[aria-invalid="true"], input:not([type="hidden"]):not([type="file"]), textarea',
      )
      ?.focus({ preventScroll: true });
  }
  const dialogAnimations = new WeakMap();
  const closingDialogs = new WeakSet();
  function enterDialog(dialog) {
    if (reducedMotion.matches) return;
    dialogAnimations.get(dialog)?.stop();
    dialogAnimations.set(
      dialog,
      animate(
        dialog,
        { opacity: [0, 1], y: [16, 0], scale: [0.985, 1] },
        { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
      ),
    );
    const fields = dialog.querySelectorAll("[data-dialog-field]");
    if (fields.length)
      animate(
        fields,
        { opacity: [0, 1], y: [6, 0] },
        {
          duration: 0.2,
          delay: stagger(0.035, { startDelay: 0.06 }),
          ease: "easeOut",
        },
      );
  }
  async function closeDialog(dialog) {
    if (!dialog?.open || closingDialogs.has(dialog)) return;
    closingDialogs.add(dialog);
    try {
      dialogAnimations.get(dialog)?.stop();
      if (!reducedMotion.matches) {
        const exit = animate(
          dialog,
          { opacity: 0, y: 8, scale: 0.99 },
          { duration: 0.14, ease: "easeIn" },
        );
        // Interrupted animation must never leave a native modal stuck open.
        await Promise.race([
          exit,
          new Promise((resolve) => setTimeout(resolve, 200)),
        ]);
        exit.stop();
      }
      dialog.close();
    } finally {
      closingDialogs.delete(dialog);
      dialog.style.removeProperty("opacity");
      dialog.style.removeProperty("transform");
    }
  }
  root.addEventListener("bchflow:dialog-open", (event) => {
    if (!(event.target instanceof HTMLDialogElement)) return;
    event.preventDefault();
    openDialog(event.target, event.detail?.trigger);
  });
  root.addEventListener("bchflow:dialog-close", (event) => {
    if (!(event.target instanceof HTMLDialogElement)) return;
    event.preventDefault();
    closeDialog(event.target);
  });
  const dialogObserver = new MutationObserver((records) => {
    for (const record of records)
      if (record.target.open) enterDialog(record.target);
  });
  root.querySelectorAll("dialog").forEach((dialog) => {
    dialogObserver.observe(dialog, {
      attributes: true,
      attributeFilter: ["open"],
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.matches("[data-chart-days]"))
      load(Number(button.dataset.chartDays));
    if (button.matches("[data-chart-reset]")) fit();
    if (button.matches("[data-chart-zoom]"))
      zoom(button.dataset.chartZoom === "in" ? 0.7 : 1.4);
    if (button.matches("[data-chart-expand]"))
      expanded(!panel.classList.contains("is-expanded"));
    if (button.matches("[data-open-dialog]"))
      openDialog(document.getElementById(button.dataset.openDialog), button);
    if (button.matches("[data-close-dialog]"))
      closeDialog(button.closest("dialog"));
    if (button.matches("[data-privacy]")) {
      const hide = button.getAttribute("aria-pressed") !== "true";
      root.querySelectorAll("[data-private-value]").forEach((el) => {
        if (!el.dataset.originalValue)
          el.dataset.originalValue = el.textContent;
        el.textContent = hide ? "••••••" : el.dataset.originalValue;
      });
      button.setAttribute("aria-pressed", String(hide));
    }
    if (button.matches("[data-menu]")) {
      const open = root.classList.toggle("nav-open");
      button.setAttribute("aria-expanded", String(open));
      if (open) {
        lastFocus = button;
        root.querySelector(".premium-sidebar a")?.focus();
      }
    }
  });
  root.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      const origin = dialogOrigins.get(dialog);
      dialogOrigins.delete(dialog);
      // Native dialogs restore their opener. Do not steal focus from a newer action.
      const active = document.activeElement;
      if (
        origin?.isConnected &&
        (active === document.body || dialog.contains(active))
      ) {
        origin.focus();
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        closeDialog(dialog);
    });
  });
  root.addEventListener("click", (event) => {
    if (
      root.classList.contains("nav-open") &&
      !event.target.closest(".premium-sidebar,[data-menu]")
    )
      closeMenu();
  });
  function closeMenu() {
    root.classList.remove("nav-open");
    q("[data-menu]").setAttribute("aria-expanded", "false");
    lastFocus?.focus();
  }
  function filter() {
    const text = q("[data-operation-search]").value.toLocaleLowerCase().trim(),
      selected = q("[data-status-filter]").value;
    let visible = 0;
    root.querySelectorAll("[data-operation]").forEach((row) => {
      row.hidden =
        !row.textContent.toLocaleLowerCase().includes(text) ||
        (selected && row.dataset.state !== selected);
      if (!row.hidden) visible++;
    });
    q("[data-empty-results]").hidden = visible > 0;
  }
  q("[data-operation-search]").addEventListener("input", filter);
  q("[data-status-filter]").addEventListener("change", filter);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      q("[data-operation-search]").focus();
    }
    if (event.key === "Escape" && !root.querySelector("dialog[open]")) {
      if (panel.classList.contains("is-expanded")) expanded(false);
      if (root.classList.contains("nav-open")) closeMenu();
    }
    if (root.classList.contains("nav-open") && event.key === "Tab") {
      const elements = [
        ...root.querySelectorAll(".premium-sidebar a,.premium-sidebar button"),
      ];
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (panel.classList.contains("is-expanded") && event.key === "Tab") {
      const elements = [...panel.querySelectorAll('button,[tabindex="0"]')];
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (document.activeElement === plot && chart) {
      if (
        ["+", "=", "-", "ArrowLeft", "ArrowRight", "Home"].includes(event.key)
      )
        event.preventDefault();
      if (event.key === "+" || event.key === "=") zoom(0.7);
      if (event.key === "-") zoom(1.4);
      if (event.key === "Home") fit();
      if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
        const scale = chart.timeScale(),
          range = scale.getVisibleLogicalRange();
        if (range) {
          const delta =
            (range.to - range.from) *
            0.15 *
            (event.key === "ArrowLeft" ? -1 : 1);
          scale.setVisibleLogicalRange({
            from: range.from + delta,
            to: range.to + delta,
          });
        }
      }
    }
  });
  // Reserve only after a separate review. No signing or broadcasting here.
  const transfer = q("[data-review-transfer]"),
    review = q("#transfer-review");
  let approved = false,
    submitter;
  transfer?.addEventListener(
    "submit",
    (event) => {
      if (approved) {
        approved = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      submitter = event.submitter;
      for (const name of ["destination", "amount", "fee_limit"]) {
        const target = review.querySelector(
          "[data-review-" + (name === "fee_limit" ? "fee" : name) + "]",
        );
        if (target)
          target.textContent = transfer.querySelector(
            '[name="send-' + name + '"]',
          ).value;
      }
      openDialog(review, submitter);
    },
    true,
  );
  q("[data-confirm-reservation]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (
      !review.open ||
      closingDialogs.has(review) ||
      button.disabled ||
      !transfer?.checkValidity()
    )
      return;
    button.disabled = true;
    try {
      await closeDialog(review);
      approved = true;
      transfer.requestSubmit(submitter);
    } catch (_) {
      approved = false;
    } finally {
      button.disabled = false;
    }
  });
  root.querySelectorAll("form[data-submit-feedback]").forEach((form) =>
    form.addEventListener("submit", (event) => {
      if (event.defaultPrevented) return;
      form.setAttribute("aria-busy", "true");
      setTimeout(
        () =>
          form.querySelectorAll("button[type=submit]").forEach((button) => {
            button.disabled = true;
          }),
        0,
      );
    }),
  );
  const broken = q("dialog[data-show-errors]");
  if (broken) openDialog(broken);
  const here = location.pathname;
  root.querySelectorAll(".premium-menu a").forEach((link) => {
    const url = new URL(link.href, location.href);
    if (url.pathname === here && !url.hash)
      link.setAttribute("aria-current", "page");
  });
  function start() {
    load(days, false);
    rates();
    timer = setInterval(() => {
      if (!document.hidden) {
        load(days, false);
        rates();
      }
    }, 240000);
  }
  window.addEventListener("pagehide", () => {
    disposed = true;
    clearInterval(timer);
    controllers.forEach((c) => c.abort());
    observer.disconnect();
    dialogObserver.disconnect();
    chart?.remove();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      location.reload();
      return;
    }
    root.querySelectorAll("form[aria-busy]").forEach((form) => {
      form.removeAttribute("aria-busy");
      form.querySelectorAll("button[type=submit]").forEach((button) => {
        button.disabled = false;
      });
    });
  });
  start();
})();
