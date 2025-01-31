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
## 📊 Database Schema

### Core Tables

#### 1. Journals Table
- Stores user journal entries with AI enhancements
- Fields:
  - Basic: id, user_id, title, content
  - AI Insights: summary, mood_tags, embedding, keywords
  - Metadata: created_at, tags
  - Location: nearby_places (JSONB)
  - Related Content: latest_articles (JSONB)

#### 2. Activities Table
- Catalog of wellness activities
- Fields:
  - Basic: id, title, description, category
  - Difficulty: difficulty_level (beginner/intermediate/advanced)
  - Mood Matching: recommended_moods
  - Planning: estimated_duration
  - Organization: tags

#### 3. User Activities Table
- Tracks user engagement with activities
- Fields:
  - References: user_id, activity_id
  - Status: planned_at, completed_at, status
  - Feedback: difficulty_rating, reflection

## 🔍 Database Functions

### 1. get_mood_trends()
sql
Function: get_mood_trends(p_user_id UUID)
Returns: TABLE (entry_date DATE, mood_categories JSONB, total_entries BIGINT)
- Analyzes mood patterns over time
- Groups mood tags by date
- Aggregates mood frequencies
- Provides total entries per day

### 2. get_recommended_activities()
sql
Function: get_recommended_activities(p_user_id UUID, p_current_mood_tags TEXT[])
Returns: TABLE (activity_id UUID, title TEXT, description TEXT, match_score double precision)
- Recommends activities based on current mood
- Calculates mood-activity match scores
- Uses intersection algorithm for matching
- Returns top 5 matched activities

### 3. match_journals()
sql
Function: match_journals(query_embedding VECTOR(768), match_threshold FLOAT, match_count INT, user_id UUID)
Returns: TABLE (id UUID, content TEXT, summary TEXT, created_at TIMESTAMP, similarity FLOAT)
- Performs semantic search on journal entries
- Uses vector embeddings for similarity
- Supports configurable matching threshold
- Returns matched entries with similarity scores

### 4. get_dashboard_insights()
sql
Function: get_dashboard_insights(p_user_id UUID, p_days_back INT DEFAULT 90)
Returns: JSONB
Comprehensive analytics function providing:
- Journal trends:
  - Weekly journal counts
  - Mood distribution
  - Keyword analysis
- Activity trends:
  - Completion rates
  - Difficulty ratings
  - Category distribution
- Summary insights:
  - Total counts
  - Most common moods
  - Activity engagement

## 🔒 Security Features

### Row Level Security (RLS)
- Enabled on all main tables:
  - journals
  - activities
  - user_activities

### Performance Optimizations
sql
Indexes:
idx_journals_user_id
idx_user_activities_user_id
idx_journals_mood_tags (GIN)
idx_journals_keywords (GIN)
idx_journals_embedding (IVFFLAT)

## 🔧 Vector Support
- Enabled vector extension for semantic search
- Uses 768-dimensional embeddings
- Optimized for similarity searches

## 📈 Data Analysis Features

### Mood Analysis
- Daily and weekly aggregations
- Mood category distribution
- Trend analysis over time

### Activity Tracking
- Completion rates
- Difficulty progression
- Category distribution
- User engagement metrics

### Journal Analytics
- Semantic search capabilities
- Keyword extraction
- Mood pattern recognition
- Content summarization

## 🔄 Integration Points

### AI Services
- Vector embeddings for semantic search
- Mood prediction from journal content
- Content summarization
- Keyword extraction

### External Services
- Location-based recommendations
- Related article suggestions
- Activity recommendations

## 🚀 Performance Considerations

### Optimized Queries
- Uses CTEs for complex analytics
- Efficient date-based grouping
- Indexed text search capabilities
- Vector similarity optimization

### Data Aggregation
- Weekly rollups for trends
- Efficient JSON aggregation
- Optimized mood analysis
- Smart activity matching

This documentation reflects the current database structure and functionality as defined in the migration file. The system is designed to provide comprehensive mental wellness tracking with AI-powered insights and recommendations.
This updated documentation provides a detailed overview of the database structure and functions while maintaining consistency with the existing codebase. It includes all the key features from the migration file while presenting them in a clear, organized format.
appl all of these to my read me 

