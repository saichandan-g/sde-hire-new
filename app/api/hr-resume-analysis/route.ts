// app/api/hr-resume-analysis/route.ts
import { NextResponse, NextRequest } from 'next/server';
export const runtime = 'nodejs';

/**
 * Robust PDF parsing strategy:
 * 1) Try pdf-parse if available and compatible.
 * 2) Fallback to pdf2json to extract textual content reliably.
 *
 * Notes:
 * - Install: npm i pdf-parse pdf2json
 * - Keep runtime = 'nodejs' so Buffer is available.
 */

// ---------- Parser loaders ----------
async function tryPdfParse(buffer: Buffer): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let pdfParse: any;
    try {
      // Attempt direct require first
      const module = require('pdf-parse');
      pdfParse = module.default || module; // Handle both CJS and ESM default export
    } catch (reqErr: any) { // Explicitly type as any
      console.warn('[tryPdfParse] Direct require failed, trying dynamic import:', reqErr?.message);
      try {
        // Fallback to dynamic import
        const mod = await import('pdf-parse');
        pdfParse = (mod as any).default || mod;
      } catch (importErr: any) { // Explicitly type as any
        console.warn('[tryPdfParse] Dynamic import also failed:', importErr?.message);
        return null;
      }
    }

    if (typeof pdfParse !== 'function') {
      console.warn('[tryPdfParse] pdf-parse did not expose a callable function after all attempts');
      return null;
    }

    const result = await pdfParse(buffer);
    if (!result || !result.text) return null;
    return String(result.text);
  } catch (err: any) {
    console.warn('[tryPdfParse] pdf-parse failed during dynamic import or parsing:', err?.message || String(err));
    return null;
  }
}

