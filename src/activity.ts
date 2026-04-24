export interface ActivityEntry {
  t: string;
  agent: string;
  action: "read" | "write";
  key: string;
}

const MAX_ENTRIES = 500;

class ActivityLog {
  private entries: ActivityEntry[] = [];

  record(entry: Omit<ActivityEntry, "t"> & { t?: string }): void {
    const t =
      entry.t ??
      new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    this.entries.unshift({ t, agent: entry.agent, action: entry.action, key: entry.key });
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.length = MAX_ENTRIES;
    }
  }

  list(limit: number): ActivityEntry[] {
    return this.entries.slice(0, limit);
  }
}

export const activityLog = new ActivityLog();
