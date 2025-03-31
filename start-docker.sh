#!/bin/bash
# Script pour démarrer l'application avec Docker Compose

echo "Démarrage de RappelAnniv avec Docker..."

# Construire et démarrer les conteneurs en mode détaché
docker-compose up -d --build

echo "Les conteneurs sont démarrés en arrière-plan."
echo "L'application sera accessible à l'adresse: http://localhost:5000"
echo ""
echo "Pour afficher les logs, exécutez: docker-compose logs -f"
echo "Pour arrêter les conteneurs, exécutez: docker-compose down"