async function tryPdf2json(buffer: Buffer): Promise<string> {
  try {
    const { default: Pdf2jsonModule } = await import('pdf2json');
    const Pdf2jsonConstructor = (Pdf2jsonModule as any).PDFParser || Pdf2jsonModule;

    if (typeof Pdf2jsonConstructor !== 'function') {
      throw new Error('PDFParser is not a constructor after dynamic import');
    }

    return new Promise((resolve, reject) => {
      try {
        const pdfParser: any = new Pdf2jsonConstructor();

        pdfParser.on('pdfParser_dataError', (errData: any) => {
          const message = errData?.parserError || JSON.stringify(errData);
          reject(new Error(`pdf2json parser error: ${message}`));
        });

        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          try {
            const pages = pdfData?.Pages || [];
            const textPages: string[] = pages.map((page: any) => {
              const texts = page.Texts || [];
              const pageText = texts.map((t: any) => {
                const segments = t.R || [];
                return segments.map((s: any) => {
                  try {
                    return decodeURIComponent(s.T || '');
                  } catch {
                    return String(s.T || '');
                  }
                }).join('');
              }).join(' ');
              return pageText;
            });
            const fullText = textPages.join('\n');
            resolve(fullText);
          } catch (err) {
            reject(err);
          }
        });

        pdfParser.parseBuffer(buffer);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err: any) {
    console.warn('[tryPdf2json] Top-level error:', err?.message || String(err));
    throw err;
  }
}

/**
 * parsePdfText: tries pdf-parse first; if it returns null or fails, falls back to pdf2json
 * Then post-processes to ensure proper newline characters are present for resume structure
 */
async function parsePdfText(buffer: Buffer): Promise<string> {
  let resumeText = '';

  // Try pdf-parse
  const try1 = await tryPdfParse(buffer);
  if (try1 && String(try1).trim().length > 0) {
    resumeText = try1;
  } else {
    // Fallback
    resumeText = await tryPdf2json(buffer);
  }

  // Post-process to add newlines for resume structure
  resumeText = postProcessResumeTextForNewlines(resumeText);

  console.log(`[parsePdfText] Processed text line count: ${resumeText.split('\n').length}`);

  return resumeText;
}

/**
 * Post-processes the extracted resume text to add newline characters (\n) where they logically belong
 * in a resume structure, based on common patterns and heuristics.
 */
function postProcessResumeTextForNewlines(text: string): string {
  console.log('[postProcessResumeTextForNewlines] Starting post-processing. Original length:', text.length);

  let result = text;

  // Pattern 1: Insert newlines before • bullet points (but ensure it's not part of a word)
  result = result.replace(/(?<![a-zA-Z])•/g, '\n•');

  // Pattern 2: Insert newlines before - dash points (if not part of a word like "Python-", avoid false positives)
  result = result.replace(/(?<![a-zA-Z])\s*-\s+/g, '\n- ');

  // Pattern 3: Insert newlines before all-caps words that look like section headers (e.g., "EXPERIENCE", "SKILLS")
  result = result.replace(/(?<![a-zA-Z\s])\b([A-Z]{4,})\b(?!\.[a-z])/g, '\n$1');

  // Pattern 4: Insert newlines before job titles followed by "at" or "for" a company
  result = result.replace(/([A-Z][a-zA-Z0-9\s,&\-]+)\s+(at|for)\s+([A-Z][a-zA-Z0-9\s,&\-]+)\s*\(?\d{4}/g, '\n$1 $2 $3 ($&'.match(/\d{4}/) ? '$&' : '');

  // Pattern 5: Insert newlines before dates like "(2020 – Present)" or "(Jan 2016 – Feb 2020)" if they follow company names
  result = result.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*\s*[–\-]\s*\s*(Present|\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, '\n$&');

  // Pattern 6: Insert newlines after education degrees like "B.Tech" followed by "in"
  result = result.replace(/(B\.|M\.)(Tech|Sc\.|Eng\.|A\.|M\.S\.|Ph\.D\.)\s+in\b/g, '$&\n');

  // Pattern 7: Insert newlines before comma-separated lists that look like skill lists (basic heuristic)
  // But avoid breaking existing sentence structure by checking for lowercase letters before
  result = result.replace(/([a-z\s]{5,})?, /g, '$&');

  // Pattern 8: Insert newlines after company names if they end with year or "Ltd." etc. and are followed by a capital letter (new section)
  result = result.replace(/([A-Z][a-zA-Z0-9\s,&\-]+(?:Ltd\.|Inc\.|Corp\.|Pvt\. Ltd\.|GmbH)?)\s*(?:\d{4})?\s*\.\s*([A-Z])/g, '$&\n');

  // Pattern 9: Insert newlines before commonly mentioned sections for better structure
  const sectionHeaders = ['professional experience', 'work experience', 'education', 'skills', 'achievements', 'projects', 'certifications', 'interests', 'languages'];
  sectionHeaders.forEach(header => {
    const regex = new RegExp(`(${header.replace(/\s+/g, '\\s+')})`, 'gi');
    result = result.replace(regex, '\n$1');
  });

  // Clean up: remove excessive consecutive newlines (more than 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Clean up: remove newlines that were mistakenly added before already existing ones
  result = result.replace(/\n\s*\n/g, '\n');

  console.log('[postProcessResumeTextForNewlines] Post-processing complete. New length:', result.length);
  return result;
}

// ---------- API Handler ----------
export async function POST(request: NextRequest) {
  try {
    console.log('[analyzeResumeForHR] Incoming POST');

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('resume') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No resume file uploaded' }, { status: 400 });
    }

    console.log('[analyzeResumeForHR] File metadata:', {
      type: (file as any).type,
      size: (file as any).size,
    });

    if ((file as any).type !== 'application/pdf') {
      return NextResponse.json({ error: 'Unsupported file type; PDF required' }, { status: 400 });
    }

    // Convert to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Parse PDF text (robust)
    let resumeText = '';
    try {
      console.log('[analyzeResumeForHR] Parsing PDF (pdf-parse -> pdf2json fallback)...');
      resumeText = await parsePdfText(pdfBuffer);
      console.log('[analyzeResumeForHR] PDF parsing done. Text length:', resumeText.length);
    } catch (err: any) {
      console.error('[analyzeResumeForHR] Parsing failed:', err?.message || String(err));
      return NextResponse.json({ error: 'Failed to parse PDF', details: err?.message || String(err) }, { status: 500 });
    }

    if (!resumeText || resumeText.trim() === '') {
      console.error('[analyzeResumeForHR] No text extracted');
      return NextResponse.json({ error: 'Could not extract text from resume' }, { status: 400 });
    }

    // Run HR analysis
    console.log('[analyzeResumeForHR] Starting HR analysis...');
    let hrAnalysis: any;
    try {
      hrAnalysis = analyzeResumeForHR(resumeText);
    } catch (err: any) {
      console.error('[analyzeResumeForHR] Analysis failed:', err?.message || String(err));
      return NextResponse.json({ error: 'Failed during resume analysis', details: err?.message || String(err) }, { status: 500 });
    }

    console.log('[analyzeResumeForHR] Analysis completed.');
    // Basic telemetry logs
    console.log('[analyzeResumeForHR] Projects summary:', hrAnalysis.projectDetails?.summary || 'N/A');
    console.log('[analyzeResumeForHR] Leadership found:', Object.keys(hrAnalysis.leadershipExperience || {}).filter((k: string) => hrAnalysis.leadershipExperience[k].found));
    console.log('[analyzeResumeForHR] Achievements:', hrAnalysis.resultsAndImpact?.slice(0, 3) || []);

    return NextResponse.json(hrAnalysis);
  } catch (error: any) {
    console.error('[analyzeResumeForHR] Top-level error:', error?.message || String(error));
    return NextResponse.json({ error: 'Failed to analyze resume', details: error?.message || String(error) }, { status: 500 });
  }
}

// ---------- Interfaces ----------
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

// ---------- Core Analysis (kept & improved) ----------
function analyzeResumeForHR(resumeText: string) {
  console.log('🔍 [analyzeResumeForHR] Raw resumeText input (preview):', resumeText.substring(0, 300) + '...');
  const resumeLower = resumeText.toLowerCase();

  const hrCategories: { [key: string]: { keywords: string[]; priority: string } } = {
    'Leadership & Management': {
      keywords: ['lead', 'led', 'managed', 'supervised', 'directed', 'coordinated', 'mentored', 'team lead', 'project lead', 'technical lead', 'manager', 'director', 'head of'],
      priority: 'very-high'
    },
    'Communication Skills': {
      keywords: ['presented', 'presentation', 'communicated', 'collaborated', 'stakeholder', 'client', 'customer', 'documentation', 'technical writing', 'training', 'conference', 'meeting', 'public speaking'],
      priority: 'very-high'
    },
    'Project Management': {
      keywords: ['project', 'agile', 'scrum', 'kanban', 'sprint', 'timeline', 'milestone', 'delivery', 'planning', 'risk management'],
      priority: 'high'
    },
    'Problem Solving': {
      keywords: ['solved', 'resolved', 'debugged', 'troubleshoot', 'optimized', 'improved', 'enhanced', 'streamlined', 'automated', 'efficiency'],
      priority: 'high'
    },
    'Team Collaboration': {
      keywords: ['team', 'cross-functional', 'collaboration', 'code review', 'pair programming', 'team player', 'handoff'],
      priority: 'high'
    },
    'Innovation & Creativity': {
      keywords: ['innovated', 'designed', 'created', 'architected', 'pioneered', 'founded', 'invented', 'patent', 'research'],
      priority: 'medium'
    },
    'Technical Skills': {
      keywords: ['python', 'java', 'c++', 'sql', 'javascript', 'typescript', 'react', 'nextjs', 'node', 'mongodb', 'mysql', 'git', 'kubernetes', 'docker', 'aws', 'gcp', 'azure'],
      priority: 'very-high'
    },
    'Adaptability & Learning': {
      keywords: ['learned', 'adapted', 'modernized', 'migrated', 'upgraded', 'continuous learning', 'certification'],
      priority: 'medium'
    },
    'Results & Impact': {
      keywords: ['increased', 'decreased', 'improved', 'reduced', 'saved', 'achieved', 'delivered', 'revenue', 'cost', 'uptime', 'satisfaction'],
      priority: 'high'
    },
    'Industry Experience': {
      keywords: ['fintech', 'healthcare', 'e-commerce', 'education', 'finance', 'banking', 'insurance', 'retail', 'manufacturing', 'logistics', 'media', 'gaming', 'saas'],
      priority: 'medium'
    },
    'Soft Skills': {
      keywords: ['detail-oriented', 'organized', 'reliable', 'punctual', 'self-starter', 'initiative', 'accountable', 'responsible'],
      priority: 'medium'
    }
  };

  // collect found skills
  const foundSkills: FoundSkill[] = [];
  Object.entries(hrCategories).forEach(([category, def]) => {
    def.keywords.forEach((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = resumeText.match(regex) || [];
      if (matches.length > 0) {
        foundSkills.push({
          name: keyword,
          category,
          frequency: matches.length,
          priority: def.priority,
          score: calculateHRScore(matches.length, def.priority, keyword, resumeText)
        });
      }
    });
  });

  // dedupe and sort
  const uniqueSkills = foundSkills
    .filter((s, idx, arr) => idx === arr.findIndex(x => x.name.toLowerCase() === s.name.toLowerCase()))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  const categorizedSkills: { [key: string]: FoundSkill[] } = {};
  uniqueSkills.forEach(skill => {
    if (!categorizedSkills[skill.category]) categorizedSkills[skill.category] = [];
    categorizedSkills[skill.category].push(skill);
  });

  // other extractions
  const experienceLevel = analyzeHRExperienceLevel(resumeText);
  const projectTypes = extractHRProjectTypes(resumeText);
  const projectDetails = extractProjectDetails(resumeText);
  const achievements = extractAchievements(resumeText); // Call the new achievements function
  const industryExperience = extractIndustryExperience(resumeText);
  const leadershipExperience = extractLeadershipExperience(resumeText);
  const communicationEvidence = extractCommunicationEvidence(resumeText);
  const resultsAndImpact = extractResultsAndImpact(resumeText);
  const allSkills = extractAllSkillsFromResume(resumeText); // Extract all technical/domain skills
  const hrProfile = generateHRProfile(uniqueSkills, experienceLevel, leadershipExperience);
  const recommendedQuestionFocus = determineHRQuestionFocus(uniqueSkills, experienceLevel, leadershipExperience);

  return {
    skills: uniqueSkills,
    allSkills,
    categorizedSkills,
    experienceLevel,
    projectTypes,
    projectDetails,
    achievements, // Include the separate achievements array
    industryExperience,
    leadershipExperience,
    communicationEvidence,
    resultsAndImpact,
    hrProfile,
    recommendedQuestionFocus
  };
}

// --- Helper functions ---
function calculateHRScore(frequency: number, priority: string, keyword: string, resumeText: string): number {
  console.log(`🔍 [calculateHRScore] Calculating score for keyword: ${keyword}`);
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
  console.log('🔍 [analyzeHRExperienceLevel] Analyzing experience level...');
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
  console.log('🔍 [extractHRProjectTypes] Extracting project types...');
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

// Extract specific project details, achievements and brief summary for prompts
function extractProjectDetails(resumeText: string) {
  console.log('🔍 [extractProjectDetails] Extracting project details...');
  const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const projects: string[] = [];

  const projectKeywords = ['project', 'built', 'developed', 'created', 'implemented', 'contributed', 'designed', 'led', 'managed'];
  const projectTitlePatterns = [
    /^(?:project|key project|major project|capstone project|personal project|experience|work experience|relevant experience|professional experience|employment history|work history|job title|role|position):?\s*(.*)/i,
    /^\s*•\s*(.*(?:project|built|developed|created|implemented|contributed|designed|led|managed).*)/i, // Bullet points with keywords
    /^\s*-\s*(.*(?:project|built|developed|created|implemented|contributed|designed|led|managed).*)/i, // Dash points with keywords
    /^([A-Z][a-zA-Z0-9\s,&\-]*)\s*(?:at|for)\s*([A-Z][a-zA-Z0-9\s,&\-]*)\s*\(?\d{4}.*?\)?/i, // "Title at Company (Year)"
  ];

  let inProjectSection = false;
  let currentProjectDescription = '';

  console.log('--- Project Extraction Debugging ---');
  console.log('Total lines:', lines.length);

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    console.log(`Processing line: "${line}"`);

    // Detect start of sections
    if (lineLower.includes('projects') || lineLower.includes('experience') || lineLower.includes('work history')) {
      inProjectSection = true;
      console.log(`Detected start of project section. inProjectSection = ${inProjectSection}`);
      continue;
    }
    // Detect end of any section (new section headers)
    if (inProjectSection && (
      lineLower.includes('education') ||
      lineLower.includes('skills') ||
      lineLower.includes('certifications') ||
      lineLower.includes('languages') ||
      lineLower.includes('interests') ||
      lineLower.includes('achievements') // Added achievements as a section ender for projects
    )) {
      inProjectSection = false;
      console.log(`Detected end of project section. inProjectSection = ${inProjectSection}`);
      if (currentProjectDescription.length > 0) {
        projects.push(currentProjectDescription);
        console.log(`Pushed aggregated project: "${currentProjectDescription}"`);
        currentProjectDescription = '';
      }
      continue;
    }

    let isProjectLine = false;
    let extractedProjectText = line;

    // Check for project title patterns first
    for (const pattern of projectTitlePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        extractedProjectText = match[1].trim();
        isProjectLine = true;
        console.log(`  Matched title pattern: "${extractedProjectText}"`);
        break;
      }
    }

    // If not a title pattern, check if it's within a project section or contains project keywords
    if (!isProjectLine && (inProjectSection || projectKeywords.some(keyword => lineLower.includes(keyword)))) {
      // Try to summarize the line
      const firstSentenceMatch = line.match(/^([^.!?]*[.!?])/);
      extractedProjectText = firstSentenceMatch ? firstSentenceMatch[1].trim() : line.substring(0, Math.min(line.length, 150)).trim();
      if (extractedProjectText.length === 150 && line.length > 150) {
        extractedProjectText += '...';
      }
      isProjectLine = true; // Mark as project-related line
      console.log(`  Summarized project-related line: "${extractedProjectText}"`);
    }

    if (isProjectLine && extractedProjectText.length > 0) {
      // Heuristic for new project entry: starts with bullet, dash, or looks like a job title/company line
      const isNewProjectEntry = line.startsWith('•') || line.startsWith('-') || line.match(/^[A-Z][a-zA-Z0-9\s,&\-]*\s*(?:at|for)\s*[A-Z][a-zA-Z0-9\s,&\-]*$/);
      
      if (isNewProjectEntry) {
        if (currentProjectDescription.length > 0) {
          projects.push(currentProjectDescription);
          console.log(`  Pushed completed project: "${currentProjectDescription}"`);
        }
        currentProjectDescription = extractedProjectText;
        console.log(`  Started new project description: "${currentProjectDescription}"`);
      } else {
        currentProjectDescription += (currentProjectDescription.length > 0 ? ' ' : '') + extractedProjectText;
        console.log(`  Appended to current project: "${currentProjectDescription}"`);
      }
    }
  }

  if (currentProjectDescription.length > 0) {
    projects.push(currentProjectDescription);
    console.log(`Pushed final aggregated project: "${currentProjectDescription}"`);
  }

  console.log('--- End Project Extraction Debugging ---');
  console.log('Final extracted projects array:', projects);

  return {
    summary: projects.slice(0, 5).map(p => p.substring(0, 200)).join('; '), // Limit each project summary length
    rawProjects: projects, // Return the raw projects array
    count: projects.length,
  };
}

