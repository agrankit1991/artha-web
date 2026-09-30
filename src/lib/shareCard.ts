/**
 * Drawing a share card: a picture of one instrument's day.
 *
 * Name, symbol, price, the day's move and a month's sparkline on a card
 * the size a link preview expects, so a screenshot is never needed. The
 * drawing is a pure function of the facts and a 2D context, so it can be
 * tested with a context that records what it was asked to draw -- jsdom
 * has no canvas -- and so the dialog that shows it does nothing but hand
 * it a real one.
 *
 * In the brand since 2026-09-30: the dark mode's surfaces and its rise and
 * fall, Geist for the words and figures, and the name in the logo's two
 * colours. A canvas cannot read a token, and the card is dark whatever the
 * page's mode, so the colours are the dark tokens' values written out;
 * `palette.test.ts` fails when they drift from the stylesheet.
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
  measureText(text: string): { width: number };
  drawImage(image: CanvasImageSource, x: number, y: number, width: number, height: number): void;
}

/**
 * The card's colours, each the dark mode's value of the token named beside
 * it in `index.css`.
 */
export const CARD_COLOURS = {
  /** `--foreground` */
  ink: "#e4f0f2",
  /** `--muted-foreground` */
  muted: "#8fa8ae",
  /** `--background` */
  paper: "#0a1316",
  /** `--card` */
  paperEdge: "#101d21",
  /** `--gain` */
  gain: "#22c55e",
  /** `--loss` */
  loss: "#ef4444",
  /** `--wordmark-artha` */
  artha: "#fb7a3c",
  /** `--wordmark-science` */
  science: "#2bb7d1",
} as const;

const {
  ink: INK,
  muted: MUTED,
  paper: PAPER,
  paperEdge: PAPER_EDGE,
  gain: GAIN,
  loss: LOSS,
} = CARD_COLOURS;
/** No move known: neither rise nor fall. */
const FLAT = CARD_COLOURS.muted;

/** The application's typefaces, loaded by `main.tsx`, then the system's. */
const SANS = "'Geist Variable', system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace";

const PAD = 72;

/** The logo's size beside the name: it is square. */
const LOGO = 44;

/**
 * Draw the card.
 *
 * @param context - Where to draw; the whole card is painted, no clearing needed.
 * @param facts - What to say.
 * @param logo - The logo, drawn before the name when it has loaded; without
 *   it the card is whole, only plainer.
 */
export function drawShareCard(
  context: CardContext,
  facts: CardFacts,
  logo: CanvasImageSource | null = null,
): void {
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
  context.font = `600 56px ${SANS}`;
  context.fillText(facts.title, PAD, 132, CARD_WIDTH - PAD * 2);
  context.fillStyle = MUTED;
  context.font = `400 30px ${SANS}`;
  context.fillText(facts.subtitle, PAD, 180, CARD_WIDTH - PAD * 2);

  // Price and move.
  context.fillStyle = INK;
  context.font = `700 96px ${MONO}`;
  context.fillText(facts.price, PAD, 330);
  context.fillStyle = tone;
  context.font = `600 44px ${MONO}`;
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
  context.font = `400 26px ${SANS}`;
  context.textAlign = "left";
  context.fillText(facts.asOf, PAD, CARD_HEIGHT - 40);
  const named = drawWordmark(context, facts.brand, CARD_WIDTH - PAD, CARD_HEIGHT - 40);
  if (logo !== null) {
    context.drawImage(logo, named - 12 - LOGO, CARD_HEIGHT - 40 - LOGO + 10, LOGO, LOGO);
  }
}

/**
 * The application's name in the logo's two colours, ending at a point: its
 * first word in the orange, the rest in the teal, as the sidebar writes it.
 *
 * @param context - Where.
 * @param name - The name, such as "Artha Science".
 * @param right - Where the name ends.
 * @param baseline - The line it sits on.
 * @returns Where the name starts, for the logo to sit before it.
 */
function drawWordmark(context: CardContext, name: string, right: number, baseline: number): number {
  const space = name.indexOf(" ");
  const first = space === -1 ? name : name.slice(0, space);
  const rest = space === -1 ? "" : name.slice(space + 1);
  context.font = `700 30px ${SANS}`;
  context.textAlign = "left";
  const lead = context.measureText(`${first} `).width;
  const start = right - lead - context.measureText(rest).width;
  context.fillStyle = CARD_COLOURS.artha;
  context.fillText(first, start, baseline);
  context.fillStyle = CARD_COLOURS.science;
  context.fillText(rest, start + lead, baseline);
  return start;
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
