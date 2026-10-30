import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Reels sunucusu çalışıyor.");
});

app.post("/api/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
    return res.status(400).json({
      error: "Geçerli bir YouTube bağlantısı gir."
    });
  }

  res.status(501).json({
    error: "Video analiz motoru henüz kurulmadı."
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Reels sunucusu ${PORT} portunda çalışıyor.`);
});
