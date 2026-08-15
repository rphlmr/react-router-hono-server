import { chromium } from "@playwright/test";
import { expect, test } from "vitest";
import type { FixtureApp } from "../../helpers/fixture";

export function registerProductionBrowserTests(getApp: () => FixtureApp) {
  test("hydrates, interacts, navigates, submits actions, and loads assets in Chromium", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    try {
      await page.goto(getApp().url);
      await page.getByRole("button", { name: "count:0" }).click();
      await expect.poll(() => page.getByRole("button").textContent()).toBe("count:1");
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).color)).toBe("rgb(20, 30, 40)");

      await page.getByRole("link", { name: "Loader" }).click();
      await expect.poll(() => page.getByRole("heading").textContent()).toBe("hello-from-loader");
      await page.goto(`${getApp().url}/action`);
      await page.getByRole("textbox").fill("browser-action");
      await page.getByRole("button", { name: "Submit" }).click();
      await expect.poll(() => page.getByText("browser-action").count()).toBe(1);
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  });
}

export function registerDevBrowserTests(getApp: () => FixtureApp) {
  test("applies browser HMR without reloading or losing state", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const messages: string[] = [];
    page.on("console", (message) => messages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
    try {
      await page.goto(getApp().url);
      await page.getByRole("button", { name: "count:0" }).click();
      await getApp().edit(
        "app/routes/_index.tsx",
        `import { useState } from "react";
export default function IndexRoute() {
  const [count, setCount] = useState(0);
  return <main><h1>HMR works</h1><button type="button" onClick={() => setCount((value) => value + 1)}>count:{count}</button></main>;
}
`
      );
      try {
        await expect.poll(() => page.getByRole("heading").textContent(), { timeout: 15_000 }).toBe("HMR works");
      } catch (error) {
        const resources = await page.evaluate(() =>
          performance.getEntriesByType("resource").map((entry) => entry.name)
        );
        throw new Error(
          `${String(error)}\nBrowser messages:\n${messages.join("\n")}\nResources:\n${resources.join("\n")}`
        );
      }
      await expect.poll(() => page.getByRole("button").textContent()).toBe("count:1");
    } finally {
      await browser.close();
    }
  });
}
