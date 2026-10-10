// Version de l'appli et journal des nouveautés.
// À chaque mise à jour : ajouter une entrée EN HAUT de CHANGELOG et mettre version.json au même numéro.
export const CHANGELOG = [
  {
    version: '3.9.1', date: '2026-10-11', title: '🔒 Écran de code aux couleurs de la saison',
    items: ['L’écran de verrouillage (code secret) et l’écran de connexion prennent aussi le thème de la saison'],
  },
  {
    version: '3.9', date: '2026-10-11', title: '🎨 Thèmes de saison',
    items: ['L’appli change de décor toute seule : Noël, Halloween, Chandeleur, printemps, été, automne, hiver',
      'Fond, barre du haut, horloge, tableau, gros boutons et barre du bas habillés selon la période',
      'Noël : compte à rebours « Plus que X dodos avant Noël »'],
  },
  {
    version: '3.8', date: '2026-10-11', title: '🎨 Seulement vos autocollants',
    items: ['Les autocollants intégrés sont retirés : seuls ceux de la famille s’affichent, rangés par thème',
      '📦 Importer un pack d’autocollants (fichier .json) en un toucher'],
  },
  {
    version: '3.7.1', date: '2026-10-11', title: '🎯 Missions : listes remises à zéro',
    items: ['Les missions de tous les enfants sont vidées : chaque parent choisit les siennes', 'Les idées surlignées correspondent exactement à la liste ; un 2ᵉ toucher retire la mission', 'Bouton « Tout effacer » dans la gestion des missions'],
  },
  {
    version: '3.7', date: '2026-10-11', title: '✂️ Vos propres thèmes d’autocollants',
    items: ['Créez vos thèmes (« ＋ Nouveau thème ») et ajoutez une photo de planche d’autocollants : l’appli découpe chaque autocollant toute seule',
      'Touchez un cadre pour le garder ou l’enlever, glissez le doigt pour en tracer un à la main (fonds non unis)',
      'Option « N’afficher que nos thèmes » pour remplacer les thèmes intégrés par les vôtres'],
  },
  {
    version: '3.6', date: '2026-10-11', title: '🎯 Plus de missions, autocollants à thème',
    items: ['Plus de 40 idées de missions, rangées par moment : matin, école, maison, animaux, soir, gentillesse, santé & sport',
      'Autocollants par thème : super-héros, K-pop & chasseuses de démons, princesses & magie, dinosaures, espace, sport, animaux, gourmandises',
      '📷 Mes autocollants : les parents peuvent ajouter leurs propres images (le héros préféré de l’enfant)'],
  },
  {
    version: '3.5', date: '2026-10-11', title: '🌦️ Météo du jour avec conseils',
    items: ['Onglet « Aujourd’hui » : météo précise (température, ressenti, pluie heure par heure, vent, UV, lever/coucher du soleil)',
      'Conseils selon le temps : K-way et bottes s’il pleut, bonnet et gants s’il fait froid, casquette et crème solaire au soleil, verglas, vent, brouillard…',
      'Après 19 h, la météo et les conseils de demain ; ville réglable avec 📍 (Libourne par défaut)'],
  },
  {
    version: '3.4.1', date: '2026-10-11', title: '🔒 Verrouillage par code uniquement',
    items: ['L’ouverture par empreinte / Face ID est retirée : on déverrouille avec son code secret'],
  },
  {
    version: '3.4', date: '2026-10-11', title: '⭐ Pense-bête simplifié',
    items: ['L’onglet « À vérifier » est retiré : le pense-bête fait la même chose, en plus simple',
      'Pense-bête : une idée à ne pas oublier, sans date ni catégorie, avec une couleur 🟢 normal, 🟠 important ou 🔴 urgent (toucher la pastille pour changer)',
      'Cocher une note pose un tampon « ✓ VALIDÉ » avec le prénom de celui qui l’a fait'],
  },
  {
    version: '3.3.1', date: '2026-10-11', title: '🩹 Ouverture depuis le raccourci corrigée',
    items: ['Corrige « Ce site est inaccessible » à l’ouverture depuis l’icône de l’écran d’accueil'],
  },
  {
    version: '3.3', date: '2026-10-10', title: '🔕 Moins de notifications, 🆕 récap du calendrier',
    items: ['Les rendez-vous ordinaires ajoutés, modifiés ou supprimés n’envoient plus de notification (seulement Important, Urgent et À vérifier)',
      'À l’ouverture, un bandeau vert « Du nouveau dans le calendrier » (avec ✕ pour le fermer) ouvre la liste des derniers changements — parents et enfants de 12 ans et plus',
      'Bouton « 🆕 Derniers ajouts » dans l’Agenda ; pastilles vertes pour tout ce qui est nouveau'],
  },
  {
    version: '3.2.1', date: '2026-10-10', title: '📱 Barre du bas simplifiée',
    items: ['Sur téléphone, la barre du bas n’a plus que 3 gros boutons : Accueil, Agenda (Missions pour un enfant) et Menu', 'Tout le reste (Messages, À vérifier, Album, Envies…) est rangé dans « Menu »'],
  },
  {
    version: '3.2', date: '2026-10-10', title: '🏠 Accueil en onglets, plus simple',
    items: ['La page d’accueil est rangée en gros onglets : ☀️ Aujourd’hui, 📅 À venir, ⭐ Pense-bête, 💬 Messages, 👨‍👩‍👧 Famille',
      'Les enfants ont aussi un onglet 🎯 Missions, ouvert directement s’il reste des missions à faire',
      'Une pastille indique ce qui attend (messages non lus, rendez-vous du jour…) ; l’appli se souvient du dernier onglet choisi'],
  },
  {
    version: '3.1.5', date: '2026-10-09', title: '📱 Photos sur iPhone',
    items: ['iPhone : on peut ajouter plusieurs photos à la suite (mémoire libérée après chaque photo, nouvel essai automatique)'],
  },
  {
    version: '3.1.4', date: '2026-10-09', title: '🔄 Bouton « Mettre à jour »',
    items: ['Bouton 🔄 en haut à droite (à côté de votre photo) : vérifie et installe la dernière version ; une pastille apparaît quand une mise à jour attend'],
  },
  {
    version: '3.1.3', date: '2026-10-09', title: '📷 Ajout de plusieurs photos corrigé',
    items: ['Plusieurs photos d’un coup dans un rendez-vous, une note ou l’album : plus de blocage, progression « photo 2/4… »', 'Photos plus légères, enregistrement instantané (l’envoi continue en arrière-plan)'],
  },
  {
    version: '3.1.2', date: '2026-10-09', title: '🔄 Mises à jour automatiques',
    items: ['L’appli se met à jour toute seule à l’ouverture dès qu’une nouvelle version est publiée', 'Le numéro de version s’affiche en haut, à côté du logo (touchez-le pour voir les nouveautés)'],
  },
  {
    version: '3.1', date: '2026-10-09', title: '🎁 Listes d’envies, 🏖️ vacances scolaires et 📷 images',
    items: [
      'Listes d’envies : photo, lien, prix ; les autres réservent « Je l’offre », la personne ne voit rien 🤫',
      'Vacances scolaires (zone A) et jours fériés dans l’agenda, compte à rebours « Plus que X dodos » sur l’accueil',
      'Images dans les rendez-vous (ordonnance, convocation…) et dans les notes du pense-bête',
    ],
  },
  {
    version: '3.0', date: '2026-10-09', title: '📸 Album photo, 🗳️ sondages et 📍 « Bien arrivé »',
    items: [
      'Album photo de la famille : ajout de photos, ❤️, légendes, diaporama ; l’écran Maison lance le diaporama après 5 min sans activité',
      'Sondages dans Messages : question + réponses, chacun vote, résultats en direct avec les avatars',
      'Bouton « 📍 Bien arrivé » : prévient toute la famille (avec la position si on veut) et s’affiche sur la carte du jour',
      'Téléphone : barre du bas avec « ⋯ Plus » pour les autres onglets',
    ],
  },
  {
    version: '2.9.1', date: '2026-10-09', title: 'Pavé de verrouillage adapté à l’écran',
    items: ['Le pavé du code (avec le 0, l’empreinte et ⌫) tient entièrement sur tous les téléphones'],
  },
  {
    version: '2.9', date: '2026-10-09', title: 'Date de naissance et règle des moins de 13 ans',
    items: [
      'Date de naissance sur la fiche et la carte Kids & Co (avec l’âge), saisie par un parent',
      'Moins de 13 ans : agenda, À vérifier, emploi du temps et pense-bête en lecture seule',
      'Ils gardent les messages (lire, écrire, répondre) et leurs missions',
    ],
  },
  {
    version: '2.8.1', date: '2026-10-09', title: 'Réglage du verrouillage plus visible',
    items: ['Nouvelle carte « 🔒 Code et empreinte » en haut de Réglages, sous votre carte Kids & Co'],
  },
  {
    version: '2.8', date: '2026-10-09', title: '🔒 Verrouillage par code ou empreinte',
    items: [
      'Réglages → « Verrouiller quand je quitte l’appli » : au retour, code secret ou empreinte / Face ID',
      'Délai au choix : immédiatement, 1, 5 ou 15 minutes ; réglage propre à chaque téléphone',
    ],
  },
  {
    version: '2.7', date: '2026-10-09', title: 'Prof absent sur une période',
    items: [
      'Bouton « 🚫 Prof absent » sur chaque cours : ce jour-là, la semaine, 2 semaines, des dates précises ou jusqu’à nouvel ordre',
      'Pour tous les cours de ce prof ou ce cours seulement ; les cours concernés sont barrés automatiquement',
      'Liste des absences en cours au-dessus de l’emploi du temps, bouton « De retour » ; notification à la famille',
    ],
  },
  {
    version: '2.6.1', date: '2026-10-09', title: 'Petits écrans de PC',
    items: ['La barre de gauche tient sur les écrans peu hauts : « Changer d’utilisateur » toujours visible'],
  },
  {
    version: '2.6', date: '2026-10-09', title: '🔔 Notifications sur le téléphone, même appli fermée',
    items: [
      'Message reçu, rendez-vous ajouté / modifié / supprimé, validation « À vérifier »',
      'Étoile collée (pour l’enfant), missions du jour finies (pour les parents)',
      'Changement d’emploi du temps et infos du lycée, chose importante ajoutée au pense-bête',
      'Réglages → Notifications → Activer, puis « 🔔 Tester »',
    ],
  },
  {
    version: '2.5', date: '2026-10-09', title: 'Emploi du temps façon scolaire',
    items: [
      'Nouvelle vue principale : grille fixe Lundi → Vendredi avec les heures, comme un emploi du temps de lycée',
      'Touchez une case vide pour ajouter un cours à cette heure, ou un cours pour le modifier',
      'Semaine A / B en un clic ; la vue « Cette semaine » garde les infos du jour (prof absent, contrôle…)',
    ],
  },
  {
    version: '2.4', date: '2026-10-09', title: 'Emploi du temps : plusieurs jours par matière',
    items: ['Dans la fiche d’un cours, « Ajouter un autre jour » : tous les créneaux d’une matière en une fois, chacun avec ses horaires'],
  },
  {
    version: '2.3.1', date: '2026-10-09', title: 'Notifications sur iPhone',
    items: ['Réglages explique comment activer les notifications sur iPhone / iPad (installer l’appli sur l’écran d’accueil)'],
  },
  {
    version: '2.3', date: '2026-10-09', title: 'QR code pour partager l’appli',
    items: [
      'Réglages → « 📲 Partager l’appli » : QR code à scanner avec l’appareil photo',
      'Le QR code peut contenir le code famille : il est déjà rempli à l’ouverture',
      'Agrandir, partager le lien ou enregistrer l’image du QR code',
    ],
  },
  {
    version: '2.2', date: '2026-10-09', title: 'Code secret : oubli, confirmation et affichage',
    items: [
      '« 🔑 Code secret oublié ? » sur la page d’accueil : nouveau code avec l’e-mail et le mot de passe du compte famille',
      'Le code secret se tape deux fois à la création (plus de faute de frappe)',
      'Bouton 👁️ pour voir les chiffres pendant qu’on tape',
    ],
  },
  {
    version: '2.1.2', date: '2026-10-08', title: 'Connexion Maison par le prénom',
    items: ['On peut aussi taper « Maison » comme prénom, avec son code secret, puis « Se connecter »'],
  },
  {
    version: '2.1.1', date: '2026-10-08', title: 'Correction d’affichage',
    items: ['La carte Kids & Co n’est plus coupée en bas dans Réglages'],
  },
  {
    version: '2.1', date: '2026-10-08', title: '🎯 Missions des enfants',
    items: [
      'Case « 🎯 Missions » dans la fiche de chaque compte (cochée par défaut pour un enfant)',
      'Onglet Missions : une carte par semaine, des tâches à cocher chaque jour (douche, lit, table, jouets…)',
      'Les parents collent des autocollants (⭐ 🌟 🏆 💖 🦄…) sur la carte ; tout repart à zéro chaque lundi',
      'Missions du jour sur l’accueil, fête quand tout est fait, liste de missions modifiable par les parents',
    ],
  },
  {
    version: '2.0', date: '2026-10-08', title: 'Nouvelle page d’accueil : prénom + code secret',
    items: [
      'À l’ouverture, chacun se connecte avec son prénom et son code secret (ou en touchant sa photo)',
      'Nouveau téléphone ou PC : code famille + prénom + code secret, sans e-mail ni mot de passe',
      'Gros bouton « 🏠 Connexion Maison » pour la tablette de la cuisine',
      'Le compte Maison est créé automatiquement avec chaque nouvelle famille',
      'Case « Rester connecté sur cet appareil »',
    ],
  },
  {
    version: '1.9.1', date: '2026-10-08', title: 'Numéro de version et nouveautés',
    items: [
      'Le numéro de version s’affiche dans la barre de gauche et dans Réglages → À propos',
      'Page « Nouveautés » avec l’historique de toutes les versions',
      'Bandeau « Nouvelle version disponible » pour mettre à jour en un clic (pratique sur la tablette Maison)',
    ],
  },
  {
    version: '1.9', date: '2026-10-08', title: 'Onglet « À vérifier » et tampon VALIDÉ',
    items: [
      'Case « 📌 À vérifier — très important » dans la fiche du planning',
      'Onglet « À vérifier » : échéances, en retard, compteurs et filtres',
      '« C’est fait » pose un tampon VALIDÉ (prénom + date), visible par toute la famille',
    ],
  },
  {
    version: '1.8', date: '2026-10-08', title: 'Qui est connecté ?',
    items: [
      'Rangée de cartes d’identité sur l’accueil : en ligne (vert) ou « vu il y a… »',
      'Ma carte dans la barre de gauche, alerte quand un membre se connecte',
    ],
  },
  {
    version: '1.7', date: '2026-10-08', title: 'Synchronisation en direct (Firebase)',
    items: ['Tous les appareils de la famille partagent les mêmes données, en direct'],
  },
  {
    version: '1.6', date: '2026-10-08', title: 'Emploi du temps du lycée',
    items: [
      'Grille de la semaine, semaines A / B, vue jour par jour sur téléphone',
      'Annotations datées : prof absent, cours annulé, salle, contrôle, devoir…',
    ],
  },
  {
    version: '1.5', date: '2026-10-08', title: 'Agenda : importance, répétitions et alertes',
    items: ['Importance Normal / Important / Urgent', 'Répétitions avec date de fin', 'Case Alerte avec rappel sonore'],
  },
  {
    version: '1.4', date: '2026-10-08', title: 'Photos, carte d’identité, compte Maison et messagerie',
    items: ['Photo de profil et carte d’identité Kids & Co', 'Compte Maison pour la tablette', 'Boîte de réception et boîte d’envoi pour chacun'],
  },
  {
    version: '1.3', date: '2026-10-08', title: 'Profils de la famille',
    items: ['Écran « Qui est là ? »', 'Code secret à 4 chiffres, rôles parent / enfant'],
  },
  {
    version: '1.2', date: '2026-10-08', title: 'Kids & Co',
    items: ['Nouveau nom, logo et icônes pour PC, tablette, Android et iPhone', 'Style d’après votre maquette'],
  },
  {
    version: '1.1', date: '2026-10-08', title: 'Refonte visuelle',
    items: ['Nouveau design, mode sombre retravaillé'],
  },
  {
    version: '1.0', date: '2026-10-08', title: 'Première version',
    items: ['Agenda, messages et pense-bête partagés', 'Installable sur PC, tablette, Android et iPhone'],
  },
];
export const APP_VERSION = CHANGELOG[0].version;
