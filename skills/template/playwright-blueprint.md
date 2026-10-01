# 🎭 Playwright E2E Test Blueprint

L'agent Builder doit utiliser ce template pour chaque scénario de feature majeure.

## 📝 Structure du Test
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: [Nom de la Feature]', () => {

  test('should allow a user to complete the happy path', async ({ page }) => {
    // 1. Authentification (via session cookie ou login)
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test@org.com');
    await page.click('[data-testid="submit"]');

    // 2. Navigation vers la feature
    await page.goto('/[feature-url]');

    // 3. Action métier
    await page.getByTestId('action-button').click();
    await page.fill('[data-testid="input-field"]', 'Valeur Test');
    await page.click('[data-testid="save-button"]');

    // 4. Validation du résultat
    await expect(page.getByTestId('success-message')).toBeVisible();
    await expect(page.getByTestId('result-display')).toContainText('Valeur Test');
  });

  test('should deny access to unauthenticated users', async ({ page }) => {
    await page.goto('/[feature-url]');
    // Vérifie la redirection vers le login
    await expect(page).toHaveURL(/\/auth/);
  });
});