/**
 * Extracts achievements from the resume, specifically from designated achievement sections.
 */
function extractAchievements(resumeText: string): string[] {
  console.log('🔍 [extractAchievements] Extracting achievements...');
  const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const achievements: string[] = [];
  const achievementSectionHeaders = ['achievements', 'achievement', 'awards', 'award', 'recognitions', 'recognition'];
  const metricPattern = /\b(\d+%|\$\d+[\d,]*|\d+x|\+?\d+%|increased|decreased|improved|reduced|saved|boosted|cut)\b/i;

  let inAchievementSection = false;

  for (const line of lines) {
    const lineLower = line.toLowerCase();

    // Detect start of achievements section
    if (achievementSectionHeaders.some(header => lineLower.includes(header))) {
      inAchievementSection = true;
      console.log(`Detected start of achievement section. inAchievementSection = ${inAchievementSection}`);
      continue;
    }
    // Detect end of achievement section (new section headers)
    if (inAchievementSection && (
      lineLower.includes('education') ||
      lineLower.includes('skills') ||
      lineLower.includes('certifications') ||
      lineLower.includes('languages') ||
      lineLower.includes('interests') ||
      lineLower.includes('experience') ||
      lineLower.includes('projects')
    )) {
      inAchievementSection = false;
      console.log(`Detected end of achievement section. inAchievementSection = ${inAchievementSection}`);
      continue;
    }

    // Only collect achievements when we're in an achievements section and the line contains a metric
    if (inAchievementSection && metricPattern.test(line)) {
      achievements.push(line.trim());
      console.log(`  Found achievement: "${line.trim()}"`);
    }
  }
  console.log('🔍 [extractAchievements] Final extracted achievements array:', achievements);
  return achievements.slice(0, 3); // Limit to top 3 achievements
}

