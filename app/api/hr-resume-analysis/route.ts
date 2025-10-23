import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const resumeText = body.resumeText || '';
    
    if (!resumeText) {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    console.log('🔍 Starting HR resume analysis...');
    
    // Analyze resume for HR context
    const hrAnalysis = analyzeResumeForHR(resumeText);
    
    console.log('📊 HR Analysis Results:', JSON.stringify(hrAnalysis, null, 2));
    
    return NextResponse.json(hrAnalysis);
    
  } catch (error: any) {
    console.error('Error in HR resume analysis:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze resume',
      details: error.message 
    }, { status: 500 });
  }
}

interface FoundSkill {
  name: string;
  category: string;
  frequency: number;
  priority: string;
  score: number;
}

interface LeadershipEvidence {
  'Team Management': { keywords: string[]; found: boolean; examples: string[] };
  'Project Leadership': { keywords: string[]; found: boolean; examples: string[] };
  'Mentoring': { keywords: string[]; found: boolean; examples: string[] };
  'Strategic Planning': { keywords: string[]; found: boolean; examples: string[] };
}

interface CommunicationEvidence {
  'Presentations': { keywords: string[]; found: boolean; examples: string[] };
  'Documentation': { keywords: string[]; found: boolean; examples: string[] };
  'Client Interaction': { keywords: string[]; found: boolean; examples: string[] };
  'Training': { keywords: string[]; found: boolean; examples: string[] };
}

