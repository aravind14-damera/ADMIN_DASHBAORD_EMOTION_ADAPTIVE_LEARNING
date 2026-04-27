import "dotenv/config";
import mongoose from "mongoose";

import env from "../config/env.js";
import Admin from "../models/Admin.js";
import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import User from "../models/User.js";
import EmotionAnalytics from "../models/EmotionAnalytics.js";
import StudentActivity from "../models/StudentActivity.js";
import AIInsight from "../models/AIInsight.js";
import Setting from "../models/Setting.js";

/**
 * Seed script for admin dashboard demo data.
 * Usage:
 *  npm run seed
 *
 * Optional flags:
 *  --reset   : clears existing collections before seeding
 *
 * Notes:
 * - Requires MONGODB_URI (or MONGO_URI) in environment
 * - Creates an admin account for testing
 * - Populates realistic data for:
 *   admins, courses, modules, lessons, users, emotionAnalytics,
 *   studentActivity, aiInsights, settings
 */

const hasResetFlag = process.argv.includes("--reset");

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickOne = (arr) => arr[randomBetween(0, arr.length - 1)];
const clamp = (num, min, max) => Math.max(min, Math.min(max, num));
const to2 = (num) => Number(num.toFixed(2));

const names = [
  "Aarav Sharma",
  "Priya Nair",
  "Rahul Verma",
  "Isha Gupta",
  "Karan Malhotra",
  "Neha Joshi",
  "Arjun Reddy",
  "Meera Kapoor",
  "Siddharth Jain",
  "Ananya Rao",
  "Vikram Singh",
  "Ritika Das",
];

const difficultTopicsPool = [
  "Trees",
  "Recursion",
  "Dynamic Programming",
  "Binary Search",
  "Graph Traversal",
  "Time Complexity",
];

const skippedLessonsPool = [
  "Introduction to Recursion",
  "Tree Traversal Deep Dive",
  "Dynamic Programming Patterns",
  "Advanced Binary Search",
  "Graph Shortest Path Basics",
];

const highEngagementModulesPool = [
  "Python Basics",
  "Arrays and Strings",
  "OOP Fundamentals",
  "Data Structures Core",
  "Problem Solving Toolkit",
];

const seedAdmin = async () => {
  const existing = await Admin.findOne({ email: "admin@emotionlearn.com" });
  if (existing) return existing;

  const admin = await Admin.create({
    name: "Super Admin",
    email: "admin@emotionlearn.com",
    password: "Admin@123",
    role: "admin",
    lastLoginAt: new Date(),
  });

  return admin;
};

const seedCoursesModulesLessons = async (adminId) => {
  const courseBlueprint = [
    {
      courseTitle: "Python Programming",
      courseDescription:
        "A comprehensive Python course covering basics to intermediate concepts with practical coding exercises.",
      modules: [
        {
          moduleTitle: "Python Basics",
          lessons: [
            { lessonTitle: "Introduction to Python", duration: 600, description: "Overview of Python ecosystem and setup." },
            { lessonTitle: "Variables and Data Types", duration: 900, description: "Core data types and variable handling in Python." },
            { lessonTitle: "Control Flow", duration: 840, description: "Conditional statements and loops in Python." },
          ],
        },
        {
          moduleTitle: "Functions and OOP",
          lessons: [
            { lessonTitle: "Functions and Scope", duration: 930, description: "Function design, parameters, and scope rules." },
            { lessonTitle: "Object-Oriented Programming", duration: 1080, description: "Classes, objects, inheritance, and polymorphism." },
            { lessonTitle: "Exception Handling", duration: 720, description: "Robust error handling with try/except/finally." },
          ],
        },
      ],
    },
    {
      courseTitle: "Data Structures",
      courseDescription:
        "Master essential data structures and problem-solving patterns for coding interviews and production systems.",
      modules: [
        {
          moduleTitle: "Arrays and Strings",
          lessons: [
            { lessonTitle: "Array Fundamentals", duration: 840, description: "Memory model and operations for arrays." },
            { lessonTitle: "String Manipulation", duration: 780, description: "Common string operations and performance tips." },
            { lessonTitle: "Two Pointer Pattern", duration: 960, description: "Efficient traversal using dual indices." },
          ],
        },
        {
          moduleTitle: "Trees",
          lessons: [
            { lessonTitle: "Tree Basics", duration: 900, description: "Binary trees and common terminology." },
            { lessonTitle: "DFS and BFS Traversal", duration: 1020, description: "Depth-first and breadth-first traversal strategies." },
            { lessonTitle: "Binary Search Trees", duration: 960, description: "BST properties and operations." },
          ],
        },
      ],
    },
  ];

  const courseDocs = [];
  const moduleDocs = [];
  const lessonDocs = [];

  for (const courseData of courseBlueprint) {
    let course = await Course.findOne({ courseTitle: courseData.courseTitle });

    if (!course) {
      course = await Course.create({
        courseTitle: courseData.courseTitle,
        courseDescription: courseData.courseDescription,
        thumbnail: "",
        isPublished: true,
        createdBy: adminId,
      });
    }

    courseDocs.push(course);

    for (const modData of courseData.modules) {
      let moduleDoc = await Module.findOne({
        courseId: course._id,
        moduleTitle: modData.moduleTitle,
      });

      if (!moduleDoc) {
        moduleDoc = await Module.create({
          moduleTitle: modData.moduleTitle,
          courseId: course._id,
        });
      }

      moduleDocs.push(moduleDoc);

      let orderCounter = 1;
      for (const lessonData of modData.lessons) {
        let lesson = await Lesson.findOne({
          moduleId: moduleDoc._id,
          lessonTitle: lessonData.lessonTitle,
        });

        if (!lesson) {
          lesson = await Lesson.create({
            lessonTitle: lessonData.lessonTitle,
            moduleId: moduleDoc._id,
            description: lessonData.description,
            duration: lessonData.duration,
            order: orderCounter,
            isPublished: true,
            uploadStatus: "pending",
            videoURL: "",
            videoPublicId: "",
          });
        }

        lessonDocs.push(lesson);
        orderCounter += 1;
      }
    }
  }

  return { courseDocs, moduleDocs, lessonDocs };
};

