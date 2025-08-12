import { db, hashPassword } from '../index'; // Your database connection
import {
  users,
  userProfiles,
  userAuthMethods,
  categories,
  courses,
  courseChapters,
  courseLectures,
  courseEnrollments,
  userLectureProgress,
  tests,
  testQuestions,
  questionOptions,
  courseReviews,
  payments,
  subscriptionPlans,
  userSubscriptions,
  liveSessions,
  notifications,
  systemSettings,
} from '../index';
import { sql } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // ================================
    // SYSTEM SETTINGS
    // ================================
    await db.insert(systemSettings).values([
      {
        settingKey: 'platform_name',
        settingValue: 'LearnHub',
        settingType: 'string',
        description: 'Platform name',
        isPublic: true,
      },
      {
        settingKey: 'platform_fee_percentage',
        settingValue: '15',
        settingType: 'number',
        description: 'Platform commission percentage',
        isPublic: false,
      },
      {
        settingKey: 'max_file_size_mb',
        settingValue: '500',
        settingType: 'number',
        description: 'Maximum file upload size in MB',
        isPublic: false,
      },
    ]);

    // ================================
    // SUBSCRIPTION PLANS
    // ================================
    const planIds = await db
      .insert(subscriptionPlans)
      .values([
        {
          name: 'Basic Plan',
          description: 'Access to basic courses',
          price: '299.00',
          durationMonths: 1,
          features: ['Access to 100+ courses', 'Mobile app access', 'Email support'],
          maxCourses: 10,
        },
        {
          name: 'Premium Plan',
          description: 'Access to all courses with premium features',
          price: '999.00',
          durationMonths: 6,
          features: [
            'Unlimited course access',
            'Download for offline viewing',
            'Priority support',
            'Certificate of completion',
          ],
          maxCourses: null,
        },
      ])
      .returning({ id: subscriptionPlans.id });

    // ================================
    // USERS
    // ================================
    // Hash passwords for seed users
    const defaultPassword = 'SecurePass123!';
    const hashedPassword = await hashPassword(defaultPassword);
    const adityaPass = await hashPassword('aditya@123');
    const badalPass = await hashPassword('badal@123');
    const lisaPass = await hashPassword('lisa@123');
    const mikePass = await hashPassword('mike@123');
    const sarahPass = await hashPassword('sarah@123');
    const adminPass = await hashPassword('admin@123');

    const userIds = await db
      .insert(users)
      .values([
        {
          email: 'adiya@student.com',
          phone: '+91-9876543210',
          passwordHash: adityaPass,
          role: 'student',
          status: 'active',
          emailVerified: true,
          phoneVerified: true,
        },
        {
          email: 'sarah@teacher.com',
          phone: '+91-9876543211',
          passwordHash: sarahPass,
          role: 'teacher',
          status: 'active',
          emailVerified: true,
          phoneVerified: true,
        },
        {
          email: 'badal@student.com',
          phone: '+91-9876543212',
          passwordHash: badalPass,
          role: 'student',
          status: 'active',
          emailVerified: true,
          phoneVerified: false,
        },
        {
          email: 'lisa@teacher.com',
          phone: '+91-9876543213',
          passwordHash: lisaPass,
          role: 'teacher',
          status: 'active',
          emailVerified: true,
          phoneVerified: true,
        },
        {
          email: 'lms@admin.com',
          phone: '+91-9876543214',
          passwordHash: adminPass,
          role: 'super_admin',
          status: 'active',
          emailVerified: true,
          phoneVerified: true,
        },
      ])
      .returning({ id: users.id });

    // ================================
    // USER PROFILES
    // ================================
    await db.insert(userProfiles).values([
      {
        userId: userIds[0].id,
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John D.',
        bio: 'Passionate learner interested in technology and business',
        dateOfBirth: '1995-06-15',
        gender: 'male',
        country: 'India',
        state: 'Maharashtra',
        city: 'Mumbai',
        timezone: 'Asia/Kolkata',
        preferredLanguage: 'en',
      },
      {
        userId: userIds[1].id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        displayName: 'Sarah J.',
        bio: 'Full-stack developer with 8+ years of experience. Love teaching and sharing knowledge.',
        dateOfBirth: '1988-03-22',
        gender: 'female',
        country: 'India',
        state: 'Karnataka',
        city: 'Bangalore',
        timezone: 'Asia/Kolkata',
        preferredLanguage: 'en',
      },
      {
        userId: userIds[2].id,
        firstName: 'Mike',
        lastName: 'Chen',
        displayName: 'Mike C.',
        bio: 'Data science enthusiast and machine learning practitioner',
        dateOfBirth: '1992-11-08',
        gender: 'male',
        country: 'India',
        state: 'Delhi',
        city: 'New Delhi',
        timezone: 'Asia/Kolkata',
        preferredLanguage: 'en',
      },
      {
        userId: userIds[3].id,
        firstName: 'Lisa',
        lastName: 'Williams',
        displayName: 'Lisa W.',
        bio: 'Digital marketing expert and content creator with 10+ years of experience',
        dateOfBirth: '1985-09-12',
        gender: 'female',
        country: 'India',
        state: 'Tamil Nadu',
        city: 'Chennai',
        timezone: 'Asia/Kolkata',
        preferredLanguage: 'en',
      },
      {
        userId: userIds[4].id,
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'Admin',
        bio: 'Platform administrator',
        country: 'India',
        timezone: 'Asia/Kolkata',
        preferredLanguage: 'en',
      },
    ]);

    // ================================
    // USER AUTH METHODS
    // ================================
    await db.insert(userAuthMethods).values([
      {
        userId: userIds[0].id,
        authMethod: 'email',
        isPrimary: true,
      },
      {
        userId: userIds[1].id,
        authMethod: 'email',
        isPrimary: true,
      },
      {
        userId: userIds[1].id,
        authMethod: 'google',
        providerId: 'google_123456789',
        providerData: { email: 'sarah.teacher@gmail.com' },
        isPrimary: false,
      },
      {
        userId: userIds[2].id,
        authMethod: 'email',
        isPrimary: true,
      },
      {
        userId: userIds[3].id,
        authMethod: 'email',
        isPrimary: true,
      },
      {
        userId: userIds[4].id,
        authMethod: 'email',
        isPrimary: true,
      },
    ]);

    // ================================
    // USER SUBSCRIPTIONS
    // ================================
    await db.insert(userSubscriptions).values([
      {
        userId: userIds[0].id,
        planId: planIds[0].id,
        expiresAt: '2025-09-12 00:00:00',
        isActive: true,
        autoRenew: true,
        paymentMethod: 'razorpay',
      },
      {
        userId: userIds[2].id,
        planId: planIds[1].id,
        expiresAt: '2026-02-12 00:00:00',
        isActive: true,
        autoRenew: false,
        paymentMethod: 'stripe',
      },
    ]);

    // ================================
    // CATEGORIES
    // ================================
    const categoryIds = await db
      .insert(categories)
      .values([
        {
          name: 'Programming',
          slug: 'programming',
          description: 'Learn programming languages and software development',
          iconUrl: 'https://example.com/icons/programming.svg',
          colorCode: '#3B82F6',
          sortOrder: 1,
        },
        {
          name: 'Data Science',
          slug: 'data-science',
          description: 'Master data analysis, machine learning, and AI',
          iconUrl: 'https://example.com/icons/data-science.svg',
          colorCode: '#10B981',
          sortOrder: 2,
        },
        {
          name: 'Digital Marketing',
          slug: 'digital-marketing',
          description: 'Learn modern marketing strategies and techniques',
          iconUrl: 'https://example.com/icons/marketing.svg',
          colorCode: '#F59E0B',
          sortOrder: 3,
        },
        {
          name: 'Business',
          slug: 'business',
          description: 'Develop business and entrepreneurship skills',
          iconUrl: 'https://example.com/icons/business.svg',
          colorCode: '#EF4444',
          sortOrder: 4,
        },
      ])
      .returning({ id: categories.id });

    // ================================
    // COURSES
    // ================================
    const courseIds = await db
      .insert(courses)
      .values([
        {
          teacherId: userIds[1].id, // Sarah (teacher)
          categoryId: categoryIds[0].id, // Programming
          title: 'Complete React.js Development Course',
          slug: 'complete-reactjs-development-course',
          description:
            'Master React.js from basics to advanced concepts. Build real-world projects and learn modern React patterns, hooks, and state management.',
          shortDescription: 'Learn React.js from scratch with hands-on projects',
          thumbnailUrl: 'https://example.com/thumbnails/react-course.jpg',
          trailerVideoUrl: 'https://example.com/videos/react-trailer.mp4',
          difficulty: 'intermediate',
          status: 'published',
          pricingType: 'paid',
          price: '2999.00',
          discountPrice: '1999.00',
          durationHours: 25,
          durationMinutes: 30,
          language: 'en',
          prerequisites: 'Basic JavaScript knowledge',
          whatYouLearn: [
            'React fundamentals and JSX',
            'Component lifecycle and hooks',
            'State management with Redux',
            'Building responsive UIs',
            'Testing React applications',
          ],
          targetAudience: ['Frontend developers', 'JavaScript developers', 'Web developers'],
          requirements: ['Computer with internet connection', 'Basic JavaScript knowledge'],
          tags: ['react', 'javascript', 'frontend', 'web development'],
          isFeatured: true,
          certificateAvailable: true,
          maxStudents: 500,
          publishedAt: '2024-07-15 10:00:00',
        },
        {
          teacherId: userIds[3].id, // Lisa (teacher)
          categoryId: categoryIds[2].id, // Digital Marketing
          title: 'Digital Marketing Masterclass 2025',
          slug: 'digital-marketing-masterclass-2025',
          description:
            'Complete digital marketing course covering SEO, SEM, social media marketing, content marketing, and analytics. Get hands-on experience with real campaigns.',
          shortDescription: 'Master all aspects of digital marketing',
          thumbnailUrl: 'https://example.com/thumbnails/digital-marketing.jpg',
          difficulty: 'beginner',
          status: 'published',
          pricingType: 'paid',
          price: '3499.00',
          durationHours: 30,
          durationMinutes: 0,
          language: 'en',
          whatYouLearn: [
            'SEO optimization strategies',
            'Google Ads and Facebook Ads',
            'Social media marketing',
            'Content marketing',
            'Analytics and reporting',
          ],
          targetAudience: ['Marketing professionals', 'Business owners', 'Entrepreneurs'],
          requirements: ['Basic computer skills', 'Internet connection'],
          tags: ['marketing', 'seo', 'social media', 'advertising'],
          isBestseller: true,
          certificateAvailable: true,
          publishedAt: '2024-06-20 09:00:00',
        },
        {
          teacherId: userIds[1].id, // Sarah (teacher)
          categoryId: categoryIds[1].id, // Data Science
          title: 'Python for Data Analysis',
          slug: 'python-for-data-analysis',
          description:
            'Learn Python programming specifically for data analysis. Cover pandas, numpy, matplotlib, and data visualization techniques.',
          shortDescription: 'Master Python for data analysis and visualization',
          thumbnailUrl: 'https://example.com/thumbnails/python-data.jpg',
          difficulty: 'intermediate',
          status: 'published',
          pricingType: 'paid',
          price: '2499.00',
          durationHours: 20,
          durationMinutes: 45,
          language: 'en',
          prerequisites: 'Basic Python knowledge',
          whatYouLearn: [
            'Pandas for data manipulation',
            'NumPy for numerical computing',
            'Data visualization with Matplotlib',
            'Statistical analysis',
            'Data cleaning techniques',
          ],
          targetAudience: ['Data analysts', 'Python developers', 'Students'],
          requirements: ['Python installed', 'Basic programming knowledge'],
          tags: ['python', 'data analysis', 'pandas', 'numpy'],
          certificateAvailable: true,
          publishedAt: '2024-08-01 11:00:00',
        },
      ])
      .returning({ id: courses.id });

    // ================================
    // COURSE CHAPTERS
    // ================================
    const chapterIds = await db
      .insert(courseChapters)
      .values([
        // React Course Chapters
        {
          courseId: courseIds[0].id,
          title: 'Getting Started with React',
          description: 'Introduction to React and development setup',
          sortOrder: 1,
        },
        {
          courseId: courseIds[0].id,
          title: 'Components and JSX',
          description: 'Understanding React components and JSX syntax',
          sortOrder: 2,
        },
        {
          courseId: courseIds[0].id,
          title: 'State Management',
          description: 'Managing state in React applications',
          sortOrder: 3,
        },
        // Marketing Course Chapters
        {
          courseId: courseIds[1].id,
          title: 'Digital Marketing Fundamentals',
          description: 'Basic concepts and terminology',
          sortOrder: 1,
        },
        {
          courseId: courseIds[1].id,
          title: 'Search Engine Optimization',
          description: 'SEO strategies and best practices',
          sortOrder: 2,
        },
        // Python Course Chapters
        {
          courseId: courseIds[2].id,
          title: 'Python Basics for Data Analysis',
          description: 'Essential Python concepts for data work',
          sortOrder: 1,
        },
        {
          courseId: courseIds[2].id,
          title: 'Working with Pandas',
          description: 'Data manipulation using Pandas library',
          sortOrder: 2,
        },
      ])
      .returning({ id: courseChapters.id });

    // ================================
    // COURSE LECTURES
    // ================================
    const lectureIds = await db
      .insert(courseLectures)
      .values([
        // React Course Lectures
        {
          courseId: courseIds[0].id,
          chapterId: chapterIds[0].id,
          title: 'What is React?',
          description: 'Introduction to React library and its benefits',
          contentType: 'video',
          videoUrl: 'https://example.com/videos/react-intro.mp4',
          videoDuration: 900, // 15 minutes
          isPreview: true,
          sortOrder: 1,
        },
        {
          courseId: courseIds[0].id,
          chapterId: chapterIds[0].id,
          title: 'Setting up Development Environment',
          description: 'Installing Node.js, npm, and creating React app',
          contentType: 'video',
          videoUrl: 'https://example.com/videos/react-setup.mp4',
          videoDuration: 1200, // 20 minutes
          sortOrder: 2,
        },
        {
          courseId: courseIds[0].id,
          chapterId: chapterIds[1].id,
          title: 'Understanding JSX',
          description: 'JSX syntax and how it differs from HTML',
          contentType: 'video',
          videoUrl: 'https://example.com/videos/jsx-basics.mp4',
          videoDuration: 1800, // 30 minutes
          isDownloadable: true,
          sortOrder: 1,
        },
        // Marketing Course Lectures
        {
          courseId: courseIds[1].id,
          chapterId: chapterIds[3].id,
          title: 'Introduction to Digital Marketing',
          description: 'Overview of digital marketing landscape',
          contentType: 'video',
          videoUrl: 'https://example.com/videos/marketing-intro.mp4',
          videoDuration: 1500, // 25 minutes
          isPreview: true,
          sortOrder: 1,
        },
        {
          courseId: courseIds[1].id,
          chapterId: chapterIds[4].id,
          title: 'SEO Fundamentals',
          description: 'Basic principles of search engine optimization',
          contentType: 'video',
          videoUrl: 'https://example.com/videos/seo-basics.mp4',
          videoDuration: 2100, // 35 minutes
          sortOrder: 1,
        },
        // Python Course Lectures
        {
          courseId: courseIds[2].id,
          chapterId: chapterIds[5].id,
          title: 'Python Data Types for Analysis',
          description: 'Essential Python data types and structures',
          contentType: 'video',
          videoUrl: 'https://example.com/videos/python-datatypes.mp4',
          videoDuration: 1200, // 20 minutes
          isPreview: true,
          sortOrder: 1,
        },
      ])
      .returning({ id: courseLectures.id });

    // ================================
    // COURSE ENROLLMENTS
    // ================================
    const enrollmentIds = await db
      .insert(courseEnrollments)
      .values([
        {
          userId: userIds[0].id, // John (student)
          courseId: courseIds[0].id, // React course
          status: 'active',
          progressPercentage: '35.50',
          lastAccessedAt: '2025-08-10 15:30:00',
          totalWatchTime: 3600, // 1 hour
        },
        {
          userId: userIds[0].id, // John (student)
          courseId: courseIds[1].id, // Marketing course
          status: 'active',
          progressPercentage: '12.25',
          lastAccessedAt: '2025-08-08 10:15:00',
          totalWatchTime: 1800, // 30 minutes
        },
        {
          userId: userIds[2].id, // Mike (student)
          courseId: courseIds[0].id, // React course
          status: 'active',
          progressPercentage: '78.90',
          lastAccessedAt: '2025-08-11 20:45:00',
          totalWatchTime: 7200, // 2 hours
        },
        {
          userId: userIds[2].id, // Mike (student)
          courseId: courseIds[2].id, // Python course
          status: 'completed',
          progressPercentage: '100.00',
          completedAt: '2025-07-25 14:20:00',
          certificateIssued: true,
          certificateUrl: 'https://example.com/certificates/mike-python.pdf',
          totalWatchTime: 4500, // 1.25 hours
        },
      ])
      .returning({ id: courseEnrollments.id });

    // ================================
    // USER LECTURE PROGRESS
    // ================================
    await db.insert(userLectureProgress).values([
      {
        userId: userIds[0].id,
        courseId: courseIds[0].id,
        lectureId: lectureIds[0].id,
        isCompleted: true,
        watchTime: 900,
        lastPosition: 900,
        firstWatchedAt: '2025-08-05 10:00:00',
        completedAt: '2025-08-05 10:15:00',
        lastAccessedAt: '2025-08-05 10:15:00',
      },
      {
        userId: userIds[0].id,
        courseId: courseIds[0].id,
        lectureId: lectureIds[1].id,
        isCompleted: true,
        watchTime: 1200,
        lastPosition: 1200,
        firstWatchedAt: '2025-08-05 10:20:00',
        completedAt: '2025-08-05 10:40:00',
        lastAccessedAt: '2025-08-05 10:40:00',
      },
      {
        userId: userIds[0].id,
        courseId: courseIds[0].id,
        lectureId: lectureIds[2].id,
        isCompleted: false,
        watchTime: 850,
        lastPosition: 850,
        firstWatchedAt: '2025-08-10 15:00:00',
        lastAccessedAt: '2025-08-10 15:30:00',
      },
      {
        userId: userIds[2].id,
        courseId: courseIds[2].id,
        lectureId: lectureIds[5].id,
        isCompleted: true,
        watchTime: 1200,
        lastPosition: 1200,
        firstWatchedAt: '2025-07-20 09:00:00',
        completedAt: '2025-07-20 09:20:00',
        lastAccessedAt: '2025-07-20 09:20:00',
      },
    ]);

    // ================================
    // TESTS
    // ================================
    const testIds = await db
      .insert(tests)
      .values([
        {
          courseId: courseIds[0].id,
          chapterId: chapterIds[1].id,
          title: 'JSX and Components Quiz',
          description: 'Test your knowledge of JSX syntax and React components',
          testType: 'quiz',
          durationMinutes: 30,
          totalMarks: 20,
          passingMarks: 14,
          maxAttempts: 3,
          shuffleQuestions: true,
          showResults: true,
          showCorrectAnswers: true,
        },
        {
          courseId: courseIds[1].id,
          chapterId: chapterIds[4].id,
          title: 'SEO Basics Assessment',
          description: 'Evaluate your understanding of SEO fundamentals',
          testType: 'assignment',
          durationMinutes: 45,
          totalMarks: 30,
          passingMarks: 21,
          maxAttempts: 2,
          proctoringEnabled: true,
          proctoringStrictness: 2,
        },
      ])
      .returning({ id: tests.id });

    // ================================
    // TEST QUESTIONS
    // ================================
    const questionIds = await db
      .insert(testQuestions)
      .values([
        {
          testId: testIds[0].id,
          questionType: 'mcq',
          questionText: 'What does JSX stand for?',
          marks: 2,
          explanation: 'JSX stands for JavaScript XML, allowing us to write HTML in React.',
          sortOrder: 1,
        },
        {
          testId: testIds[0].id,
          questionType: 'mcq',
          questionText: 'Which method is used to render a React component?',
          marks: 2,
          explanation: 'ReactDOM.render() is used to render React components to the DOM.',
          sortOrder: 2,
        },
        {
          testId: testIds[0].id,
          questionType: 'true_false',
          questionText: 'JSX is mandatory for React development.',
          marks: 1,
          explanation:
            'JSX is not mandatory but it makes React code more readable and easier to write.',
          sortOrder: 3,
        },
        {
          testId: testIds[1].id,
          questionType: 'mcq',
          questionText: 'What does SEO stand for?',
          marks: 3,
          explanation: 'SEO stands for Search Engine Optimization.',
          sortOrder: 1,
        },
        {
          testId: testIds[1].id,
          questionType: 'multiple_select',
          questionText: 'Which are important SEO ranking factors?',
          marks: 5,
          explanation:
            'Content quality, backlinks, page speed, and mobile-friendliness are key ranking factors.',
          sortOrder: 2,
        },
      ])
      .returning({ id: testQuestions.id });

    // ================================
    // QUESTION OPTIONS
    // ================================
    await db.insert(questionOptions).values([
      // Question 1 options
      {
        questionId: questionIds[0].id,
        optionText: 'JavaScript XML',
        isCorrect: true,
        sortOrder: 1,
      },
      {
        questionId: questionIds[0].id,
        optionText: 'JavaScript Extension',
        isCorrect: false,
        sortOrder: 2,
      },
      {
        questionId: questionIds[0].id,
        optionText: 'JavaScript eXtra',
        isCorrect: false,
        sortOrder: 3,
      },
      {
        questionId: questionIds[0].id,
        optionText: 'Java Syntax Extension',
        isCorrect: false,
        sortOrder: 4,
      },
      // Question 2 options
      {
        questionId: questionIds[1].id,
        optionText: 'ReactDOM.render()',
        isCorrect: true,
        sortOrder: 1,
      },
      {
        questionId: questionIds[1].id,
        optionText: 'React.render()',
        isCorrect: false,
        sortOrder: 2,
      },
      {
        questionId: questionIds[1].id,
        optionText: 'Component.render()',
        isCorrect: false,
        sortOrder: 3,
      },
      {
        questionId: questionIds[1].id,
        optionText: 'DOM.render()',
        isCorrect: false,
        sortOrder: 4,
      },
      // Question 3 options (True/False)
      {
        questionId: questionIds[2].id,
        optionText: 'True',
        isCorrect: false,
        sortOrder: 1,
      },
      {
        questionId: questionIds[2].id,
        optionText: 'False',
        isCorrect: true,
        sortOrder: 2,
      },
      // Question 4 options (SEO)
      {
        questionId: questionIds[3].id,
        optionText: 'Search Engine Optimization',
        isCorrect: true,
        sortOrder: 1,
      },
      {
        questionId: questionIds[3].id,
        optionText: 'Social Engine Optimization',
        isCorrect: false,
        sortOrder: 2,
      },
      {
        questionId: questionIds[3].id,
        optionText: 'Search Engine Operation',
        isCorrect: false,
        sortOrder: 3,
      },
      // Question 5 options (Multiple select)
      {
        questionId: questionIds[4].id,
        optionText: 'High-quality content',
        isCorrect: true,
        sortOrder: 1,
      },
      {
        questionId: questionIds[4].id,
        optionText: 'Quality backlinks',
        isCorrect: true,
        sortOrder: 2,
      },
      {
        questionId: questionIds[4].id,
        optionText: 'Page loading speed',
        isCorrect: true,
        sortOrder: 3,
      },
      {
        questionId: questionIds[4].id,
        optionText: 'Website color scheme',
        isCorrect: false,
        sortOrder: 4,
      },
      {
        questionId: questionIds[4].id,
        optionText: 'Mobile responsiveness',
        isCorrect: true,
        sortOrder: 5,
      },
    ]);

    // ================================
    // PAYMENTS
    // ================================
    await db.insert(payments).values([
      {
        userId: userIds[0].id,
        courseId: courseIds[0].id,
        amount: '1999.00',
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'razorpay',
        paymentGatewayId: 'pay_MxxxxxxxxxxxxxR',
        transactionId: 'txn_1234567890',
        description: 'Payment for Complete React.js Development Course',
      },
      {
        userId: userIds[0].id,
        courseId: courseIds[1].id,
        amount: '3499.00',
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'razorpay',
        paymentGatewayId: 'pay_NxxxxxxxxxxxxxS',
        transactionId: 'txn_1234567891',
        description: 'Payment for Digital Marketing Masterclass 2025',
      },
      {
        userId: userIds[2].id,
        courseId: courseIds[0].id,
        amount: '1999.00',
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'stripe',
        paymentGatewayId: 'pi_xxxxxxxxxxxxx',
        transactionId: 'txn_1234567892',
        description: 'Payment for Complete React.js Development Course',
      },
      {
        userId: userIds[2].id,
        courseId: courseIds[2].id,
        amount: '2499.00',
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'stripe',
        paymentGatewayId: 'pi_yyyyyyyyyyy',
        transactionId: 'txn_1234567893',
        description: 'Payment for Python for Data Analysis',
      },
    ]);

    // ================================
    // COURSE REVIEWS
    // ================================
    await db.insert(courseReviews).values([
      {
        userId: userIds[0].id,
        courseId: courseIds[0].id,
        rating: 5,
        reviewText:
          'Excellent React course! Sarah explains everything clearly and the projects are really helpful for understanding concepts.',
        isVerified: true,
        helpfulCount: 12,
      },
      {
        userId: userIds[2].id,
        courseId: courseIds[0].id,
        rating: 4,
        reviewText:
          'Great course overall. Good content and structure. Would recommend adding more advanced topics.',
        isVerified: true,
        helpfulCount: 8,
      },
      {
        userId: userIds[2].id,
        courseId: courseIds[2].id,
        rating: 5,
        reviewText:
          'Perfect introduction to data analysis with Python. The pandas section was particularly well done.',
        isVerified: true,
        isFeatured: true,
        helpfulCount: 15,
      },
      {
        userId: userIds[0].id,
        courseId: courseIds[1].id,
        rating: 4,
        reviewText:
          'Comprehensive marketing course. Lisa covers all the important topics. Could use more case studies.',
        isVerified: true,
        helpfulCount: 6,
      },
    ]);

    // ================================
    // LIVE SESSIONS
    // ================================
    await db.insert(liveSessions).values([
      {
        courseId: courseIds[0].id,
        teacherId: userIds[1].id,
        title: 'React Hooks Deep Dive',
        description: 'Advanced session on React hooks and custom hooks',
        meetingId: 'react-hooks-session-001',
        meetingPassword: 'react2025',
        scheduledAt: '2025-08-15 19:00:00',
        durationMinutes: 90,
        status: 'scheduled',
        maxParticipants: 50,
        isRecorded: true,
        agenda: '1. useState and useEffect review\n2. Custom hooks creation\n3. Q&A session',
      },
      {
        courseId: courseIds[1].id,
        teacherId: userIds[3].id,
        title: 'SEO Strategy Workshop',
        description: 'Interactive workshop on developing SEO strategies',
        meetingId: 'seo-workshop-001',
        meetingPassword: 'seo2025',
        scheduledAt: '2025-08-20 18:00:00',
        startedAt: '2025-08-20 18:05:00',
        endedAt: '2025-08-20 19:30:00',
        durationMinutes: 85,
        status: 'ended',
        maxParticipants: 100,
        isRecorded: true,
        recordingUrl: 'https://example.com/recordings/seo-workshop-001.mp4',
        agenda:
          '1. Keyword research techniques\n2. On-page optimization\n3. Link building strategies',
      },
    ]);

    // ================================
    // NOTIFICATIONS
    // ================================
    await db.insert(notifications).values([
      {
        userId: userIds[0].id,
        type: 'course_update',
        priority: 'medium',
        title: 'New Lecture Added',
        message: "A new lecture 'Advanced React Patterns' has been added to your enrolled course.",
        data: { courseId: courseIds[0].id, lectureId: lectureIds[2].id },
        isRead: false,
        isSent: true,
        sentAt: '2025-08-10 10:00:00',
      },
      {
        userId: userIds[0].id,
        type: 'live_session',
        priority: 'high',
        title: 'Live Session Tomorrow',
        message: "Don't miss the React Hooks Deep Dive session starting tomorrow at 7 PM.",
        data: { courseId: courseIds[0].id },
        isRead: true,
        isSent: true,
        sentAt: '2025-08-14 09:00:00',
      },
      {
        userId: userIds[2].id,
        type: 'achievement',
        priority: 'medium',
        title: 'Course Completed!',
        message: "Congratulations! You have successfully completed 'Python for Data Analysis'.",
        data: { courseId: courseIds[2].id },
        isRead: false,
        isSent: true,
        sentAt: '2025-07-25 14:25:00',
      },
      {
        userId: userIds[2].id,
        type: 'test_result',
        priority: 'medium',
        title: 'Quiz Results Available',
        message: "Your results for 'JSX and Components Quiz' are now available.",
        data: { testId: testIds[0].id, score: 85 },
        isRead: false,
        isSent: true,
        sentAt: '2025-08-11 16:30:00',
      },
    ]);

    // Update course statistics
    await db.execute(sql`
      UPDATE courses 
      SET 
        total_enrollments = (
          SELECT COUNT(*) FROM course_enrollments 
          WHERE course_id = courses.id
        ),
        average_rating = (
          SELECT COALESCE(AVG(rating::decimal), 0) FROM course_reviews 
          WHERE course_id = courses.id
        ),
        total_reviews = (
          SELECT COUNT(*) FROM course_reviews 
          WHERE course_id = courses.id
        ),
        total_lectures = (
          SELECT COUNT(*) FROM course_lectures 
          WHERE course_id = courses.id AND is_active = true
        )
    `);

    console.log('✅ Database seeded successfully!');
    console.log(`📊 Created:
    - 5 users (2 students, 2 teachers, 1 admin)
    - 4 categories
    - 3 courses with chapters and lectures  
    - 4 enrollments with progress
    - 2 tests with questions and options
    - 4 payments
    - 4 course reviews
    - 2 live sessions
    - 4 notifications
    - 2 subscription plans with user subscriptions`);

    return {
      users: userIds,
      categories: categoryIds,
      courses: courseIds,
      enrollments: enrollmentIds,
    };
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Call this function to seed your database
seedDatabase().catch(console.error);
