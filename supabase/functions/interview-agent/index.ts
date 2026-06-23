import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      return new Response(JSON.stringify({ 
        error: "GROQ_API_KEY is not set in Supabase secrets. Please set it using 'supabase secrets set GROQ_API_KEY=your_key'" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Verify user authorization before accessing the AI services
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { skillName, chatHistory, newAnswer, selectedLanguage } = await req.json()

    const isTechnicalSkill = (nameStr: string): boolean => {
      const name = nameStr.toLowerCase().trim();
      const techKeywords = [
        'python', 'java', 'c++', 'javascript', 'typescript', 'react', 'angular', 'vue', 
        'node.js', 'node', 'express.js', 'express', 'sql', 'mongodb', 'postgresql', 'mysql', 
        'firebase', 'supabase', 'data structures', 'algorithms', 'operating systems', 'computer networks', 
        'dbms', 'machine learning', 'deep learning', 'artificial intelligence', 'ai', 'data science', 
        'nlp', 'computer vision', 'cloud computing', 'aws', 'azure', 'docker', 'kubernetes', 'git', 
        'github', 'cyber security', 'system design', 'rest apis', 'rest api', 'graphql', 
        'prompt engineering', 'generative ai', 'llms', 'llm', 'rag', 'langchain', 'agentic ai',
        'go', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'dart', 'r', 'matlab',
        'html', 'css', 'tailwind', 'bootstrap', 'next.js', 'nextjs', 'nuxt.js', 'nuxtjs',
        'flutter', 'react native', 'android', 'ios', 'redis', 'oracle', 'oop', 'software engineering',
        'reinforcement learning', 'large language models', 'ai agents', 'tensorflow', 'pytorch', 'scikit-learn',
        'google cloud', 'gcp', 'jenkins', 'ci/cd', 'linux', 'ethical hacking', 'network security', 'penetration testing',
        'cryptography', 'digital forensics', 'coding', 'programming'
      ];
      if (name === 'c') return true;
      return techKeywords.some(keyword => {
        if (name === keyword) return true;
        const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`);
        return regex.test(name);
      });
    };

    const checkLanguageValidity = (question: string, language: string, isTechnical: boolean): boolean => {
      if (isTechnical) {
        const hasHindi = /[\u0900-\u097F]/.test(question);
        const hasTelugu = /[\u0C00-\u0C7F]/.test(question);
        return !hasHindi && !hasTelugu;
      }
      if (language === 'Hindi') {
        return /[\u0900-\u097F]/.test(question);
      }
      if (language === 'Telugu') {
        return /[\u0C00-\u0C7F]/.test(question);
      }
      if (language === 'English') {
        const hasHindi = /[\u0900-\u097F]/.test(question);
        const hasTelugu = /[\u0C00-\u0C7F]/.test(question);
        return !hasHindi && !hasTelugu;
      }
      return true;
    };

    const isTech = isTechnicalSkill(skillName);
    const totalQ = isTech ? 20 : 15;
    const currentLang = isTech ? 'English' : (selectedLanguage || 'English');
    const skillType = isTech ? 'Technical' : 'Non-Technical';

    // Determine user message/answer count to steer the interview stage
    const userMessages = chatHistory.filter((m: any) => m.role === 'user');
    const userAnswersCount = userMessages.length; // number of user responses in history so far

    // Determine the current difficulty level based on index
    const getTargetDifficulty = (isTechnical: boolean, index: number): string => {
      if (isTechnical) {
        return index <= 5 ? 'Beginner' : index <= 12 ? 'Intermediate' : 'Advanced';
      } else {
        return index <= 4 ? 'Beginner' : index <= 9 ? 'Intermediate' : 'Advanced';
      }
    };

    const qIndex = userAnswersCount + 1;
    const currentDifficulty = getTargetDifficulty(isTech, qIndex);

    // Dynamic prompt mapping categories
    const categoriesPrompt = `
For the following core skills, follow their designated interview path:
- Python: Variables -> Functions -> OOP -> Modules -> Decorators -> Generators -> Async Programming -> Memory Management -> Exception Handling -> Multithreading -> Performance -> Best Practices.
- React: JSX -> Props -> State -> Hooks -> Context API -> Redux -> Lifecycle -> Performance -> Optimization -> Virtual DOM.
- SQL: SELECT -> JOIN -> GROUP BY -> HAVING -> Subqueries -> Indexes -> Normalization -> Transactions -> Stored Procedures.
- Machine Learning: Regression -> Classification -> Clustering -> Overfitting -> Cross Validation -> Feature Engineering -> Neural Networks -> Evaluation Metrics -> Deep Learning -> NLP.
For any other skill, dynamically identify its logical teaching progression across Beginner, Intermediate, and Advanced topics, and ask questions matching that progression.
`;

    // Dynamic System Prompt builder
    const baseSystemPrompt = `You are a senior technical interviewer.
Interview Skill:
${skillName}
Interview Language:
${currentLang}
Skill Type:
${skillType}

Instruction:
If Skill Type is Technical:
Always ask questions in English.
If Skill Type is Non-Technical:
Generate every interview question only in the selected language.
Do not mix languages.
Never switch languages during the interview.

Generate ONLY interview questions related to ${skillName}.
Never ask questions from any other technology or unrelated topic.
If the skill is Python, every question must be about Python.
If the skill is React, every question must be about React.
If the skill is SQL, every question must be about SQL.
If the skill is Machine Learning, every question must be about Machine Learning.
If the skill is Photography, every question must be about Photography.
Continue until the interview is complete.

General Instructions:
1. Conduct the interview by asking exactly ${totalQ} questions, one at a time.
2. The questions should test practical and theoretical knowledge of "${skillName}" across three levels. Gradually increase the difficulty based on the current question index:
   - For Technical skills (20 questions total):
     - Question 1 to 5: Beginner level
     - Question 6 to 12: Intermediate level
     - Question 13 to 20: Advanced level
   - For Non-Technical skills (15 questions total):
     - Question 1 to 4: Beginner level
     - Question 5 to 9: Intermediate level
     - Question 10 to 15: Advanced level
3. You must ask questions dynamically. Evaluate the previous answer:
   - If the previous answer was weak, incomplete, or incorrect, ask an easier clarifying or follow-up question at the current level.
   - If the previous answer was strong and correct, ask a more advanced or deep-dive question to challenge the candidate.
4. You must ask exactly one question at a time. Do NOT ask multiple questions in one turn.
5. Keep your speaking speed natural and professional. Speak and listen exclusively in ${currentLang}. Keep your output concise so it can be spoken aloud naturally.
6. Make your questions conversational and realistic, like a real interviewer:
   - Instead of asking generic definitions like "What is Python?", phrase it naturally: "Imagine you're explaining Python to a beginner joining your team. How would you describe it?"
   - If the answer is incomplete: "Can you elaborate on that?"
   - If the answer is excellent: "Interesting. Let's move to a more advanced scenario." or similar conversational transition, then ask the next question.
7. Regardless of the interview language, generate the final assessment report in English. This report must include the Overall Score, Strengths, Weaknesses, Suggestions, Mentor Eligibility details, and Badge. The report language must always remain English.

Topic Path Guidelines:
${categoriesPrompt}

Self-Validation Step:
Before outputting any question, check: Does this question belong to the selected skill "${skillName}"? If it involves other technologies or is unrelated, discard it and generate a new one. The AI should never ask unrelated questions.`;

    // Add state-specific instruction to guarantee compliance with the question limit
    let stateInstruction = "";
    if (userAnswersCount < totalQ) {
      stateInstruction = `The user has answered ${userAnswersCount} questions so far. This is question index ${qIndex} out of ${totalQ}. 
The current target difficulty level is: ${currentDifficulty}.
Action: Acknowledge the user's previous answer briefly in ${currentLang} (point out strengths or gently nudge on gaps if weak, but keep it very short), then ask the next question in ${currentLang}.
If this is the very start of the interview (userAnswersCount is 0), do not acknowledge any previous answer; welcome the user to the assessment and ask Question 1 in ${currentLang}.
Ensure the question strictly belongs to ${skillName} and relates to candidate difficulty level: ${currentDifficulty}. Check: Is the question about ${skillName}? If not, discard and generate another.`;
    } else {
      stateInstruction = `The user has answered all ${totalQ} questions. The interview is concluded.
Action: Do not ask any more questions. Perform a comprehensive evaluation of their responses.
You must evaluate the user across these eight dimensions:
- Technical Accuracy (correctness and accuracy of concepts)
- Communication (clarity and structure of explanations)
- Confidence (assertiveness and certainty in their voice/content)
- Fluency (smoothness of speaking, vocabulary, minimal pauses/stuttering)
- Teaching Ability (patience, explanation of concepts to a learner)
- Logical Thinking (structured thought process)
- Practical Experience (hands-on engineering/real-world context)
- Problem Solving (logical analytical thinking in complex situations)

Calculate these scores (0-100):
- Technical Score (averaging Technical Accuracy, Practical Experience, and Problem Solving)
- Communication Score (averaging Communication and Fluency)
- Teaching Score
- Confidence Score
- Speech Score (averaging Fluency and Confidence)
- Overall Score (weighted average: 50% Technical, 25% Communication, 25% Teaching)

Assign one of the following Mentor Badges based on the Overall Score:
- Overall Score >= 80: "Expert Mentor" 🏆
- Overall Score >= 70: "Verified Mentor" ✅
- Overall Score >= 50: "Community Mentor" ⭐
- Overall Score < 50: "Not Eligible" ❌

Output a detailed evaluation report.
You MUST write the report in English.
You MUST conclude your response with a JSON block at the very end of your reply. The JSON block must be formatted EXACTLY like this:
{
  "evaluation_complete": true,
  "technical_score": <number between 0 and 100>,
  "communication_score": <number between 0 and 100>,
  "teaching_score": <number between 0 and 100>,
  "confidence_score": <number between 0 and 100>,
  "speech_score": <number between 0 and 100>,
  "overall_score": <number between 0 and 100>,
  "badge": "Expert Mentor" | "Verified Mentor" | "Community Mentor" | "Not Eligible",
  "report": {
    "strengths": "<summary of candidate strengths in English>",
    "weaknesses": "<areas of concern or weaknesses in English>",
    "suggestions": "<specific suggestions/action plan to improve in English>",
    "summary": "<AI evaluation summary overview in English>",
    "detailed_scores": {
      "technical_accuracy": <number between 0 and 100>,
      "communication": <number between 0 and 100>,
      "confidence": <number between 0 and 100>,
      "fluency": <number between 0 and 100>,
      "teaching_ability": <number between 0 and 100>,
      "logical_thinking": <number between 0 and 100>,
      "practical_experience": <number between 0 and 100>,
      "problem_solving": <number between 0 and 100>
    }
  },
  "recommendation": "<detailed final recommendation text explaining why this badge was assigned in English>"
}
Ensure that this JSON block is the very last thing you write, so the application can parse it.`;
    }

    const payloadMessages = [
      { role: 'system', content: baseSystemPrompt },
      ...chatHistory.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newAnswer },
      { role: 'system', content: `[SYSTEM STATE DIRECTIVE]: ${stateInstruction}` }
    ];

    // Local programmatic check if the generated question belongs to the selected skill
    const checkQuestionValidity = (question: string, skill: string): boolean => {
      const text = question.toLowerCase();
      const skillLower = skill.toLowerCase().trim();
      
      const domains = [
        { name: 'python', keywords: ['python', 'django', 'flask', 'pandas', 'numpy', 'list comprehension', 'decorator', 'generator', 'asyncio', 'multithreading', 'gil'] },
        { name: 'react', keywords: ['react', 'jsx', 'props', 'state', 'hooks', 'useeffect', 'usestate', 'redux', 'context api', 'virtual dom', 'nextjs', 'tailwind'] },
        { name: 'sql', keywords: ['sql', 'select', 'join', 'group by', 'having', 'subqueries', 'index', 'normalization', 'transactions', 'stored procedure', 'database index', 'foreign key'] },
        { name: 'machine learning', keywords: ['machine learning', 'regression', 'classification', 'clustering', 'overfitting', 'cross validation', 'feature engineering', 'neural network', 'deep learning', 'nlp', 'random forest', 'gradient boosting'] },
        { name: 'java', keywords: ['java', 'jvm', 'spring boot', 'hashmap', 'treemap', 'garbage collection', 'checked exception'] },
        { name: 'photography', keywords: ['photography', 'camera', 'aperture', 'shutter speed', 'iso', 'lens', 'exposure', 'composition', 'lighting', 'focal length', 'depth of field'] }
      ];

      if (!text.trim()) return false;

      for (const domain of domains) {
        if (domain.name !== skillLower && !skillLower.includes(domain.name) && !domain.name.includes(skillLower)) {
          const hasConflict = domain.keywords.some(kw => {
            const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`);
            return regex.test(text);
          });
          
          if (hasConflict) {
            console.warn(`Question validation failed: Question contains keywords from unrelated domain "${domain.name}". Question: "${question}"`);
            return false;
          }
        }
      }
      return true;
    };

    // Initialize OpenAI compatible SDK for Groq
    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    // Call Groq Chat Completion with validation loop
    let completion;
    let reply = '';
    let attempt = 0;

    while (attempt < 3) {
      try {
        completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: payloadMessages,
          temperature: 0.7,
          max_tokens: 1024,
        });
      } catch (err: any) {
        console.warn("Primary Groq versatile model failed or timed out. Falling back to instant model. Error: ", err.message);
        // Fallback model call
        completion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: payloadMessages,
          temperature: 0.7,
          max_tokens: 1024,
        });
      }

      reply = completion.choices[0]?.message?.content || '';

      // Skip validation if the interview is completed (it outputs the JSON evaluation report)
      if (userAnswersCount >= totalQ) {
        break;
      }

      const isLangValid = checkLanguageValidity(reply, currentLang, isTech);
      if (checkQuestionValidity(reply, skillName) && isLangValid) {
        break;
      }

      console.warn(`Validation attempt ${attempt + 1} failed. Discarding invalid question: "${reply}"`);
      attempt++;

      let correctionContent = '';
      if (!isLangValid) {
        correctionContent = `[SYSTEM CORRECTION]: The generated response was NOT in the correct language. You must generate the response and the interview question ONLY in ${currentLang}. Do not mix languages or use English.`;
      } else {
        correctionContent = `[SYSTEM CORRECTION]: The generated question was rejected because it did not strictly target ${skillName}. Please generate a new, different question focusing ONLY on ${skillName}. Never mention or ask about other technologies or domains.`;
      }

      payloadMessages.push({
        role: 'system',
        content: correctionContent
      });
    }

    let finalStatus = 'in_progress'
    let finalScore: number | undefined
    let finalFeedback: string | undefined
    let technical_score: number | undefined
    let communication_score: number | undefined
    let teaching_score: number | undefined
    let badge: string | undefined
    let report: any | undefined
    let recommendation: string | undefined

    const jsonRegex = /\{[\s\S]*"evaluation_complete"\s*:\s*true[\s\S]*\}/
    const match = reply.match(jsonRegex)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (parsed.badge) {
          finalStatus = parsed.badge === 'Not Eligible' ? 'failed' : 'passed'
          finalScore = parsed.overall_score
          finalFeedback = parsed.report?.summary || parsed.recommendation
          technical_score = parsed.technical_score
          communication_score = parsed.communication_score
          teaching_score = parsed.teaching_score
          badge = parsed.badge
          report = parsed.report
          recommendation = parsed.recommendation
        }
      } catch (err) {
        console.error('Failed to parse final JSON evaluation from Groq reply:', err)
      }
    }

    let cleanedReply = reply.replace(jsonRegex, '').trim()
    if (!cleanedReply) {
      cleanedReply = reply
    }

    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: newAnswer },
      { role: 'assistant', content: cleanedReply }
    ]

    return new Response(JSON.stringify({
      cleanedReply,
      finalStatus,
      finalScore,
      finalFeedback,
      updatedHistory,
      technical_score,
      communication_score,
      teaching_score,
      badge,
      report,
      recommendation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
