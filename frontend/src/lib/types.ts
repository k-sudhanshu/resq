// Mirrors the backend response models in backend/app/schemas/api.py.
// Enum values and ids stay English; only display strings are localized.

export type RiskLevel = 'CRITICAL' | 'URGENT' | 'NON_URGENT';
export type GuidanceSource = 'ai' | 'fallback' | 'rules';
export type PatientContext = 'baby' | 'child' | 'adult' | 'elderly' | 'unknown';

export interface Category {
  key: string;
  label: string;
  /** The other language's label, for the dual-label landing cards only. */
  label_alt: string;
  icon: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface CategoryDetail {
  key: string;
  label: string;
  questions: Question[];
}

export interface Answer {
  question_id: string;
  option_id: string;
}

export interface ActionStep {
  step: number;
  title: string;
  instruction: string;
}

export interface AnalysisResult {
  id: string;
  /** The language this guidance was generated in; results are not translated. */
  language: 'en' | 'hi';
  risk_level: RiskLevel;
  source: GuidanceSource;
  summary: string;
  emergency: { call_112: boolean; call_108: boolean };
  immediate_actions: ActionStep[];
  do_not: string[];
  monitor: string[];
  medical_follow_up: { required: boolean; reason: string | null };
  video: { video_id: string | null };
  sources: { source_id: string; label: string; url: string }[];
  /** Client-side only: set from the X-RESQ-Degraded response header. */
  degradedReason?: string | null;
}

export interface AnalysisRequestBody {
  language: string;
  category_key: string;
  patient_context: PatientContext;
  answers: Answer[] | null;
  description: string | null;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'SESSION_INVALID'
  | 'RATE_LIMITED'
  | 'IMAGE_REJECTED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'NETWORK';
