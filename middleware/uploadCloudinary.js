import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Configuration Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration du storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "user_profiles", // nom du dossier Cloudinary
        allowed_formats: ["jpg", "jpeg", "png"],
    },
});

// Multer + Cloudinary upload
const uploadCloudinary = multer({ storage: storage });

export default uploadCloudinary;
