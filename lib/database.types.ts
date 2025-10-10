// lib/database.types.ts
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  test_cases: {
    sample: { inputs: string[]; outputs: string[] };
    hidden: { inputs: string[]; outputs: string[] };
  };
  solution: string | null;
  hint: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  metadata: {
    tags: string[];
    companies: string[];
    topic_category: string;
    subtopics: string[];
    prerequisites: string[];
    time_complexity: string;
    space_complexity: string;
    expected_solve_time_minutes: number;
    common_approaches: string[];
    common_mistakes: string[];
    interview_frequency: string;
    mastery_indicators: {
      solve_time_threshold: number;
      code_quality_patterns: string[];
      optimization_awareness: string;
    };
  } | null;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  role: string;
  is_registered: boolean;
  profile: {
    experience_level: string;
    target_companies: string[];
    target_roles: string[];
    preferred_languages: string[];
  } | null;
  progress: {
    problemsProgress: Record<
      number,
      {
        id: number;
        status: 'unsolved' | 'solved' | 'attempted';
        lastAttempted?: string;
        completedAt?: string;
        attempts: number;
        codeLength?: number; // New: Number of non-empty lines in the submitted code
        solveTime?: number; // New: Time taken to solve (in seconds)
        errorCount?: number; // New: Number of failed submissions (compilation/runtime/wrong answer)
      }
    >;
    totalSolved: number;
    totalAttempted: number;
    streak: number;
    lastActive?: string;
  };
  created_at: string;
  updated_at: string;
}

/*
// lib/database.types.ts
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  test_cases: {
    sample: { inputs: string[]; outputs: string[] };
    hidden: { inputs: string[]; outputs: string[] };
  };
  solution: string | null;
  hint: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  role: string;
  progress: {
    problemsProgress: Record<
      number,
      {
        id: number;
        status: 'unsolved' | 'solved' | 'attempted';
        lastAttempted?: string;
        completedAt?: string;
        attempts: number;
      }
    >;
    totalSolved: number;
    totalAttempted: number;
    streak: number;
    lastActive?: string;
  };
  created_at: string;
  updated_at: string;
}
*/