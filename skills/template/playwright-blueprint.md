# 🎭 Playwright E2E Test Blueprint

Utiliser ce modèle pour les parcours E2E pertinents, en l'adaptant aux fixtures,
helpers d'authentification, conventions de données et projets Playwright déjà
configurés dans le dépôt. Ne pas supposer une route de connexion ni un compte fixes.

Préférer les locators accessibles (`getByRole`, `getByLabel`, `getByText`) et
n'utiliser `data-testid` que lorsqu'aucun locator stable et accessible ne convient.
Les identifiants et données de test doivent venir des fixtures/configurations du
projet, jamais de secrets ou de comptes réels inscrits dans le test.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: [Nom de la feature]', () => {
  test('allows an authenticated user to complete the happy path', async ({ page }) => {
    // La session et les données de test sont fournies par les fixtures du projet.
    await page.goto('/[feature-url]');

    await page.getByRole('button', { name: '[action]' }).click();
    await page.getByLabel('[input]').fill('Valeur de test');
    await page.getByRole('button', { name: '[save]' }).click();

    await expect(page.getByRole('status')).toContainText('Valeur de test');
  });

  test('denies access to unauthenticated users', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto('/[feature-url]');
      await expect(page).toHaveURL('[actual-auth-redirect-url]');
    } finally {
      await context.close();
    }
  });
});
```

La route, les rôles et les résultats attendus sont des placeholders : les remplacer
par le contrat réel de la feature. Vérifier aussi que le contexte non authentifié
n'hérite pas du `storageState` configuré pour les tests authentifiés.