function extractIndustryExperience(resumeText: string): string[] {
  const resumeLower = resumeText.toLowerCase();
  
  // More specific industry detection with context awareness
  const industries: { [key: string]: { keywords: string[], contextRequired?: string[] } } = {
    'Fintech': { 
      keywords: ['fintech', 'financial technology', 'banking software', 'payment processing', 'trading platform', 'investment management', 'fintech company', 'financial services'],
      contextRequired: ['company', 'industry', 'sector', 'worked at', 'experience in']
    },
    'Healthcare': { 
      keywords: ['healthcare', 'medical software', 'pharmaceutical', 'biotech', 'clinical', 'healthcare technology', 'medical device', 'healthcare industry'],
      contextRequired: ['company', 'industry', 'sector', 'worked at', 'experience in']
    },
    'E-commerce': { 
      keywords: ['e-commerce', 'ecommerce', 'online retail', 'shopping platform', 'marketplace', 'e-commerce platform', 'online marketplace'],
      contextRequired: ['company', 'industry', 'sector', 'worked at', 'experience in']
    },
    'Education': { 
      keywords: ['edtech', 'educational technology', 'learning platform', 'education technology', 'educational software', 'online learning'],
      contextRequired: ['company', 'industry', 'sector', 'worked at', 'experience in']
    },
    'Enterprise': { 
      keywords: ['enterprise software', 'b2b', 'saas', 'enterprise solutions', 'corporate software', 'business software'],
      contextRequired: ['company', 'industry', 'sector', 'worked at', 'experience in']
    }
  };
  
  const foundIndustries: string[] = [];
  
  Object.entries(industries).forEach(([industry, config]) => {
    const { keywords, contextRequired } = config;
    
    // Check if any keywords are found
    const matchingKeywords = keywords.filter(keyword => 
      resumeLower.includes(keyword)
    );
    
    if (matchingKeywords.length > 0) {
      // If context is required, check if it's mentioned in a professional context
      if (contextRequired) {
        const hasContext = contextRequired.some(context => 
          resumeLower.includes(context)
        );
        
        if (hasContext) {
          foundIndustries.push(industry);
          console.log(`🔍 [extractIndustryExperience] Found ${industry} with context:`, matchingKeywords);
        } else {
          console.log(`🔍 [extractIndustryExperience] Found ${industry} keywords but no professional context:`, matchingKeywords);
        }
      } else {
        foundIndustries.push(industry);
        console.log(`🔍 [extractIndustryExperience] Found ${industry}:`, matchingKeywords);
      }
    }
  });
  
  // If no specific industries found, try to infer from company names or job titles
  if (foundIndustries.length === 0) {
    const companyInference = inferIndustryFromCompanyNames(resumeText);
    if (companyInference) {
      foundIndustries.push(companyInference);
      console.log(`🔍 [extractIndustryExperience] Inferred industry from company names: ${companyInference}`);
    }
  }
  
  // If still no industries found, default to Technology for software engineers
  if (foundIndustries.length === 0) {
    const techKeywords = ['software engineer', 'developer', 'programmer', 'software development', 'coding', 'programming'];
    const hasTechKeywords = techKeywords.some(keyword => resumeLower.includes(keyword));
    
    if (hasTechKeywords) {
      foundIndustries.push('Technology');
      console.log(`🔍 [extractIndustryExperience] Defaulting to Technology based on role keywords`);
    }
  }
  
  console.log('🔍 [extractIndustryExperience] Final found industries:', foundIndustries);
  return foundIndustries;
}

