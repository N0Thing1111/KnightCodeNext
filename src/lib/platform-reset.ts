export type ResetMode = 'learning' | 'platform_keep' | 'platform_delete';
export type ResetTarget = 'student' | 'section' | 'teacher' | 'independent' | 'all';
export type ResetPreview = { mode: ResetMode; target: ResetTarget; target_id: string | null; target_label: string; student_ids: string[]; account_ids: string[]; counts: Record<string, number> };
export type ResetState = { error?: string; message?: string; preview?: ResetPreview };
export const resetPhrase = (mode: ResetMode) => mode === 'learning' ? 'RESET LEARNING' : mode === 'platform_keep' ? 'RESET PLATFORM KEEP ACCOUNTS' : 'RESET PLATFORM DELETE ACCOUNTS';
export const resetRecordLabels: Record<string,string> = {
 python_reviews:'Python feedback',python_submissions:'Python submissions',python_runs:'Python runs',python_drafts:'Python drafts',student_code_executions:'Game code executions',student_level_sessions:'Game sessions',student_telemetry_runs:'Game save tracking',student_level_progress:'Game progress',student_activity:'Learning activity and independent unlocks',student_achievements:'Earned achievements',student_notifications:'Student notifications',teacher_notifications:'Related teacher notifications',learner_profiles_reset:'Learners whose XP and streaks reset',enrollment_requests:'Class join requests',announcements:'Announcements',assignments:'Assignments',class_students:'Section memberships',classes:'Sections',accounts_deleted:'Teacher and student accounts deleted'
};
