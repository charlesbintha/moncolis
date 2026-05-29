# 🚀 ColiSN Backend API

> Application de covoiturage de colis pour le Sénégal

## Stack Technique

- **Backend** : Node.js + NestJS + TypeScript
- **Base de données** : PostgreSQL + Prisma ORM
- **Cache** : Redis
- **Auth** : JWT (Access 15min + Refresh 30j) + OTP SMS
- **SMS** : AfricasTalking
- **Paiement** : PayDunya (Wave / Orange Money) + Stripe
- **Images** : Cloudinary
- **Push** : Firebase Cloud Messaging
- **Logs** : Winston

## Structure du Projet

```
colisn-backend/
├── prisma/
│   ├── schema.prisma         # Modèles de données
│   └── seed.ts               # Données de test
├── src/
│   ├── main.ts               # Point d'entrée
│   ├── app.module.ts         # Module racine
│   │
│   ├── auth/                 # Authentification
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts   # Register, Login, Refresh, Logout, CNI
│   │   ├── auth.controller.ts
│   │   ├── otp.service.ts    # Gestion OTP SMS
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── dto/
│   │       └── register.dto.ts
│   │
│   ├── users/                # Profils utilisateurs
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── dto/
│   │
│   ├── trips/                # Annonces transporteurs
│   │   ├── trips.module.ts
│   │   ├── trips.service.ts  # CRUD + filtres + matching
│   │   ├── trips.controller.ts
│   │   └── dto/
│   │
│   ├── parcels/              # Demandes expéditeurs
│   │   ├── parcels.module.ts
│   │   ├── parcels.service.ts # CRUD + matching automatique
│   │   ├── parcels.controller.ts
│   │   └── dto/
│   │
│   ├── bookings/             # Réservations
│   │   ├── bookings.module.ts
│   │   ├── bookings.service.ts # Workflow complet + cron expiration
│   │   ├── bookings.controller.ts
│   │   └── dto/
│   │
│   ├── payments/             # Paiements (Escrow)
│   │   ├── payments.module.ts
│   │   ├── payments.service.ts # Escrow + PayDunya + Stripe
│   │   ├── payments.controller.ts
│   │   └── dto/
│   │
│   ├── reviews/              # Évaluations
│   │   ├── reviews.module.ts
│   │   ├── reviews.service.ts # Note + recalcul moyenne
│   │   └── dto/
│   │
│   ├── disputes/             # Litiges
│   │   ├── disputes.module.ts
│   │   ├── disputes.service.ts
│   │   └── dto/
│   │
│   ├── admin/                # Dashboard Admin
│   │   ├── admin.module.ts
│   │   ├── admin.service.ts  # Stats, CNI, Litiges, Users
│   │   └── admin.controller.ts
│   │
│   ├── notifications/        # Notifications
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts # Push + persistance
│   │   ├── notifications.controller.ts
│   │   └── notifications.listener.ts # Event listeners
│   │
│   └── common/
│       ├── prisma/
│       │   ├── prisma.service.ts
│       │   └── prisma.module.ts
│       ├── cloudinary/
│       │   ├── cloudinary.service.ts
│       │   └── cloudinary.module.ts
│       ├── decorators/
│       │   ├── current-user.decorator.ts
│       │   └── roles.decorator.ts
│       ├── guards/
│       │   └── roles.guard.ts
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   └── response.interceptor.ts
│       ├── dto/
│       │   └── pagination.dto.ts
│       └── utils/
│           └── winston.config.ts
│
├── .env.example
├── docker-compose.yml
├── nest-cli.json
├── package.json
└── tsconfig.json
```

## Démarrage Rapide

```bash
# 1. Cloner et installer
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Remplir les variables dans .env

# 3. Démarrer PostgreSQL et Redis
docker-compose up -d

# 4. Générer le client Prisma et migrer
npm run prisma:generate
npm run prisma:migrate

# 5. Insérer les données de test
npm run prisma:seed

# 6. Démarrer en développement
npm run start:dev
```

## Documentation API

Disponible sur : `http://localhost:3000/api/docs`

## Corridors Prioritaires

| Route | Prix indicatif / kg |
|-------|-------------------|
| Dakar ↔ Touba | 400 - 600 FCFA |
| Dakar ↔ Thiès | 200 - 400 FCFA |
| Dakar ↔ Ziguinchor | 1000 - 1500 FCFA |
| Dakar ↔ Saint-Louis | 600 - 800 FCFA |

## Commission Plateforme

**12%** prélevé automatiquement sur chaque transaction.
Les fonds sont bloqués en escrow jusqu'à confirmation de livraison.
