# quality/ — instructions pour tests & scripts

Contenu
- `e2e_purchase_consume.sh` : script shell qui orchestre un achat → création d'un RDV → vérification decrement → suppression → vérification increment.

Prérequis
- Serveur de dev Next.js en écoute sur http://localhost:3000
- `jq` installé (`brew install jq`)

Exécution
1. Démarrer l'application en mode dev :

```bash
pnpm dev
```

2. Lancer le script e2e :

```bash
chmod +x quality/e2e_purchase_consume.sh
quality/e2e_purchase_consume.sh
```

Notes
- Le script est un outil smoke-test et ne remplace pas des tests automatisés avec fixtures DB et assertions robustes.
- Ajuster les URLs si votre dev server n'est pas sur le port 3000.

