const { chromium } = require("playwright");
const fs = require("node:fs");
(async () => {
  const input = JSON.parse(process.env.WALLET_BROWSER_INPUT);
  fs.mkdirSync(input.artifacts, { recursive: true });
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const p = await b.newPage({
      viewport: { width: 1500, height: 1100 },
      reducedMotion: "reduce",
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p
      .context()
      .addCookies([
        { name: input.cookieName, value: input.cookie, url: input.base },
      ]);
    await p.route("**/financial-workspace.js*", async (route) => {
      const response = await route.fetch();
      const code = await response.text();
      await route.fulfill({
        response,
        body:
          "const originalChart=LightweightCharts.createChart;window.LightweightCharts={...LightweightCharts,createChart:(...args)=>{const c=originalChart(...args);window.__testChart=c;return c;}};\n" +
          code,
      });
    });
    await p.route("**/api/live-ohlc/**", (route) => {
      const days = Number(
        new URL(route.request().url()).searchParams.get("days"),
      );
      const start = 1700000000;
      const candles = Array.from({ length: 80 }, (_, i) => ({
        time: start + i * 3600,
        open: 100 + i,
        high: 103 + i,
        low: 98 + i,
        close: 102 + i,
      }));
      return route.fulfill({
        json: { available: true, source: "CoinGecko", candles },
      });
    });
    await p.route("**/api/market-rates/**", (route) =>
      route.fulfill({
        json: {
          available: true,
          rates: {
            BTC: { prices: { USD: 100000 } },
            BCH: { prices: { USD: 500 } },
          },
        },
      }),
    );
    await p.goto(input.base + input.url);
    await p
      .waitForFunction(
        () => window.__testChart?.timeScale().getVisibleLogicalRange(),
        null,
        { timeout: 10000 },
      )
      .catch(async (e) => {
        throw Error(
          "Chart not initialized: " +
            errors.join(";") +
            " status=" +
            (await p.locator("[data-chart-status]").textContent()) +
            " chart=" +
            (await p.evaluate(() => typeof window.LightweightCharts)),
        );
      });
    const width = () =>
      p.evaluate(() => {
        const r = __testChart.timeScale().getVisibleLogicalRange();
        return r.to - r.from;
      });
    const before = await width();
    await p.getByRole("button", { name: "Zoom in", exact: true }).click();
    await p.waitForFunction((before) => {
      const r = __testChart.timeScale().getVisibleLogicalRange();
      return r.to - r.from < before;
    }, before);
    await p
      .getByRole("button", { name: "Reset chart view", exact: true })
      .click();
    const plot = p.locator("[data-chart]");
    const rect = await plot.boundingBox();
    const prior = await p.evaluate(
      () => __testChart.timeScale().getVisibleLogicalRange().from,
    );
    await p.mouse.move(rect.x + rect.width * 0.65, rect.y + rect.height * 0.5);
    await p.mouse.down();
    await p.mouse.move(rect.x + rect.width * 0.35, rect.y + rect.height * 0.5, {
      steps: 12,
    });
    await p.mouse.up();
    if (
      (await p.evaluate(
        () => __testChart.timeScale().getVisibleLogicalRange().from,
      )) === prior
    )
      throw Error("Dragging did not pan chart");
    await p.getByRole("button", { name: "Expand chart", exact: true }).click();
    await p.keyboard.press("Escape");
    if (await p.locator(".is-expanded").count())
      throw Error("Expanded chart did not close");
    await p.screenshot({
      path: input.artifacts + "/wallet-desktop.png",
      fullPage: true,
    });
    for (const [asset, color] of [
      ["BTC", "rgb(247, 147, 26)"],
      ["BCH", "rgb(10, 193, 142)"],
      ["BRL", "rgb(50, 188, 173)"],
    ]) {
      const actual = await p
        .locator('.fw-tabs [data-tone="' + asset + '"] svg')
        .evaluate((el) => getComputedStyle(el).color);
      if (actual !== color)
        throw Error(asset + " brand color incorrect: " + actual);
    }
    await p.emulateMedia({ reducedMotion: "no-preference" });
    await p.getByRole("button", { name: "Receive", exact: true }).click();
    const receive = p.locator("#receive-dialog");
    await receive.waitFor({ state: "visible" });
    await receive.evaluate(async (el) => {
      await Promise.all(
        el
          .getAnimations({ subtree: true })
          .map((a) => a.finished.catch(() => {})),
      );
    });
    await p.screenshot({
      path: input.artifacts + "/receive-dialog-desktop.png",
    });
    await p.locator("[data-rc2-new]").click();
    await p.locator("#rc2-create-dialog").waitFor({ state: "visible" });
    await p.keyboard.press("Escape");
    await p.locator("#rc2-create-dialog").waitFor({ state: "hidden" });
    if (!(await receive.evaluate((el) => el.open)))
      throw Error("Closing product dialog dismissed payment form");
    await p.keyboard.press("Escape");
    await receive.waitFor({ state: "hidden" });
    await p.getByRole("button", { name: "Receive", exact: true }).click();
    await receive.waitFor({ state: "visible" });
    await p.keyboard.press("Escape");
    await receive.waitFor({ state: "hidden" });
    await p.getByRole("button", { name: "Send", exact: true }).click();
    await p.locator('[name="send-destination"]').fill("sandbox:test");
    await p.locator('[name="send-amount"]').fill("0.000001");
    await p.locator('[name="send-fee_limit"]').fill("0");
    await p
      .getByRole("button", { name: "Review and reserve", exact: true })
      .click();
    await p.locator("#transfer-review").waitFor({ state: "visible" });
    if (
      (await p.locator("[data-review-destination]").innerText()) !==
      "sandbox:test"
    )
      throw Error("Review destination mismatch");
    await p.locator("#transfer-review").evaluate(async (el) => {
      await Promise.all(
        el
          .getAnimations({ subtree: true })
          .map((a) => a.finished.catch(() => {})),
      );
    });
    await p.screenshot({
      path: input.artifacts + "/review-dialog-desktop.png",
    });
    await p.keyboard.press("Escape");
    await p.locator("#transfer-review").waitFor({ state: "hidden" });
    await p.keyboard.press("Escape");
    await p.locator("#send-dialog").waitFor({ state: "hidden" });
    await p.setViewportSize({ width: 390, height: 844 });
    if (
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    )
      throw Error("Mobile overflow");
    await p
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    if (!(await p.locator(".premium-sidebar").isVisible()))
      throw Error("Mobile menu unavailable");
    await p.keyboard.press("Escape");
    await p.screenshot({
      path: input.artifacts + "/wallet-mobile.png",
      fullPage: true,
    });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.getByRole("button", { name: "Receive", exact: true }).click();
    await receive.waitFor({ state: "visible" });
    if (await receive.evaluate((el) => el.scrollWidth > el.clientWidth + 1))
      throw Error("Mobile dialog overflow");
    if (
      await receive.evaluate((el) =>
        el
          .getAnimations({ subtree: true })
          .some((a) => a.playState === "running"),
      )
    )
      throw Error("Reduced motion not respected");
    await p.screenshot({
      path: input.artifacts + "/receive-dialog-mobile.png",
    });
    await p.keyboard.press("Escape");
    await receive.waitFor({ state: "hidden" });
    await p.keyboard.press("Control+k");
    if (
      !(await p
        .locator("[data-operation-search]")
        .evaluate((e) => e === document.activeElement))
    )
      throw Error("Search shortcut failed");
    // Complete both actual form round trips in the disposable sandbox database.
    await p.setViewportSize({ width: 1500, height: 1100 });
    await p.getByRole("button", { name: "Send", exact: true }).click();
    await p
      .locator('[name="send-destination"]')
      .fill("sandbox:browser-refinement");
    await p.locator('[name="send-amount"]').fill("0.000001");
    await p.locator('[name="send-fee_limit"]').fill("0");
    await p
      .getByRole("button", { name: "Review and reserve", exact: true })
      .click();
    await p.locator("#transfer-review").waitFor({ state: "visible" });
    let reservations = 0;
    p.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname.endsWith("/payments/")
      )
        reservations++;
    });
    await Promise.all([
      p.waitForNavigation(),
      p.locator("[data-confirm-reservation]").evaluate((button) => {
        button.click();
        button.click();
      }),
    ]);
    if (reservations !== 1)
      throw Error("Reservation was submitted " + reservations + " times");
    if ((await p.locator("#withdrawals .premium-withdrawal").count()) !== 1)
      throw Error("Reservation did not persist");
    await p.getByRole("button", { name: "Receive", exact: true }).click();
    await p.locator('[name="receive-amount"]').fill("0.000002");
    await p
      .locator('[name="receive-description"]')
      .fill("Browser modal receipt");
    await Promise.all([
      p.waitForURL("**/payments/requests/**"),
      p.locator('#receive-dialog button[type="submit"]').click(),
    ]);
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      "Chart zoom/pan/reset, expansion, dialogs, transfer review, mobile navigation and search passed.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
