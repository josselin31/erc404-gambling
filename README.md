# ERC404 Gambling Platform - Pachinko Game

Un jeu de Pachinko basé sur la blockchain ERC404 avec une interface utilisateur moderne et des fonctionnalités de jeu avancées.

## Prérequis

- Node.js (version 14 ou supérieure)
- npm (inclus avec Node.js)

## Installation

1. Clonez le dépôt :
```bash
git clone [URL_DU_REPO]
cd erc404-gambling
```

2. Installez les dépendances :
```bash
npm install
npm install live-server --save-dev
```

## Démarrage

Pour démarrer l'application en mode développement :

```bash
npm start
```

L'application sera accessible à l'adresse : http://localhost:3000

## Fonctionnalités

- Interface utilisateur moderne et responsive
- Effets visuels et sonores
- Système de mise avec contrôles intuitifs
- Multiplicateurs de gains équilibrés
- Mode auto-stop
- Affichage en temps réel des statistiques

## Structure du projet

```
frontend/
  ├── public/
  │   ├── sounds/         # Fichiers audio
  │   └── pachinko.html   # Page principale du jeu
  └── src/
      ├── js/
      │   └── pachinko.js # Logique du jeu
      └── styles/
          └── pachinko.css # Styles du jeu
```

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

ISC 