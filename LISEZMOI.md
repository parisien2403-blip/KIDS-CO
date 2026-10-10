# Kids & Co — Famille & partage

Une seule application pour **la tablette de la cuisine (la « maison mère »)**, les **PC**, et les **téléphones Android et iPhone**.
Tout ce qu'un membre ajoute depuis son téléphone (rendez-vous, chose importante, message) apparaît **instantanément** sur la tablette et sur les autres appareils.

## Ce que fait l'appli

| Écran | Contenu |
|---|---|
| **Accueil** | Grande horloge et gros onglets : ☀️ Aujourd’hui, 🎯 Missions (enfants), 📅 À venir, ⭐ Pense-bête, 💬 Messages, 👨‍👩‍👧 Famille (qui est connecté, album). Pensé pour la tablette posée dans la cuisine. |
| **Agenda** | Calendrier du mois, ajout/modification de rendez-vous : heure, catégorie (santé, école, anniversaire…), répétition (semaine / mois / année), personnes concernées (chacun a sa couleur), notes. |
| **Messages** | Discussion de famille en temps réel (Entrée pour envoyer, Maj+Entrée pour aller à la ligne). Pastille de messages non lus. |
| **Pense-bête** | Une idée à ne pas oublier, sans date ni catégorie : couleur 🟢 normal, 🟠 important, 🔴 urgent ; la cocher pose un tampon « ✓ VALIDÉ » avec le prénom. |
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
   - **Sur le premier appareil**, un parent touche « Nouvelle famille ? Créer notre compte » (e-mail + mot de passe), crée la famille puis **son compte** (prénom, nom, photo, code secret). Le compte **Maison** est créé automatiquement.
   - Dans *Réglages → La famille*, il ajoute son conjoint(e) et les enfants, chacun avec son code secret, et note le **code famille** (8 caractères).
   - **Sur un autre téléphone ou PC** : la page d'accueil demande le **code famille**, le **prénom** et le **code secret**. C'est tout (une seule fois par appareil).
   - **Ensuite, à l'ouverture** : prénom + code secret (ou toucher sa photo). Cochez « Rester connecté sur cet appareil » pour ne pas le retaper à chaque fois.
   - Sur la **tablette de la cuisine** : bouton **🏠 Connexion Maison**.

