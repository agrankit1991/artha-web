/**
 * Drawing a share card: a picture of one instrument's day.
 *
 * Name, symbol, price, the day's move and a month's sparkline on a card
 * the size a link preview expects, so a screenshot is never needed. The
 * drawing is a pure function of the facts and a 2D context, so it can be
 * tested with a context that records what it was asked to draw -- jsdom
 * has no canvas -- and so the dialog that shows it does nothing but hand
 * it a real one.
 */

/** A link preview's size, which is also a phone's landscape screen. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/** What a card says. */
export interface CardFacts {
  /** What the instrument is called. */
  title: string;
  /** Its symbol, exchange or category: the small line under the name. */
  subtitle: string;
  /** The latest price or level, already written. */
  price: string;
  /** The day's move as a number, or null when unknown. */
  changePercent: number | null;
  /** The move written, e.g. "+1.50%". */
  changeText: string;
  /** Closes for the sparkline, oldest first; none draws no line. */
  points: number[];
  /** "As of 16 Sep 2026", or whatever the page says. */
  asOf: string;
  /** The application's name, bottom right. */
  brand: string;
}

/** The part of a 2D context the card uses, so a test can stand one in. */
export interface CardContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  lineCap: CanvasLineCap;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  stroke(): void;
  fill(): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
}

/** The card's palette: the application's dark surface, and its gain and loss. */
const INK = "#fafafa";
const MUTED = "#a1a1aa";
const PAPER = "#18181b";
const PAPER_EDGE = "#27272a";
const GAIN = "#22c55e";
const LOSS = "#ef4444";
const FLAT = "#a1a1aa";

const PAD = 72;

/**
 * Draw the card.
 *
 * @param context - Where to draw; the whole card is painted, no clearing needed.
 * @param facts - What to say.
 */
export function drawShareCard(context: CardContext, facts: CardFacts): void {
  const tone = facts.changePercent === null ? FLAT : facts.changePercent < 0 ? LOSS : GAIN;

  // Ground: a dark card with a faint edge, as the application's dark theme has.
  const ground = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ground.addColorStop(0, PAPER);
  ground.addColorStop(1, PAPER_EDGE);
  context.fillStyle = ground;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  context.fillStyle = tone;
  context.fillRect(0, 0, 12, CARD_HEIGHT);

  // Name and what it is.
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = INK;
  context.font = "600 56px system-ui, -apple-system, Segoe UI, sans-serif";
  context.fillText(facts.title, PAD, 132, CARD_WIDTH - PAD * 2);
  context.fillStyle = MUTED;
  context.font = "400 30px system-ui, -apple-system, Segoe UI, sans-serif";
  context.fillText(facts.subtitle, PAD, 180, CARD_WIDTH - PAD * 2);

  // Price and move.
  context.fillStyle = INK;
  context.font = "700 96px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(facts.price, PAD, 330);
  context.fillStyle = tone;
  context.font = "600 44px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(facts.changeText, PAD, 392);

  // A month's line, bottom left, and the area under it in the tone.
  drawSparkline(context, facts.points, tone, {
    x: PAD,
    y: 430,
    width: CARD_WIDTH - PAD * 2,
    height: 120,
  });

  // The date, and whose card it is.
  context.fillStyle = MUTED;
  context.font = "400 26px system-ui, -apple-system, Segoe UI, sans-serif";
  context.textAlign = "left";
  context.fillText(facts.asOf, PAD, CARD_HEIGHT - 40);
  context.textAlign = "right";
  context.fillText(facts.brand, CARD_WIDTH - PAD, CARD_HEIGHT - 40);
}

/**
 * Draw the sparkline into a box.
 *
 * @param context - Where.
 * @param points - Closes, oldest first; fewer than two draw nothing.
 * @param tone - The line's colour.
 * @param box - The area to fill.
 */
function drawSparkline(
  context: CardContext,
  points: number[],
  tone: string,
  box: { x: number; y: number; width: number; height: number },
): void {
  if (points.length < 2) {
    return;
  }
  const low = Math.min(...points);
  const high = Math.max(...points);
  const span = high - low || 1;
  const step = box.width / (points.length - 1);
  const at = (index: number): [number, number] => [
    box.x + index * step,
    // `?? low` is unreachable: the index is always within the points; it
    // satisfies noUncheckedIndexedAccess, not a case.
    box.y + box.height - (((points[index] ?? low) - low) / span) * box.height,
  ];

  // The area first, faintly, then the line over it.
  const shade = context.createLinearGradient(0, box.y, 0, box.y + box.height);
  shade.addColorStop(0, `${tone}55`);
  shade.addColorStop(1, `${tone}00`);
  context.beginPath();
  context.moveTo(box.x, box.y + box.height);
  for (let index = 0; index < points.length; index += 1) {
    const [x, y] = at(index);
    context.lineTo(x, y);
  }
  context.lineTo(box.x + box.width, box.y + box.height);
  context.closePath();
  context.fillStyle = shade;
  context.fill();

  context.beginPath();
  for (let index = 0; index < points.length; index += 1) {
    const [x, y] = at(index);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.strokeStyle = tone;
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();
}
