import { user as User } from '../models/user.models.js';
import jwt from 'jsonwebtoken';
import { apiError } from '../utils/api-errors.js';
import asyncHandler from '../utils/async-handler.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = req.cookies?.accessToken || authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new apiError(401, 'Unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const foundUser = await User.findById(decodedToken?._id).select(
      '-password -refreshToken -emailVerficationToken -emailVerficationExpiry',
    );

    if (!foundUser) {
      throw new apiError(401, 'Invalid access token');
    }

    req.user = foundUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error.name === 'TokenExpiredError') {
      throw new apiError(401, 'Invalid access token');
    }
    throw error;
  }
});