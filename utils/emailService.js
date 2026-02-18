import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const { EMAIL_USER, EMAIL_PASSWORD, EMAIL_HOST, EMAIL_PORT } = process.env;

if (!EMAIL_USER || !EMAIL_PASSWORD) {
  console.warn("⚠️ Variables EMAIL_USER ou EMAIL_PASSWORD non configurées");
}

// ✅ Configuration optimisée pour Railway
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(EMAIL_PORT || "587"),
  secure: false, // true pour 465, false pour 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  // ✅ Timeouts augmentés pour Railway
  connectionTimeout: 60000,   // 60 secondes
  greetingTimeout: 30000,     // 30 secondes
  socketTimeout: 60000,       // 60 secondes
  // ✅ Pool de connexions
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  // ✅ Options SSL/TLS
  tls: {
    rejectUnauthorized: false,
  },
});

// ✅ Vérification au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Erreur configuration email:", error.message);
  } else {
    console.log("✅ Serveur email prêt");
  }
});

/**
 * ✅ Envoyer email avec RETRY automatique
 */
async function sendEmailWithRetry(mailOptions, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Tentative ${attempt}/${maxRetries}...`);
      
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Email envoyé (tentative ${attempt}):`, info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error(`❌ Tentative ${attempt}/${maxRetries} échouée:`, {
        message: error.message,
        code: error.code,
        command: error.command,
      });

      // Si dernière tentative, throw
      if (attempt === maxRetries) {
        throw new Error(
          `Échec après ${maxRetries} tentatives: ${error.message}`
        );
      }

      // Backoff exponentiel (1s, 2s, 4s, max 10s)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Retry dans ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * ✅ Template HTML pour code de réinitialisation
 */
function getResetPasswordTemplate(resetCode) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #D2691E 0%, #A0522D 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 8px 0 0;
          opacity: 0.95;
          font-size: 16px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .code-box { 
          background: linear-gradient(135deg, #FFF5E6 0%, #FFEFD5 100%);
          border: 3px solid #D2691E; 
          border-radius: 12px; 
          padding: 30px; 
          text-align: center; 
          margin: 30px 0;
        }
        .code { 
          font-size: 48px; 
          font-weight: 800; 
          color: #D2691E; 
          letter-spacing: 12px;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background: #FEF2F2;
          border-left: 4px solid #DC2626;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning strong {
          color: #DC2626;
        }
        .footer { 
          text-align: center; 
          padding: 30px;
          background: #f9f9f9;
          color: #666; 
          font-size: 13px;
          border-top: 1px solid #eee;
        }
        .footer strong {
          color: #D2691E;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FasoLang</h1>
          <p>Réinitialisation de mot de passe</p>
        </div>
        
        <div class="content">
          <p>Bonjour,</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :</p>
          
          <div class="code-box">
            <div class="code">${resetCode}</div>
          </div>
          
          <div class="warning">
            <strong>⏱️ Ce code expire dans 15 minutes.</strong>
          </div>
          
          <p>Entrez ce code dans l'application pour continuer.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, <strong>ignorez cet email</strong>.</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} <strong>FasoLang</strong> - Langues du Burkina Faso</p>
          <p style="margin-top: 8px;">Préserver • Transmettre • Célébrer</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * ✅ Envoyer code de réinitialisation
 */
export const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    console.log(`📧 Début envoi email pour ${email} avec code: ${resetCode}`);

    const mailOptions = {
      from: `"FasoLang" <${EMAIL_USER}>`,
      to: email,
      subject: "🔐 Code de réinitialisation - FasoLang",
      html: getResetPasswordTemplate(resetCode),
    };

    const result = await sendEmailWithRetry(mailOptions, 3);
    console.log(`✅ Email envoyé avec succès à ${email}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Erreur détaillée pour ${email}:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
};

/**
 * ✅ Vérification configuration SMTP
 */
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log("✅ Configuration email vérifiée avec succès");
    return true;
  } catch (error) {
    console.error("❌ Erreur configuration email:", {
      message: error.message,
      code: error.code,
    });
    return false;
  }
};

export default {
  sendPasswordResetEmail,
  verifyEmailConfig,
  transporter,
};