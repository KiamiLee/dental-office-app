# Deployment Guide

## Render Deployment Instructions

### Prerequisites
1. **Render Account**: Sign up at https://render.com/
2. **GitHub Account**: Sign up at https://github.com/
3. **This code repository**: Upload to GitHub

### Step 1: Create PostgreSQL Database on Render

1. **Login** to Render dashboard
2. **Click**: "New +" → "PostgreSQL"
3. **Configure**:
   - **Name**: `dental-office-db`
   - **Database**: `dental_office`
   - **User**: `dental_user`
   - **Plan**: **Free** ($0/month)
4. **Create Database**
5. **Copy** the "External Database URL" from the Connections tab

### Step 2: Create Web Service on Render

1. **Click**: "New +" → "Web Service"
2. **Connect** your GitHub repository
3. **Configure**:
   - **Name**: `dental-office-web`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd src && python main.py`
   - **Plan**: **Free** ($0/month)

### Step 3: Set Environment Variables

1. **In Web Service settings** → "Environment"
2. **Add**:
   - **Key**: `DATABASE_URL`
   - **Value**: Your PostgreSQL URL from Step 1
   - **Key**: `FLASK_ENV`
   - **Value**: `production`

### Step 4: Deploy

1. **Click**: "Create Web Service"
2. **Wait**: 5-10 minutes for deployment
3. **Access**: Your app at the provided Render URL

## Local Development

### Setup
```bash
# Clone repository
git clone https://github.com/yourusername/dental-office-app.git
cd dental-office-app

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional)
export DATABASE_URL="postgresql://user:password@host:port/database"
export FLASK_ENV="development"

# Run application
cd src
python main.py
```

### Access
- **Local URL**: http://localhost:5000
- **Database**: SQLite (if no DATABASE_URL set)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | No | SQLite fallback |
| `FLASK_ENV` | Environment mode | No | `production` |
| `PORT` | Server port | No | `5000` |

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify PostgreSQL database is running
   - Falls back to SQLite automatically

2. **Module Not Found**
   - Ensure all dependencies in requirements.txt
   - Run `pip install -r requirements.txt`

3. **Port Issues**
   - Render automatically sets PORT environment variable
   - Local development uses port 5000

### Logs
- **Render**: Check deployment logs in Render dashboard
- **Local**: Console output shows database connection status

## Features

- ✅ **Automatic Database Fallback**: PostgreSQL → SQLite
- ✅ **Environment-Aware**: Development vs Production
- ✅ **Port Configuration**: Automatic port detection
- ✅ **Static File Serving**: Integrated frontend
- ✅ **CORS Enabled**: API access from frontend

## Support

For deployment issues:
1. Check Render deployment logs
2. Verify environment variables
3. Test locally first
4. Open GitHub issue if needed

