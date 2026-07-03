import {Router} from 'express';
import {registerUser, verifyEmail,login} from '../controllers/auth.controllers.js';
import {validate} from "../middlewares/validation.middlewares.js";
import {userRegisterValidator} from "../validators/index.js";
const router = Router();
router.route('/register').post(userRegisterValidator(), validate, registerUser);
router.get('/verify-email/:token', verifyEmail);
router.route('/login').post(login);
export default router;