function analyzeResumeForHR(resumeText: string) {
  console.log('🔍 [analyzeResumeForHR] Raw resumeText input:', resumeText.substring(0, 500) + '...'); // Log first 500 chars
  const resumeLower = resumeText.toLowerCase();
  
  // HR-focused analysis categories
  const hrCategories: { [key: string]: { keywords: string[]; priority: string } } = {
    'Leadership & Management': {
      keywords: [
        'lead', 'managed', 'supervised', 'directed', 'coordinated', 'mentored', 'coached',
        'team lead', 'project lead', 'technical lead', 'senior', 'principal', 'architect',
        'head of', 'director', 'manager', 'supervisor', 'coordinator', 'mentor', 'coach'
      ],
      priority: 'very-high'
    },
    'Communication Skills': {
      keywords: [
        'presented', 'presentation', 'communicated', 'collaborated', 'worked with',
        'stakeholder', 'client', 'customer', 'user', 'documentation', 'technical writing',
        'training', 'workshop', 'meeting', 'conference', 'speaking', 'public speaking'
      ],
      priority: 'very-high'
    },
    'Project Management': {
      keywords: [
        'project', 'agile', 'scrum', 'kanban', 'sprint', 'backlog', 'user story',
        'planning', 'estimation', 'timeline', 'deadline', 'delivery', 'milestone',
        'risk management', 'resource management', 'budget', 'scope'
      ],
      priority: 'high'
    },
    'Problem Solving': {
      keywords: [
        'solved', 'resolved', 'fixed', 'debugged', 'troubleshoot', 'optimized',
        'improved', 'enhanced', 'streamlined', 'automated', 'efficient', 'performance',
        'scalability', 'reliability', 'maintenance', 'support'
      ],
      priority: 'high'
    },
    'Team Collaboration': {
      keywords: [
        'team', 'collaboration', 'cross-functional', 'interdisciplinary', 'partnership',
        'worked with', 'coordinated with', 'aligned with', 'synced with', 'handoff',
        'code review', 'pair programming', 'mob programming', 'team player'
      ],
      priority: 'high'
    },
    'Innovation & Creativity': {
      keywords: [
        'innovated', 'created', 'designed', 'architected', 'developed', 'built',
        'implemented', 'launched', 'pioneered', 'introduced', 'established', 'founded',
        'startup', 'entrepreneur', 'invented', 'patent', 'research', 'experiment'
      ],
      priority: 'medium'
    },
    'Technical Skills': {
      keywords: [
        'python', 'java', 'c++', 'sql', 'javascript', 'typescript', 'html', 'css', 'php',
        'react', 'react-native', 'nextjs', 'node.js', 'mongodb', 'mysql', 'git', 'kubernetes',
        'docker', 'aws', 'azure', 'gcp', 'linux', 'unix', 'bash', 'shell', 'api', 'rest',
        'graphql', 'figma', 'photoshop', 'illustrator', 'wordpress', 'bootstrap', 'tailwind',
        // Grouped technologies for broader matching
        'java/jvm', 'javascript/typescript', 'python/django/flask', 'sql/nosql',
        'frontend/react/angular/vue', 'backend/node/express', 'cloud/aws/azure/gcp',
        'devops/docker/kubernetes', 'mobile/react-native/flutter'
      ],
      priority: 'very-high'
    },
    'Adaptability & Learning': {
      keywords: [
        'learned', 'adapted', 'migrated', 'upgraded', 'modernized', 'transitioned',
        'new technology', 'emerging', 'trend', 'latest', 'cutting-edge', 'innovation',
        'continuous learning', 'professional development', 'certification', 'training'
      ],
      priority: 'medium'
    },
    'Results & Impact': {
      keywords: [
        'increased', 'decreased', 'improved', 'reduced', 'saved', 'achieved',
        'delivered', 'completed', 'launched', 'released', 'deployed', 'production',
        'revenue', 'cost', 'efficiency', 'performance', 'uptime', 'satisfaction'
      ],
      priority: 'high'
    },
    'Industry Experience': {
      keywords: [
        'fintech', 'healthcare', 'e-commerce', 'education', 'finance', 'banking',
        'insurance', 'retail', 'manufacturing', 'logistics', 'transportation',
        'media', 'entertainment', 'gaming', 'social media', 'saas', 'enterprise'
      ],
      priority: 'medium'
    },
    'Soft Skills': {
      keywords: [
        'detail-oriented', 'organized', 'reliable', 'punctual', 'professional',
        'positive attitude', 'enthusiastic', 'motivated', 'self-starter', 'initiative',
        'responsible', 'accountable', 'trustworthy', 'honest', 'ethical'
      ],
      priority: 'medium'
    }
  };

  // Extract HR-relevant information
  const foundSkills: FoundSkill[] = [];
  const experienceLevel = analyzeHRExperienceLevel(resumeText);
  const projectTypes = extractHRProjectTypes(resumeText);
  const industryExperience = extractIndustryExperience(resumeText);
  const leadershipExperience = extractLeadershipExperience(resumeText);
  const communicationEvidence = extractCommunicationEvidence(resumeText);
  const resultsAndImpact = extractResultsAndImpact(resumeText);

  // Analyze each HR category
  Object.entries(hrCategories).forEach(([category, data]) => {
    data.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = resumeText.match(regex) || [];
      if (matches.length > 0) {
        foundSkills.push({
          name: keyword,
          category: category,
          frequency: matches.length,
          priority: data.priority,
          score: calculateHRScore(matches.length, data.priority, keyword, resumeText)
        });
      }
    });
  });

  // Sort by score and remove duplicates
  const uniqueSkills = foundSkills
    .filter((skill, index, self) => 
      index === self.findIndex(s => s.name.toLowerCase() === skill.name.toLowerCase())
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Top 20 skills

  // Group by category
  const categorizedSkills: { [key: string]: FoundSkill[] } = {};
  uniqueSkills.forEach(skill => {
    if (!categorizedSkills[skill.category]) {
      categorizedSkills[skill.category] = [];
    }
    categorizedSkills[skill.category].push(skill);
  });

  return {
    skills: uniqueSkills,
    categorizedSkills: categorizedSkills,
    experienceLevel: experienceLevel,
    projectTypes: projectTypes,
    industryExperience: industryExperience,
    leadershipExperience: leadershipExperience,
    communicationEvidence: communicationEvidence,
    resultsAndImpact: resultsAndImpact,
    hrProfile: generateHRProfile(uniqueSkills, experienceLevel, leadershipExperience),
    recommendedQuestionFocus: determineHRQuestionFocus(uniqueSkills, experienceLevel, leadershipExperience)
  };
}

function calculateHRScore(frequency: number, priority: string, keyword: string, resumeText: string): number {
  let score = frequency;
  
  // Priority multiplier
  const priorityMultiplier: { [key: string]: number } = {
    'very-high': 5,
    'high': 3,
    'medium': 2,
    'low': 1
  };
  
  score *= priorityMultiplier[priority] || 1;
  
  // Context bonus (if mentioned in context of experience, achievements, etc.)
  const contextKeywords = ['experience', 'achieved', 'led', 'managed', 'developed', 'implemented', 'delivered'];
  const keywordRegex = new RegExp(`(${contextKeywords.join('|')}).*?${keyword}|${keyword}.*?(${contextKeywords.join('|')})`, 'gi');
  const contextMatches = resumeText.match(keywordRegex) || [];
  score += contextMatches.length * 3;
  
  return score;
}