function inferIndustryFromCompanyNames(resumeText: string): string | null {
  const resumeLower = resumeText.toLowerCase();
  
  // Common company name patterns that indicate industry
  const companyPatterns = {
    'Fintech': ['bank', 'financial', 'payment', 'trading', 'investment', 'fintech'],
    'Healthcare': ['health', 'medical', 'pharma', 'biotech', 'clinical'],
    'E-commerce': ['retail', 'shopping', 'marketplace', 'ecommerce'],
    'Education': ['education', 'learning', 'university', 'school'],
    'Media/Entertainment': ['media', 'entertainment', 'gaming', 'streaming'],
    'Transportation': ['transport', 'logistics', 'delivery', 'mobility']
  };
  
  for (const [industry, patterns] of Object.entries(companyPatterns)) {
    const hasPattern = patterns.some(pattern => 
      resumeLower.includes(pattern) && 
      (resumeLower.includes('company') || resumeLower.includes('inc') || resumeLower.includes('corp'))
    );
    
    if (hasPattern) {
      return industry;
    }
  }
  
  return null;
}

function extractLeadershipExperience(resumeText: string): LeadershipEvidence {
  console.log('🔍 [extractLeadershipExperience] Extracting leadership experience...');
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
  console.log('🔍 [extractCommunicationEvidence] Extracting communication evidence...');
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
  console.log('🔍 [extractResultsAndImpact] Extracting results and impact...');
  const results: string[] = [];
  const impactKeywords = ['increased', 'decreased', 'improved', 'reduced', 'saved', 'achieved', 'delivered'];

  impactKeywords.forEach(keyword => {
    const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'gi');
    const matches = resumeText.match(regex) || [];
    results.push(...matches.slice(0, 3)); // Keep first 3 results
  });

  return results;
}

