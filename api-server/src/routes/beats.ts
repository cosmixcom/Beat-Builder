import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, beatsTable } from "@workspace/db";
import {
  CreateBeatBody,
  GetBeatParams,
  LaunchBeatParams,
  ReactToBeatParams,
  ReactToBeatBody,
  ListBeatsResponse,
  GetBeatResponse,
  LaunchBeatResponse,
  ReactToBeatResponse,
  GetLeaderboardResponse,
  GetStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const FAN_MESSAGES = [
  "just saved your beat!",
  "left a comment: 'this slaps!!'",
  "shared this with 12 friends",
  "added this to their playlist",
  "said: 'need this on repeat'",
  "is playing this on loop",
  "sent this to their group chat",
  "started following you",
  "said: 'absolute fire bro'",
  "featured this in their DJ set",
  "put this on their workout mix",
  "said: 'who made this? a legend'",
  "screenshotted this",
  "said: 'I felt that'",
  "reposted this",
];

const FAN_NAMES = [
  "TravisB", "SoundGirl", "RodWave84", "DJNightOwl", "BeatKing99",
  "MellowVibes", "NeonDrums", "LowKeyFan", "TrapQueen7", "SynthWave",
  "GrooveHunter", "BassDropKing", "LilMelody", "HouseVictor", "ChillFactor",
  "MidnightDJ", "LucidBeats", "CloudNineX", "PurpleMage", "TheWaveMaker",
];

const FAN_EMOJIS = ["🔥", "💜", "⚡", "🎧", "🎵", "💥", "🌊", "✨", "🎤", "🎹"];

const MILESTONES: Record<number, string> = {
  100: "First 100 fans!",
  500: "Going viral!",
  1000: "1K fans! You're blowing up!",
  5000: "5K fans! Industry notice incoming...",
  10000: "10K! You've made it!",
};

router.get("/beats", async (_req, res): Promise<void> => {
  const beats = await db.select().from(beatsTable).orderBy(desc(beatsTable.createdAt));
  res.json(ListBeatsResponse.parse(beats));
});

router.post("/beats", async (req, res): Promise<void> => {
  const parsed = CreateBeatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [beat] = await db.insert(beatsTable).values(parsed.data).returning();
  res.status(201).json(GetBeatResponse.parse(beat));
});

router.get("/beats/:id", async (req, res): Promise<void> => {
  const params = GetBeatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [beat] = await db.select().from(beatsTable).where(eq(beatsTable.id, params.data.id));
  if (!beat) {
    res.status(404).json({ error: "Beat not found" });
    return;
  }

  res.json(GetBeatResponse.parse(beat));
});

router.post("/beats/:id/launch", async (req, res): Promise<void> => {
  const params = LaunchBeatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [beat] = await db.select().from(beatsTable).where(eq(beatsTable.id, params.data.id));
  if (!beat) {
    res.status(404).json({ error: "Beat not found" });
    return;
  }

  const newFans = Math.floor(Math.random() * 900) + 100;
  const prevFans = beat.fans;
  const updatedFans = prevFans + newFans;

  const [updated] = await db
    .update(beatsTable)
    .set({ fans: updatedFans, launched: true, launchedAt: new Date() })
    .where(eq(beatsTable.id, params.data.id))
    .returning();

  const messageCount = Math.min(8, Math.floor(newFans / 100) + 3);
  const messages: string[] = [];
  for (let i = 0; i < messageCount; i++) {
    const emoji = FAN_EMOJIS[Math.floor(Math.random() * FAN_EMOJIS.length)];
    const name = FAN_NAMES[Math.floor(Math.random() * FAN_NAMES.length)];
    const msg = FAN_MESSAGES[Math.floor(Math.random() * FAN_MESSAGES.length)];
    messages.push(`${emoji} ${name} ${msg}`);
  }

  let milestone: string | null = null;
  for (const [threshold, text] of Object.entries(MILESTONES)) {
    const t = Number(threshold);
    if (prevFans < t && updatedFans >= t) {
      milestone = text;
      break;
    }
  }

  res.json(LaunchBeatResponse.parse({ beat: updated, newFans, messages, milestone }));
});

router.post("/beats/:id/react", async (req, res): Promise<void> => {
  const params = ReactToBeatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ReactToBeatBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [beat] = await db.select().from(beatsTable).where(eq(beatsTable.id, params.data.id));
  if (!beat) {
    res.status(404).json({ error: "Beat not found" });
    return;
  }

  const updateField = body.data.reaction === "fire" ? { fires: beat.fires + 1 } : { likes: beat.likes + 1 };
  const [updated] = await db
    .update(beatsTable)
    .set(updateField)
    .where(eq(beatsTable.id, params.data.id))
    .returning();

  res.json(ReactToBeatResponse.parse(updated));
});

router.get("/leaderboard", async (_req, res): Promise<void> => {
  const beats = await db
    .select({
      id: beatsTable.id,
      name: beatsTable.name,
      genre: beatsTable.genre,
      fans: beatsTable.fans,
      likes: beatsTable.likes,
      fires: beatsTable.fires,
      bpm: beatsTable.bpm,
    })
    .from(beatsTable)
    .orderBy(desc(beatsTable.fans))
    .limit(10);

  res.json(GetLeaderboardResponse.parse(beats));
});

router.get("/stats", async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalBeats: sql<number>`count(*)::int`,
      totalFans: sql<number>`coalesce(sum(${beatsTable.fans}), 0)::int`,
      totalLaunches: sql<number>`count(case when ${beatsTable.launched} = true then 1 end)::int`,
    })
    .from(beatsTable);

  const genreRows = await db
    .select({
      genre: beatsTable.genre,
      count: sql<number>`count(*)::int`,
    })
    .from(beatsTable)
    .groupBy(beatsTable.genre)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const topGenre = genreRows[0]?.genre ?? "Trap";

  res.json(GetStatsResponse.parse({
    totalBeats: totals?.totalBeats ?? 0,
    totalFans: totals?.totalFans ?? 0,
    totalLaunches: totals?.totalLaunches ?? 0,
    topGenre,
  }));
});

export default router;
