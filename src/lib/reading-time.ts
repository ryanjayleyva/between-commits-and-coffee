const WORDS_PER_MINUTE = 200

export function getReadingTime(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
