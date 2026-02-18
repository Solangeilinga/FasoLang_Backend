// services/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Vérifier que les variables d'environnement essentielles sont présentes
const { EMAIL_USER, EMAIL_PASSWORD } = process.env;

if (!EMAIL_USER || !EMAIL_PASSWORD) {
  console.warn("⚠️ Variables d'email non configurées");
}

// ✅ CONFIGURATION CORRIGÉE - avec port 587 et IPv4 forcé
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,                    // Port TLS (plus fiable que 465 sur Railway)
  secure: false,                 // false pour port 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  family: 4,                     // 🔥 FORCE IPv4 (résout l'erreur ENETUNREACH)
  connectionTimeout: 30000,       // 30 secondes timeout connexion
  greetingTimeout: 30000,         // 30 secondes timeout greeting
  socketTimeout: 60000,           // 60 secondes timeout socket
  tls: {
    rejectUnauthorized: false,    // Évite certains problèmes de certificat
    ciphers: 'SSLv3'              // Compatibilité
  },
  debug: process.env.NODE_ENV === 'development' // Logs détaillés en dev
});

// ✅ FONCTION PRINCIPALE - Envoi du code à 4 chiffres
export const sendPasswordResetEmail = async (email, resetCode) => {
  console.log(`📧 Début envoi email pour ${email} avec code: ${resetCode}`);
  
  // Validation des entrées
  if (!email || !resetCode) {
    throw new Error("Email et code requis");
  }

  try {
    const mailOptions = {
      from: `"Langues du Faso" <${EMAIL_USER}>`,
      to: email,
      subject: "🔐 Code de réinitialisation - Langues du Faso",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- En-tête -->
            <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Langues du Faso</h1>
            </div>
            
            <!-- Corps -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1F2937; margin-bottom: 20px;">Réinitialisation de mot de passe</h2>
              
              <p style="color: #4B5563; line-height: 1.6; margin-bottom: 30px;">
                Bonjour,<br><br>
                Vous avez demandé la réinitialisation de votre mot de passe. 
                Voici votre code de vérification à 4 chiffres :
              </p>
              
              <!-- Code à 4 chiffres -->
              <div style="text-align: center; margin: 40px 0;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); 
                          padding: 20px 40px; 
                          border-radius: 12px; 
                          display: inline-block;
                          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  <span style="font-size: 48px; 
                             letter-spacing: 8px; 
                             font-weight: bold; 
                             color: white;">
                    ${resetCode}
                  </span>
                </div>
              </div>
              
              <!-- Infos expiration -->
              <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 30px 0;">
                <p style="color: #92400E; margin: 0; font-weight: 500;">
                  ⏰ Ce code expirera dans <strong>15 minutes</strong>
                </p>
              </div>
              
              <!-- Message sécurité -->
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; border-left: 3px solid #3B82F6; padding-left: 15px;">
                Si vous n'avez pas demandé cette réinitialisation, 
                ignorez cet email et votre mot de passe restera inchangé.
              </p>
            </div>
            
            <!-- Pied de page -->
            <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 14px; margin: 0;">
                Cordialement,<br>
                <strong style="color: #3B82F6;">L'équipe Langues du Faso</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Version texte simple pour les clients email qui n'acceptent pas le HTML
      text: `
        Réinitialisation de mot de passe - Langues du Faso
        
        Bonjour,
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        Voici votre code de vérification : ${resetCode}
        
        Ce code expirera dans 15 minutes.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        Cordialement,
        L'équipe Langues du Faso
      `
    };

    // Envoi avec timeout
    const result = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout envoi email (30s)")), 30000)
      )
    ]);

    console.log(`✅ Email envoyé avec succès à ${email} - ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error(`❌ Erreur détaillée pour ${email}:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    
    // Gestion spécifique des erreurs
    if (error.code === 'ESOCKET' || error.message.includes('ENETUNREACH')) {
      throw new Error("Impossible de joindre le serveur Gmail - Vérifiez votre connexion réseau");
    } else if (error.code === 'EAUTH') {
      throw new Error("Erreur d'authentification - Vérifiez vos identifiants Gmail");
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error("Timeout - Le serveur Gmail ne répond pas");
    } else {
      throw new Error(`Erreur envoi email: ${error.message}`);
    }
  }
};

// ✅ FONCTION DE TEST - Vérifie la configuration
export const verifyEmailConfig = async () => {
  console.log("🔍 Vérification configuration email...");
  console.log("- EMAIL_USER:", EMAIL_USER ? "✅ Défini" : "❌ Non défini");
  console.log("- EMAIL_PASSWORD:", EMAIL_PASSWORD ? "✅ Défini" : "❌ Non défini");
  
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    console.error("❌ Configuration incomplète");
    return false;
  }

  try {
    // Test avec timeout
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout vérification")), 10000)
      )
    ]);
    
    console.log("✅ Configuration email vérifiée avec succès");
    console.log("📧 Serveur SMTP Gmail accessible");
    return true;
    
  } catch (error) {
    console.error("❌ Échec vérification email:", error.message);
    
    // Tentative avec config alternative
    try {
      console.log("🔄 Tentative avec configuration alternative...");
      const testTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
        family: 4,
        connectionTimeout: 10000
      });
      
      await testTransporter.verify();
      console.log("✅ Configuration alternative fonctionne (port 465)");
      return true;
    } catch (altError) {
      console.error("❌ Toutes les configurations ont échoué");
      return false;
    }
  }
};

// ✅ EXPORT de la configuration pour usage externe
export const emailConfig = {
  isConfigured: !!(EMAIL_USER && EMAIL_PASSWORD),
  user: EMAIL_USER,
  provider: 'gmail'
};