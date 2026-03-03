import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// ===============================
// ✅ AUTHENTICATE TOKEN (existant)
// ===============================
export const authenticateToken = (req, res, next) => {
    try {
        let token;

        // 1. Essayer de récupérer le token depuis le header Authorization
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            console.log("Token trouvé dans le header");
        }
        
        // 2. Si pas de header, essayer les cookies (pour le web)
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
            console.log("Token trouvé dans les cookies");
        }

        // 3. Si toujours pas de token, retourner 401
        if (!token) {
            console.log("Aucun token trouvé");
            return res.status(401).json({ 
                message: "Token manquant" 
            });
        }

        // 4. Vérifier le token
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                console.error("Token invalide:", err.message);
                return res.status(403).json({ 
                    message: "Token invalide ou expiré" 
                });
            }
            
            console.log("Utilisateur authentifié:", user.id);
            req.user = user;
            next();
        });
        
    } catch (error) {
        console.error("Erreur serveur:", error);
        return res.status(500).json({ 
            message: "Erreur serveur" 
        });
    }
};

// ===============================
// 🛡️ ADMIN MIDDLEWARE (nouveau)
// ===============================
export const adminMiddleware = (req, res, next) => {
    try {
        // Vérifier que l'utilisateur est authentifié
        if (!req.user) {
            console.log("❌ Utilisateur non authentifié (pas de req.user)");
            return res.status(401).json({
                success: false,
                message: "Non autorisé - Utilisateur non authentifié",
            });
        }

        // Vérifier que l'utilisateur est admin
        if (req.user.role !== 'admin') {
            console.log(`❌ Accès refusé - Role: ${req.user.role} (requis: admin)`);
            return res.status(403).json({
                success: false,
                message: "Accès refusé - Droits administrateur requis",
            });
        }

        console.log(`✅ Admin vérifié: ${req.user.email || req.user.id}`);
        next();
    } catch (error) {
        console.error("❌ Erreur adminMiddleware:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur",
        });
    }
};

// ===============================
// 📤 Exports
// ===============================
export default {
    authenticateToken,
    adminMiddleware,
};