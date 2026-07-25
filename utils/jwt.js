import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );
};
