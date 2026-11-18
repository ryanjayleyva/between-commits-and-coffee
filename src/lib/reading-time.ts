const WORDS_PER_MINUTE = 200

export function getReadingTime(body: string): number {
  const wordCount = body.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
}
