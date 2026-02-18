// services/emailService.js
import sgMail from '@sendgrid/mail';
import dotenv from "dotenv";

dotenv.config();

const { SENDGRID_API_KEY, EMAIL_FROM } = process.env;

if (!SENDGRID_API_KEY || !EMAIL_FROM) {
  console.warn("⚠️ Variables SendGrid non configurées");
}

sgMail.setApiKey(SENDGRID_API_KEY);

export const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    console.log(`📧 Préparation email SendGrid pour ${email} avec code: ${resetCode}`);

    const msg = {
      to: email,
      from: EMAIL_FROM, // Utilise ton email vérifié chez SendGrid
      subject: "🔐 Code de réinitialisation - Langues du Faso",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Réinitialisation de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Voici votre code de vérification à 4 chiffres :</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #3B82F6; padding: 20px; border-radius: 10px;">
              <span style="font-size: 48px; letter-spacing: 8px; color: white; font-weight: bold;">
                ${resetCode}
              </span>
            </div>
          </div>
          <p>Ce code expirera dans 15 minutes.</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`✅ Email envoyé via SendGrid à ${email}`);
    return true;
    
  } catch (error) {
    console.error("❌ Erreur SendGrid:", error.response?.body || error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
};