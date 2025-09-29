# Library Management System - Backend

A robust Node.js backend API for the High School Library Management System.

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **Express Validator** - Input validation
- **Helmet** - Security middleware
- **Morgan** - HTTP request logger
- **Compression** - Response compression
- **CORS** - Cross-origin resource sharing

## Features

- 🔐 **Authentication & Authorization** - JWT-based auth with role management
- 📚 **Book Management** - CRUD operations for books with search and filtering
- 👥 **User Management** - Student and staff account management
- 🔄 **Transaction System** - Book issue, return, and renewal functionality
- 📊 **Statistics API** - Comprehensive analytics endpoints
- 🛡️ **Security** - Rate limiting, input validation, and security headers
- 📝 **Logging** - Request logging and error handling
- 🐳 **Docker Ready** - Containerized for easy deployment

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update environment variables in `.env`:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/library-management
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`.

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run seed` - Seed database with sample data

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Books
- `GET /api/books` - Get all books (with search, filter, pagination)
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Create new book (Admin/Librarian)
- `PUT /api/books/:id` - Update book (Admin/Librarian)
- `DELETE /api/books/:id` - Delete book (Admin/Librarian)
- `GET /api/books/meta/categories` - Get book categories

### Students
- `GET /api/students` - Get all students (Admin/Librarian)
- `GET /api/students/:id` - Get single student (Admin/Librarian)
- `POST /api/students` - Create new student (Admin/Librarian)
- `PUT /api/students/:id` - Update student (Admin/Librarian)
- `DELETE /api/students/:id` - Delete student (Admin/Librarian)
- `GET /api/students/meta/stats` - Get student statistics

### Transactions
- `GET /api/transactions` - Get all transactions (Admin/Librarian)
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions/issue` - Issue book (Admin/Librarian)
- `POST /api/transactions/return` - Return book (Admin/Librarian)
- `POST /api/transactions/renew` - Renew book (Admin/Librarian)
- `GET /api/transactions/student/:studentId` - Get student's transactions
- `GET /api/transactions/meta/overdue` - Get overdue transactions

### Statistics
- `GET /api/stats/dashboard` - Dashboard statistics (Admin/Librarian)
- `GET /api/stats/books` - Book statistics (Admin/Librarian)
- `GET /api/stats/students` - Student statistics (Admin/Librarian)
- `GET /api/stats/transactions` - Transaction statistics (Admin/Librarian)

### Health Check
- `GET /api/health` - API health status

## Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  role: ['admin', 'librarian', 'student'],
  password: String (hashed),
  studentId: String (unique, for students),
  class: String (for students),
  section: String (for students),
  phone: String,
  address: String,
  isActive: Boolean,
  timestamps: true
}
```

### Book Model
```javascript
{
  title: String,
  author: String,
  isbn: String (unique),
  publisher: String,
  publicationYear: Number,
  category: String,
  subject: String,
  description: String,
  totalCopies: Number,
  availableCopies: Number,
  location: {
    shelf: String,
    section: String
  },
  language: String,
  pages: Number,
  condition: ['New', 'Good', 'Fair', 'Poor'],
  addedBy: ObjectId (User),
  isActive: Boolean,
  timestamps: true
}
```

### Transaction Model
```javascript
{
  book: ObjectId (Book),
  student: ObjectId (User),
  type: ['issue', 'return', 'renew'],
  issueDate: Date,
  dueDate: Date,
  returnDate: Date,
  status: ['active', 'returned', 'overdue', 'lost'],
  fine: {
    amount: Number,
    reason: String,
    paid: Boolean,
    paidDate: Date
  },
  renewalCount: Number,
  notes: String,
  processedBy: ObjectId (User),
  timestamps: true
}
```

## Authentication & Authorization

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Roles:
- **Admin** - Full access to all resources
- **Librarian** - Manage books, students, and transactions
- **Student** - View own profile and transactions

## Security Features

- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - All inputs validated using express-validator
- **Password Hashing** - Bcrypt with salt rounds
- **Security Headers** - Helmet.js for security headers
- **CORS** - Configured for frontend domain
- **Error Handling** - Centralized error handling middleware

## Database Seeding

To populate the database with sample data:

```bash
npm run seed
```

This creates:
- 1 Admin user (admin@library.com / password123)
- 1 Librarian user (librarian@library.com / password123)
- 3 Student users
- 8 Sample books
- Sample transactions

## Production Deployment

### Environment Variables
Ensure all production environment variables are set:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db-uri
JWT_SECRET=your-super-secure-production-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t library-backend .

# Run container
docker run -p 5000:5000 --env-file .env library-backend
```

### Using Docker Compose

Run the entire stack:

```bash
docker-compose up -d
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "stack": "Error stack (development only)"
}
```

## Logging

- **Development** - Detailed logs with colors
- **Production** - Combined format logs
- **Error Logging** - All errors logged to console

## Performance Optimizations

- **Database Indexing** - Optimized indexes for queries
- **Response Compression** - Gzip compression enabled
- **Query Optimization** - Efficient MongoDB queries
- **Pagination** - All list endpoints support pagination

## Testing

Run tests with:

```bash
npm test
```

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Write tests for new features
5. Update documentation

## License

MIT License
