# MongoDB Atlas Setup Guide

Your application has been configured to use MongoDB Atlas (cloud cluster) instead of a local MongoDB instance.

## Steps to Complete Setup:

### 1. Create MongoDB Atlas Account
- Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Sign up for a free account (or log in if you already have one)

### 2. Create a New Cluster
- Click "Build a Cluster"
- Choose the **FREE tier** (M0)
- Select your preferred cloud provider and region
- Click "Create Cluster" (this may take a few minutes)

### 3. Create Database User
- Go to **Database Access** (in left sidebar)
- Click "Add New Database User"
- Choose authentication method: **Username and Password**
- Create a username and strong password (save these!)
- Set privileges to "Read and write to any database"
- Click "Add User"

### 4. Whitelist IP Address
- Go to **Network Access** (in left sidebar)
- Click "Add IP Address"
- Click "Allow Access from Anywhere" (for development) OR add your specific IP
- Click "Confirm"

### 5. Get Connection String
- Go back to **Database** view
- Click "Connect" on your cluster
- Choose "Connect your application"
- Select Driver: **Node.js** and Version: **4.1 or later**
- Copy the connection string (it looks like):
  ```
  mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```

### 6. Update .env File
Edit `server/.env` and replace the placeholder values:

```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/smartAmbulance?retryWrites=true&w=majority
SESSION_SECRET=your-random-secret-key
PORT=5000
NODE_ENV=development
```

**Important:**
- Replace `your-username` with your database username
- Replace `your-password` with your database password
- Replace `cluster0.xxxxx.mongodb.net` with your actual cluster URL
- The database name `smartAmbulance` will be created automatically

### 7. Start Your Server
```bash
cd server
npm run dev
```

You should see: `✅ MongoDB Connected: cluster0-shard-00-00.xxxxx.mongodb.net`

## Troubleshooting

**Connection Error:** 
- Check that your IP is whitelisted
- Verify username/password are correct
- Ensure you replaced `<username>` and `<password>` in the connection string

**Authentication Failed:**
- Password might contain special characters - encode them in the URL
- Example: `@` becomes `%40`, `#` becomes `%23`

**Network Timeout:**
- Check your firewall settings
- Try allowing access from anywhere in Network Access settings

## Production Deployment

When deploying to production:
1. Set `NODE_ENV=production` in your environment variables
2. Update the `cors` origin in `server.js` to match your frontend URL
3. Ensure SSL/HTTPS is enabled
4. Use environment variables provided by your hosting platform
