# Upadyai - AI-Powered Interview Platform

## Project Documentation

---

## 📋 **Project Overview**

Upadyai is a comprehensive AI-powered interview platform that provides three main modules:

- **DSA Tutor**: Data Structures and Algorithms practice with AI assistance
- **Technical Interview**: AI-powered technical interviews with resume analysis
- **HR Interview**: Behavioral and situational interview questions with emotion detection

The platform uses **Supabase** as the backend database.

---

## 🚀 **How to Run the Application**

### **Prerequisites**

- Node.js (v18 or higher)
- npm
- Supabase account and project
- Environment variables configured

### **Installation Steps**

1. **Clone and Install Dependencies**

   npm install --legacy-peer-deps

2. **Environment Setup**
   Create `.env.local` and '.env' file with:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=
   MISTRAL_API_KEY=your_mistral_api_key
   ```

3. **Start Development Server**

   npm run dev

---

## 🏗️ **Architecture & Modules**

### **1. DSA Tutor Module** (`/app/dsa-tutor/`)

- **Purpose**: Practice DSA problems with AI assistance
- **Features**:

  - Code editor with multiple language support (Python, Java, C++, JavaScript, C)
  - Real-time code execution and testing
  - AI-powered problem explanation and solution hints
  - Progress tracking and performance metrics
  - Free/Pro user modes (Pro users get AI assistance)

- **Key Components**:
  - `CodeAssistance`: AI-powered hints and explanations
  - `ProblemAssistanceTab`: Problem explanation using Ollama
  - `AIAssistanceTab`: Code assistance (currently using Ollama)
  - `CodeEditorSection`: Monaco editor with syntax highlighting

### **2. Technical Interview Module** (`/app/technical-interview/`)

- **Purpose**: AI-conducted technical interviews
- **Features**:

  - Resume upload and analysis
  - Dynamic question generation based on resume
  - MCQ and open-ended questions
  - Real-time evaluation using Mistral AI
  - Pro user queue system for advanced evaluation

- **Flow**:
  1. User uploads resume
  2. AI analyzes resume and generates relevant questions
  3. User answers questions (MCQ + short/long answers)
  4. For Pro users: Responses go to `mistral_queue` for AI evaluation
  5. Results stored in `response_evaluations` and `final_reports` tables

### **3. HR Interview Module** (`/app/hr-interview/`)

- **Purpose**: Behavioral and situational interviews
- **Features**:
  - Emotion detection using AWS Rekognition
  - Video recording and analysis
  - Behavioral question generation
  - Real-time feedback and evaluation
  - Pro mode with API key management for different AI models

---

## 🔐 **Authentication & Session Management**

### **Authentication Flow**

1. **Supabase Auth**: Email/password authentication
2. **Middleware Protection**: Route-based access control (`middleware.ts`)
3. **Registration Check**: Two-step process (auth → registration)
4. **Session Management**: Automatic token refresh and validation

### **Key Files**:

- `lib/context/auth-context.tsx`: Global auth state management
- `middleware.ts`: Route protection and session validation
- `components/layout/auth-layout.tsx`: Protected route wrapper

### **User Flow**:

```
Login → Check Registration → Dashboard/Register → Module Access
```

---

## 🛡️ **Fallback Mechanisms**

### **Technical Interview Fallbacks**

- **Question Generation**: If AI fails, uses predefined question sets based on resume analysis
- **Evaluation**: Fallback evaluation system in `test-evaluation.js` provides basic scoring
- **API Failures**: Graceful degradation with error messages and retry options

### **HR Interview Fallbacks**

- **Question Generation**: Predefined behavioral questions if AI generation fails
- **Emotion Detection**: Fallback to basic analysis if AWS Rekognition fails
- **Video Processing**: Alternative processing methods for video analysis

### **DSA Tutor Fallbacks**

- **Problem Assistance**: Fallback responses when Ollama server is unavailable
- **Code Execution**: Error handling for compilation and runtime issues
- **AI Assistance**: Basic hints when advanced AI features fail

---

## 📊 **Database Schema (Supabase)**

### **Key Tables**:

- `users`: User profiles and registration status
- `mistral_queue`: Pro user interview responses awaiting AI evaluation
- `response_evaluations`: AI evaluation results
- `final_reports`: Comprehensive interview reports
- `problems`: DSA problems and test cases
- `interview_sessions`: Interview session tracking

---

## ⚙️ **Mistral Queue Processing**

### **Manual Processing**

run this script after taking pro user interview (technical interview page)
"node scripts/process-mistral-queue.js"

**for automation follow this** :
Add vercel.json with cron schedule
Create /api/cron/process-mistral-queue/route.ts
Copy your existing script logic into the API route (exaclty as it is from process-mistral-queue)
Deploy - Vercel handles the rest

Uptime Robot or Cron-job.org (free services)
Calls your Vercel API endpoint every 5 minutes
Zero code changes needed
Just create one API route that runs your existing script logic

### **What it does**:

1. Fetches pending jobs from `mistral_queue` table
2. Processes up to 5 jobs at a time
3. Calls Mistral API for evaluation
4. Stores results in `response_evaluations` and `final_reports`
5. Updates job status to 'done' or 'error'

### **Automation Plan (Cron Jobs)**:

- **Option 1**: Vercel Cron Jobs (recommended)
- **Option 2**: External cron service (Uptime Robot, Cron-job.org)

---

## 🎯 **Remaining Tasks**

### **High Priority**

1. **Frontend Enhancements**

   - UI/UX improvements
   - Mobile responsiveness optimization
   - Performance optimizations

2. **Free/Pro User Tracking**

   - Implement usage limits for free users
   - Pro user feature gating
   - Subscription management

3. **DSA Tutor AI Integration**
   - Replace Ollama with Mistral for code assistance
   - Improve AI response quality
   - Add more language support

### **Medium Priority**

4. **Resume Analysis & Job Recommendations**

   - New module for resume analysis
   - Job matching algorithms
   - Career recommendations (no backend required)

5. **Profile Page Updates**

   - Remove badges tab
   - Streamline user profile interface

6. **HR Interview Pro Mode**
   - API key management for different AI models
   - Enhanced video mode features
   - Custom model selection

### **Low Priority**

7. **Deployment**

   - Vercel deployment setup
   - Environment configuration
   - CI/CD pipeline

8. **Automation**
   - Implement cron job automation
   - Monitor queue processing
   - Error handling and alerts

---

## 🚀 **Deployment Guide**

### **Vercel Deployment**

1. **Connect Repository**: Link GitHub repo to Vercel
2. **Environment Variables**: Add all required env vars
3. **Build Settings**: Use default Next.js settings
4. **Deploy**: Automatic deployment on push

### **Environment Variables for Production**:

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=
MISTRAL_API_KEY=your_mistral_api_key
```

