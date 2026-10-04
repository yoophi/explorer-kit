/** Each iterable yields single-code-point strings (a string itself is valid). */
export function compareCodePoints(left: Iterable<string>, right: Iterable<string>): number {
  const leftPoints = left[Symbol.iterator]();
  const rightPoints = right[Symbol.iterator]();
  while (true) {
    const a = leftPoints.next();
    const b = rightPoints.next();
    if (a.done || b.done) return a.done === b.done ? 0 : a.done ? -1 : 1;
    const difference = a.value.codePointAt(0)! - b.value.codePointAt(0)!;
    if (difference !== 0) return difference;
  }
}

/** Compare names after lowercasing; equal lowercase forms remain tied. */
export function compareLowercasedCodePoints(left: string, right: string): number {
  return compareCodePoints(left.toLowerCase(), right.toLowerCase());
}
