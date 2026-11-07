/**
 * Charts kept in step: the session under the crosshair and the span on
 * screen, followed by every chart in a group (the Observer pattern).
 *
 * The watchlist's Chart view lays several charts side by side, and comparing
 * them is reading the same day on each. A chart joins a group as a member
 * that can show a session's crosshair and a span; when one moves, the rest
 * are told. Spans are kept in step by date, not by bar number: two
 * companies' sessions do not line up when one listed later or was suspended,
 * and bar 200 is then a different day on each.
 *
 * Plain logic, apart from any chart library, so it is tested as such; `Chart`
 * adapts the library to a member.
 */

/** A span of sessions, by ISO date. */
export interface SessionSpan {
  from: string;
  to: string;
}

/** A chart as a group sees it. */
export interface SyncedChart {
  /** Put the crosshair on a session, or take it away with null. */
  showCrosshair: (day: string | null) => void;
  /** Show a span of sessions. */
  showSpan: (span: SessionSpan) => void;
}

/** What a group keeps in step. */
export interface SyncSettings {
  crosshair: boolean;
  span: boolean;
}

/** A group of charts kept in step. */
export class ChartSync {
  private readonly members = new Set<SyncedChart>();
  // Set while telling the others, so a chart moved by the group does not
  // tell the group again, which would echo back and forth.
  private telling = false;

  /**
   * Start a group.
   *
   * @param settings - What it keeps in step; changed later with `configure`.
   */
  constructor(private settings: SyncSettings = { crosshair: true, span: true }) {}

  /**
   * Change what the group keeps in step.
   *
   * @param settings - The new settings.
   */
  configure(settings: SyncSettings): void {
    this.settings = settings;
  }

  /**
   * Add a chart to the group.
   *
   * @param member - The chart.
   * @returns What takes it out again, as when it is torn down.
   */
  join(member: SyncedChart): () => void {
    this.members.add(member);
    return () => {
      this.members.delete(member);
    };
  }

  /**
   * Tell the others the crosshair moved on one chart.
   *
   * @param source - The chart it moved on.
   * @param day - The session now under it, or null off the plot.
   */
  crosshairMoved(source: SyncedChart, day: string | null): void {
    if (this.settings.crosshair) {
      this.tell(source, (member) => {
        member.showCrosshair(day);
      });
    }
  }

  /**
   * Tell the others one chart now shows another span.
   *
   * @param source - The chart that moved.
   * @param span - The span it shows.
   */
  spanChanged(source: SyncedChart, span: SessionSpan): void {
    if (this.settings.span) {
      this.tell(source, (member) => {
        member.showSpan(span);
      });
    }
  }

  private tell(source: SyncedChart, act: (member: SyncedChart) => void): void {
    if (this.telling) {
      return;
    }
    this.telling = true;
    try {
      for (const member of this.members) {
        if (member !== source) {
          act(member);
        }
      }
    } finally {
      this.telling = false;
    }
  }
}
