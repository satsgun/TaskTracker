import { describe, expect, it } from "vitest";

import { appName } from "../src/main";

describe("appName", () => {
  it("returns the application name", () => {
    expect(appName()).toBe("Task Tracker");
  });
});