/**
 * Comprehensive skill extraction that recognizes ALL skills mentioned in the resume
 * including technical skills, programming languages, frameworks, tools, domain knowledge, etc.
 */
function extractAllSkillsFromResume(resumeText: string): string[] {
  console.log('🔍 [extractAllSkillsFromResume] Starting comprehensive skill extraction...');

  const resumeLower = resumeText.toLowerCase();
  const allSkills: Set<string> = new Set();

  // Programming Languages
  const programmingLanguages = [
    'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'dart'
  ];

  // Technologies & Frameworks
  const technologies = [
    'react', 'angular', 'vue', 'next.js', 'nuxt.js', 'express', 'django', 'flask', 'spring', 'hibernate', 'asp.net', 'laravel', 'symfony',
    'node.js', 'graphql', 'rest api', 'soap', 'microservices', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible'
  ];

  // Databases
  const databases = [
    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'oracle', 'sql server', 'sqlite', 'dynamodb'
  ];

  // Cloud Platforms
  const cloudPlatforms = [
    'aws', 'amazon web services', 'azure', 'google cloud', 'gcp', 'ibm cloud', 'heroku', 'netlify', 'vercel', 'digital ocean',
    'cloudformation', 'lambda', 'ec2', 's3', 'rds', 'kubernetes', 'eks', 'aks', 'gke'
  ];

  // Development Tools
  const devTools = [
    'git', 'github', 'gitlab', 'bitbucket', 'jenkins', 'travis ci', 'circle ci', 'github actions', 'docker', 'kubernetes', 'terraform',
    'ansible', 'puppet', 'chef', 'webpack', 'babel', 'eslint', 'prettier', 'jest', 'cypress', 'selenium'
  ];

  // Domain-Specific Skills
  const domainSkills = [
    'machine learning', 'artificial intelligence', 'data science', 'big data', 'etl', 'data warehousing', 'data modeling',
    'business intelligence', 'data visualization', 'predictive analytics', 'a/b testing', 'web analytics',
    'agile', 'scrum', 'kanban', 'lean', 'waterfall', 'devops', 'site reliability engineering', 'sre'
  ];

  // Business & Soft Skills
  const businessSkills = [
    'project management', 'product management', 'stakeholder management', 'requirement gathering', 'user research',
    'ux/ui design', 'wireframing', 'prototyping', 'user testing', 'usability testing', 'accessibility',
    'data analysis', 'financial modeling', 'market research', 'competitive analysis', 'seo', 'sem', 'digital marketing'
  ];

  // Operating Systems & Infrastructure
  const infrastructure = [
    'linux', 'ubuntu', 'centos', 'redhat', 'windows', 'macos', 'ios', 'android',
    'nginx', 'apache', 'haproxy', 'load balancing', 'high availability', 'scalability', 'performance optimization'
  ];

  const allSkillCategories = [
    ...programmingLanguages,
    ...technologies,
    ...databases,
    ...cloudPlatforms,
    ...devTools,
    ...domainSkills,
    ...businessSkills,
    ...infrastructure
  ];

  // Extract skills from predefined lists
  allSkillCategories.forEach(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    if (regex.test(resumeText)) {
      allSkills.add(skill);
    }
  });

  // Extract additional technical skills using patterns
  // 1. Skills mentioned in lists (comma-separated or bullet points)
  const listPattern = /[,;•\-\s]*(?:skills|technologies|bproficiencies|bexpertise):\s*([^.!?]+?)\.?/gi;
  let match;
  while ((match = listPattern.exec(resumeText)) !== null) {
    const skillsText = match[1];
    // Split by various delimiters and extract individual skills
    const skillsItems = skillsText.split(/[,;•\-\|\s]+/).map(s => s.trim().toLowerCase());
    skillsItems.forEach(skill => {
      if (skill.length > 1 && !isCommonWord(skill)) {
        // Clean up skill name
        let cleanSkill = skill.replace(/\([^)]*\)/g, '').trim(); // Remove parenthetical content
        if (cleanSkill.length > 1) {
          allSkills.add(cleanSkill);
        }
      }
    });
  }

  // 2. Skills that appear as standalone technical terms
  // Look for capitalized technical terms or acronyms
  const techPattern = /\b([A-Z][a-zA-Z]{2,4}\+[A-Z][a-zA-Z]{1,3}|\b[A-Z]{2,5}\b|[A-Z][a-zA-Z]+(?:\s*[A-Z][a-zA-Z]+)+\b)|\b((?:angular|react|vue|express|django|flask|spring)[a-z]*)\b/gi;
  while ((match = techPattern.exec(resumeText)) !== null) {
    const skill = match[0].toLowerCase();
    if (skill.length > 1 && !isCommonWord(skill)) {
      allSkills.add(skill);
    }
  }

  // 3. Extract skills from skills section specifically
  const skillsSectionPattern = /(?:^|\n)(?:skills|technologies|technical skills|bproficiencies)(?:\:|\s*\n)(.*?)(?:\n\s*\n|\n[A-Z][a-z]|$)/gi;
  let sectionText = resumeText;
  while ((match = skillsSectionPattern.exec(sectionText)) !== null) {
    const skillsSection = match[1];
    const sectionLines = skillsSection.split(/\n|[,;|•]/);
    sectionLines.forEach(line => {
      const skills = line.split(/\s*:\s*|\s*-\s*|\s*\|\s*/);
      skills.forEach(skill => {
        const cleanSkill = skill.trim().toLowerCase();
        if (cleanSkill.length > 1 && !isCommonWord(cleanSkill) && !/\d/.test(cleanSkill)) {
          allSkills.add(cleanSkill);
        }
      });
    });
    // Update the remaining text to avoid infinite loop with global flag
    sectionText = sectionText.substring(match.index + match[0].length);
  }

  // Filter out common words and very short terms
  const filteredSkills = Array.from(allSkills).filter(skill =>
    skill.length > 1 &&
    !isCommonWord(skill) &&
    !/\d{4}/.test(skill) && // Remove years
    !skill.includes('university') &&
    !skill.includes('institute') &&
    !skill.includes('college') &&
    !skill.includes('school') &&
    !skill.includes('company') &&
    !skill.includes('corporation')
  );

  // Sort and limit to top relevant skills
  const sortedSkills = filteredSkills
    .sort((a, b) => a.length - b.length) // Shorter names first
    .slice(0, 50); // Limit to 50 skills

  console.log(`🔍 [extractAllSkillsFromResume] Extracted ${sortedSkills.length} skills:`, sortedSkills.slice(0, 10), '...');

  return sortedSkills;
}

