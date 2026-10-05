export function shouldStackOrganizationBrand(
  availableWidth: number,
  titleWidth: number,
  logoWidth: number,
  gap: number,
): boolean {
  return titleWidth + logoWidth + gap > availableWidth
}
