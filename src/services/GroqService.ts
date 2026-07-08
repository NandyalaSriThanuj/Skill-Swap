import { supabase } from '../lib/supabaseClient';

export interface GroqEvaluationResult {
  cleanedReply: string;
  finalStatus?: 'passed' | 'failed' | 'in_progress' | 'pending';
  finalScore?: number;
  finalFeedback?: string;
  updatedHistory: { role: 'assistant' | 'user' | 'system'; content: string }[];
  technical_score?: number;
  communication_score?: number;
  teaching_score?: number;
  badge?: string;
  report?: any;
  recommendation?: string;
}

export class GroqService {
  private static isTechnicalSkill(skillName: string): boolean {
    const lowerSkill = skillName.toLowerCase();
    if (lowerSkill.includes('react') || lowerSkill.includes('python') || lowerSkill.includes('sql') || lowerSkill.includes('node') || lowerSkill.includes('javascript') || lowerSkill.includes('aws') || lowerSkill.includes('typescript') || lowerSkill.includes('programming')) {
      return true;
    }
    return false;
  }

  static async evaluateAnswer(
    skillName: string, 
    currentHistory: { role: 'assistant' | 'user' | 'system'; content: string }[],
    newAnswer: string,
    selectedLanguage: string,
    totalQuestions: number,
    forceEnd: boolean = false
  ): Promise<GroqEvaluationResult> {
    
    // First attempt: Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('interview-agent', {
        body: { 
          skillName, 
          chatHistory: currentHistory, 
          newAnswer, 
          selectedLanguage, 
          totalQuestions, 
          forceEnd 
        }
      });

      if (!error && data) {
        // Run parser check on the Edge Function response if it returned report text
        const parsedReport = this.parseMarkdownReportIfPresent(data.cleanedReply, skillName);
        if (parsedReport) {
          return {
            ...parsedReport,
            updatedHistory: data.updatedHistory.map((h: any, i: number) => 
              (i === data.updatedHistory.length - 1) 
                ? { ...h, content: "Interview Complete. Evaluating results...", evaluation: parsedReport.report } 
                : h
            ) as any
          };
        }

        return {
          cleanedReply: data.cleanedReply,
          finalStatus: data.finalStatus,
          finalScore: data.finalScore,
          finalFeedback: data.finalFeedback,
          updatedHistory: data.updatedHistory,
          technical_score: data.technical_score,
          communication_score: data.communication_score,
          teaching_score: data.teaching_score,
          badge: data.badge,
          report: data.report,
          recommendation: data.recommendation
        };
      } else {
        console.warn('Edge function returned error, falling back to client-side logic:', error);
      }
    } catch (e) {
      console.warn('Edge function failed to execute, falling back to client-side logic:', e);
    }

    // Fallback: Client-side logic
    return this.handleDirectGroqCall(skillName, currentHistory, newAnswer, selectedLanguage, totalQuestions, forceEnd);
  }

  private static mapBadge(rawBadge: string, score: number): string {
    const cleanBadge = (rawBadge || '').toLowerCase();
    if (cleanBadge.includes('expert')) return 'Expert Mentor';
    if (cleanBadge.includes('verified')) return 'Verified Mentor';
    if (cleanBadge.includes('community')) return 'Community Mentor';
    if (cleanBadge.includes('not eligible') || cleanBadge.includes('failed')) return 'Not Eligible';
    
    // Fallback based on score
    if (score >= 80) return 'Expert Mentor';
    if (score >= 70) return 'Verified Mentor';
    if (score >= 50) return 'Community Mentor';
    return 'Not Eligible';
  }

  private static parseMarkdownReportIfPresent(reply: string, skillName: string): Partial<GroqEvaluationResult> | null {
    const lowerReply = reply.toLowerCase();
    const isReport = lowerReply.includes("final assessment report") || 
                     lowerReply.includes("overall score") || 
                     lowerReply.includes("mentor eligibility") ||
                     (lowerReply.includes("strengths:") && lowerReply.includes("weaknesses:")) ||
                     (lowerReply.includes("previous report stands") && lowerReply.includes("overall score"));

    if (!isReport) return null;

    // Parse Overall Score
    const scoreMatch = reply.match(/Overall Score[:\s\*]+(\d+)/i) || reply.match(/Score[:\s\*]+(\d+)/i);
    const finalScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 60;

    // Parse Mentor Eligibility / Badge
    const eligibilityMatch = reply.match(/Mentor Eligibility[:\s\*]+([^\*\n]+)/i) || reply.match(/Eligibility[:\s\*]+([^\*\n]+)/i);
    const isEligible = eligibilityMatch ? !eligibilityMatch[1].toLowerCase().includes("not eligible") : finalScore >= 70;
    const finalStatus = isEligible ? 'passed' : 'failed';

    const badgeMatch = reply.match(/Badge[:\s\*]+([^\*\n]+)/i);
    const parsedBadge = badgeMatch ? badgeMatch[1].trim() : '';
    const badge = this.mapBadge(parsedBadge, finalScore);

    // Parse sections: Strengths, Weaknesses, Suggestions, Recommendation
    const strengthsMatch = reply.match(/Strengths[:\s\*]+([\s\S]*?)(?=\*\*|$)/i);
    const weaknessesMatch = reply.match(/Weaknesses[:\s\*]+([\s\S]*?)(?=\*\*|$)/i);
    const suggestionsMatch = reply.match(/Suggestions[:\s\*]+([\s\S]*?)(?=\*\*|$)/i) || reply.match(/Areas for Improvement[:\s\*]+([\s\S]*?)(?=\*\*|$)/i);
    const recommendationMatch = reply.match(/Recommendation[:\s\*]+([\s\S]*?)(?=\*\*|$)/i);

    const strengths = strengthsMatch ? strengthsMatch[1].trim() : "Demonstrated understanding.";
    const weaknesses = weaknessesMatch ? weaknessesMatch[1].trim() : "Could provide more details.";
    const suggestions = suggestionsMatch ? suggestionsMatch[1].trim() : "Review advanced topics.";
    const recommendation = recommendationMatch ? recommendationMatch[1].trim() : "Study the suggested topics.";

    const finalFeedback = strengths + " " + weaknesses;
    const technical_score = Math.min(100, Math.max(40, finalScore + Math.floor(Math.random() * 8 - 4)));
    const communication_score = Math.min(100, Math.max(50, finalScore + Math.floor(Math.random() * 12 - 6)));
    const teaching_score = Math.min(100, Math.max(40, finalScore + Math.floor(Math.random() * 10 - 5)));

    const report = {
      summary: finalFeedback,
      strengths,
      weaknesses,
      suggestions,
      areas_for_improvement: suggestions,
      detailed_scores: {
        technical_accuracy: technical_score,
        communication: communication_score,
        teaching_ability: teaching_score,
        logical_thinking: finalScore,
        practical_experience: technical_score,
        problem_solving: technical_score
      }
    };

    return {
      cleanedReply: "Interview Complete. Evaluating results...",
      finalStatus,
      finalScore,
      finalFeedback,
      technical_score,
      communication_score,
      teaching_score,
      badge,
      report,
      recommendation
    };
  }

  private static async handleDirectGroqCall(
    skillName: string, 
    currentHistory: { role: 'assistant' | 'user' | 'system'; content: string }[],
    newAnswer: string,
    selectedLanguage: string,
    totalQuestions: number,
    forceEnd: boolean
  ): Promise<GroqEvaluationResult> {
    const apiKey = localStorage.getItem('skillswap-groq-api-key');
    if (!apiKey) {
      throw new Error("GROQ API key is required. Please configure it by clicking the settings button in the top right of the page.");
    }

    const hasStarted = currentHistory.some(m => m.role === 'assistant' && !m.is_pre_interview);
    const isPreInterviewConfirmation = !hasStarted;

    const actualUserMessages = currentHistory.filter(m => m.role === 'user' && !m.is_pre_interview);
    const userAnswersCount = actualUserMessages.length;
    const isComplete = userAnswersCount >= totalQuestions || forceEnd;
    const isTech = this.isTechnicalSkill(skillName);
    const currentLang = isTech ? 'English' : (selectedLanguage || 'English');
    const skillType = isTech ? 'Technical' : 'Non-Technical';

    const qIndex = userAnswersCount + 1;
    const currentDifficulty = isTech 
      ? (qIndex <= 5 ? 'Beginner' : qIndex <= 12 ? 'Intermediate' : 'Advanced')
      : (qIndex <= 4 ? 'Beginner' : qIndex <= 9 ? 'Intermediate' : 'Advanced');

    // Build the Compact Summary locally to avoid sending massive history
    const assistantMessages = currentHistory.filter(m => m.role === 'assistant' && !m.is_pre_interview);
    
    // Extract past topics and scores from history evaluations
    const pastTopics = assistantMessages.slice(0, -1).map((m: any, i) => `Q${i+1}: ${m.content.substring(0, 40)}...`).join(' | ');
    const pastScores = assistantMessages.map((m: any) => m.evaluation?.score).filter(s => typeof s === 'number');
    const avgScore = pastScores.length ? Math.round(pastScores.reduce((a, b) => a + b, 0) / pastScores.length) : 'N/A';
    
    // Extract weaknesses from evaluations
    const allWeaknesses = assistantMessages.map((m: any) => m.evaluation?.weakness).filter(Boolean);
    const compactWeaknesses = allWeaknesses.slice(-3).join('. '); // Keep only latest 3 to save tokens

    const lastQuestion = currentHistory.filter(m => m.role === 'assistant').pop()?.content || '';

    const baseSystemPrompt = `You are a technical interviewer for ${skillName} (${skillType}).
Language: ${currentLang}.
DO NOT repeat these past topics: ${pastTopics || 'None'}
Candidate Avg Score: ${avgScore}/10. Weaknesses: ${compactWeaknesses || 'None'}`;

    let stateInstruction = "";
    if (isPreInterviewConfirmation) {
      stateInstruction = `The user has confirmed they are ready to start. The interview has NOT started yet.
Action: Generate the first actual interview question (Question 1) for the skill ${skillName} in ${currentLang}.
Do NOT evaluate the user's confirmation message. Simply ask the first question.
Ensure the question strictly belongs to ${skillName} and is at the Beginner difficulty level.
You MUST output your response as a raw JSON object EXACTLY matching this structure:
{
  "next_question": "<the actual question you want to ask next in ${currentLang}>"
}`;
    } else if (!isComplete) {
      stateInstruction = `[STATE] Q: ${qIndex}/${totalQuestions}. Target Difficulty: ${currentDifficulty}.
Evaluate the candidate's LAST answer. Then ask the NEXT question in ${currentLang}.
You MUST output your response as a raw JSON object EXACTLY matching this structure:
{
  "evaluation": {
    "score": <number 1-10>,
    "weakness": "<1 short sentence or empty>",
    "strength": "<1 short sentence or empty>"
  },
  "next_question": "<the actual question you want to ask next in ${currentLang}>"
}`;
    } else {
      stateInstruction = `[STATE] Interview Complete. 
Evaluate the candidate's overall performance.
You MUST output your response as a raw JSON object EXACTLY matching this structure:
{
  "evaluation_complete": true,
  "technical_score": <number 0-100>,
  "communication_score": <number 0-100>,
  "teaching_score": <number 0-100>,
  "confidence_score": <number 0-100>,
  "speech_score": <number 0-100>,
  "overall_score": <number 0-100>,
  "badge": "Expert Mentor" | "Verified Mentor" | "Community Mentor" | "Not Eligible",
  "report": {
    "strengths": "<summary of candidate strengths in English>",
    "weaknesses": "<areas of concern in English>",
    "summary": "<AI evaluation summary in English>"
  },
  "recommendation": "<detailed recommendation in English>"
}`;
    }

    const payloadMessages = [
      { role: 'system', content: baseSystemPrompt },
      { role: 'assistant', content: lastQuestion || "Welcome." },
      ...(newAnswer.trim() ? [{ role: 'user' as const, content: newAnswer }] : []),
      { role: 'system' as const, content: stateInstruction }
    ];

    let reply = '';
    let attempt = 0;
    while (attempt < 2) {
      try {
        // Fallback to 8b model on second attempt to bypass 70b rate limits
        const modelToUse = attempt === 0 ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: payloadMessages,
            temperature: 0.7,
            max_tokens: 1024,
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Groq API Error: ${response.status} ${errBody}`);
        }

        const data = await response.json();
        reply = data.choices[0]?.message?.content || '';
        break; // success
      } catch (err: any) {
        console.warn(`Groq API attempt ${attempt + 1} failed:`, err);
        attempt++;
        if (attempt >= 2) throw err;
      }
    }

    let finalStatus: 'passed' | 'failed' | 'in_progress' | 'pending' = 'in_progress';
    let finalScore: number | undefined;
    let finalFeedback: string | undefined;
    let technical_score: number | undefined;
    let communication_score: number | undefined;
    let teaching_score: number | undefined;
    let badge: string | undefined;
    let report: any | undefined;
    let recommendation: string | undefined;

    let cleanedReply = reply;
    let newEvaluation = null;

    let parsedFromJson = false;
    try {
      // Find the JSON block in the reply
      const jsonStart = reply.indexOf('{');
      const jsonEnd = reply.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = reply.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.evaluation_complete) {
          finalScore = parsed.overall_score || 0;
          badge = this.mapBadge(parsed.badge, finalScore);
          finalStatus = badge === 'Not Eligible' ? 'failed' : 'passed';
          finalFeedback = parsed.report?.summary || parsed.recommendation;
          technical_score = parsed.technical_score;
          communication_score = parsed.communication_score;
          teaching_score = parsed.teaching_score;
          report = parsed.report || {};
          if (parsed.confidence_score !== undefined) {
            report.confidence_score = parsed.confidence_score;
          }
          recommendation = parsed.recommendation;
          cleanedReply = "Interview Complete. Evaluating results...";
          parsedFromJson = true;
        } else if (parsed.next_question) {
          cleanedReply = parsed.next_question;
          newEvaluation = parsed.evaluation;
          parsedFromJson = true;
        }
      }
    } catch (err) {
      console.error('Failed to parse JSON evaluation from Groq reply:', err);
    }

    if (!parsedFromJson) {
      const parsedReport = this.parseMarkdownReportIfPresent(reply, skillName);
      if (parsedReport) {
        finalStatus = parsedReport.finalStatus || 'failed';
        finalScore = parsedReport.finalScore;
        finalFeedback = parsedReport.finalFeedback;
        technical_score = parsedReport.technical_score;
        communication_score = parsedReport.communication_score;
        teaching_score = parsedReport.teaching_score;
        badge = parsedReport.badge;
        report = parsedReport.report;
        recommendation = parsedReport.recommendation;
        cleanedReply = parsedReport.cleanedReply || cleanedReply;
      }
    }

    const baseHistory = [
      ...currentHistory,
      ...(newAnswer.trim() ? [{ 
        role: 'user' as const, 
        content: newAnswer, 
        is_pre_interview: isPreInterviewConfirmation ? true : undefined 
      }] : [])
    ];

    if (!isComplete) {
      baseHistory.push({ 
        role: 'assistant', 
        content: cleanedReply,
        evaluation: newEvaluation 
      } as any);
    }

    return {
      cleanedReply,
      finalStatus: finalStatus === 'in_progress' ? undefined : finalStatus,
      finalScore,
      finalFeedback,
      updatedHistory: baseHistory,
      technical_score,
      communication_score,
      teaching_score,
      badge,
      report,
      recommendation
    };
  }
}
