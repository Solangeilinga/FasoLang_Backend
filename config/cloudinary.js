import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

dotenv.config();

// Configuration Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Fonction pour uploader un fichier audio
export const uploadAudio = async (filePath, folder = 'langues-faso/audio') => {
    try {
        console.log(`📤 Upload audio vers Cloudinary: ${filePath}`);
        
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'video', // Cloudinary traite l'audio comme "video"
            folder: folder,
            format: 'mp3',
            quality: 'auto',
            chunk_size: 6000000
        });
        
        console.log('✅ Audio uploadé sur Cloudinary:', result.secure_url);
        
        // Supprimer le fichier temporaire après upload
        try {
            fs.unlinkSync(filePath);
            console.log('🗑️ Fichier temporaire supprimé');
        } catch (deleteError) {
            console.warn('⚠️ Impossible de supprimer le fichier temporaire:', deleteError);
        }
        
        return result.secure_url;
    } catch (error) {
        console.error('❌ Erreur upload Cloudinary:', error);
        
        // Essayer de supprimer le fichier temporaire même en cas d'erreur
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (deleteError) {
            console.warn('⚠️ Impossible de supprimer le fichier temporaire après erreur:', deleteError);
        }
        
        throw new Error('Erreur lors de l\'upload de l\'audio');
    }
};

// Fonction pour uploader une image
export const uploadImage = async (filePath, folder = 'langues-faso/images') => {
    try {
        console.log(`📤 Upload image vers Cloudinary: ${filePath}`);
        
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'image',
            folder: folder,
            quality: 'auto',
            fetch_format: 'auto'
        });
        
        console.log('✅ Image uploadée sur Cloudinary:', result.secure_url);
        
        // Supprimer le fichier temporaire
        try {
            fs.unlinkSync(filePath);
        } catch (deleteError) {
            console.warn('⚠️ Impossible de supprimer le fichier temporaire image:', deleteError);
        }
        
        return result.secure_url;
    } catch (error) {
        console.error('❌ Erreur upload image Cloudinary:', error);
        
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (deleteError) {
            console.warn('⚠️ Impossible de supprimer le fichier temporaire image après erreur:', deleteError);
        }
        
        throw new Error('Erreur lors de l\'upload de l\'image');
    }
};

// Fonction pour supprimer un fichier
export const deleteFile = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'video'
        });
        console.log('🗑️ Fichier supprimé de Cloudinary:', publicId);
        return result;
    } catch (error) {
        console.error('❌ Erreur suppression Cloudinary:', error);
        throw error;
    }
};

// Vérification de la configuration
export const verifyCloudinaryConfig = () => {
    const config = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'non défini'
    };
    
    console.log('🔧 Configuration Cloudinary:', config);
    
    if (!config.cloud_name || !config.api_key || !process.env.CLOUDINARY_API_SECRET) {
        console.warn('⚠️ Configuration Cloudinary incomplète');
        return false;
    }
    
    console.log('✅ Configuration Cloudinary valide');
    return true;
};

export default cloudinary;