---

## 🔧 **Backend Servers (Optional)**

### **Problem Assistance Server** (`backend/problem-assistance-server.js`)

- **Port**: 3005
- **Purpose**: DSA problem explanations using Ollama
- **Features**: Streaming responses, caching, fallback mechanisms

### **Code Generation Server** (`backend/gen-code-server.js`)

- **Port**: 3006
- **Purpose**: Code generation and assistance
- **Features**: Multi-language support, template generation

### **Running Backend Servers**:

```bash
cd backend
node problem-assistance-server.js  # Port 3005
node gen-code-server.js           # Port 3006
```

---

## 📝 **Development Notes**

### **Key Dependencies**:

- **Next.js 15**: React framework
- **Supabase**: Backend as a Service
- **Monaco Editor**: Code editor
- **Radix UI**: Component library
- **Tailwind CSS**: Styling
- **TensorFlow.js**: AI/ML capabilities

### **Code Structure**:

- `app/`: Next.js app router pages
- `components/`: Reusable UI components
- `lib/`: Utilities and configurations
- `hooks/`: Custom React hooks
- `scripts/`: Utility scripts

### **Important Files**:

- `middleware.ts`: Authentication and routing
- `lib/supabase.ts`: Database client
- `lib/context/`: Global state management
- `scripts/process-mistral-queue.js`: Queue processing

---

## 🆘 **Troubleshooting**

### **Common Issues**:

1. **Installation**: Use `--legacy-peer-deps` flag
2. **Environment**: Ensure all env vars are set
3. **Database**: Check Supabase connection and permissions
4. **AI Services**: Verify API keys and quotas
5. **Backend Servers**: Ensure ports 3005/3006 are available

### **Debug Commands**:

# Check environment

npm run dev

# Test Mistral queue

node scripts/process-mistral-queue.js

# Test backend servers

node backend/problem-assistance-server.js

```

---


```
