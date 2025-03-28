export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    isVerified: boolean;
    verificationToken?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
  }
  
  export interface JwtPayload {
    userId: string;
  }
  
  declare global {
    namespace Express {
      interface Request {
        user?: JwtPayload;
      }
    }
  }