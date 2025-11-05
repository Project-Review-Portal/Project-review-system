# Project Review System

A comprehensive web application for managing academic project reviews, viva examinations, and project coordination in educational institutions.

## 🎯 Overview

This system provides a complete solution for managing:
- Student project reviews and viva examinations
- Panel assignments and scheduling
- User management for students, supervisors, and examiners
- Attendance tracking and evaluation

## 🚀 Features

### User Management
- **Role-Based Access**: Students, supervisors, internal/external examiners, administrators
- **Authentication**: Secure login with JWT tokens
- **Authorization**: Role-based permissions and access control

### Panel Management
- **Assignment System**: Automatic and manual panel assignments
- **Availability Tracking**: Examiner availability management
- **Scheduling**: Viva date and time coordination

### Administrative Features
- **Dashboard**: Comprehensive overview of system status
- **Reporting**: Various reports for academic administration
- **Configuration**: Flexible system settings

## 🛠️ Technology Stack

### Frontend
- **React.js**: Modern UI framework
- **Tailwind CSS**: Utility-first styling
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **MongoDB**: Database with Mongoose ODM
- **JWT**: Authentication tokens
- **Multer**: File upload handling
- **PDF-lib**: PDF generation
- **Docxtemplater**: DOCX template processing
- **LibreOffice**: Document conversion

## 📁 Project Structure

```
project-review-system/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   └── styles/          # CSS and styling
│   ├── public/
│   └── package.json
├── backend/                  # Node.js backend application
│   ├── controllers/         # Request handlers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication & authorization
│   ├── utils/              # Utility functions
│   ├── scripts/            # Database and maintenance scripts
│   └── uploads/
│       └── templates/      # Document templates (preserved)
└── uploads/                 # Shared upload directory
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB

### Backend Setup
```bash
cd backend
npm install
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Environment Variables
Create `.env` files in both frontend and backend directories with appropriate configuration.

## 📚 Documentation

- **STATUS.md**: Current system status and verification results
- **IMPROVEMENTS.md**: Recent improvements and technical implementations

## 🧪 Testing

The system includes comprehensive test suites:
- Template generation tests
- Document conversion tests
- Data injection verification
- End-to-end functionality tests

Run tests with:
```bash
cd backend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For technical issues or questions, please refer to the documentation or create an issue in the repository.

---

*This project is designed to streamline academic review processes and improve efficiency in educational institutions.*