### Comptes, photos et carte Kids & Co
- Chaque compte a un **prénom, un nom et une photo** (prise avec l'appareil photo ou choisie dans la galerie ; elle est recadrée et allégée automatiquement). Un avatar rigolo reste possible à la place.
- À la création, l'appli génère la **carte d'identité Kids & Co** du membre ; on la retrouve dans *Réglages*.
- Le compte **Maison** est celui de la tablette de la cuisine : il active le mode tablette, et la tablette y revient toute seule après 3 minutes si quelqu'un oublie de se déconnecter.

### Agenda
- Vue **mois par mois** ; chaque élément a une catégorie, une date, des horaires, un **niveau d'importance** (Normal / Important / Urgent) et peut se **répéter** (tous les jours, en semaine, chaque semaine, toutes les 2 semaines, chaque mois, chaque année) jusqu'à une date.
- Case **🔔 Alerte** : rappel à l'heure, quelques minutes avant, la veille ou à une date et heure précises, pour les personnes choisies. Le rappel sonne et s'affiche sur les appareils où ces personnes sont connectées (l'appli doit être ouverte ou en arrière-plan ; la tablette Maison, toujours allumée, est idéale).

### 🎯 Missions des enfants
- Dans la fiche d'un compte (Parent / Enfant / Maison), la case **🎯 Missions** donne accès à l'onglet Missions (cochée par défaut pour un enfant).
- Chaque enfant a sa **carte Mission de la semaine** : des tâches à cocher chaque jour (douche, lit, table, jouets… modifiables par les parents).
- **Seuls les parents** collent des autocollants (⭐ 🌟 🏆 💖 🦄 🚀 👑 🌈) sur la carte. **Chaque lundi, une nouvelle carte vierge** ; les semaines passées restent consultables.

### Emploi du temps du lycée
- Grille de la semaine (jour par jour sur téléphone), semaines A / B, samedi en option.
- **Tout le monde peut ajouter, modifier ou supprimer un cours.**
- Pour un jour précis : prof absent, cours annulé, changement de salle ou d'horaire, contrôle, devoir, sortie, grève, remarque. Le cours apparaît barré s'il n'a pas lieu.
- L'emploi du temps du jour s'affiche aussi sur l'accueil.

### Messagerie
- Chaque compte a sa **boîte de réception** et sa **boîte d'envoi**. On écrit à une personne, à plusieurs ou à toute la famille ; chacun ne voit que les messages qui lui sont adressés.
- L'**agenda** et le **pense-bête** restent communs à toute la famille.

### Profils et codes secrets
- **Parents** : peuvent ajouter, modifier ou retirer des membres et réinitialiser un code. Ajouter un membre depuis l'écran « Qui est là ? » demande le code d'un parent.
- **Enfants** : peuvent modifier leur propre profil (avatar, couleur, code).
- Le code secret est une protection entre membres de la famille (comme un verrou de chambre), pas un coffre-fort : la vraie protection des données est le compte de la famille et les règles Firebase.

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

## 🔔 Notifications push (même appli fermée)

Le fichier `worker.js` (service Cloudflare) envoie les notifications. Il a besoin d'**un secret**, à ajouter une seule fois :
Cloudflare → *Workers et Pages* → **kids-co** → *Paramètres* → *Variables et secrets* → **Ajouter** → type **Secret**,
nom **`VAPID_PRIVATE_KEY`**, valeur : la clé privée fournie à la mise en place (ne jamais la publier sur GitHub).

Ensuite, sur chaque appareil : *Réglages → Notifications → Activer* (sur iPhone : appli installée sur l'écran d'accueil, iOS 16.4+), puis « 🔔 Tester ».

### 📸 Album, 🗳️ sondages, 📍 « Bien arrivé »
- **Album photo** (onglet Album, ou « ⋯ Menu » sur téléphone) : ajout de photos (allégées automatiquement), ❤️, légendes, diaporama. L'écran **Maison** lance le diaporama tout seul après 5 minutes sans activité.
- **Sondages** : Messages → 🗳️ Sondages → « + Sondage ». Chacun vote, les résultats s'affichent en direct.
- **📍 Bien arrivé** : un bouton sur l'accueil et dans Messages prévient toute la famille (position facultative) ; le lieu s'affiche sur la carte de la personne pour la journée.

### 🎁 Listes d'envies, 🏖️ vacances, 📷 images
- **Listes d'envies** (onglet Envies, ou « ⋯ Menu » sur téléphone) : chacun ajoute ses envies (photo, lien, prix, ❤️). Les autres touchent **« Je l'offre »** pour réserver : la personne concernée **ne voit jamais** ce qui est réservé.
- **Vacances scolaires** (zone A par défaut, modifiable dans *Emploi du temps → Réglages*) et **jours fériés** apparaissent dans l'agenda ; l'accueil affiche « Plus que X dodos avant les vacances ». Les dates viennent du calendrier officiel de l'Éducation nationale.
- **Images** : ajoutez jusqu'à 4 photos à un rendez-vous (ordonnance, convocation, plan…) ou à une note du pense-bête (bouton 📷). Touchez une miniature pour l'agrandir.

### 🔕 Notifications plus calmes et 🆕 récap du calendrier
- Un rendez-vous **ordinaire** ajouté, modifié ou supprimé **n'envoie plus de notification**. Seuls les rendez-vous **Important** ou **Urgent** (et les notes 🔴 urgentes) sonnent encore (et toujours les messages).
- À l'ouverture, un bandeau vert **« Du nouveau dans le calendrier »** apparaît sur l'accueil : le toucher ouvre la liste des derniers changements (ajouté / modifié / supprimé, par qui, quand) ; la croix ✕ le ferme. Aussi dans l'Agenda : bouton **🆕 Derniers ajouts**.
- Réservé aux parents et aux enfants de 12 ans et plus. Les pastilles vertes signalent ce qui est nouveau.

### 🌦️ Météo du jour
- Dans l'onglet **☀️ Aujourd'hui** de l'accueil : température et ressenti, pluie heure par heure (en %), vent, UV, lever et coucher du soleil.
- **Conseils** selon le temps : K-way et bottes de pluie, bonnet et gants, casquette et crème solaire, verglas, vent fort, brouillard, orage…
- Après 19 h, ce sont la météo et les conseils **de demain**. Ville réglable avec 📍 (Libourne par défaut, pour toute la famille). Données : Open-Meteo (gratuit).

### 🎯 Plus de missions et 🎨 autocollants à thème
- Dans *Missions → modifier*, plus de 40 idées rangées par moment (matin, école, maison, animaux, soir, gentillesse, santé & sport) : un toucher pour ajouter.
- En collant un autocollant, choisissez un **thème** : classiques, super-héros, K-pop & chasseuses de démons, princesses & magie, dinosaures, espace, sport, animaux, gourmandises. L'appli retient le thème préféré de chaque enfant.
- **📷 Mes autocollants** : ajoutez vos propres images (personnage préféré, photo…). Elles restent privées dans la famille ; ✕ pour en supprimer une.
- **Vos propres thèmes** : « ＋ Nouveau thème » (ex. *Toy Story*), puis « ＋ Ajouter des images » avec une photo de **planche d'autocollants** : l'appli découpe chaque autocollant toute seule (fond uni). Touchez un cadre pour le garder ou l'enlever ; glissez le doigt pour tracer un cadre à la main (fond non uni, capture d'écran…). Cochez « N'afficher que nos thèmes » pour remplacer les thèmes intégrés.

### 🎨 Thèmes de saison
L'appli change de décor toute seule selon la date : 🎄 Noël (1er déc. → 2 janv.), 🎃 Halloween (20 oct. → 2 nov.), 🥞 Chandeleur (30 janv. → 3 fév.), puis 🌸 printemps, ☀️ été, 🍂 automne et ❄️ hiver. Les images sont dans le dossier `saisons/` (une sous-dossier par thème). Pour essayer un thème : ajouter `?saison=noel` (ou `halloween`, `ete`…) à l'adresse.
