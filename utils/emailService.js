// services/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Vérifier que les variables d'environnement essentielles sont présentes
const { EMAIL_USER, EMAIL_PASSWORD } = process.env;

if (!EMAIL_USER || !EMAIL_PASSWORD) {
  console.warn("⚠️ Variables d'email non configurées");
}

// Configuration du transporteur
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

// ✅ CORRIGÉ: Envoi d'un CODE à 4 chiffres (pas de lien)
export const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    console.log(`📧 Préparation email avec code pour ${email}`);

    const mailOptions = {
      from: `"Langues du Faso" <${EMAIL_USER}>`,
      to: email,
      subject: "🔐 Code de réinitialisation - Langues du Faso",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3B82F6;">Réinitialisation de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Voici votre code de vérification à 4 chiffres :</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); 
                      padding: 20px; border-radius: 10px; display: inline-block;">
              <span style="font-size: 48px; letter-spacing: 8px; 
                         font-weight: bold; color: white;">
                ${resetCode}
              </span>
            </div>
          </div>
          
          <p><strong style="color: #DC2626;">Ce code expirera dans 15 minutes.</strong></p>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
          
          <p style="color: #6B7280; font-size: 14px;">
            Cordialement,<br>
            <strong>L'équipe Langues du Faso</strong>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé à ${email}`);
    return true;
    
  } catch (error) {
    console.error("❌ Erreur envoi email:", error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
};

// Vérification de la configuration SMTP
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log("✅ Configuration email vérifiée");
    return true;
  } catch (error) {
    console.error("❌ Erreur configuration email:", error);
    return false;
  }
};