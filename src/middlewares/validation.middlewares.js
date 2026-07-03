import {validationResult} from 'express-validator';
import {apiError} from '../utils/api-errors.js';

export const validate = (req,res,next)=>{
    const errors = validationResult(req);
    if(errors.isEmpty()){
        return next();
    }
}