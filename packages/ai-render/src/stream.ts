// Incremental splitter of the model's HTML stream (spec §2.1): the block roots are the delimiters. It tracks open
// tags (a stack, so an unclosed `<li>` closed by `</ul>` still balances) and hands each root over when it closes, so
// a block can be sanitized, checked and shown while the rest of the screen is still being written. Prose, code
// fences and comments outside the roots are ignored. Pure TS: the server route, the BYOK path in the browser and
// «mi Claude» use it.

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW_TEXT = new Set(["script", "style", "textarea", "title", "xmp", "noscript", "iframe", "noembed", "noframes"]);

export type StreamBlock = {
  /** `data-block-id` of the root as written by the model (`null` when missing). */
  blockId: string | null;
  /** Raw HTML of the root, start to end tag. */
  html: string;
  /** Root closed by the next root or the end of the stream instead of its own end tag. */
  forced: boolean;
};

const BLOCK_ID = /\sdata-block-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/=`]+))/i;

export function blockIdOfTag(tag: string): string | null {
  const match = BLOCK_ID.exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? null) : null;
}

export class BlockStreamParser {
  private buffer = "";
  /** Next index of `buffer` to scan. */
  private pos = 0;
  /** Start of the current root in `buffer` (−1 outside a root). */
  private rootStart = -1;
  private rootId: string | null = null;
  private stack: string[] = [];
  private rawUntil: string | null = null;
  /** Characters received (the server's 120 KB cap reads it). */
  received = 0;

  /**
   * @param expected ids the screen asked for: a new root carrying one of them while the previous one is still open
   * closes the previous one (the model forgot an end tag).
   */
  constructor(private readonly expected: ReadonlySet<string> = new Set()) {}

  /** Feeds text; returns the roots that closed. */
  push(chunk: string): StreamBlock[] {
    this.buffer += chunk;
    this.received += chunk.length;
    return this.scan(false);
  }

  /** End of the stream: an open root is handed over as `forced`. */
  end(): StreamBlock[] {
    const out = this.scan(true);
    if (this.rootStart >= 0) {
      out.push({ blockId: this.rootId, html: this.buffer.slice(this.rootStart), forced: true });
      this.resetRoot(this.buffer.length);
    }
    return out;
  }

  private resetRoot(cut: number) {
    this.rootStart = -1;
    this.rootId = null;
    this.stack = [];
    this.rawUntil = null;
    // Drop what was consumed so the buffer stays small.
    this.buffer = this.buffer.slice(cut);
    this.pos -= cut;
  }

  private scan(final: boolean): StreamBlock[] {
    const out: StreamBlock[] = [];
    const text = () => this.buffer;
    while (this.pos < text().length) {
      const buffer = text();
      if (this.rawUntil) {
        const close = buffer.toLowerCase().indexOf(`</${this.rawUntil}`, this.pos);
        if (close < 0) {
          this.pos = Math.max(this.pos, buffer.length - this.rawUntil.length - 2);
          break;
        }
        this.pos = close;
        this.rawUntil = null;
        continue;
      }
      const lt = buffer.indexOf("<", this.pos);
      if (lt < 0) {
        this.pos = buffer.length;
        if (this.rootStart < 0) this.resetRoot(this.pos);
        break;
      }
      if (buffer.startsWith("<!--", lt)) {
        const close = buffer.indexOf("-->", lt + 4);
        if (close < 0) {
          this.pos = lt;
          break;
        }
        this.pos = close + 3;
        continue;
      }
      const end = tagEnd(buffer, lt);
      if (end < 0) {
        // The tag is not complete yet (or the stream ended inside it).
        this.pos = lt;
        if (final) this.pos = buffer.length;
        break;
      }
      const tag = buffer.slice(lt, end + 1);
      this.pos = end + 1;
      const parsed = /^<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag);
      if (!parsed) continue;
      const closing = parsed[1] === "/";
      const name = parsed[2]!.toLowerCase();

      if (!closing) {
        const id = blockIdOfTag(tag);
        if (this.rootStart >= 0 && id !== null && id !== this.rootId && this.expected.has(id)) {
          // A new root while the previous one is open: close the previous one here.
          out.push({ blockId: this.rootId, html: buffer.slice(this.rootStart, lt), forced: true });
          this.resetRoot(lt);
          this.pos = 0;
          continue;
        }
        if (this.rootStart < 0) {
          if (VOID.has(name)) continue;
          this.rootStart = lt;
          this.rootId = id;
          this.stack = [name];
          if (RAW_TEXT.has(name)) this.rawUntil = name;
          continue;
        }
        if (VOID.has(name) || /\/\s*>$/.test(tag)) continue;
        this.stack.push(name);
        if (RAW_TEXT.has(name)) this.rawUntil = name;
        continue;
      }

      if (this.rootStart < 0) continue;
      const index = this.stack.lastIndexOf(name);
      if (index < 0) continue;
      this.stack.length = index;
      if (this.stack.length === 0) {
        out.push({ blockId: this.rootId, html: buffer.slice(this.rootStart, this.pos), forced: false });
        this.resetRoot(this.pos);
      }
    }
    return out;
  }
}

/** Index of the `>` that closes the tag starting at `lt` (quotes respected), or −1. */
function tagEnd(text: string, lt: number): number {
  let quote: string | null = null;
  for (let i = lt + 1; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return i;
  }
  return -1;
}

/** Whole answers («mi Claude», tests): every root of `text`. */
export function splitBlocks(text: string, expected: Iterable<string> = []): StreamBlock[] {
  const parser = new BlockStreamParser(new Set(expected));
  return [...parser.push(text), ...parser.end()];
}
