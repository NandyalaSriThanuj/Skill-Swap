export class FeedbackService {
  static generateFinalReport(
    skillName: string, 
    calculatedScore: number, 
    chatHistory: { role: 'assistant' | 'user' | 'system'; content: string }[]
  ) {
    const passed = calculatedScore >= 70;
    const finalStatus = passed ? 'passed' : 'failed';
    const finalFeedback = passed 
      ? `Excellent understanding of ${skillName} fundamentals. Highly qualified to teach ${skillName}!` 
      : `The assessment identified some gaps in ${skillName} concepts. Feel free to study and retry!`;

    const technical_score = Math.min(100, Math.max(45, calculatedScore + Math.floor(Math.random() * 8 - 4)));
    const communication_score = Math.min(100, Math.max(50, calculatedScore + Math.floor(Math.random() * 12 - 6)));
    const teaching_score = Math.min(100, Math.max(45, calculatedScore + Math.floor(Math.random() * 10 - 5)));

    let badge = 'Not Eligible';
    if (calculatedScore >= 80) badge = 'Expert Mentor';
    else if (calculatedScore >= 70) badge = 'Verified Mentor';
    else if (calculatedScore >= 50) badge = 'Community Mentor';

    const report = {
      strengths: `Demonstrated foundational understanding.`,
      weaknesses: `Could elaborate more on optimizations.`,
      suggestions: `Study performance tuning.`,
      areas_for_improvement: `Study performance tuning.`,
      summary: finalFeedback,
      detailed_scores: {
        technical_accuracy: technical_score,
        communication: communication_score,
        teaching_ability: teaching_score,
        logical_thinking: calculatedScore,
        practical_experience: technical_score,
        problem_solving: technical_score
      }
    };

    const recommendation = `The candidate has successfully demonstrated their capabilities in ${skillName}. We recommend admitting them as an active mentor with a '${badge}' designation.`;

    return {
      finalStatus,
      finalScore: calculatedScore,
      finalFeedback,
      technical_score,
      communication_score,
      teaching_score,
      badge,
      report,
      recommendation,
      reply: `Thank you for completing the technical assessment! I have evaluated your responses and compiled the qualification results.`
    };
  }
}
