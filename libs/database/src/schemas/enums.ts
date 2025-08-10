import { pgEnum } from 'drizzle-orm/pg-core';

// User related enums
export const userRole = pgEnum('user_role', ['student', 'teacher', 'super_admin']);
export const authMethod = pgEnum('auth_method', ['email', 'google', 'apple', 'phone']);
export const userStatus = pgEnum('user_status', [
  'active',
  'inactive',
  'suspended',
  'pending_verification',
]);

// Course related enums
export const courseDifficulty = pgEnum('course_difficulty', [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);
export const courseStatus = pgEnum('course_status', [
  'draft',
  'published',
  'archived',
  'under_review',
]);
export const pricingType = pgEnum('pricing_type', ['free', 'paid', 'subscription']);

// Enrollment related enums
export const enrollmentStatus = pgEnum('enrollment_status', [
  'active',
  'completed',
  'dropped',
  'expired',
]);

// Assessment related enums
export const questionType = pgEnum('question_type', [
  'mcq',
  'multiple_select',
  'true_false',
  'short_answer',
  'long_answer',
  'fill_blank',
]);
export const testType = pgEnum('test_type', ['quiz', 'assignment', 'final_exam', 'practice']);

// Proctoring related enums
export const violationType = pgEnum('violation_type', [
  'phone_detected',
  'multiple_faces',
  'no_face',
  'looking_away',
  'audio_detected',
  'tab_switch',
  'copy_paste',
  'other',
]);

// Live session related enums
export const sessionStatus = pgEnum('session_status', ['scheduled', 'live', 'ended', 'cancelled']);

// Payment related enums
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
  'cancelled',
]);
export const paymentMethod = pgEnum('payment_method', [
  'razorpay',
  'stripe',
  'paypal',
  'wallet',
  'bank_transfer',
]);

// Notification related enums
export const notificationType = pgEnum('notification_type', [
  'course_update',
  'payment',
  'achievement',
  'reminder',
  'announcement',
  'live_session',
  'test_result',
  'violation',
]);
export const notificationPriority = pgEnum('notification_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

// Download related enums
export const downloadType = pgEnum('download_type', ['video', 'pdf', 'audio', 'document']);
export const downloadStatus = pgEnum('download_status', [
  'pending',
  'downloading',
  'completed',
  'failed',
  'expired',
]);
