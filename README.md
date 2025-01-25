# 🌿 MindfulPath: Personalized Mental Wellness Companion

## 📖 Project Overview

Serenity AI  is a comprehensive mental health application designed to support users' emotional well-being through journaling, mood tracking, personalized activities, and AI-powered insights.

### 🚀 Key Features
- Personalized mood tracking
- Sentiment-aware journaling
- AI-powered emotional insights
- Activity and exercise recommendations
- Gamification of mental wellness
- Emergency support features

## 🛠 Tech Stack

### Frontend
- Next.js 14
- Tailwind CSS
- Shadcn/UI Components
- Vercel Deployment

### Backend
- Flask API
- Supabase Authentication & Database
- Google Gemini AI (Embeddings & Language Model)

### Database
- Supabase Postgres
- Vector Embeddings
- Row Level Security

## 🔧 Prerequisites

- Python 3.9+
- Node.js 18+
- Supabase Account
- Google AI Studio API Key
- Vercel Account (optional)

## 📦 Project Structure

```
mental-health-app/
│
├── frontend/                # Next.js Application
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── styles/
│
├── backend/                 # Flask API
│   ├── app.py
│   ├── services/
│   │   ├── gemini_service.py
│   │   └── supabase_service.py
│   └── utils/
│
├── database/                # Supabase Migrations & Functions
│   ├── migrations/
│   └── functions/
│
└── README.md
```

## 🔐 Environment Setup

### 1. Supabase Configuration

1. Create a new Supabase project
2. Enable the `vector` extension
3. Run database migrations
4. Set up Row Level Security (RLS)

#### Required Supabase Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Google Gemini AI Setup

1. Get API key from Google AI Studio
2. Set environment variable

```bash
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Backend Flask API Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py
```

### 4. Frontend Next.js Setup

```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev
```

## 📊 Database Schema Highlights

### Key Tables
- `profiles`: Extended user information
- `mood_entries`: Daily mood tracking
- `journals`: User journal entries with embeddings
- `activities`: Wellness activities
- `achievements`: User progress tracking

## 🧠 AI-Powered Features

### Semantic Search Workflow
1. Generate embedding for journal entries
2. Store 768-dimensional vectors in Supabase
3. Perform similarity search
4. Generate context-aware responses

### Empathetic Response Generation
- Uses Gemini Pro for generating supportive messages
- Considers user's mood, journal history, and current context

## 🔒 Security Considerations

- Supabase Row Level Security
- Secure API routes
- User-specific data access
- Encryption of sensitive information

## 🚀 Deployment

### Frontend (Vercel)
```bash
vercel deploy
```

### Backend (Recommended: Railway/Render)
- Deploy Flask API
- Set environment variables
- Configure CORS

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

For issues, please open a GitHub issue or contact support@mindfullpath.com

---

### 🌈 Future Roadmap
- [ ] Multi-language support
- [ ] Advanced machine learning models
- [ ] Integration with health tracking devices
- [ ] Professional therapist marketplace

## 📦 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/mindfullpath.git

# Setup backend
cd backend
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install

# Run both simultaneously
npm run dev:full
```

**Happy Mental Wellness Tracking! 🧘‍♀️✨**