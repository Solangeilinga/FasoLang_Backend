import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Vérifier que les variables d'environnement essentielles sont présentes
const { EMAIL_USER, EMAIL_PASSWORD } = process.env;

if (!EMAIL_USER || !EMAIL_PASSWORD ) {
  throw new Error(
    "Variables d'environnement manquantes : EMAIL_USER, EMAIL_PASSWORD ou FRONTEND_URL"
  );
}

// Configuration du transporteur
const transporter = nodemailer.createTransport({
  service: "gmail", // ou autre service SMTP
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD, // mot de passe d'application Gmail
  },
});

// Fonction d'envoi d'email de réinitialisation
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"Langues du Faso" <${EMAIL_USER}>`,
      to: email,
      subject: "Réinitialisation de votre mot de passe - Langues du Faso",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Réinitialisation de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Langues du Faso.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p>Ou copiez-collez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; color: #6B7280;">${resetLink}</p>
          <p><strong>Ce lien expirera dans 1 heure.</strong></p>
          <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 14px;">
            Cordialement,<br>
            L'équipe Langues du Faso
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de réinitialisation envoyé à ${email}`);
    return result;
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