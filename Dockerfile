FROM node:20-alpine

WORKDIR /app

# Installer netcat pour vérifier la disponibilité de la base de données
RUN apk --no-cache add netcat-openbsd

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code source
COPY . .

# Rendre le script d'entrée exécutable
RUN chmod +x docker-entrypoint.sh

# Construire l'application
RUN npm run build

# Exposition du port
EXPOSE 5000

# Utiliser notre script d'entrée comme point d'entrée
ENTRYPOINT ["./docker-entrypoint.sh"]

# Commande par défaut pour démarrer l'application
CMD ["npm", "run", "dev"]