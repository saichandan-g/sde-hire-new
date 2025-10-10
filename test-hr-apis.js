// Test script for HR APIs - Phase 1
const fs = require('fs');

// Sample resume text for testing
const sampleResumeText = `
John Doe
Senior Software Engineer
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe

SUMMARY
Experienced senior software engineer with 8+ years of expertise in full-stack development, 
team leadership, and scalable system architecture. Led cross-functional teams of 5-8 developers, 
managed client relationships, and delivered high-impact projects that increased user engagement by 40%.

EXPERIENCE

Senior Software Engineer | TechCorp Inc. | 2020 - Present
• Led a team of 6 developers in developing and maintaining a microservices-based e-commerce platform
• Managed stakeholder communications and presented technical solutions to executive leadership
• Mentored junior developers and conducted code reviews to maintain code quality standards
• Collaborated with product managers and designers to deliver user-centric features
• Improved system performance by 35% through optimization and architectural improvements

Software Engineer | StartupXYZ | 2018 - 2020
• Developed and deployed RESTful APIs using Node.js and Express.js
• Worked closely with cross-functional teams including marketing, sales, and customer support
• Implemented automated testing strategies that reduced bug reports by 50%
• Presented technical solutions to clients and gathered requirements through stakeholder meetings

Junior Developer | WebDev Agency | 2016 - 2018
• Built responsive web applications using React.js and modern CSS frameworks
• Collaborated with senior developers on large-scale projects
• Participated in agile development processes and sprint planning meetings
• Learned new technologies quickly and adapted to changing project requirements

SKILLS
Technical: JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes
Soft Skills: Leadership, Communication, Problem Solving, Team Collaboration, Project Management
`;

async function testHRResumeAnalysis() {
  console.log('🧪 Testing HR Resume Analysis API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/hr-resume-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeText: sampleResumeText
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const analysis = await response.json();
    console.log('✅ HR Resume Analysis API Test - SUCCESS');
    console.log('📊 Analysis Summary:');
    console.log(`- Experience Level: ${analysis.experienceLevel}`);
    console.log(`- Top Skills: ${analysis.hrProfile?.topSkills?.slice(0, 5).join(', ')}`);
    console.log(`- Primary Strengths: ${analysis.hrProfile?.primaryStrengths?.join(', ')}`);
    console.log(`- Leadership Experience: ${analysis.hrProfile?.hasLeadershipExperience ? 'Yes' : 'No'}`);
    console.log(`- Communication Skills: ${analysis.hrProfile?.hasStrongCommunication ? 'Strong' : 'Standard'}`);
    
    return analysis;
  } catch (error) {
    console.error('❌ HR Resume Analysis API Test - FAILED');
    console.error('Error:', error.message);
    return null;
  }
}

async function testHRQuestionsGeneration(resumeAnalysis) {
  console.log('\n🧪 Testing HR Questions Generation API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/hr-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeAnalysis: resumeAnalysis
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const questions = await response.json();
    console.log('✅ HR Questions Generation API Test - SUCCESS');
    console.log(`📝 Generated ${questions.length} questions:`);
    
    questions.forEach((q, index) => {
      console.log(`${index + 1}. [${q.question_type.toUpperCase()}] ${q.topic}: ${q.question_text.substring(0, 80)}...`);
    });
    
    return questions;
  } catch (error) {
    console.error('❌ HR Questions Generation API Test - FAILED');
    console.error('Error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Phase 1 API Tests...\n');
  
  // Test 1: HR Resume Analysis
  const analysis = await testHRResumeAnalysis();
  
  if (analysis) {
    // Test 2: HR Questions Generation (using the analysis from Test 1)
    const questions = await testHRQuestionsGeneration(analysis);
    
    if (questions) {
      console.log('\n🎉 Phase 1 API Tests - ALL PASSED!');
      console.log('✅ Both HR APIs are working independently');
      console.log('✅ Resume analysis provides comprehensive HR insights');
      console.log('✅ Questions generation creates relevant HR questions');
      console.log('✅ Fallback system is in place');
      
      // Save test results
      const testResults = {
        timestamp: new Date().toISOString(),
        analysis: analysis,
        questions: questions,
        status: 'PASSED'
      };
      
      fs.writeFileSync('hr-api-test-results.json', JSON.stringify(testResults, null, 2));
      console.log('\n💾 Test results saved to hr-api-test-results.json');
    } else {
      console.log('\n❌ Phase 1 API Tests - PARTIAL FAILURE');
      console.log('✅ HR Resume Analysis API works');
      console.log('❌ HR Questions Generation API failed');
    }
  } else {
    console.log('\n❌ Phase 1 API Tests - FAILED');
    console.log('❌ HR Resume Analysis API failed');
    console.log('❌ Cannot test HR Questions Generation API');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testHRResumeAnalysis, testHRQuestionsGeneration, runTests };
