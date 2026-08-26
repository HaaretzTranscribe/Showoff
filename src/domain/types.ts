/**
 * Typed domain models mirroring the Supabase/Postgres schema
 * (see supabase/migrations/0001_init_schema.sql and spec section 11).
 * These are the single source of truth for shapes shared across
 * Student App, Instructor Studio and Live Presentation.
 */

export type UserRole = "instructor" | "admin";

export interface AppUser {
  id: string;
  role: UserRole;
  authId: string;
  email: string | null;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  ownerUserId: string;
  createdAt: string;
}

export type CourseMemberRole = "owner" | "instructor" | "ta";

export interface CourseMember {
  courseId: string;
  userId: string;
  role: CourseMemberRole;
}

export interface StudentRosterEntry {
  id: string;
  courseId: string;
  studentKeyHash: string;
  displayAlias: string | null;
  metadata: Record<string, unknown>;
}

export type RosterPolicy = "required" | "optional" | "off";
export type AttendanceCodePolicy = "static" | "rotating";

export interface LessonConfig {
  identityFieldLabel: { he: string; en: string };
  rosterPolicy: RosterPolicy;
  attendanceCodePolicy: AttendanceCodePolicy;
  rotatingCodeTtlSeconds: number;
  lateJoinUntilMinutes: number | null;
  editUntilLock: boolean;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: { he: string; en: string };
  plannedAt: string | null;
  internalNotes: string | null;
  config: LessonConfig;
  createdAt: string;
}

/** Question types from spec section 6.2 (Question Builder). */
export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "number"
  | "scale"
  | "text"
  | "yes_no"
  | "datetime"
  | "hidden_meta";

export interface QuestionConfigBase {
  required: boolean;
}

export interface ChoiceQuestionConfig extends QuestionConfigBase {
  shuffle?: boolean;
  allowOther?: boolean;
  minSelections?: number; // multiple_choice only
  maxSelections?: number; // multiple_choice only
}

export interface NumberQuestionConfig extends QuestionConfigBase {
  min?: number;
  max?: number;
  integerOnly?: boolean;
  unitLabel?: { he: string; en: string };
}

export interface ScaleQuestionConfig extends QuestionConfigBase {
  min: number;
  max: number;
  step: number;
  minLabel?: { he: string; en: string };
  maxLabel?: { he: string; en: string };
}

export interface TextQuestionConfig extends QuestionConfigBase {
  long?: boolean;
  maxLength?: number;
}

export type QuestionConfig =
  | ChoiceQuestionConfig
  | NumberQuestionConfig
  | ScaleQuestionConfig
  | TextQuestionConfig
  | QuestionConfigBase;

export interface Question {
  id: string;
  lessonId: string;
  /** Immutable after creation. Scene bindings reference this, never the label. */
  stableKey: string;
  type: QuestionType;
  prompt: { he: string; en: string };
  config: QuestionConfig;
  orderIndex: number;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  value: string;
  label: { he: string; en: string };
  orderIndex: number;
}

export type ChartTypeId =
  | "bar"
  | "stacked_bar"
  | "stacked_bar_100"
  | "histogram"
  | "box_plot"
  | "dot_strip"
  | "scatter"
  | "bubble_scatter"
  | "line"
  | "donut"
  | "table"
  | "big_number"
  | "word_cloud"
  | "response_feed";

export type AggregationType = "none" | "count" | "mean" | "median" | "sum" | "percent";

export interface SceneFilter {
  questionStableKey: string;
  op: "eq" | "neq" | "in" | "not_in" | "gte" | "lte" | "between";
  value: unknown;
}

export interface SceneConfig {
  schemaVersion: 1;
  name: { he: string; en: string };
  chartType: ChartTypeId;
  bindings: {
    x?: string;
    y?: string;
    color?: string;
    size?: string;
  };
  aggregation: AggregationType;
  filters: SceneFilter[];
  sort?: { by: "value_desc" | "category" | "custom"; customOrder?: string[] };
  axis?: {
    zeroBaseline?: boolean;
    domain?: "auto" | [number, number];
    labels?: boolean;
    units?: string;
  };
  outlierControls: {
    enabled: boolean;
    manual: boolean;
    iqr: boolean;
    percentile: boolean;
  };
  display: {
    title?: { he: string; en: string };
    subtitle?: { he: string; en: string };
    showSampleSize: boolean;
    legend: boolean;
    annotations?: string[];
  };
  transition: "morph" | "fade" | "instant";
  privacy: {
    minGroupSize: number;
  };
}

export interface PresentationScene {
  id: string;
  lessonId: string;
  name: string;
  chartType: ChartTypeId;
  config: SceneConfig;
  orderIndex: number;
  isBroken: boolean;
}

/** Session state machine states (spec section 16). */
export type SessionState =
  | "draft"
  | "join_open"
  | "responses_open"
  | "join_closed"
  | "responses_locked"
  | "ended";

export interface ClassSession {
  id: string;
  lessonId: string;
  status: SessionState;
  openedAt: string | null;
  closedAt: string | null;
  codePolicy: AttendanceCodePolicy;
  currentCodeVersion: number;
}

export interface SessionParticipant {
  id: string;
  classSessionId: string;
  studentKeyHash: string;
  authUserId: string;
  joinedAt: string;
  lastSeenAt: string;
}

export type ResponseStatus = "draft" | "submitted" | "locked";

export interface QuestionResponse {
  id: string;
  classSessionId: string;
  participantId: string;
  questionId: string;
  valueJson: unknown;
  numericValue: number | null;
  status: ResponseStatus;
  submittedAt: string;
  updatedAt: string;
}

export interface PresentationExclusion {
  id: string;
  classSessionId: string;
  sceneId: string | null;
  participantId: string | null;
  responseId: string | null;
  reason: string | null;
  createdAt: string;
  isActive: boolean;
}

export type AuditActorType = "instructor" | "student" | "system";

export interface AuditEvent {
  id: string;
  actorType: AuditActorType;
  actorId: string | null;
  classSessionId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
