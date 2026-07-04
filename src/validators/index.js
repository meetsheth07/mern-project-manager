import { body } from 'express-validator';

const userRegisterValidator = () => {
  return [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address'),
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
      .isLowercase().withMessage('Username must be in lowercase'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6, max: 20 }).withMessage('Password must be between 6 and 20 characters'),
  ];
};
const userLoginValidator = () =>{
    return[
        body('email').optional().isEmail().withMessage('email is invalid'),
        body('password').notEmpty().withMessage('password is required')
    ]
}
export { userRegisterValidator , userLoginValidator};