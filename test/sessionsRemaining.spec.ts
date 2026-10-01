import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('sessionsRemaining transaction pattern', () => {
  it('ensures code uses updateMany pattern for atomic decrement', () => {
    const file = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'api', 'appointments', 'route.ts'), 'utf-8')
    expect(file.includes('updateMany')).toBe(true)
  })
})

