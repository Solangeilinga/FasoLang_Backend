import express from "express";
import multer from "multer";
import { uploadAudio, uploadImage } from "../config/cloudinary.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/audio", upload.single("file"), async (req, res) => {
  try {
    const result = await uploadAudio(req.file.path, "langues-faso/lecons/audio");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Upload audio failed" });
  }
});

router.post("/image", upload.single("file"), async (req, res) => {
  try {
    const result = await uploadImage(req.file.path, "langues-faso/lecons/images");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Upload image failed" });
  }
});

export default router;