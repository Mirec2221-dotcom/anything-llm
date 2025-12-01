# VladAI AnythingLLM - Inštalácia na Ubuntu (bez Dockeru)

Táto príručka popisuje inštaláciu AnythingLLM priamo na Ubuntu server pre rýchly development.

## Požiadavky

- Ubuntu 22.04 LTS
- Node.js 18.18.0
- Yarn
- Git

## 1. Inštalácia Node.js 18

```bash
# Inštalácia nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Inštalácia Node.js 18
nvm install 18.18.0
nvm use 18.18.0
nvm alias default 18.18.0

# Overenie
node -v  # mal by zobraziť v18.18.0
```

## 2. Inštalácia Yarn

```bash
npm install -g yarn
```

## 3. Inštalácia systémových závislostí

```bash
sudo apt update
sudo apt install -y build-essential python3 libgfortran5 ffmpeg
```

## 4. Klonovanie repozitára

```bash
cd /opt
git clone https://github.com/Mirec2221-dotcom/anything-llm.git vladai-anythingllm
cd vladai-anythingllm
```

## 5. Prvotný setup

```bash
yarn setup
```

Toto nainštaluje všetky dependencies a vytvorí `.env` súbory.

## 6. Konfigurácia

Uprav konfiguračné súbory:

```bash
# Hlavná konfigurácia servera
nano server/.env.development

# Frontend konfigurácia (ak treba)
nano frontend/.env

# Collector konfigurácia (ak treba)
nano collector/.env
```

Minimálna konfigurácia v `server/.env.development`:
```env
STORAGE_DIR="/var/lib/anythingllm"
SERVER_PORT=3001
JWT_SECRET="tvoj-tajny-kluc-tu"
```

## 7. Vytvorenie storage adresára

```bash
sudo mkdir -p /var/lib/anythingllm
sudo chown -R $USER:$USER /var/lib/anythingllm
```

## 8. Inicializácia databázy

```bash
yarn prisma:setup
```

## 9. Spustenie služieb

### Možnosť A: Všetko naraz (development)

```bash
yarn dev:all
```

### Možnosť B: Jednotlivé služby v separátnych termináloch

**Terminál 1 - Server (backend):**
```bash
yarn dev:server
```

**Terminál 2 - Frontend:**
```bash
yarn dev:frontend
```

**Terminál 3 - Collector (spracovanie dokumentov):**
```bash
yarn dev:collector
```

## 10. Prístup k aplikácii

- Frontend: http://localhost:3000
- API: http://localhost:3001

---

## Rýchly development workflow

Keď potrebuješ rýchlo testovať zmeny:

### Len frontend zmeny (CSS, React komponenty):
```bash
yarn dev:frontend
```
Zmeny sa automaticky reloadujú (hot reload).

### Len backend zmeny (API, modely):
```bash
yarn dev:server
```
Server sa automaticky reštartuje pri zmenách.

### Len collector zmeny:
```bash
yarn dev:collector
```

### Po zmene v databázovej schéme:
```bash
yarn prisma:generate
yarn prisma:migrate
```

---

## Production build (na serveri)

### Build frontend pre produkciu:
```bash
yarn prod:frontend
```
Výstup bude v `frontend/dist/`.

### Spustenie servera v produkcii:
```bash
yarn prod:server
```

---

## Systemd služby (pre production)

Vytvor systemd služby pre automatické spustenie:

### /etc/systemd/system/vladai-server.service
```ini
[Unit]
Description=VladAI AnythingLLM Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vladai-anythingllm
ExecStart=/root/.nvm/versions/node/v18.18.0/bin/node /opt/vladai-anythingllm/server/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### /etc/systemd/system/vladai-collector.service
```ini
[Unit]
Description=VladAI AnythingLLM Collector
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vladai-anythingllm/collector
ExecStart=/root/.nvm/versions/node/v18.18.0/bin/node /opt/vladai-anythingllm/collector/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Aktivácia služieb:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vladai-server vladai-collector
sudo systemctl start vladai-server vladai-collector

# Kontrola stavu
sudo systemctl status vladai-server
sudo systemctl status vladai-collector
```

---

## Nginx reverse proxy (voliteľné)

```nginx
server {
    listen 80;
    server_name vladai.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Užitočné príkazy

```bash
# Aktualizácia kódu
git pull

# Reinštalácia dependencies (po zmene package.json)
yarn setup

# Reset databázy
yarn prisma:reset

# Lint kódu
yarn lint

# Spustenie testov
yarn test

# Zobrazenie logov (systemd)
journalctl -u vladai-server -f
journalctl -u vladai-collector -f
```

---

## Troubleshooting

### Chyba "ENOENT: no such file or directory" pre databázu
```bash
mkdir -p /var/lib/anythingllm
yarn prisma:setup
```

### Chyba s právami
```bash
sudo chown -R $USER:$USER /var/lib/anythingllm
sudo chown -R $USER:$USER /opt/vladai-anythingllm
```

### Port už používaný
```bash
# Nájdi proces na porte
lsof -i :3001
# Ukonči ho
kill -9 <PID>
```
