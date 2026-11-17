# CONTEXT.md — ShiftFX (FOREX)

> **Dernière mise à jour :** 2026-11-17 | **Branche :** `main` (`HEAD`: `c7def37`) | **Repo :** `https://github.com/KaidAkram/FOREX`

---

## 1. Stack & Architecture

- **Backend :** Django 5.2 + Django REST Framework + `simplejwt` + Gunicorn (Python 3.12) dans `fx-macro-bias/backend/`.
- **Frontend :** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand dans `fx-macro-bias/frontend/`.
- **Base de données & Concurrence :** SQLite en mode **WAL** (`busy_timeout=30s`) + verrouillage applicatif via modèle `WorkerLease` (fencing, lease 15 min, heartbeat 15 s, réclamation automatique si heartbeat > 60 s).
- **Moteurs de données à la racine :** `equity_engine.py` (Yahoo Finance + fallback cache local) et `imf_fx_reserves.py` (IMF SDMX 3.0) importés dynamiquement par le backend via `sys.path`.
- **Déploiement (Render — Plan Free $0.00 imposé par l'utilisateur) :**
  - Blueprint : `render.yaml` (ID `exs-dap6nj6k1f9s739luolg`, Workspace `tea-da0f3nc9v7es7397o8t0`).
  - Frontend : `https://shiftfx-admin.onrender.com` (`srv-dap6qt5g1s2s739l3aog`).
  - Backend : `https://shiftfx-backend.onrender.com` (`srv-dbh659flk1mc73fc8trg`).
  - **Ne pas toucher** au service tiers `entreprise-transport` présent sur le même workspace Render.
- **Univers métier :** 10 économies G10 (`USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD, SEK, NOK`), 6 indicateurs (`GDP, CPI, Interest Rate, Current Account, FX Reserves, Equity`), 28 paires canoniques (+ 2 indices), scoring `[-10, +10]`, calendrier économique via **Biquote**.

### Organisation clé
```text
FOREX/
├── equity_engine.py, imf_fx_reserves.py, equity_dataset_cache.json   # Moteurs & cache fallback (requis à la racine)
├── render.yaml                                                        # Blueprint Render Free Tier
├── README.md                                                          # Doc institutionnelle + diagrammes Mermaid/KaTeX
├── fx-macro-bias/
│   ├── backend/
│   │   ├── apps/macro/{models,services,views,management,tests}/       # Cœur ingestion, fencing, calcul, API live
│   │   └── config/settings/{base,development,production}.py
│   └── frontend/src/{app,components,context,lib,store}/               # Terminal Next.js 14 (19 routes)
├── tests/                                                             # Tests Node (tsx) & Python unittest
└── memory/shiftfx-verification/LATEST_AUDIT.md                        # Dernier audit indépendant
```

---

## 2. Fichiers critiques

| Chemin | Rôle |
|---|---|
| `render.yaml` | Définition exacte des services Render Free (`migrate`, `bootstrap_macro --continuous`, Gunicorn 1 worker / 4 threads). |
| `equity_engine.py` | Téléchargement Yahoo Finance, calcul différentiel Equity (`change_synth - change_index`), suivi provenance (`LAST_DATASET_META`, `get_last_dataset_meta()`, write-back cache). |
| `equity_dataset_cache.json` | Fallback local anti-rate-limit Yahoo Finance (ne pas supprimer). |
| `imf_fx_reserves.py` | Client IMF SDMX 3.0 pour les réserves de change. |
| `fx-macro-bias/backend/apps/__init__.py` | Indispensable sous Python 3.12/3.13 pour que `manage.py test apps.macro.tests` découvre le package. |
| `fx-macro-bias/backend/apps/macro/services/scheduler.py` | Boucle worker in-process, `run_once()`, `force_trigger_now()`, attribution `trigger_source`, réclamation de lease stale (`heartbeat_at <= now - 60s`), heartbeat résilient. |
| `fx-macro-bias/backend/apps/macro/services/fencing.py` | Gestion `WorkerLease` ; vérifie le nombre de lignes mises à jour lors du renouvellement et lève `RuntimeError` si 0. |
| `fx-macro-bias/backend/apps/macro/services/scraper_orchestrator.py` | Orchestration des scrapers et renouvellement de lease en ligne (importe `WorkerLease`). |
| `fx-macro-bias/backend/apps/macro/services/equity.py` | Intégration `equity_engine`, garde anti-régression (ne jamais écraser des données live plus récentes par le cache fallback), statut `PARTIAL` honnête si fallback utilisé. |
| `fx-macro-bias/backend/apps/macro/views/live.py` | Endpoints `/api/health`, `/api/ready` (vérification stricte des 5 indicateurs macro + calculs Equity non-nuls, sans effet de bord), `/api/live/snapshot` (ETag weak/strong SHA-256 → HTTP 304). |
| `fx-macro-bias/backend/apps/macro/management/commands/bootstrap_macro.py` | Initialisation idempotente des dimensions de référence (10 économies, 6 indicateurs, 28 paires, règles). |
| `fx-macro-bias/frontend/src/lib/biquoteCalendar.ts` & `biquoteServer.ts` | Sous-système calendrier économique `/api/calendar` et `/api/calendar/upcoming` (fonctionnel, à préserver). |
| `tests/biquote_calendar.test.ts` & `tests/fx_and_equity_frontend.test.ts` | Suite Node (12 tests). |
| `tests/test_equity_engine.py` & `tests/test_imf_fx_reserves.py` | Suite Python moteurs racine (12 tests). |
| `fx-macro-bias/backend/apps/macro/tests/` | Suite Django pipeline autonome & FX/Equity (27 tests). |

---

## 3. Ce qui a été fait

- **Concurrence & Fencing (`6a76df0` → `f26fabb`, `736ec2b`) :**
  - SQLite WAL + timeout 30 s ; `worker_heartbeat` protégé par `try/except` ; import manquant de `WorkerLease` corrigé dans `scraper_orchestrator.py`.
  - Réclamation automatique des leases abandonnés (`heartbeat_at <= now - 60s`) dans `acquire_lease()`.
  - Contrôle strict du retour `.update()` dans `fencing.py` (lève `RuntimeError` si le lease a été perdu).
- **Fiabilité des données & API (`736ec2b`) :**
  - Protection anti-régression dans `equity.py` + suivi `LAST_DATASET_META` + `write_cache=True` dans `equity_engine.py` (un fallback ne remplace jamais des valeurs live plus récentes et marque `PARTIAL`).
  - Suppression du déclenchement public `GET /api/ready?refresh=1` ; `trigger_source` propagé proprement.
  - `has_usable_coverage` durci dans `live.py` : exige les 5 indicateurs macro cœur + des calculs Equity non-nuls.
  - ETag weak (`W/"..."`) et strong (`"..."`) renvoient HTTP 304 en direct et via le proxy frontend.
- **Documentation & Nettoyage (`c7def37`) :**
  - Création de `README.md` complet (logo, Mermaid, KaTeX, API, déploiement Render, commandes tests) et archivage de `memory/shiftfx-verification/LATEST_AUDIT.md`.
- **État des vérifications locales (51/51 tests OK + build OK) :**
  - Node : `npx tsx --test tests/biquote_calendar.test.ts tests/fx_and_equity_frontend.test.ts` → **12/12**.
  - Python : `python -m unittest tests/test_equity_engine.py tests/test_imf_fx_reserves.py` → **12/12**.
  - Django : `cd fx-macro-bias/backend && python manage.py test apps.macro.tests` → **27/27**.
  - Migrations : `python manage.py makemigrations --check --dry-run` → **No changes detected**.
  - Frontend : `cd fx-macro-bias/frontend && npm run build` → **19/19 routes compilées**.

---

## 4. À ne pas refaire / Pièges évités

- **Ne jamais passer sur un plan payant Render :** L'utilisateur impose **$0.00 (Free Tier)**. Garder à l'esprit les limites architecturales réelles du Free Tier (mise en veille après 15 min d'inactivité, cold start ~45–55 s, disque SQLite éphémère perdu au sleep/redeploy). Ne **jamais** présenter `bootstrap_macro` comme une restauration de comptes utilisateurs, saisies manuelles ou historique d'audit : il ne restaure que les dimensions de référence.
- **Ne pas inverser l'équation Equity :** La formule valide est strictement **`change_synth - change_index`** (Synthétique moins Indice), jamais l'inverse.
- **Ne pas déplacer/supprimer les fichiers racine :** `equity_engine.py`, `imf_fx_reserves.py` et `equity_dataset_cache.json` sont importés directement par le backend depuis la racine du dépôt.
- **Ne pas lancer `python manage.py test` sans cible :** `fx-macro-bias/backend/test_settings_functionality.py` est un script d'audit hors `TestCase` qui échoue à l'importation sans serveur/auth. Toujours cibler `python manage.py test apps.macro.tests`.
- **Ne jamais ajouter de déclencheur d'ingestion sur un endpoint `GET` public** (ex. `?refresh=1` sur `/api/ready`) : les déclenchements manuels doivent rester des `POST` authentifiés staff.
- **Ne pas conclure à un « cycle complet » sur la seule base d'un snapshot intermédiaire :** Vérifier `last_status`, `last_cycle`, la couverture des 6 indicateurs et l'absence de `null` sur les 1 410 points Equity.
- **Ne pas lancer un second scheduler lors des commandes/tests :** Garder `ENABLE_IN_PROCESS_SCHEDULER=false` pour les harnesses et scripts isolés.
- **Shell Windows (PowerShell) :** Utiliser `;` au lieu de `&&` pour chaîner les commandes.
