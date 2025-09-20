export type TaskType = 'Reading' | 'Assignment' | 'Exam' | 'Other';

export interface SyllabusItem {
  id: string;
  title: string;
  type: TaskType;
  details?: string;
  startISO: string; // ISO string with timezone
  endISO: string;   // ISO string with timezone
}