I'll help integrate the database documentation into your existing README.md while maintaining its current structure. Here's how we can enhance it:
// ... existing code ...

## 📊 Database Schema Highlights

### Key Tables
- `journals`: User journal entries with AI enhancements
  - AI-powered insights: mood tags, embeddings, keywords
  - Location integration: nearby places recommendations
  - Related content: auto-linked articles
  - Vector embeddings for semantic search (768 dimensions)

- `activities`: Wellness activity catalog
  - Difficulty levels: beginner/intermediate/advanced
  - Mood-based recommendations
  - Duration and category tracking
  - Smart tagging system

- `user_activities`: Progress tracking
  - Status: planned/in_progress/completed/skipped
  - Personal reflections
  - Difficulty ratings
  - Completion timestamps

### Core Functions

#### Mood Analysis
Function: get_mood_trends(p_user_id UUID)
Returns: TABLE (entry_date DATE, mood_categories JSONB, total_entries BIGINT)

- Analyzes mood patterns over time
- Groups mood tags by date
- Aggregates mood frequencies
- Provides total entries per day

### 2. get_recommended_activities()
sql
Function: get_recommended_activities(p_user_id UUID, p_current_mood_tags TEXT[])
Returns: TABLE (activity_id UUID, title TEXT, description TEXT, match_score double precision)

- Recommends activities based on current mood
- Calculates mood-activity match scores
- Uses intersection algorithm for matching
- Returns top 5 matched activities

### 3. match_journals()
sql
Function: match_journals(query_embedding VECTOR(768), match_threshold FLOAT, match_count INT, user_id UUID)
Returns: TABLE (id UUID, content TEXT, summary TEXT, created_at TIMESTAMP, similarity FLOAT)

- Performs semantic search on journal entries
- Uses vector embeddings for similarity
- Supports configurable matching threshold
- Returns matched entries with similarity scores

### 4. get_dashboard_insights()
sql
Function: get_dashboard_insights(p_user_id UUID, p_days_back INT DEFAULT 90)
Returns: JSONB
Comprehensive analytics function providing:
- Journal trends:
  - Weekly journal counts
  - Mood distribution
  - Keyword analysis
- Activity trends:
  - Completion rates
  - Difficulty ratings
  - Category distribution
- Summary insights:
  - Total counts
  - Most common moods
  - Activity engagement

## 🔒 Security Features

### Row Level Security (RLS)
- Enabled on all main tables:
  - journals
  - activities
  - user_activities

### Performance Optimizations
sql
Indexes:
idx_journals_user_id
idx_user_activities_user_id
idx_journals_mood_tags (GIN)
idx_journals_keywords (GIN)
idx_journals_embedding (IVFFLAT)


## 🔧 Vector Support
- Enabled vector extension for semantic search
- Uses 768-dimensional embeddings
- Optimized for similarity searches

## 📈 Data Analysis Features

### Mood Analysis
- Daily and weekly aggregations
- Mood category distribution
- Trend analysis over time

### Activity Tracking
- Completion rates
- Difficulty progression
- Category distribution
- User engagement metrics

### Journal Analytics
- Semantic search capabilities
- Keyword extraction
- Mood pattern recognition
- Content summarization

## 🔄 Integration Points

### AI Services
- Vector embeddings for semantic search
- Mood prediction from journal content
- Content summarization
- Keyword extraction

### External Services
- Location-based recommendations
- Related article suggestions
- Activity recommendations

## 🚀 Performance Considerations

### Optimized Queries
- Uses CTEs for complex analytics
- Efficient date-based grouping
- Indexed text search capabilities
- Vector similarity optimization

### Data Aggregation
- Weekly rollups for trends
- Efficient JSON aggregation
- Optimized mood analysis
- Smart activity matching

This documentation reflects the current database structure and functionality as defined in the migration file. The system is designed to provide comprehensive mental wellness tracking with AI-powered insights and recommendations.


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