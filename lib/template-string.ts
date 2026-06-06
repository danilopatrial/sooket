const SLOT_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

/** Returns deduplicated slot names in order of first appearance. */
export function parseSlots(template: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  let m: RegExpExecArray | null;
  SLOT_RE.lastIndex = 0;
  while ((m = SLOT_RE.exec(template)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      order.push(m[1]);
    }
  }
  return order;
}
