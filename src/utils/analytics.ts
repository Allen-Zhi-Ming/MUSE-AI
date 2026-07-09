export interface AnalyticsEvent {
  id: string;
  category: string; // "chat" | "studio" | "journal" | "habit" | "project" | "theme" | "error" | "engagement"
  action: string;
  label: string;
  ts: string;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];

  constructor() {
    this.load();
    this.trackSessionStart();
  }

  private load() {
    try {
      const stored = localStorage.getItem("muse_analytics_events");
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (e) {
      this.events = [];
    }
  }

  private save() {
    try {
      localStorage.setItem("muse_analytics_events", JSON.stringify(this.events));
    } catch (e) {}
  }

  private trackSessionStart() {
    // Only track if no session started recently to prevent bloat on fast reloads
    const key = "muse_last_session_tracked";
    const now = Date.now();
    const last = localStorage.getItem(key);
    if (!last || now - parseInt(last, 10) > 30000) {
      this.track("engagement", "Session Started", "Application loaded successfully");
      localStorage.setItem(key, now.toString());
    }
  }

  track(category: string, action: string, label: string) {
    const timeStr = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const event: AnalyticsEvent = {
      id: "ev-" + Math.random().toString(36).substring(2, 9),
      category,
      action,
      label,
      ts: timeStr
    };
    
    this.events.unshift(event);
    // Maintain a cap of 150 events to avoid LocalStorage bloat
    if (this.events.length > 150) {
      this.events = this.events.slice(0, 150);
    }
    
    this.save();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("muse_analytics_updated", { detail: event }));
    }, 0);
  }

  getEvents(): AnalyticsEvent[] {
    return this.events;
  }

  getCategoryBreakdown(): Record<string, number> {
    const counts: Record<string, number> = {
      chat: 0,
      studio: 0,
      journal: 0,
      habit: 0,
      inspi: 0,
      comm: 0,
      project: 0,
      theme: 0,
      error: 0,
      engagement: 0
    };
    this.events.forEach(e => {
      const cat = e.category;
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts[cat] = 1;
      }
    });
    return counts;
  }

  clear() {
    this.events = [];
    this.save();
    setTimeout(() => {
      window.dispatchEvent(new Event("muse_analytics_updated"));
    }, 0);
  }
}

export const analytics = new AnalyticsService();
