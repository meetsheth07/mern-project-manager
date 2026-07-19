import { Router } from 'express';
import {
  registerUser,
  verifyEmail,
  login,
  logoutUser,
  resendEmailVerfication,
  refreshAccessToken,
} from '../controllers/auth.controllers.js';
import { validate } from '../middlewares/validation.middlewares.js';
import { userRegisterValidator, userLoginValidator } from '../validators/index.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

router.route('/register').post(userRegisterValidator(), validate, registerUser);
router.get('/verify-email/:verificationToken', verifyEmail);
router.route('/login').post(userLoginValidator(), validate, login);
router.route('/resend-verification-email').post(verifyJWT, resendEmailVerfication);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/logout').post(verifyJWT, logoutUser);

export default router;


