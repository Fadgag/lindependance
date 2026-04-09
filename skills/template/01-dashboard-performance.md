# 📑 Spécification : Dashboard de Performance (V1)

## 1. Objectif
Fournir au gérant une vision analytique de son activité commerciale. Le dashboard doit transformer les données transactionnelles (RDV, Clients) en indicateurs de performance (KPIs) exploitables pour la prise de décision.

---

## 2. Architecture & Sécurité

### 🛡️ Isolation des données (Critique)
- **Scope :** Toutes les agrégations doivent impérativement être filtrées par `organizationId` extrait de la session serveur (`auth()`).
- **Middleware :** La route API doit rejeter toute requête non authentifiée (401) ou sans `organizationId` valide (403).

### 🛠️ Stack Technique
- **Backend :** Next.js Route Handler (`/api/stats/dashboard/route.ts`).
- **ORM :** Prisma (Aggregations : `_sum`, `_count`).
- **Frontend :** React Server Components (pour le squelette) + Client Components (pour les graphiques interactifs).
- **Lib de Chart :** Recharts ou Tremor.
- **Dates :** `date-fns` pour le calcul des périodes.

---

## 3. Spécifications du Backend (API)

### Endpoint : `GET /api/stats/dashboard`
**Paramètres (Query) :** - `period` : `7d` (7 derniers jours), `30d` (par défaut), `this_month`.

**Données à retourner :**
1. **Summary (Valeurs unitaires) :**
    - `totalRevenue` : Somme des prix des rendez-vous.
    - `appointmentCount` : Nombre total de rendez-vous sur la période.
    - `newCustomerCount` : Nombre de clients créés (createdAt) sur la période.
2. **TimeSeries (Graphique) :**
    - Tableau d'objets : `[{ date: string, revenue: number, count: number }]`.

---

## 4. Spécifications de l'Interface (UI)

### A. Section "Overview" (Cards)
Affichage de 3 indicateurs majeurs sous forme de "Bento Grid" :
1. **Chiffre d'Affaires** : Montant total avec symbole €.
2. **Volume d'Activité** : Nombre de rendez-vous honorés.
3. **Croissance Client** : Nombre de nouvelles fiches créées.

### B. Section "Graphique" (Visualisation)
- **Type :** AreaChart (Courbe lissée avec remplissage).
- **Axe X :** Jours de la période sélectionnée.
- **Axe Y :** Chiffre d'affaires journalier.
- **Comportement :** Tooltip affichant le CA précis au survol d'un point.

---

## 5. Cas d'Erreurs & Edge Cases

- **Zéro Data :** Si aucun rendez-vous n'existe sur la période, retourner `0` pour les chiffres et un tableau vide pour le graphique (ne pas crash).
- **Rendez-vous sans prix :** Si le champ `price` est nul, le considérer comme `0` dans la somme.
- **Timezones :** S'assurer que le groupement par jour (`groupBy`) utilise bien la timezone locale du salon et non UTC pour éviter les décalages de date sur le graphique.

---

## 6. Checklist d'Implémentation
- [ ] Créer le fichier `src/app/api/stats/dashboard/route.ts`.
- [ ] Vérifier que `date-fns` est installé.
- [ ] Implémenter les requêtes Prisma avec filtrage `organizationId`.
- [ ] Créer le composant `DashboardCharts.tsx` (Client Component).
- [ ] Intégrer le composant dans la page principale du dashboard.