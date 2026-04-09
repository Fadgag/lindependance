"use client"

import { showToast } from './toast'

export function clientError(message: string, err?: unknown) {
  try {
    // Prefer to show a user-friendly toast in client UI
    showToast(message)
    // Also keep console.error during development for debugging
    if (process.env.NODE_ENV === 'development') console.error(message, err)
  } catch (e) {
    // swallow
  }
}

export function clientWarn(message: string, err?: unknown) {
  try {
    showToast(message)
    if (process.env.NODE_ENV === 'development') console.warn(message, err)
  } catch (e) {
    // swallow
  }
}