const seedUsersAndActivities = async (courses) => {
  const userDocs = [];
  const activityDocs = [];

  for (let i = 0; i < names.length; i += 1) {
    const fullName = names[i];
    const email = `student${i + 1}@emotionlearn.com`;

    let user = await User.findOne({ email });

    const progress = randomBetween(15, 98);
    const lessonsWatched = randomBetween(8, 70);
    const completedTopics = randomBetween(5, 45);
    const totalLearningTimeMins = randomBetween(240, 4200);
    const currentStreakDays = randomBetween(0, 30);

    if (!user) {
      const enrolledCourses = courses.map((c) => ({
        course: c._id,
        progress: randomBetween(10, 100),
        enrolledAt: new Date(Date.now() - randomBetween(2, 120) * 24 * 60 * 60 * 1000),
      }));

      user = await User.create({
        name: fullName,
        email,
        avatarUrl: "",
        status: "active",
        learningProgress: progress,
        totalLearningTimeMins,
        lessonsWatched,
        completedTopics,
        currentStreakDays,
        lastActiveAt: new Date(Date.now() - randomBetween(0, 5) * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - randomBetween(0, 7) * 24 * 60 * 60 * 1000),
        enrolledCourses,
        metadata: {
          emotionTrackingEnabled: true,
          preferredLanguage: "en",
          timezone: "UTC",
        },
      });
    }

    userDocs.push(user);

    const existingActivity = await StudentActivity.findOne({ userId: user._id });
    if (!existingActivity) {
      const activityByDate = Array.from({ length: 14 }).map((_, idx) => {
        const dayOffset = 13 - idx;
        return {
          date: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000),
          learningTimeMinutes: randomBetween(10, 120),
          lessonsWatched: randomBetween(0, 5),
        };
      });

      const topicProgress = Array.from({ length: randomBetween(8, 18) }).map((_, topicIdx) => {
        const isCompleted = Math.random() > 0.35;
        return {
          topicName: `Topic ${topicIdx + 1}`,
          isCompleted,
          completedAt: isCompleted ? new Date(Date.now() - randomBetween(1, 80) * 24 * 60 * 60 * 1000) : null,
        };
      });

      const activity = await StudentActivity.create({
        userId: user._id,
        totalLearningTimeMinutes: totalLearningTimeMins,
        lessonsWatched,
        completedTopics,
        currentStreakDays,
        lastLoginAt: user.lastLoginAt,
        progressPercent: progress,
        activityByDate,
        topicProgress,
        metadata: {
          source: "seed",
          notes: "Seeded demo activity data",
        },
      });

      activityDocs.push(activity);
    }
  }

  return { userDocs, activityDocs };
};

const seedEmotionAnalytics = async () => {
  const existingCount = await EmotionAnalytics.countDocuments({});
  if (existingCount > 0) return;

  const days = 21;
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);

    const happy = randomBetween(18, 42);
    const confused = randomBetween(15, 32);
    const frustrated = randomBetween(8, 24);
    const angry = randomBetween(2, 12);
    let neutral = 100 - (happy + confused + frustrated + angry);

    // Adjust if out of range due to random boundaries
    neutral = clamp(neutral, 5, 40);
    const total = happy + confused + frustrated + angry + neutral;
    const adjust = 100 - total;
    neutral += adjust;

    await EmotionAnalytics.create({
      date,
      emotionPercentages: {
        happy: to2(happy),
        confused: to2(confused),
        frustrated: to2(frustrated),
        angry: to2(angry),
        neutral: to2(neutral),
      },
      focusMetrics: {
        averageFocusScore: randomBetween(52, 89),
        mostDifficultTopic: pickOne(difficultTopicsPool),
        mostSkippedLesson: pickOne(skippedLessonsPool),
        highestEngagementModule: pickOne(highEngagementModulesPool),
      },
      generatedBy: "system",
      notes: "Seeded demo emotion analytics",
    });
  }
};

