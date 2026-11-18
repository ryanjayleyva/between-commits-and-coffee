import { describe, expect, it } from 'vitest'
import { getReadingTime } from '@/lib/reading-time'

function words(count: number): string {
  return Array.from({ length: count }, () => 'word').join(' ')
}

describe('getReadingTime', () => {
  it('returns 1 minute for an empty body', () => {
    expect(getReadingTime('')).toBe(1)
  })

  it('returns 1 minute for a short body', () => {
    expect(getReadingTime('just a few words')).toBe(1)
  })

  it('returns 1 minute for exactly 200 words', () => {
    expect(getReadingTime(words(200))).toBe(1)
  })

  it('rounds up to 2 minutes for 201 words', () => {
    expect(getReadingTime(words(201))).toBe(2)
  })

  it('counts words across repeated whitespace and newlines', () => {
    const body = `${words(100)}\n\n   \n${words(101)}`
    expect(getReadingTime(body)).toBe(2)
  })
})
