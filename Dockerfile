# Usa l'immagine ufficiale di Node.js come base
FROM node:18-alpine

# Imposta la directory di lavoro
WORKDIR /app

# Copia il file package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice dell'applicazione
COPY . .

# Esponi la porta su cui gira l'applicazione
EXPOSE 3000

# Comando per avviare l'applicazione
CMD ["npm", "start"]