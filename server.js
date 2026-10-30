import express from "express";
import cors from "cors";
import youtubedl from "youtube-dl-exec";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = path.join(os.tmpdir(), "reels-output");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/clips", express.static(OUTPUT_DIR));

ffmpeg.setFfmpegPath(ffmpegPath);

app.get("/", (req, res) => {
  res.send("Reels video sunucusu çalışıyor.");
});

app.post("/api/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url || !/(youtube\.com|youtu\.be)/i.test(url)) {
    return res.status(400).json({
      error: "Geçerli bir YouTube bağlantısı gir."
    });
  }

  const jobId = crypto.randomUUID();
  const inputPath = path.join(OUTPUT_DIR, jobId + ".mp4");

  const ytOptions = {
    noPlaylist: true,
    jsRuntimes: "node",
    remoteComponents: "ejs:github",
    noWarnings: true
  };

  try {
    console.log("YouTube video bilgileri alınıyor...");

    const metadata = await youtubedl(url, {
      ...ytOptions,
      dumpSingleJson: true
    });

    const duration = Math.floor(metadata.duration || 0);

    if (duration < 5) {
      throw new Error("Video çok kısa.");
    }

    console.log("Video indiriliyor...");

    await youtubedl(url, {
      ...ytOptions,
      output: inputPath,
      format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      mergeOutputFormat: "mp4",
      maxFilesize: "500M"
    });

    if (!fs.existsSync(inputPath)) {
      throw new Error("İndirilen video dosyası bulunamadı.");
    }

    const clips = [];
    const clipCount = Math.min(3, Math.floor(duration / 5));

    for (let i = 0; i < clipCount; i++) {
      const start = Math.floor((duration / clipCount) * i);
      const clipName = jobId + "-" + (i + 1) + ".mp4";
      const clipPath = path.join(OUTPUT_DIR, clipName);

      console.log("Reels oluşturuluyor:", i + 1);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(start)
          .duration(Math.min(20, duration - start))
          .videoFilters(
            "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
          )
          .outputOptions(
            "-c:v libx264",
            "-preset ultrafast",
            "-crf 23",
            "-c:a aac"
          )
          .output(clipPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      clips.push({
        title: "Reels " + (i + 1),
        duration: "Başlangıç: " + start + " saniye",
        url: "https://reels-faf2.onrender.com/clips/" + clipName
      });
    }

    fs.unlinkSync(inputPath);

    res.json({ clips });

  } catch (error) {
    console.error("İŞLEM HATASI:", error);

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    res.status(500).json({
      error: "Video işlenemedi: " + error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Reels sunucusu çalışıyor:", PORT);
});