function analyzeHRExperienceLevel(resumeText: string): string {
  const seniorKeywords = ['senior', 'lead', 'principal', 'architect', 'manager', 'head of', 'director', '10+ years', '15+ years'];
  const midKeywords = ['developer', 'engineer', 'programmer', '3+ years', '4+ years', '5+ years', '6+ years', '7+ years'];
  const juniorKeywords = ['junior', 'intern', 'trainee', 'graduate', 'entry level', '1+ year', '2+ years'];
  
  const seniorCount = seniorKeywords.reduce((count, keyword) => 
    count + (resumeText.toLowerCase().includes(keyword) ? 1 : 0), 0);
  const midCount = midKeywords.reduce((count, keyword) => 
    count + (resumeText.toLowerCase().includes(keyword) ? 1 : 0), 0);
  const juniorCount = juniorKeywords.reduce((count, keyword) => 
    count + (resumeText.toLowerCase().includes(keyword) ? 1 : 0), 0);
  
  if (seniorCount >= 2) return 'senior';
  if (midCount >= 2) return 'mid-level';
  if (juniorCount >= 1) return 'junior';
  return 'mid-level'; // default
}

function extractHRProjectTypes(resumeText: string): string[] {
  const projectTypes: { [key: string]: string[] } = {
    'Team Leadership': ['team lead', 'project lead', 'technical lead', 'mentored', 'coached'],
    'Cross-functional Projects': ['cross-functional', 'interdisciplinary', 'stakeholder', 'client'],
    'Process Improvement': ['optimized', 'streamlined', 'automated', 'improved', 'enhanced'],
    'Product Development': ['product', 'feature', 'launch', 'release', 'development'],
    'Client/Stakeholder Management': ['client', 'stakeholder', 'customer', 'user', 'presentation'],
    'Innovation Projects': ['innovated', 'pioneered', 'established', 'created', 'designed'],
    'Performance Optimization': ['performance', 'scalability', 'efficiency', 'optimization']
  };
  
  const foundTypes: string[] = [];
  Object.entries(projectTypes).forEach(([type, keywords]) => {
    const found = keywords.some(keyword => 
      resumeText.toLowerCase().includes(keyword)
    );
    if (found) foundTypes.push(type);
  });
  
  return foundTypes;
}

function extractIndustryExperience(resumeText: string): string[] {
  const industries: { [key: string]: string[] } = {
    'Fintech': ['fintech', 'financial', 'banking', 'payment', 'trading', 'investment'],
    'Healthcare': ['healthcare', 'medical', 'pharmaceutical', 'biotech', 'clinical'],
    'E-commerce': ['e-commerce', 'ecommerce', 'retail', 'shopping', 'marketplace'],
    'Education': ['education', 'learning', 'edtech', 'academic', 'university'],
    'Enterprise': ['enterprise', 'b2b', 'saas', 'corporate', 'business'],
    'Media/Entertainment': ['media', 'entertainment', 'gaming', 'streaming', 'content'],
    'Transportation': ['transportation', 'logistics', 'delivery', 'mobility', 'automotive']
  };
  
  const foundIndustries: string[] = [];
  Object.entries(industries).forEach(([industry, keywords]) => {
    const found = keywords.some(keyword => 
      resumeText.toLowerCase().includes(keyword)
    );
    if (found) foundIndustries.push(industry);
  });
  
  console.log('🔍 [extractIndustryExperience] Found industries:', foundIndustries);
  return foundIndustries;
}

function extractLeadershipExperience(resumeText: string): LeadershipEvidence {
  const leadershipEvidence: LeadershipEvidence = {
    'Team Management': {
      keywords: ['managed team', 'led team', 'supervised', 'directed', 'coordinated'],
      found: false,
      examples: []
    },
    'Project Leadership': {
      keywords: ['project lead', 'technical lead', 'architect', 'principal'],
      found: false,
      examples: []
    },
    'Mentoring': {
      keywords: ['mentored', 'coached', 'trained', 'guided', 'supported'],
      found: false,
      examples: []
    },
    'Strategic Planning': {
      keywords: ['strategy', 'planning', 'roadmap', 'vision', 'direction'],
      found: false,
      examples: []
    }
  };

  Object.entries(leadershipEvidence).forEach(([type, data]) => {
    data.keywords.forEach((keyword: string) => {
      if (resumeText.toLowerCase().includes(keyword)) {
        data.found = true;
        // Extract context around the keyword
        const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'gi');
        const matches = resumeText.match(regex) || [];
        data.examples.push(...matches.slice(0, 2)); // Keep first 2 examples
      }
    });
  });

  return leadershipEvidence;
}

