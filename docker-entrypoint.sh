#!/bin/sh

# Attendre que la base de données soit prête
echo "Attente de la disponibilité de la base de données PostgreSQL..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Base de données PostgreSQL disponible"

# Appliquer les migrations de la base de données
echo "Application des migrations de la base de données..."
npm run db:push

# Démarrer l'application
echo "Démarrage de l'application..."
exec "$@"