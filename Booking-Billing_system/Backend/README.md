# Authentication Backend API

A complete Node.js/Express backend with role-based authentication using MySQL.

## 📦 NPM Packages Installed

### Dependencies
- **express** (^4.18.2) - Web framework
- **mysql2** (^3.6.5) - MySQL client with Promise support
- **bcryptjs** (^2.4.3) - Password hashing
- **jsonwebtoken** (^9.0.2) - JWT token generation and verification
- **dotenv** (^16.3.1) - Environment variable management
- **cors** (^2.8.5) - Cross-Origin Resource Sharing
- **express-validator** (^7.0.1) - Request validation

### Dev Dependencies
- **nodemon** (^3.0.2) - Auto-restart server on file changes

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file and update the following values:

```env
# ⚠️ YOUR INPUT REQUIRED

# MySQL Database
DB_HOST=localhost
DB_USER=root                    # ← YOUR MYSQL USERNAME
DB_PASSWORD=your_password       # ← YOUR MYSQL PASSWORD
DB_NAME=auth_db                # ← YOUR DATABASE NAME
DB_PORT=3306

# JWT Secret
JWT_SECRET=change_this_secret  # ← GENERATE A STRONG SECRET

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 3. Setup MySQL Database

Run the SQL script in `config/schema.sql`:

```bash
mysql -u your_username -p < config/schema.sql
```

Or manually execute the SQL commands in your MySQL client.

**⚠️ IMPORTANT:** Update database name in `schema.sql` if needed.

### 4. Start the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js      # MySQL connection
│   └── schema.sql       # Database schema
├── controllers/
│   └── authController.js # Authentication logic
├── middleware/
│   └── authMiddleware.js # JWT verification
├── routes/
│   └── authRoutes.js    # API routes
├── .env                 # Environment variables
├── package.json         # Dependencies
├── server.js           # Main server file
└── README.md
```

## 🔗 API Endpoints

### Public Routes

#### 1. Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "customer"  // admin, receptionist, or customer
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

#### 3. Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Protected Routes (Require JWT Token)

#### 4. Get Current User
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 5. Logout
```http
POST /api/auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔐 User Roles

- **Admin** - Full system access
- **Receptionist** - Reception management
- **Customer/Guest** - Customer access

## 🛡️ Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Input validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS protection
- ✅ Role-based access control

## ⚠️ Areas Requiring Your Input

1. **`.env` file** - Update all database credentials and JWT secret
2. **`schema.sql`** - Change database name if needed
3. **`authController.js`** - Implement email sending for password reset (line 167)
4. **Frontend URL** - Update CORS origin in `.env`

## 📧 Email Integration (TODO)

To complete the forgot password feature, integrate an email service:

**Recommended options:**
- **Nodemailer** with Gmail/SendGrid
- **AWS SES**
- **Mailgun**

Example integration location: `controllers/authController.js` (line 167)

## 🧪 Testing the API

Use tools like:
- **Postman**
- **Thunder Client** (VS Code extension)
- **cURL**

Example cURL request:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

## 🔄 Frontend Integration

Update your frontend `script.js`:

```javascript
const API_CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    endpoints: {
        login: '/auth/login',
        signup: '/auth/signup',
        forgotPassword: '/auth/forgot-password'
    }
};
```

## 📝 Notes

- Default admin user: `admin@example.com` / `admin123`
- JWT tokens expire in 7 days (configurable in `.env`)
- Password reset tokens expire in 1 hour

## 🐛 Troubleshooting

**Connection refused:**
- Check MySQL is running
- Verify credentials in `.env`

**Token errors:**
- Ensure JWT_SECRET is set
- Check token format: `Bearer <token>`

**CORS errors:**
- Update FRONTEND_URL in `.env`
- Check frontend origin matches

## 📄 License

ISC