
export enum TeachingMode {
  ARABIC = 'ARABIC',
  ENGLISH = 'ENGLISH'
}

export type SkillType = 'Reading' | 'Writing' | 'Listening' | 'Speaking';

export interface Lesson {
  id: number;
  title: string;
  vocabulary: string[];
  grammar?: string;
}

export interface Unit {
  id: number;
  title: string;
  language: string;
  lifeSkills: string[];
  values: string[];
  lessons: Lesson[];
}

export interface TeachingStep {
  type: 'warm-up' | 'vocabulary' | 'pronunciation' | 'phonics' | 'song' | 'activity' | 'revision' | 'exercise';
  content: string;
  instruction: string;
  audioText: string;
  isQuestion?: boolean;
  correctAnswer?: string; // Only for exercise type
}

export interface ExamQuestion {
  skill: SkillType;
  question: string;
  instruction: string;
  correctAnswer?: string;
}

export interface LessonSummary {
  vocabularyLearned: string[];
  homeActivity: string;
  encouragement: string;
}

export interface FeedbackResult {
  isCorrect: boolean;
  feedbackText: string;
  audioFeedback: string;
}
