/** Random id for locally-created entities (players, extra costs, saved sessions). */
export const uid = (): string =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
