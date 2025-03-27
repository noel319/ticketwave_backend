import { Router } from 'express';
import { 
  signUp, 
  login, 
  verifyEmail, 
  resendVerification 
} from '../controllers/authController';
import { validate } from '../middleware/validation';
import { 
  signupSchema, 
  loginSchema, 
  verifyEmailSchema 
} from '../utils/validators';

const router = Router();

router.post('/signup', validate(signupSchema), signUp);
router.post('/login', validate(loginSchema), login);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', resendVerification);

export default router;