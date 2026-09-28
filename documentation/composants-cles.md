# Composants clés (`src/components/`)

Cette page documente les composants React les plus significatifs (logique ou responsabilité
importante), pas l'intégralité des 36 fichiers de `src/components/`. Convention générale :
les composants sont des **clients** (`"use client"`), consomment les API via `fetch`, et ne
contiennent pas d'accès direct à Prisma (voir `technique.md` §4). Les calculs métier partagés
(TVA, etc.) sont importés depuis `src/domain/` plutôt que réimplémentés localement.

## Agenda / Calendrier

### `AppointmentScheduler.tsx`
Composant racine de la page agenda. Orchestre FullCalendar (`@fullcalendar/react`) : affichage
des ressources (staff), des rendez-vous et des indisponibilités sur la même vue. Délègue le
chargement des données à `useCalendarData` (hook) et les réglages d'organisation (horaires
d'ouverture) à `useOrganizationSettings`. Ouvre `AppointmentModal` / `UnavailabilityModal` /
`CheckoutModal` selon l'action de l'utilisateur (clic sur un créneau vide, clic sur un
rendez-vous existant, etc.).

### `calendar/AppointmentModal.tsx`
Formulaire de création/édition d'un rendez-vous. Toute la logique d'état et de sauvegarde est
déportée dans le hook `useAppointmentForm` (le composant ne fait que du rendu + branchement des
callbacks). Props principales : `isOpen`, `onCloseAction`, `onSuccess`, `selectedRange` (créneau
pré-sélectionné dans le calendrier), `initialData` (mode édition), `services`, `customers`,
`staffs`. Compose `CustomerPicker`, `PackageSelector`, `TimeRangeSection`, `ConfirmDialog`
(confirmation de suppression) au-dessus de `BaseModal`.

### `calendar/UnavailabilityModal.tsx`
Formulaire de création/édition d'une indisponibilité (congé, blocage). Gère la récurrence
(`RECURRENCE_OPTIONS` : aucune / hebdo / bimensuelle / mensuelle) et, en mode édition d'une
série récurrente, propose de supprimer soit l'occurrence, soit toute la série
(`editingRecurrenceGroupId`).

### `calendar/CustomerPicker.tsx`
Sélecteur de client avec recherche (combobox), création rapide d'un nouveau client à la volée
(bouton "+"), utilisé dans `AppointmentModal`. Un composant équivalent existe côté encaissement
si besoin de rattacher/modifier le client d'un rendez-vous.

### `calendar/PackageSelector.tsx`
Liste déroulante des forfaits **utilisables** du client sélectionné (déjà filtrés côté API par
`canConsumeSession`), affichant le nombre de séances restantes. Permet de rattacher le
rendez-vous à un forfait pour déclencher le décrément de séance à la création.

## Encaissement / Dashboard

### `dashboard/CheckoutModal.tsx`
Écran d'encaissement d'un rendez-vous : ajustement du prix (extras libres + produits vendus du
catalogue via `ProductPicker`), calcul du total TTC et de la TVA (délégué à
`src/domain/billing/vat.ts::computeSoldProductLine` — voir `technique.md` §4), choix du mode de
paiement, note. Au clic sur "Confirmer", appelle `POST /api/appointments/[id]/checkout`.

### `dashboard/ProductPicker.tsx`
Sélecteur de produit du catalogue à ajouter à un encaissement (`onSelect(product)`), avec
mémorisation des produits "récents" en `localStorage` (`recent_products`, 8 max) pour un accès
rapide aux articles les plus utilisés.

### `dashboard/EditPaymentModal.tsx`
Permet de corriger a posteriori le mode de paiement et la note d'un rendez-vous déjà payé
(`appointment`, `onClose`, `onSuccess`), sans toucher au montant ni aux produits vendus.

### `dashboard/DashboardShell.tsx`
Conteneur de la page dashboard : reçoit les données déjà calculées côté serveur
(`initialData: DashboardData`, `currentPeriod`), affiche les KPIs (CA réalisé/prévisionnel,
nombre de RDV, nouveaux clients) et délègue les graphiques à `DashboardCharts`. Le changement de
période met à jour l'URL (`computeDateRange`) pour re-fetcher côté serveur (App Router).

### `dashboard/DetailsFilterBar.tsx`
Barre de filtres de la page "Détails" du dashboard (période personnalisée, recherche), pilotée
par les search params de l'URL (`useSearchParams`/`usePathname`/`useRouter`).

## Paramètres (Settings)

### `settings/ServiceManager.tsx`, `settings/ProductManager.tsx`
CRUD complet (création, édition inline, suppression) des prestations et produits du catalogue
de l'organisation, chacun branché sur `GET/POST/PUT/DELETE /api/services` /
`/api/products`. `ProductManager` gère en plus le choix d'une icône (`iconName`) parmi un
jeu prédéfini (`lucide-react`).

### `settings/PasswordSettings.tsx`
Formulaire de changement de mot de passe pour l'utilisateur connecté, basé sur `PasswordInput`
(champ mot de passe avec bascule affichage/masquage) et `useTransition` pour l'état de
soumission.

## UI générique / transverse

### `ui/BaseModal.tsx`
Modale de base (Radix `Dialog` + `framer-motion`) utilisée par **toutes** les autres modales du
projet (`AppointmentModal`, `UnavailabilityModal`, etc.). Gère l'empilement de plusieurs
modales ouvertes simultanément via `ModalStackProvider` (z-index, focus, `aria-hidden` du
contenu sous la modale active) et le drag pour repositionner la fenêtre. Props :
`isOpen`, `onClose`, `title`, `children`, `maxWidth`.

### `ui/ConfirmDialog.tsx`
Boîte de confirmation générique (Radix `Dialog`), utilisée avant toute action destructrice
(suppression d'un rendez-vous, d'une indisponibilité, etc.).

### `RoleGuard.tsx`
Composant de garde d'affichage : masque son contenu (`children`) si l'utilisateur connecté n'a
pas le rôle exact demandé (`role` prop). Expose aussi un hook `useIsAdmin()` pour les
vérifications ponctuelles hors JSX. ⚠️ C'est une garde **UI uniquement** (expérience
utilisateur) : la sécurité réelle est toujours appliquée côté API (filtrage `organizationId`,
vérification `session.user.role` — voir `documentation/api-routes.md`, ex. `/api/users`).

### `AuthProvider.tsx`
Wrapper du `SessionProvider` NextAuth pour exposer la session côté client à toute
l'application (App Router `layout.tsx`).

### `RegisterServiceWorker.tsx`
Enregistre le service worker PWA (`public/sw.js`) côté client au montage de l'application.

## Hooks associés (logique extraite des composants)

- `useAppointmentForm` — état et sauvegarde du formulaire `AppointmentModal` (détection de
  collision, gestion du forfait sélectionné, appel des Server Actions/API).
- `useCustomerPackages` — chargement des forfaits utilisables d'un client
  (`GET /api/customers/[id]/packages`) et état "utiliser un forfait" (`usePackage`).
- `useCalendarData` — chargement combiné rendez-vous + indisponibilités + ressources staff pour
  FullCalendar.
- `useOrganizationSettings` — horaires d'ouverture / objectif de CA (`GET /api/organization/settings`).
