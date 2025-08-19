# 🚀 Listen Together - Deployment Guide

## Quick Deployment Checklist

### ✅ Pre-deployment Setup

1. **Clone and Install:**
   ```bash
   git clone <your-repo>
   cd listen-together
   npm run install-all
   ```

2. **Configure Environment Variables:**
   ```bash
   # Backend configuration
   cp config.example.env .env
   
   # Frontend configuration  
   cp client/config.example.env client/.env
   ```

3. **Update Configuration Files:**
   - Add your YouTube API key to `.env`
   - Set your domain URLs in both `.env` files

### 🌐 Platform-Specific Deployment

---

## Heroku Deployment

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set YOUTUBE_API_KEY=your_key_here
heroku config:set CLIENT_URL=https://your-app-name.herokuapp.com
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

**Environment Variables for Heroku:**
```
YOUTUBE_API_KEY=your_youtube_api_key
CLIENT_URL=https://your-app-name.herokuapp.com
NODE_ENV=production
PORT=(automatically set by Heroku)
```

---

## Vercel + Railway/Render

### Backend (Railway/Render):
1. Connect your GitHub repo
2. Set environment variables:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key
   CLIENT_URL=https://your-frontend-domain.vercel.app
   NODE_ENV=production
   PORT=5000
   ```
3. Deploy from main branch

### Frontend (Vercel):
1. Connect your GitHub repo
2. Set build settings:
   - **Framework:** React
   - **Root Directory:** client
   - **Build Command:** npm run build
   - **Output Directory:** client/build
3. Set environment variables:
   ```
   REACT_APP_SERVER_URL=https://your-backend-domain.up.railway.app
   ```

---

## DigitalOcean/VPS Deployment

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx for reverse proxy
sudo apt install nginx -y
```

### 2. Application Setup
```bash
# Clone repository
git clone <your-repo>
cd listen-together

# Install dependencies
npm run install-all

# Create environment files
cp config.example.env .env
cp client/config.example.env client/.env

# Edit configuration files
nano .env
nano client/.env

# Build production version
npm run build:prod
```

### 3. PM2 Configuration
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'listen-together',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Nginx Configuration
```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/listen-together
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/listen-together /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Setup (Optional but recommended)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install && npm run install-client

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start:prod"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  listen-together:
    build: .
    ports:
      - "5000:5000"
    environment:
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      - CLIENT_URL=${CLIENT_URL}
      - NODE_ENV=production
    volumes:
      - ./.env:/app/.env
```

```bash
# Build and run
docker-compose up -d
```

---

## Environment Variables Reference

### Backend (.env)
```env
YOUTUBE_API_KEY=your_youtube_api_key_here
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-domain.com
```

### Frontend (client/.env)
```env
REACT_APP_SERVER_URL=https://your-domain.com
```

---

## Testing Your Deployment

1. **Health Check:**
   - Visit your domain
   - Check browser console for errors
   - Test video search functionality

2. **Multi-user Test:**
   - Open multiple browser tabs/windows
   - Join the same room
   - Test synchronization features

3. **Mobile Test:**
   - Test on mobile devices
   - Check responsive design
   - Verify touch controls work

---

## Troubleshooting

### Common Issues:

**CORS Errors:**
- Ensure `CLIENT_URL` matches your frontend domain exactly
- Check for trailing slashes in URLs

**Socket.IO Connection Issues:**
- Verify `REACT_APP_SERVER_URL` is correct
- Check firewall settings
- Ensure WebSocket support on your hosting platform

**YouTube API Errors:**
- Verify API key is correct
- Check API quotas in Google Cloud Console
- Ensure YouTube Data API v3 is enabled

**Build Failures:**
- Check Node.js version (18+ recommended)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

---

## Monitoring and Maintenance

### PM2 Commands:
```bash
pm2 status                 # Check app status
pm2 logs listen-together   # View logs
pm2 restart listen-together # Restart app
pm2 monit                  # Monitor resources
```

### Nginx Commands:
```bash
sudo nginx -t              # Test config
sudo systemctl reload nginx # Reload config
sudo tail -f /var/log/nginx/access.log # View logs
```

### Updates:
```bash
git pull origin main       # Get latest code
npm run install-all        # Install new dependencies
npm run build:prod         # Rebuild frontend
pm2 restart listen-together # Restart app
```

---

**🎉 Your Listen Together app should now be live and accessible to users worldwide!**