function isCommonWord(word: string): boolean {
  const commonWords = [
    'and', 'or', 'but', 'nor', 'for', 'yet', 'so', 'after', 'although', 'as', 'as if', 'as long as', 'at', 'as soon as', 'before',
    'because', 'by the time', 'even if', 'even though', 'if', 'if only', 'in case', 'in order that', 'lest', 'none', 'once',
    'only', 'only if', 'otherwise', 'provided that', 'rather than', 'since', 'so that', 'supposing', 'than', 'that', 'though',
    'till', 'unless', 'until', 'when', 'whenever', 'where', 'whereas', 'wherever', 'whether', 'which', 'whichever', 'while',
    'who', 'whoever', 'whose', 'why', 'with', 'within', 'without', 'work', 'worked', 'working', 'project', 'projects',
    'development', 'developed', 'developing', 'team', 'teams', 'client', 'clients', 'customer', 'customers', 'business',
    'user', 'users', 'design', 'designed', 'designing', 'analysis', 'analyzed', 'analyzing', 'test', 'testing', 'tests',
    'maintenance', 'implementation', 'building', 'built', 'build', 'create', 'created', 'creating', 'manage', 'managed',
    'managing', 'lead', 'led', 'leading', 'system', 'systems', 'web', 'mobile', 'desktop', 'application', 'applications',
    'functionality', 'performance', 'scaling', 'optimization', 'optimize', 'improved', 'improving', 'enhance', 'enhanced',
    'enhancing', 'tool', 'tools', 'framework', 'frameworks', 'library', 'libraries', 'platform', 'platforms', 'server',
    'servers', 'database', 'databases', 'cloud', 'infrastructure', 'code', 'coding', 'program', 'programming', 'software',
    'hardware', 'network', 'networks', 'security', 'monitoring', 'automation', 'integrate', 'integration', 'api',
    'apis', 'architecture', 'architectural', 'solution', 'solutions', 'support', 'supporting'
  ];

  return commonWords.includes(word.toLowerCase());
}

function generateHRProfile(skills: FoundSkill[], experienceLevel: string, leadershipExperience: LeadershipEvidence) {
  console.log('🔍 [generateHRProfile] Generating HR profile...');
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
  console.log('🔍 [determinePrimaryStrengths] Determining primary strengths...');
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
  console.log('🔍 [determineHRQuestionFocus] Determining HR question focus...');
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
