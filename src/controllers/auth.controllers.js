import {user} from "../models/user.models.js";
import { apiResponse } from "../utils/api-response.js";
import {apiError} from "../utils/api-errors.js";
import asyncHandler from "../utils/async-handler.js";
import {sendEmail} from "../utils/email.js";


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token",
    );
  }
};

const registerUser = asyncHandler(async (req,res)=>{
    const {email,username,password,role} = req.body;
    const existedUser = await user.findOne({
        $or:[{username}, {email}]
    })
    if(existedUser) {
        throw new apiError(409, "User already exists",[]);
    }
    const user = await user.create({
        email,
        username,
        password,
        isEmailVerified:false,
    })
    const {unHashedToken,hashedToken,TokenExpiry} = user.generateTemporaryToken();
    user.emailVerficationToken = hashedToken;
    user.emailVerficationExpiry = TokenExpiry;
    await user.save({validateBeforeSave:false}); 
    await sendEmail({
        email : user.email,
        subject : "Email Verification",
        mailgenContent : emailVerificationmailGenContent(user.username,`${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`)
    })
    const createdUser = await user.findById(user._id).select("-password -refreshToken -emailVerficationToken -emailVerficationExpiry ");
     if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user");
     }
     return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User registered successfully and verification email has been sent on your email",
      ),
    );

})

export {registerUser};