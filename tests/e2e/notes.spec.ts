import { test, expect } from '@playwright/test';

test.describe('Notes rendez-vous', () => {
  // Adapter login / state selon votre projet (storageState, helper, etc.)
  test.beforeEach(async ({ page }) => {
    // Aller sur l'app (adapter URL si besoin)
    await page.goto(process.env.E2E_BASE_URL ?? 'http://localhost:3000');

    // Si besoin, se logger automatiquement (ex: via cookie / fixture)
    // await loginAsTestUser(page);

    // Ouvrir un rendez-vous existant — adapter le sélecteur / id
    await page.click('[data-testid="appointment-item-123"]');
    await expect(page.locator('[data-testid="appointment-modal"]')).toBeVisible();
  });

  test('Autosave onBlur : remplit la note, blur -> indicateur "✅ Enregistré"', async ({ page }) => {
    const note = page.locator('[data-testid="appointment-note"]');
    const indicator = page.locator('[data-testid="save-indicator"]');

    const text = `E2E autosave ${Date.now()}`;
    await note.fill(text);

    // Clic en-dehors pour provoquer onBlur
    await page.click('body', { position: { x: 0, y: 0 } });

    // Attendre l'indicateur 'Enregistré' (augmenter timeout si nécessaire)
    await expect(indicator).toHaveText('✅ Enregistré', { timeout: 10000 });
  });

  test('Sécurité à la fermeture : modifie, ferme -> ConfirmDialog -> Enregistrer -> persistance', async ({ page }) => {
    const note = page.locator('[data-testid="appointment-note"]');
    const closeBtn = page.locator('[data-testid="close-modal"]');

    const newText = `E2E save-on-close ${Date.now()}`;
    await note.fill(newText);

    // Tenter de fermer la modale
    await closeBtn.click();

    // Le ConfirmDialog doit apparaître
    const dialog = page.getByRole('dialog').filter({ hasText: 'Voulez-vous enregistrer' });
    await expect(dialog).toBeVisible();

    // Cliquer sur "Enregistrer" dans le dialog
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();

    // Vérifier que l'indicateur s'affiche
    const indicator = page.locator('[data-testid="save-indicator"]');
    await expect(indicator).toHaveText('✅ Enregistré', { timeout: 10000 });

    // Optionnel: fermer et rouvrir la modale pour vérifier persistance
    await page.click('[data-testid="appointment-item-123"]');
    await expect(page.locator('[data-testid="appointment-note"]')).toHaveValue(newText);
  });
});

