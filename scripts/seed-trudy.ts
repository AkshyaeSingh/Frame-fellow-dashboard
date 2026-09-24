// Trudy reports transcribed from the Frame "brand fit" page (Trudy general model, Sept 15, 2026).
// Re-running replaces these two reports.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const date = new Date("2026-09-15");

async function main() {
  const reaa = await db.fellow.findUniqueOrThrow({ where: { slug: "reaa-puri" } });
  const ernestine = await db.fellow.findUniqueOrThrow({ where: { slug: "ernestine-siu" } });
  await db.trudyReport.deleteMany({ where: { fellowId: { in: [reaa.id, ernestine.id] }, reportDate: date } });

  await db.trudyReport.create({
    data: {
      fellowId: reaa.id,
      against: "Proton",
      againstCategory: "Safety-aligned mainstream",
      platform: "INSTAGRAM",
      reportDate: date,
      score: 53,
      contentFit: 20,
      audienceFit: 91,
      persuasionFit: 39,
      insights: ["Fair potential to convert their audience", "Limited alignment with brand topics", "Strong match with your target audience"],
      contentNotes: ["Focuses on documentary storytelling and journalism", "Shares reflective art and travel content", "Advocates for independent film voices"],
      audienceNotes: ["Country match: Good", "Gender match: Excellent", "Age match: Excellent"],
      persuasionNotes: ["Weak persuasion", "Fair audience loyalty", "Low values impact"],
      metrics: { followers: 4930, posts: 519, avgViews: 4560, medianLikes: 68, medianComments: 7, likeRate: 1.4, commentRate: 0.1, engagementRate: 1.4 },
      demographics: {
        male: 49.4,
        female: 50.6,
        age: { "13-17": 2.0, "18-24": 15.8, "25-34": 54.6, "35-44": 23.7, "45-64": 4.0 },
        countries: [
          { code: "US", pct: 59.3 },
          { code: "IN", pct: 25.2 },
          { code: "CA", pct: 2.2 },
          { code: "GB", pct: 1.5 },
          { code: "KW", pct: 1.3 },
          { code: "AE", pct: 1.1 },
        ],
      },
      contentSummary:
        "This content creator focuses on storytelling that centers Punjabi Sikh cultural history and diaspora experiences, particularly through documentary filmmaking. They explore overlooked narratives, blending archival footage with personal family narratives.",
      brandSafety: { contentStyle: "Ok", controversialTopics: "Moderate", recentSponsors: "Not shown for Instagram accounts" },
      expectedViews: 5000,
      estConversions: 15,
      conversionRate: 0.3,
      source: "manual-screenshot",
    },
  });

  await db.trudyReport.create({
    data: {
      fellowId: ernestine.id,
      against: "80,000 Hours",
      againstCategory: "AI safety native",
      platform: "YOUTUBE",
      reportDate: date,
      score: 56,
      contentFit: 58,
      audienceFit: null,
      persuasionFit: 49,
      insights: ["Fair potential to convert their audience", "Solid alignment with career content", "Audience match: data missing"],
      contentNotes: ["Strong focus on career advice", "Covers personal development topics", "Features professional interview format"],
      audienceNotes: ["Country match: data missing", "Gender match: data missing", "Age match: data missing"],
      persuasionNotes: ["Fair persuasion", "Fair audience loyalty", "Strong values impact"],
      metrics: { followers: 1290, videos: 29, avgViews: 1050, medianEngagements: 66, avgVideoLengthMin: 22, engagementRate: 5.1, videosLast30Days: 1 },
      demographics: {
        male: 70.3,
        female: 29.7,
        age: { "13-17": 1.7, "18-24": 6.4, "25-34": 64.6, "35-44": 15.4, "45-64": 11.9 },
        countries: null,
      },
      contentSummary:
        "This content creator focuses on career advancement, financial independence, and international lifestyle experiences. They produce a mix of business journalism, personal finance education, and travel content.",
      brandSafety: { contentStyle: "Ok", controversialTopics: "Moderate", recentSponsors: "None found in the last 50 videos" },
      expectedViews: 1000,
      estConversions: 3,
      conversionRate: 0.3,
      source: "manual-screenshot",
    },
  });
  console.log("Seeded 2 Trudy reports.");
}

main().finally(() => db.$disconnect());
