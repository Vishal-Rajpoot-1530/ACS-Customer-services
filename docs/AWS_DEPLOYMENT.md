# AWS Production Deployment Runbook: ACS Customer Service Centre

## 1. Target Architecture Overview

- **Compute:** AWS EC2 instance (`t3.small` or `t3.medium` recommended, Ubuntu 22.04 / 24.04 LTS)
- **Process Manager:** PM2 (cluster mode with auto-restart)
- **Reverse Proxy:** Nginx (reverse proxying port 80/443 to local Node app on port 5000, handling SSL termination, rate limiting, and gzip compression)
- **SSL Certificate:** Let's Encrypt / Certbot (automated renewal)
- **Database:** MongoDB Atlas (M0 Free Tier for staging / M10 Dedicated for production)
- **Object Storage:** AWS S3 (private bucket `acs-customer-documents-prod` with SSE-S3 encryption)
- **DNS:** AWS Route 53 or custom registrar pointing to the EC2 Elastic IP

---

## 2. Step-by-Step Deployment Instructions

### Step 2.1: Provision AWS Resources
1. **EC2 Instance:** Launch an Ubuntu LTS instance in your target VPC.
2. **Elastic IP:** Allocate an Elastic IP and associate it with the EC2 instance.
3. **Security Groups:**
   - Inbound:
     - Port 22: SSH (restricted to your IP)
     - Port 80: HTTP (0.0.0.0/0)
     - Port 443: HTTPS (0.0.0.0/0)
   - Outbound: All traffic (0.0.0.0/0)

### Step 2.2: Attach IAM Role to EC2 Instance
1. In the AWS IAM Console, create an IAM Role `acs-backend-ec2-role` with EC2 trust relationship.
2. Attach the least-privilege policy defined in `docs/AWS_IAM_POLICY.md`.
3. In the EC2 console, select your instance -> **Actions -> Security -> Modify IAM role**, and attach `acs-backend-ec2-role`.
*(Note: When using an EC2 IAM role, you do not need to configure AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in the environment!)*

### Step 2.3: Server Provisioning (SSH into EC2)
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git

# Verify installations
node -v
npm -v
nginx -v

# Install PM2 globally
sudo npm install -g pm2
```

### Step 2.4: Clone Codebase & Install Dependencies
```bash
# Create application directory
sudo mkdir -p /var/www/acs-backend
sudo chown -R ubuntu:ubuntu /var/www/acs-backend

# Clone your repository
git clone https://github.com/your-org/acs-backend.git /var/www/acs-backend
cd /var/www/acs-backend/Backend

# Install production dependencies
npm ci

# Build TypeScript
npm run build
```

### Step 2.5: Configure Production Environment Variables
Create `/var/www/acs-backend/Backend/.env`:
```env
NODE_ENV=production
PORT=5000

# MongoDB Atlas URI
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/acs_prod?retryWrites=true&w=majority

# JWT Configuration
JWT_ACCESS_SECRET=super_strong_random_jwt_access_secret_key_prod_32_chars_min!
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super_strong_random_jwt_refresh_secret_key_prod_64_chars_min!
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 Storage (Using EC2 IAM Role; credentials can be empty if role attached)
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=acs-customer-documents-prod

# CORS Allowed Frontend
FRONTEND_URL=https://acs-customer-service-centre-1.vercel.app

# Cookie Secret
COOKIE_SECRET=prod_random_cookie_secret_998877

# File limits
MAX_FILE_SIZE_MB=25
```

### Step 2.6: Configure PM2
```bash
# Start backend in cluster mode
pm2 start dist/server.js --name "acs-backend" -i max

# Save PM2 process list and configure auto-start on reboot
pm2 save
pm2 startup
# (Run the sudo command output by pm2 startup)
```

### Step 2.7: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/acs-backend`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/acs-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 2.8: Install SSL with Let's Encrypt
```bash
sudo certbot --nginx -d api.yourdomain.com
```
Certbot will configure HTTPS redirects and automated certificate renewals.

---

## 3. Estimated AWS Monthly Cost (Small Production Scale)

| Resource | Specification | Estimated Monthly Cost |
| :--- | :--- | :--- |
| **AWS EC2** | `t3.small` (2 vCPU, 2GB RAM, 20GB gp3 EBS) | ~$15 - $18 / month |
| **AWS Elastic IP** | 1 Associated IPv4 address | ~$3.60 / month |
| **AWS S3** | Standard Storage (~10 GB active docs + API calls) | ~$0.30 - $1.00 / month |
| **Data Transfer** | Outbound data transfer to internet (<10 GB/mo) | Free tier eligible / < $1.00 |
| **MongoDB Atlas** | M0 Free Tier (or M10 dedicated) | Free ($0) / ~$57 for M10 |
| **Total Estimated Cost** | | **~$20 - $25 / month** (with Atlas M0) |
