# SCCCI Digital Archive System

A comprehensive digital media management and cultural preservation platform for the Singapore Chinese Chamber of Commerce and Industry (SCCCI).

## Features

### Authentication & User Management (Chun Zhen & Ee Hern)
- **User Registration & Sign In** - Secure account creation and authentication
- **Email Verification** - Account verification system with token-based confirmation
- **Password Recovery** - Forgot password functionality with secure token reset
- **Profile Management** - User profile dialog with account settings

### Dashboard & Analytics (Ee Hern)
- **Comprehensive Dashboard** - Overview of all system metrics and data
- **Statistics Tracking** - Media count, albums, people, paintings, and meeting minutes
- **Progress Monitoring** - Visual progress bars for various operations
- **Activity Overview** - Recent activity and system status displays
- **Data Visualization** - Charts and graphs for analytics

### Media Library Management (Chun Zhen)
- **File Upload System** - Support for multiple image formats
- **Album Organization** - Create and manage themed albums (Events, Paintings, Minutes, etc.)
- **Search & Filter** - Advanced search functionality across media items
- **View Modes** - Grid and list view options for optimal browsing
- **Bulk Operations** - Select multiple items for batch operations
- **Image Gallery** - Full-screen image viewing with navigation

### Paintings Management (Ee Hern)
- **Paintings Collection** - Specialized management for artwork and paintings
- **AI-Powered Descriptions** - Automatic generation of artwork descriptions using Google Gemini AI
- **Artist Information** - Track artist details and artwork metadata
- **Element Detection** - AI-based detection of elements in paintings (mountains, trees, buildings, etc.)
- **Cultural Context** - Rich metadata for cultural and historical significance

### People & Facial Recognition (Chun Zhen)
- **Facial Detection** - Automatic face detection in images
- **People Database** - Maintain records of individuals in photos
- **Face Recognition** - AI-powered identification of people across images
- **Manual Annotation** - Add and edit people information manually
- **Face Clustering** - Group similar faces for easier identification

### Image Classification (Kevin)
- **Event Classification** - Organize images by event types and categories
- **Automated Tagging** - AI-assisted image categorization
- **Custom Categories** - Create custom classification schemes
- **Image and Album Gallery Viewing and Management** - View and manage event related images and albums. 

### OCR & Document Processing (Francine)
- **Optical Character Recognition** - Extract text from meeting minutes and documents
- **Meeting Minutes Processing** - Convert scanned documents to digitised text
- **Document Management** - Organize and manage processed documents
- **Text Translation** - Translate traditional Chinese extracted text to formal English
- **Text Summarisation** - Sumamrise texts in meeting minute document
- **Image and Album Gallery Viewing and Management** - View and manage meeting minute related images and albums. 

### Cultural Story Creator (Chun Zhen)
- **AI Story Generation** - Create cultural stories using Google Gemini AI
- **Customizable Parameters** - Adjust creativity and tone settings

### Generative AI Features
- **Google Gemini Integration** - Powered by Google's latest AI technology
- **Intelligent Descriptions** - Generate contextual descriptions for artworks
- **Element Analysis** - Identify cultural and artistic elements in paintings
- **Story Generation** - Create engaging narratives about cultural heritage
- **Text Translation** - Translate traditional Chinese extracted text fom OCR to formal English
- **Text Summarisation** - Sumamrise OCR texts in meeting minute document

### User Experience
- **Responsive Design** - Optimized for desktop and mobile devices
- **Dark/Light Mode** - Theme switching for user preference
- **Intuitive Navigation** - Clean sidebar navigation with clear sections
- **Real-time Updates** - Live updates and notifications
- **Progress Indicators** - Visual feedback for long-running operations

### Technical Features
- **PocketBase Backend** - Robust database and authentication system
- **React + TypeScript** - Modern frontend with type safety
- **Vite Build System** - Fast development and optimized builds
- **TanStack Router** - Type-safe routing and navigation
- **Radix UI Components** - Accessible and customizable UI components
- **Tailwind CSS** - Utility-first styling framework

### Modern Web Technologies
- **Progressive Web App** - App-like experience in browsers
- **Component Architecture** - Reusable and maintainable code structure
- **State Management** - Efficient data flow and state handling
- **API Integration** - RESTful API communication
- **Form Validation** - Robust form handling with validation

---

## Project Structure

This is a React-based web application built with modern web technologies, featuring:
- Frontend: React 19 + TypeScript + Vite
- UI: Radix UI + Tailwind CSS
- Backend: PocketBase
- AI: Google Gemini API
- Routing: TanStack Router

