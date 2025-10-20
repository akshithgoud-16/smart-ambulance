# Smart Ambulance Project Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)
- Google Maps API Key

## Environment Setup

### 1. Server Environment Variables
Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/smartAmbulance

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Google Maps API Key (for server-side geocoding if needed)
GOOGLE_MAPS_API_KEY=AIzaSyD1ZnITeqwr7gt6pMeGfnlR-EBL1kYPbXA
```

### 2. Client Environment Variables
Create a `.env` file in the `client` directory:

```env
# Google Maps API Key for client-side
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyD1ZnITeqwr7gt6pMeGfnlR-EBL1kYPbXA
```

## Installation & Running

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

### 3. Run the Application
```bash
# From the root directory
npm run dev
```

This will start both the server (port 5000) and client (port 3000) concurrently.

## Features Implemented

### ✅ Completed Features:
1. **User Authentication** - Login/Signup with role-based access
2. **Ambulance Booking** - Interactive Google Maps integration
3. **Driver Dashboard** - Accept and complete bookings
4. **Police Dashboard** - Monitor accepted bookings
5. **User Dashboard** - Track booking history and status
6. **Session Management** - Proper login/logout functionality
7. **Real-time Status Updates** - Booking status tracking

### 🔧 Technical Stack:
- **Frontend**: React, React Router, Google Maps API
- **Backend**: Node.js, Express, MongoDB, Passport.js
- **Authentication**: Session-based with Passport Local Strategy
- **Database**: MongoDB with Mongoose ODM

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/pending` - Get pending bookings (drivers)
- `GET /api/bookings/driver` - Get driver's accepted bookings
- `PUT /api/bookings/:id/accept` - Accept booking (drivers)
- `PUT /api/bookings/:id/complete` - Complete booking (drivers)

### Users
- `GET /api/users/profile` - Get user profile
- `GET /api/users/bookings` - Get user's booking history
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/bookings/:id/cancel` - Cancel booking

### Police
- `GET /api/police/bookings` - Get all accepted bookings

## User Roles

1. **User** - Can book ambulances and track their requests
2. **Driver** - Can accept and complete ambulance requests
3. **Police** - Can monitor all accepted bookings

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in server/.env

2. **Google Maps Not Loading**
   - Verify API key is correct
   - Check browser console for API errors

3. **Session Issues**
   - Clear browser cookies and localStorage
   - Restart the server

4. **Port Conflicts**
   - Change PORT in server/.env if 5000 is occupied
   - Update client proxy in client/package.json if needed