const seedAIInsights = async ({ modules, lessons, courses }) => {
  const existingCount = await AIInsight.countDocuments({});
  if (existingCount > 0) return;

  const seeds = [
    {
      title: "High confusion detected in Trees module",
      message: "Most students show confusion while learning tree traversals. Consider adding animated visual explanations.",
      category: "emotion",
      severity: "high",
      confidenceScore: 88,
      metrics: { emotionType: "confused", engagementRate: 61, dropOffRate: 32, avgFocusScore: 58 },
      tags: ["trees", "confusion", "visual-learning"],
    },
    {
      title: "Python Basics has strongest engagement",
      message: "Students consistently spend more time and complete exercises in Python Basics compared to other modules.",
      category: "engagement",
      severity: "medium",
      confidenceScore: 84,
      metrics: { emotionType: "happy", engagementRate: 86, dropOffRate: 12, avgFocusScore: 79 },
      tags: ["python", "engagement", "retention"],
    },
    {
      title: "Frustration spikes after 10 minutes",
      message: "Emotion trend suggests frustration rises notably after 10 minutes in long theory-heavy lessons.",
      category: "dropoff",
      severity: "high",
      confidenceScore: 81,
      metrics: { emotionType: "frustrated", engagementRate: 59, dropOffRate: 37, avgFocusScore: 55 },
      tags: ["frustration", "lesson-duration", "microlearning"],
    },
    {
      title: "Recursion lesson has highest drop-off",
      message: "Recursion content records the highest abandonment. Add prerequisite checkpoints and simpler examples.",
      category: "difficulty",
      severity: "critical",
      confidenceScore: 91,
      metrics: { emotionType: "confused", engagementRate: 48, dropOffRate: 44, avgFocusScore: 51 },
      tags: ["recursion", "dropoff", "difficulty"],
    },
  ];

  for (const item of seeds) {
    await AIInsight.create({
      ...item,
      generatedBy: "rule-engine",
      isActioned: false,
      generatedAt: new Date(Date.now() - randomBetween(1, 12) * 60 * 60 * 1000),
      moduleRef: modules.length ? pickOne(modules)._id : null,
      lessonRef: lessons.length ? pickOne(lessons)._id : null,
      courseRef: courses.length ? pickOne(courses)._id : null,
    });
  }
};

const seedSettings = async (admin) => {
  const systemSettings = await Setting.getSystemSettings();

  systemSettings.emotionTrackingEnabled = true;
  systemSettings.captureIntervalSeconds = 120;
  systemSettings.cloudinaryConfigured = Boolean(
    env.cloudinary?.cloudName && env.cloudinary?.apiKey && env.cloudinary?.apiSecret
  );
  systemSettings.cloudinaryLastCheckedAt = new Date();
  systemSettings.adminProfile = {
    fullName: admin.name,
    email: admin.email,
    avatarUrl: "",
    timezone: "UTC",
    notificationPreferences: {
      emailAlerts: true,
      platformAlerts: true,
    },
  };
  systemSettings.updatedBy = admin._id;

  await systemSettings.save();
};

const resetCollections = async () => {
  const collections = [
    "admins",
    "courses",
    "modules",
    "lessons",
    "users",
    "emotionanalytics",
    "studentactivities",
    "aiinsights",
    "settings",
  ];

  for (const col of collections) {
    if (mongoose.connection.collections[col]) {
      await mongoose.connection.collections[col].deleteMany({});
    }
  }
};

const runSeed = async () => {
  try {
    const mongoUri = env.mongodbUri || process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("Missing MONGODB_URI (or MONGO_URI). Please configure environment variables.");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected for seeding");

    if (hasResetFlag) {
      await resetCollections();
      console.log("🧹 Existing collections cleared");
    }

    const admin = await seedAdmin();
    const { courseDocs, moduleDocs, lessonDocs } = await seedCoursesModulesLessons(admin._id);
    await seedUsersAndActivities(courseDocs);
    await seedEmotionAnalytics();
    await seedAIInsights({
      modules: moduleDocs,
      lessons: lessonDocs,
      courses: courseDocs,
    });
    await seedSettings(admin);

    console.log("✅ Seed completed successfully");
    console.log("🔐 Admin test credentials:");
    console.log("   Email   : admin@emotionlearn.com");
    console.log("   Password: Admin@123");
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
};

runSeed();
