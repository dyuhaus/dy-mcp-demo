import { describe, expect, it } from "vitest";
import { activityLog } from "../src/activity.js";

describe("activity log", () => {
  it("records and returns newest-first", () => {
    activityLog.record({ agent: "a1", action: "read", key: "x" });
    activityLog.record({ agent: "a2", action: "write", key: "y" });
    const entries = activityLog.list(10);
    expect(entries[0].key).toBe("y");
    expect(entries[1].key).toBe("x");
  });

  it("caps at 500 entries", () => {
    for (let i = 0; i < 600; i++) {
      activityLog.record({ agent: "bulk", action: "read", key: `k-${i}` });
    }
    const all = activityLog.list(1000);
    expect(all.length).toBeLessThanOrEqual(500);
    expect(all[0].key).toBe("k-599");
  });
});
