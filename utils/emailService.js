// services/emailService.js
import sgMail from '@sendgrid/mail';
import dotenv from "dotenv";

dotenv.config();

const { SENDGRID_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME } = process.env;

if (!SENDGRID_API_KEY || !EMAIL_FROM) {
  console.warn("⚠️ Variables SendGrid non configurées");
}

sgMail.setApiKey(SENDGRID_API_KEY);

// Design system FasoLang pour les emails
const colors = {
  primary: '#8B5A2B',      // Terre d'Afrique
  gold: '#F3BB00',         // Or
  background: '#F9FAFB',   // Ivoire
  text: '#4B5563',         // Marron chaud
  white: '#FFFFFF',
  success: '#047857',
  error: '#B91C1C',
  border: '#E5E7EB'
};

// Générer le template HTML
const generateResetEmailHTML = (resetCode: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Réinitialisation - FasoLang</title>
</head>
<body style="margin:0; padding:0; background-color:${colors.background}; font-family:'Helvetica Neue',Arial,sans-serif;">
  
  <!-- Conteneur principal -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${colors.background};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        
        <!-- Carte email -->
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:${colors.white}; border-radius:24px; border:2px solid ${colors.gold}20; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
          
          <!-- Header avec logo et titre -->
          <tr>
            <td style="padding:40px 30px 20px; text-align:center;">
              <!-- Logo (texte stylisé en attendant logo réel) -->
              <div style="width:80px; height:80px; background:linear-gradient(135deg, ${colors.primary}, #B1743F); border-radius:40px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 6px -1px rgba(139,90,43,0.2);">
                <span style="color:${colors.white}; font-size:36px; font-weight:bold;">F</span>
              </div>
              
              <!-- Titre avec gradient -->
              <div style="background:linear-gradient(135deg, ${colors.primary}, #B1743F); padding:8px 24px; border-radius:20px; display:inline-block; margin-bottom:12px;">
                <span style="color:${colors.white}; font-size:28px; font-weight:800; letter-spacing:0.5px;">FasoLang</span>
              </div>
              
              <p style="color:${colors.text}; font-size:16px; font-style:italic; margin:0;">La voix de nos racines</p>
            </td>
          </tr>
          
          <!-- Séparateur doré -->
          <tr>
            <td align="center">
              <div style="height:4px; width:60px; background:${colors.gold}; border-radius:2px; margin:10px auto 30px;"></div>
            </td>
          </tr>
          
          <!-- Contenu principal -->
          <tr>
            <td style="padding:0 30px 30px;">
              <h2 style="color:${colors.primary}; font-size:24px; font-weight:700; text-align:center; margin:0 0 16px;">
                Réinitialisation de mot de passe
              </h2>
              
              <p style="color:${colors.text}; font-size:16px; line-height:1.6; margin:0 0 24px;">
                Bonjour,
              </p>
              
              <p style="color:${colors.text}; font-size:16px; line-height:1.6; margin:0 0 24px;">
                Vous avez demandé la réinitialisation de votre mot de passe pour votre compte FasoLang.
                Voici votre code de vérification à 4 chiffres :
              </p>
              
              <!-- Code de vérification -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <div style="background:linear-gradient(135deg, ${colors.primary}, #B1743F); padding:20px 40px; border-radius:16px; display:inline-block; box-shadow:0 4px 6px -1px rgba(139,90,43,0.3);">
                      <span style="font-size:48px; letter-spacing:8px; font-weight:bold; color:${colors.white};">
                        ${resetCode}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Infos expiration -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                <tr>
                  <td style="background-color:#FEF3C7; padding:16px; border-radius:12px;">
                    <p style="color:#92400E; font-size:14px; font-weight:500; text-align:center; margin:0;">
                      ⏰ Ce code expirera dans <strong>15 minutes</strong>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Message sécurité -->
              <p style="color:${colors.text}; font-size:14px; line-height:1.6; border-left:3px solid ${colors.gold}; padding-left:16px; margin:30px 0;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet email 
                et votre mot de passe restera inchangé.
              </p>
              
              <!-- Bouton (fallback) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 20px;">
                <tr>
                  <td align="center">
                    <a href="#" style="background-color:${colors.gold}; color:#000000; padding:14px 28px; border-radius:12px; font-weight:600; text-decoration:none; font-size:16px; display:inline-block; border:1px solid ${colors.gold}80;">
                      Accéder à FasoLang
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:30px; background-color:${colors.background}; border-top:1px solid ${colors.border};">
              <p style="color:${colors.text}; font-size:13px; line-height:1.6; text-align:center; margin:0 0 10px;">
                Cordialement,<br>
                <strong style="color:${colors.primary};">L'équipe FasoLang</strong>
              </p>
              <p style="color:${colors.text}80; font-size:12px; text-align:center; margin:10px 0 0;">
                © ${new Date().getFullYear()} FasoLang. Tous droits réservés.
              </p>
              <p style="color:${colors.text}60; font-size:11px; text-align:center; margin:10px 0 0;">
                Cet email a été envoyé à <strong>${email}</strong>
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Version texte simple (fallback)
const generateResetEmailText = (resetCode: string) => `
RÉINITIALISATION DE MOT DE PASSE - FASOLANG

Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe.
Voici votre code de vérification : ${resetCode}

Ce code expirera dans 15 minutes.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Cordialement,
L'équipe FasoLang
`;

export const sendPasswordResetEmail = async (email: string, resetCode: string) => {
  try {
    console.log(`📧 Préparation email FasoLang pour ${email} avec code: ${resetCode}`);

    const msg = {
      to: email,
      from: {
        email: EMAIL_FROM,
        name: process.env.EMAIL_FROM_NAME || "FasoLang"
      },
      subject: "🔐 Code de réinitialisation - FasoLang",
      html: generateResetEmailHTML(resetCode),
      text: generateResetEmailText(resetCode),
      
      // Tracking settings (optionnel)
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: true }
      }
    };

    const response = await sgMail.send(msg);
    console.log(`✅ Email FasoLang envoyé à ${email} - Status: ${response[0]?.statusCode}`);
    
    return {
      success: true,
      messageId: response[0]?.headers['x-message-id']
    };
    
  } catch (error: any) {
    console.error("❌ Erreur SendGrid détaillée:", {
      message: error.message,
      response: error.response?.body,
      code: error.code
    });
    
    // Amélioration des messages d'erreur
    if (error.response) {
      const { errors } = error.response.body;
      if (errors && errors.length > 0) {
        throw new Error(`SendGrid: ${errors[0].message}`);
      }
    }
    
    throw new Error("Erreur lors de l'envoi de l'email");
  }
};

// Fonction de test de configuration
export const testEmailConfig = async () => {
  console.log("🔍 Test configuration SendGrid:");
  console.log("- API Key présente:", SENDGRID_API_KEY ? "✅" : "❌");
  console.log("- EMAIL_FROM:", EMAIL_FROM ? `✅ ${EMAIL_FROM}` : "❌");
  console.log("- EMAIL_FROM_NAME:", process.env.EMAIL_FROM_NAME || "⚠️ (valeur par défaut: FasoLang)");
  
  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    console.error("❌ Configuration incomplète");
    return false;
  }
  
  return true;
};