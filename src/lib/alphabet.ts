// Alphabetical grouping for the roster ("danh bạ"), iPhone Contacts style.
//
// Vietnamese names are folded onto plain A-Z before grouping and sorting: Ánh
// and An share a group, and Đức sits with Dũng under D. Folding (rather than
// the strict Vietnamese alphabet, where Ă/Â/Đ are letters of their own) keeps
// the index rail short for a roster of a few dozen people.

const OTHER = '#'

/** Lowercases and strips Vietnamese tone marks, đ and the ơ/ư horn. */
export function normalizeVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase()
}

/** The A-Z section a name belongs to, or '#' for digits, symbols and blanks. */
export function initialLetter(name: string): string {
  const first = normalizeVi(name).charAt(0).toUpperCase()
  return first >= 'A' && first <= 'Z' ? first : OTHER
}

export interface LetterGroup<T> {
  letter: string
  items: T[]
}

/** Groups entries by initial letter: sections A-Z then '#', names sorted inside. */
export function groupByLetter<T extends { name: string }>(
  entries: readonly T[],
): LetterGroup<T>[] {
  const byLetter = new Map<string, T[]>()
  for (const entry of entries) {
    const letter = initialLetter(entry.name)
    const bucket = byLetter.get(letter)
    if (bucket) bucket.push(entry)
    else byLetter.set(letter, [entry])
  }
  return [...byLetter]
    .sort(([a], [b]) => {
      if (a === OTHER) return 1
      if (b === OTHER) return -1
      return a < b ? -1 : 1
    })
    .map(([letter, items]) => ({
      letter,
      // sorted on the folded name so the order matches the grouping — a
      // locale collation would put Bảo before Bắc, which reads as random
      // next to a section header that ignores diacritics
      items: [...items].sort(
        (a, b) =>
          normalizeVi(a.name).localeCompare(normalizeVi(b.name)) ||
          a.name.localeCompare(b.name, 'vi'),
      ),
    }))
}

/** Diacritic- and case-insensitive substring match; a blank query matches all. */
export function matchesQuery(name: string, query: string): boolean {
  const q = normalizeVi(query)
  return q === '' || normalizeVi(name).includes(q)
}
