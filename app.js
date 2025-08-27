import express from "express";
import dotenv from "dotenv";
import path from "path";
import { Queue } from "bullmq";
import connection from "./redis.js";
import IORedis from "ioredis";
const redis = new IORedis({ host: "127.0.0.1", port: 6379 });

async function updatePipelineStatus(parentJobId, step, progress, message) {
  await redis.hmset(`video_pipeline:${parentJobId}`, {
    step,
    progress,
    message
  });
}

dotenv.config();
const app = express();
const PORT = process.env.PORT;
const __dirname = path.resolve();

const chapterQueue = new Queue("chapter-queue", { connection });

app.use(express.json());
 
app.use(express.static(path.join(__dirname, "public")));
app.use("/videos", express.static("output"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/search", async (req, res) => {
  try {
    // console.log("Incoming body:", req.body);
    const { title } = req.body;

    const params = new FormData();
    params.append("action", "wp-manga-search-manga");
    params.append("title", title);

    const response = await fetch(process.env.URL, {
      method: "POST",
      body: params,
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Search request failed" });
  }
});

app.post("/api/chapter", async (req, res) => {
  try {
    const { url } = req.body;
    const response = await fetch(url, { method: "POST" });
    const data = await response.text();
    res.send(data);
  } catch (err) {
    console.error("Proxy error chapter:", err);
    res.status(500).json({ error: "chapter request failed" });
  }
});

//video generation endpoint
app.post("/api/generate-video", async (req, res) => {
  try {
    const { url, chapterNumber } = req.body;
    // console.log(url + "\n" + chapterNumber);
    const job = await chapterQueue.add("chapter", { url, chapterNumber });
    console.log(job);
    res.json({ jobId: job.id });
  } catch (err) {
    console.error("Proxy error chapter:", err);
    res.status(500).json({ error: "Failed to enqueue job" });
  }
});

// Polling endpoint
app.get("/api/job-status/:id", async (req, res) => {
  try {
    const redisKey = `video_pipeline:${req.params.id}`;
    const status = await redis.hgetall(redisKey);

    if (!status || !status.step) {
      return res.status(404).json({ status: "notfound" });
    }

    res.json(status);
  } catch (err) {
    console.error("Job status error:", err);
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

app.listen(PORT, () => {
  console.log("Server Starting at port " + PORT);
});
