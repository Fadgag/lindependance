function normalizeEmail(email: string | null): string | null {
  return email?.trim().toLowerCase() || null
}

export function shouldInvalidateCustomerOtp(
  previousEmail: string | null,
  nextEmail: string | null | undefined,
): boolean {
  return nextEmail !== undefined && normalizeEmail(previousEmail) !== normalizeEmail(nextEmail)
}
