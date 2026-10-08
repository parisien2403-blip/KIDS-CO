# Kids & Co — Famille & partage

Une seule application pour **la tablette de la cuisine (la « maison mère »)**, les **PC**, et les **téléphones Android et iPhone**.
Tout ce qu'un membre ajoute depuis son téléphone (rendez-vous, chose importante, message) apparaît **instantanément** sur la tablette et sur les autres appareils.

## Ce que fait l'appli

| Écran | Contenu |
|---|---|
| **Accueil** | Grande horloge, rendez-vous du jour, à venir (2 semaines), « à ne pas oublier », derniers messages. Pensé pour la tablette posée dans la cuisine. |
| **Agenda** | Calendrier du mois, ajout/modification de rendez-vous : heure, catégorie (santé, école, anniversaire…), répétition (semaine / mois / année), personnes concernées (chacun a sa couleur), notes. |
| **Messages** | Discussion de famille en temps réel (Entrée pour envoyer, Maj+Entrée pour aller à la ligne). Pastille de messages non lus. |
| **Pense-bête** | Choses importantes, courses, tâches : étoile « important », case à cocher, effacer les éléments terminés. |
| **Réglages** | Prénom et couleur, code d'invitation du foyer, **mode tablette** (écran toujours allumé + retour automatique à l'accueil), thème clair/sombre, notifications. |

Fonctionne aussi **hors connexion** : les modifications sont envoyées dès que le réseau revient.

## Essayer tout de suite (mode démo)

Sans configuration, l'appli démarre en **mode démo** : tout marche, mais les données restent sur l'appareil.
Pour l'ouvrir sur votre PC : `cd maison && python3 -m http.server 8000`, puis http://localhost:8000.

## Mettre en service la synchronisation (≈ 10 minutes, gratuit)

La synchronisation entre appareils utilise **Firebase** (Google), dont l'offre gratuite suffit largement pour une famille.

1. **Créer le projet** : allez sur https://console.firebase.google.com → *Ajouter un projet* (ex. « kids-and-co »). Google Analytics n'est pas nécessaire.
2. **Activer la connexion** : *Build → Authentication → Commencer → Adresse e-mail/Mot de passe → Activer*.
3. **Créer la base de données** : *Build → Firestore Database → Créer une base de données* (région `europe-west`, mode production).
4. **Mettre les règles de sécurité** : onglet *Règles* de Firestore → remplacez tout par le contenu du fichier [`firestore.rules`](firestore.rules) → *Publier*.
   Ces règles garantissent que seuls les membres de votre foyer voient vos données.
5. **Récupérer la configuration** : *Paramètres du projet (roue dentée) → Vos applications → icône `</>` (Web)* → donnez un nom → copiez l'objet `firebaseConfig`.
6. **Coller la configuration** dans [`config.js`](config.js) à la place de `null`, puis enregistrez et poussez sur GitHub.
   (Ces clés ne sont pas secrètes : la sécurité vient des règles de l'étape 4.)
7. **Mettre l'appli en ligne** avec GitHub Pages : sur GitHub, *Settings → Pages → Deploy from a branch → `main` / `(root)`*.
   L'appli sera disponible à l'adresse `https://<votre-compte>.github.io/<nom-du-depot>/maison/`.
8. **Autoriser ce domaine** dans Firebase : *Authentication → Paramètres → Domaines autorisés → Ajouter* `<votre-compte>.github.io`.

## Installer sur chaque appareil

1. Ouvrez l'adresse de l'appli sur l'appareil.
2. Installez-la :
   - **iPhone / iPad** : dans Safari, bouton *Partager* → *Sur l'écran d'accueil*.
   - **Android** : dans Chrome, menu ⋮ → *Installer l'application*.
   - **PC / tablette Windows** : dans Chrome ou Edge, icône d'installation dans la barre d'adresse.
3. Premier lancement :
   - **Le premier** crée son compte, puis choisit *Créer notre foyer*.
   - Dans *Réglages*, il récupère le **code d'invitation** (8 caractères) et le partage.
   - **Les autres** créent leur compte, puis choisissent *Rejoindre un foyer* avec ce code.
   - Pour la **tablette de la cuisine**, créez un compte dédié (par ex. prénom « Maison »), rejoignez le foyer, puis activez le **mode tablette** dans Réglages.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `app.js` | L'application |
| `config.js` | Votre configuration Firebase |
| `firestore.rules` | Règles de sécurité à publier dans Firebase |
| `manifest.json`, `sw.js` | Installation sur l'écran d'accueil et fonctionnement hors ligne |
| `logo.png` | Logo affiché dans l'appli |
| `icon-192.png`, `icon-512.png` | Icône PC, tablette et Android |
| `icon-192-maskable.png`, `icon-512-maskable.png` | Icône Android adaptative (ronde, en goutte, etc.) |
| `apple-touch-icon.png` | Icône iPhone / iPad |
| `favicon.ico`, `favicon-32.png` | Icône de l'onglet du navigateur |
| `icon-1024.png` | Icône haute définition (Play Store / App Store si publication un jour) |

## Limites actuelles

- Les notifications de nouveaux messages s'affichent quand l'appli est ouverte (ou en arrière-plan sur PC/Android). Des notifications « push » appli fermée sont possibles avec Firebase Cloud Messaging, mais demandent une étape de configuration en plus.
- Pour une publication sur le Play Store / l'App Store, ce même code peut être emballé avec Capacitor. Ce n'est pas nécessaire : l'installation depuis le navigateur suffit.
