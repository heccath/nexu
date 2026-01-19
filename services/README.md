# Services

Configuration Docker pour les services externes utilisés dans le monorepo.

## Utilisation rapide

```bash
# Démarrer les services de base de données (PostgreSQL + Redis)
docker compose -f services/docker-compose.yml --profile database up -d

# Démarrer les services de messaging (RabbitMQ + Kafka)
docker compose -f services/docker-compose.yml --profile messaging up -d

# Démarrer les services de monitoring (Prometheus + Grafana)
docker compose -f services/docker-compose.yml --profile monitoring up -d

# Démarrer les services de stockage (MinIO)
docker compose -f services/docker-compose.yml --profile storage up -d

# Démarrer les services de recherche (Elasticsearch)
docker compose -f services/docker-compose.yml --profile search up -d

# Démarrer tous les services
docker compose -f services/docker-compose.yml --profile all up -d

# Arrêter les services
docker compose -f services/docker-compose.yml --profile <profile> down

# Arrêter et supprimer les volumes (reset des données)
docker compose -f services/docker-compose.yml --profile <profile> down -v
```

## Services disponibles

| Service       | Profile    | Port(s)     | Description                   |
| ------------- | ---------- | ----------- | ----------------------------- |
| PostgreSQL    | database   | 5432        | Base de données relationnelle |
| Redis         | database   | 6379        | Cache et store clé-valeur     |
| RabbitMQ      | messaging  | 5672, 15672 | Message broker (AMQP)         |
| Kafka         | messaging  | 9092        | Event streaming               |
| Zookeeper     | messaging  | 2181        | Coordination pour Kafka       |
| Prometheus    | monitoring | 9090        | Métriques et alerting         |
| Grafana       | monitoring | 3001        | Visualisation des métriques   |
| MinIO         | storage    | 9000, 9001  | Stockage S3-compatible        |
| Elasticsearch | search     | 9200, 9300  | Moteur de recherche           |

## Configuration

1. Copier le fichier `.env.example` en `.env`:

   ```bash
   cp services/.env.example services/.env
   ```

2. Modifier les variables d'environnement selon vos besoins.

## Accès aux interfaces

| Service    | URL                    | Credentials par défaut |
| ---------- | ---------------------- | ---------------------- |
| RabbitMQ   | http://localhost:15672 | nexu / nexu            |
| Grafana    | http://localhost:3001  | admin / admin          |
| MinIO      | http://localhost:9001  | nexu / nexu1234        |
| Prometheus | http://localhost:9090  | -                      |

## Structure des dossiers

```
services/
├── docker-compose.yml          # Configuration principale
├── .env.example                 # Variables d'environnement
├── README.md                    # Documentation
├── postgres/
│   └── init/                    # Scripts SQL d'initialisation
├── prometheus/
│   └── prometheus.yml           # Configuration Prometheus
└── grafana/
    └── provisioning/
        ├── datasources/         # Sources de données
        └── dashboards/          # Dashboards pré-configurés
```

## Connexion depuis les applications

### PostgreSQL

```typescript
// Avec pg
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'nexu',
  password: 'nexu',
  database: 'nexu',
});

// Avec Prisma (schema.prisma)
// DATABASE_URL="postgresql://nexu:nexu@localhost:5432/nexu"
```

### Redis

```typescript
import { createClient } from 'redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();
```

### RabbitMQ

```typescript
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://nexu:nexu@localhost:5672');
```

### MinIO (S3)

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'nexu',
    secretAccessKey: 'nexu1234',
  },
  forcePathStyle: true,
});
```

### Elasticsearch

```typescript
import { Client } from '@elastic/elasticsearch';

const client = new Client({ node: 'http://localhost:9200' });
```

---

## Ajouter un nouveau service

### Étape 1: Ajouter le service dans docker-compose.yml

Ouvrir `services/docker-compose.yml` et ajouter la configuration du service :

```yaml
services:
  # ... services existants ...

  # Nouveau service
  mon-service:
    image: mon-image:tag
    container_name: nexu-mon-service
    profiles: ['mon-profile', 'all'] # Associer à un ou plusieurs profiles
    environment:
      VAR1: ${VAR1:-default}
    ports:
      - '8080:8080'
    volumes:
      - mon_service_data:/data
      - ./mon-service/config:/etc/mon-service # Config locale si nécessaire
    networks:
      - nexu-network
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8080/health']
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  # ... volumes existants ...
  mon_service_data:
```

### Étape 2: Créer le dossier de configuration (si nécessaire)

```bash
mkdir -p services/mon-service
```

Ajouter les fichiers de configuration nécessaires dans ce dossier.

### Étape 3: Ajouter les variables d'environnement

Mettre à jour `services/.env.example` :

```bash
# Mon Service
VAR1=value1
VAR2=value2
```

### Étape 4: Documenter le service

Mettre à jour ce README avec :

- Les informations du service dans le tableau "Services disponibles"
- L'URL de l'interface web (si applicable)
- Un exemple de connexion depuis les applications

### Exemple complet : Ajouter MongoDB

**1. Dans docker-compose.yml :**

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: nexu-mongodb
    profiles: ['database', 'all']
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER:-nexu}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-nexu}
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    networks:
      - nexu-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  mongodb_data:
```

**2. Dans .env.example :**

```bash
# MongoDB
MONGO_USER=nexu
MONGO_PASSWORD=nexu
```

**3. Connexion depuis l'app :**

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://nexu:nexu@localhost:27017');
await client.connect();
```

---

## Profiles personnalisés

Vous pouvez créer vos propres profiles en ajoutant le nom dans la liste `profiles` d'un service :

```yaml
services:
  postgres:
    profiles: ['database', 'backend', 'all'] # Ajout de 'backend'

  redis:
    profiles: ['database', 'backend', 'all']
```

Maintenant vous pouvez démarrer PostgreSQL et Redis avec :

```bash
docker compose -f services/docker-compose.yml --profile backend up -d
```

## Combiner plusieurs profiles

```bash
# Démarrer database + monitoring
docker compose -f services/docker-compose.yml --profile database --profile monitoring up -d
```

## Tips

### Voir les logs d'un service

```bash
docker compose -f services/docker-compose.yml logs -f postgres
```

### Accéder au shell d'un container

```bash
# PostgreSQL
docker exec -it nexu-postgres psql -U nexu

# Redis
docker exec -it nexu-redis redis-cli

# MongoDB
docker exec -it nexu-mongodb mongosh -u nexu -p nexu
```

### Réinitialiser un service

```bash
# Arrêter et supprimer le volume
docker compose -f services/docker-compose.yml --profile database down -v

# Redémarrer
docker compose -f services/docker-compose.yml --profile database up -d
```
