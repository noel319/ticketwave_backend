import jwt from 'jsonwebtoken';

export const generateToken = (userId: string, expiresIn: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    return null;
  }
};