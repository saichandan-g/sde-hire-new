import type { CommunityPost } from "@/lib/store"

export const mockCommunityPosts: CommunityPost[] = [
  {
    id: "post-1",
    slug: "google-sde-2024",
    title: "Google SDE Interview Experience - 4 Rounds",
    company: "Google",
    role: "Software Engineer",
    location: "Mountain View, CA",
    ctc: "₹80-100 LPA",
    rounds: 4,
    tags: ["Arrays", "Graphs", "System Design", "Behavioral"],
    content: `# My Google Interview Experience

## Overview
I recently completed the Google SDE interview process and got an offer! Here's my detailed experience.

## Round 1: Online Assessment (90 mins)
- 2 coding problems (Medium difficulty)
- Problem 1: Two Sum variant with constraints
- Problem 2: LRU Cache implementation
- Both problems required optimal solutions

**Tips:**
- Practice on LeetCode before the assessment
- Time management is crucial
- Write clean, readable code

## Round 2: Phone Screen (45 mins)
- 1 coding problem (Medium)
- Problem: Merge K Sorted Lists
- Interviewer was very helpful and gave hints

**Tips:**
- Think out loud
- Ask clarifying questions
- Discuss trade-offs

## Round 3: On-site Round 1 (60 mins)
- Problem: Word Ladder
- Focused on BFS approach
- Discussed optimization techniques

## Round 4: On-site Round 2 (60 mins)
- System Design: Design a URL Shortener
- Discussed scalability, database design, caching

## Round 5: Behavioral Round
- Questions about past projects
- Why Google?
- Conflict resolution

## Key Takeaways
1. Practice consistently on LeetCode
2. Understand data structures deeply
3. Be able to explain your thought process
4. Ask questions during interviews
5. Practice system design concepts

## Resources Used
- LeetCode Premium
- System Design Primer
- Cracking the Coding Interview book

Good luck to everyone preparing!`,
    author: {
      id: "user-2",
      name: "Priya Sharma",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    },
    likes: 245,
    bookmarks: 89,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-2",
    slug: "amazon-sde-internship",
    title: "Amazon SDE Internship Interview - 3 Rounds",
    company: "Amazon",
    role: "SDE Intern",
    location: "Bangalore, India",
    ctc: "₹25 LPA (Intern)",
    rounds: 3,
    tags: ["Trees", "Dynamic Programming", "Behavioral"],
    content: `# Amazon SDE Internship Interview

## Experience Summary
Got selected for Amazon SDE internship after 3 rounds of interviews.

## Round 1: Online Assessment
- 2 coding problems in 90 minutes
- Problem 1: Binary Tree Level Order Traversal
- Problem 2: Longest Substring Without Repeating Characters

## Round 2: Technical Interview
- Problem: Merge Two Sorted Lists
- Interviewer asked for multiple approaches
- Discussed time and space complexity

## Round 3: Behavioral Round
- Tell me about yourself
- Why Amazon?
- Conflict resolution scenario

## Preparation Tips
- Focus on fundamentals
- Practice on LeetCode
- Understand Amazon's leadership principles

## Result
Got the internship offer! Very excited to join Amazon.`,
    author: {
      id: "user-3",
      name: "Rahul Kumar",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
    },
    likes: 156,
    bookmarks: 52,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-3",
    slug: "microsoft-sde-2024",
    title: "Microsoft SDE Interview - 5 Rounds Experience",
    company: "Microsoft",
    role: "Software Engineer",
    location: "Hyderabad, India",
    ctc: "₹70-85 LPA",
    rounds: 5,
    tags: ["Strings", "Graphs", "System Design"],
    content: `# Microsoft SDE Interview Experience

## Round Breakdown

### Round 1: Online Assessment (90 mins)
- 2 coding problems
- Problem 1: Rotate Array
- Problem 2: Implement Trie

### Round 2: Phone Screen
- Problem: Longest Palindromic Substring
- Discussed multiple approaches

### Round 3-4: On-site Technical Rounds
- Round 3: Graph problems
- Round 4: Dynamic Programming

### Round 5: Behavioral
- Microsoft values and culture fit

## Key Learnings
- Practice is key
- Understand fundamentals deeply
- Be confident in your approach`,
    author: {
      id: "user-4",
      name: "Ananya Patel",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
    },
    likes: 198,
    bookmarks: 71,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-4",
    slug: "flipkart-sde-2024",
    title: "Flipkart SDE Interview - 4 Rounds",
    company: "Flipkart",
    role: "Software Engineer",
    location: "Bangalore, India",
    ctc: "₹60-75 LPA",
    rounds: 4,
    tags: ["Arrays", "Linked Lists", "Behavioral"],
    content: `# Flipkart SDE Interview Experience

## Overview
Completed Flipkart interview process successfully.

## Rounds
1. Online Assessment: 2 problems
2. Phone Screen: 1 problem
3. On-site Round 1: Data Structures
4. On-site Round 2: Behavioral

## Tips
- Flipkart focuses on practical problem-solving
- Be ready to discuss trade-offs
- System design is important`,
    author: {
      id: "user-5",
      name: "Vikram Singh",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
    },
    likes: 134,
    bookmarks: 45,
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-5",
    slug: "goldman-sachs-quant",
    title: "Goldman Sachs Quant Developer Interview",
    company: "Goldman Sachs",
    role: "Quant Developer",
    location: "New York, USA",
    ctc: "$150K-180K",
    rounds: 4,
    tags: ["Algorithms", "Math", "System Design"],
    content: `# Goldman Sachs Quant Developer Interview

## Experience
Interviewed for Quant Developer role at Goldman Sachs.

## Rounds
1. Online Assessment: Algorithmic problems
2. Phone Screen: Problem-solving
3. On-site Round 1: Technical depth
4. On-site Round 2: Behavioral

## Key Focus Areas
- Strong algorithmic skills
- Mathematical thinking
- System design knowledge`,
    author: {
      id: "user-6",
      name: "Arjun Desai",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
    },
    likes: 167,
    bookmarks: 58,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
]