function extractCommunicationEvidence(resumeText: string): CommunicationEvidence {
  const communicationEvidence: CommunicationEvidence = {
    'Presentations': {
      keywords: ['presented', 'presentation', 'demo', 'showcase'],
      found: false,
      examples: []
    },
    'Documentation': {
      keywords: ['documentation', 'technical writing', 'specifications', 'proposals'],
      found: false,
      examples: []
    },
    'Client Interaction': {
      keywords: ['client', 'customer', 'stakeholder', 'user', 'meeting'],
      found: false,
      examples: []
    },
    'Training': {
      keywords: ['training', 'workshop', 'teaching', 'knowledge sharing'],
      found: false,
      examples: []
    }
  };

  Object.entries(communicationEvidence).forEach(([type, data]) => {
    data.keywords.forEach((keyword: string) => {
      if (resumeText.toLowerCase().includes(keyword)) {
        data.found = true;
        const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'gi');
        const matches = resumeText.match(regex) || [];
        data.examples.push(...matches.slice(0, 2));
      }
    });
  });

  return communicationEvidence;
}

function extractResultsAndImpact(resumeText: string): string[] {
  const results: string[] = [];
  const impactKeywords = ['increased', 'decreased', 'improved', 'reduced', 'saved', 'achieved', 'delivered'];
  
  impactKeywords.forEach(keyword => {
    const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'gi');
    const matches = resumeText.match(regex) || [];
    results.push(...matches.slice(0, 3)); // Keep first 3 results
  });
  
  return results;
}

function generateHRProfile(skills: FoundSkill[], experienceLevel: string, leadershipExperience: LeadershipEvidence) {
  const topSkills = skills.slice(0, 8).map(s => s.name);
  const categories = [...new Set(skills.map(s => s.category))];
  
  const hasLeadership = Object.values(leadershipExperience).some(exp => exp.found);
  const hasCommunication = skills.some(s => s.category === 'Communication Skills');
  const hasResults = skills.some(s => s.category === 'Results & Impact');
  
  return {
    topSkills: topSkills,
    skillCategories: categories,
    hasLeadershipExperience: hasLeadership,
    hasStrongCommunication: hasCommunication,
    hasMeasurableResults: hasResults,
    experienceLevel: experienceLevel,
    primaryStrengths: determinePrimaryStrengths(skills, experienceLevel)
  };
}

function determinePrimaryStrengths(skills: FoundSkill[], experienceLevel: string): string[] {
  const strengths: string[] = [];
  
  if (skills.some(s => s.category === 'Leadership & Management')) {
    strengths.push('Leadership');
  }
  if (skills.some(s => s.category === 'Communication Skills')) {
    strengths.push('Communication');
  }
  if (skills.some(s => s.category === 'Problem Solving')) {
    strengths.push('Problem Solving');
  }
  if (skills.some(s => s.category === 'Team Collaboration')) {
    strengths.push('Team Collaboration');
  }
  if (skills.some(s => s.category === 'Results & Impact')) {
    strengths.push('Results-Driven');
  }
  
  return strengths.length > 0 ? strengths : ['Technical Skills', 'Problem Solving'];
}

function determineHRQuestionFocus(skills: FoundSkill[], experienceLevel: string, leadershipExperience: LeadershipEvidence) {
  const focus = {
    leadership_questions: experienceLevel === 'senior' || Object.values(leadershipExperience).some(exp => exp.found),
    behavioral_questions: true, // Always include behavioral questions
    situational_questions: experienceLevel !== 'junior',
    teamwork_questions: skills.some(s => s.category === 'Team Collaboration'),
    communication_questions: skills.some(s => s.category === 'Communication Skills'),
    problem_solving_questions: skills.some(s => s.category === 'Problem Solving'),
    results_questions: skills.some(s => s.category === 'Results & Impact'),
    culture_fit_questions: true, // Always include culture fit
    career_goals_questions: true // Always include career goals
  };
  
  return focus;
}
