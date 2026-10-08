// Version de l'appli et journal des nouveautés.
// À chaque mise à jour : ajouter une entrée EN HAUT de CHANGELOG et mettre version.json au même numéro.
export const CHANGELOG = [
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
