# 🏗️ Skill: Feature Blueprint
**Statut :** VALIDATED
**Feature :** Action Rapide - Création de Rendez-vous (Quick RDV)

## 🎯 Objectif Métier
Améliorer radicalement l'efficacité opérationnelle en permettant de saisir un rendez-vous depuis n'importe quelle vue principale (Accueil/Agenda) via une modale unique, évitant ainsi les allers-retours dans les menus.

## 🛠️ Stack & Architecture Imposée
1. **Composant UI (Reusable) :**
    - Créer `src/components/appointments/QuickAppointmentModal.tsx` utilisant le composant `Dialog` de Shadcn/ui.
    - Créer `src/components/ui/FloatingActionButton.tsx` pour le déclencheur visuel.
2. **Formulaire (Validation avec Zod) :**
    - **Client :** Liste déroulante avec recherche (ou simple champ texte si la base client n'est pas encore liée).
    - **Date & Heure :** Input de type `datetime-local` ou deux inputs séparés. *Par défaut : date du jour*.
    - **Prestation :** Champ texte ou select des services prédéfinis.
    - **Notes :** Zone de texte optionnelle.
3. **Logic Layer :**
    - Utiliser une **Server Action** pour l'insertion en base via Prisma.
    - Revalidation : `revalidatePath('/')` et `revalidatePath('/agenda')`.

## 📱 Design & UX (Mobile First)
- **Bouton Flottant (FAB) :** Sur mobile, le bouton doit être un cercle avec une icône `+`, fixé en bas à droite (`fixed bottom-6 right-6`).
- **Bouton Desktop :** Dans la barre d'outils ou en haut de page, bouton classique avec label "Nouveau RDV".
- **Comportement :** La modale doit prendre toute la largeur sur mobile pour faciliter la saisie au clavier.

## 🛡️ Règles de Sécurité
- [ ] L'agent doit récupérer l'`userId` ou `organizationId` via la session (Auth) pour lier le RDV au bon compte.
- [ ] Empêcher la soumission si les champs obligatoires (Date, Client) sont vides.

## 🧪 Protocole de Test (Definition of Done)
1. **Accessibilité :** Cliquer sur le bouton "+" depuis l'Accueil.
2. **Action :** Remplir le formulaire et valider.
3. **Vérification :** La modale se ferme, un message de succès (Toast) apparaît, et le RDV est visible immédiatement dans l'agenda sans rafraîchir la page manuellement.