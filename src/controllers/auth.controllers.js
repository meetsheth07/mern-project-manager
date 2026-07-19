import { user as User } from "../models/user.models.js";
import { apiResponse } from "../utils/api-response.js";
import { apiError } from "../utils/api-errors.js";
import asyncHandler from "../utils/async-handler.js";
import { sendEmail, emailVerificationmailGenContent } from "../utils/mail.js";
import crypto from "node:crypto";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const found = await User.findById(userId);
    if (!found) throw new apiError(404, "User not found");
    const accessToken = found.generateAccessToken();
    const refreshToken = found.generateRefreshToken();

    found.refreshToken = refreshToken;
    await found.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(500, "Something went wrong while generating access token");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new apiError(409, "User already exists", []);
  }

  const newUser = await User.create({
    email,
    username,
    password,
    isEmailVerified: false,
  });

  const { unhashedToken, hashedToken, TokenExpiry } = newUser.generateTemporaryToken();
  newUser.emailVerficationToken = hashedToken;
  newUser.emailVerficationExpiry = TokenExpiry;
  await newUser.save({ validateBeforeSave: false });

  await sendEmail({
    email: newUser.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationmailGenContent(
      newUser.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unhashedToken}`,
    ),
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken -emailVerficationToken -emailVerficationExpiry",
  );
  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering a user");
  }

  return res.status(201).json(
    new apiResponse(
      201,
      "User registered successfully and verification email has been sent on your email",
      { user: createdUser },
    ),
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken) {
    throw new apiError(400, "Email verification token is missing");
  }

  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  const user = await User.findOne({
    emailVerficationToken: hashedToken,
    emailVerficationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new apiError(400, "Token is expired or invalid");
  }

  user.emailVerficationToken = undefined;
  user.emailVerficationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new apiResponse(200, "Email verified successfully", { isEmailVerified: true }),
  );
});

const login = asyncHandler(async(req,res)=>{
  const {email,password,username} = req.body
  if(!email){
    throw new apiError(400,"email is required")
  }
  if(!password){
    throw new apiError(400,"password is required")
  }
  const user = await User.findOne({email})
  if(!user){
    throw new apiError(404,"user not found")
  }
  
  const isPasswordCorrect = await user.isPasswordCorrect(password)
  if(!isPasswordCorrect){
    throw new apiError(401,"Invalid password")
  }
  const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);
  const LoggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerficationToken -emailVerficationExpiry",
  );
  if (!LoggedInUser) {
    throw new apiError(500, "Something went wrong while logging in the user");
  }
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new apiResponse(200, "User logged in successfully", { user: LoggedInUser, accessToken, refreshToken }));

})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, "User logged out successfully", {}));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new apiResponse(200, "current user fetched successfully", req.user),
  );
});

const resendEmailVerfication = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new apiError(404, "user not found");
  }
  if (user.isEmailVerified) {
    throw new apiError(409, "email is already verified");
  }

  const { unhashedToken, hashedToken, TokenExpiry } = user.generateTemporaryToken();
  user.emailVerficationExpiry = TokenExpiry;
  user.emailVerficationToken = hashedToken;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationmailGenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unhashedToken}`,
    ),
  });

  return res.status(200).json(
    new apiResponse(200, "verification email has been sent successfully", {}),
  );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorized access");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "Refresh token is expired");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(200, "Access token refreshed", {
          accessToken,
          refreshToken: newRefreshToken,
        }),
      );
  } catch (error) {
    throw new apiError(401, "Invalid refresh token");
  }
});
const forgotPassword = asyncHandler(async (req,res)=>{
  const {email} = req.body;
  const user = await User.findOne({email});
  if(!user){
    throw new apiError(404, " user not found",[]);
  }
  const { unHashedToken, hashedToken, TokenExpiry} = user.generateTemporaryToken()
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = TokenExpiry;
  await user.save({validateBeforeSave:false})
  await sendEmail({
    email: user.email,
    subject: "Password Reset",
    mailgenContent: forgotPasswordmailGenContent(
      user.username,
      `${req.protocol}://${req.get("host")}${process.env.FORGOT_PASSWORD_URL}/${unHashedToken}`,
    ),
  })
  return res.status(200).json(new apiRespone(200, "Password reset mail has been sent successfully",{}));

})

const resetForgotPassword = asyncHandler(async (req,res)=>{
  const {resetToken} = req.params;
  const {newPassword} = req.body;
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: {$gt: Date.now()}
  })
  if(!user){
    throw new apiError(489, "Token is Expired or Invalid",[]);
  }
  user.password = newPassword;
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;
  await user.save({validateBeforeSave:false});
  return res.status(200).json(new apiResponse(200, "Password has been reset successfully",{}));

})

const changeCurrentPassword = asyncHandler(async (req,res)=>{
   const {oldPassword,newPassword} = req.body;
   const user = await User.findById(req.user?._id);
   const isPasswordValid = await user.isPasswordCorrect(oldPassword);
   if(!isPasswordValid){
      throw new apiError(401, "Old password is incorrect",[]);
   }
   user.password = newPassword;
    await user.save({validateBeforeSave:false});
    return res.status(200).json(new apiResponse(200, "Password has been changed successfully",{}));
})


export { registerUser, verifyEmail ,login, logoutUser, getCurrentUser, resendEmailVerfication , refreshAccessToken, forgotPassword, resetForgotPassword, changeCurrentPassword};  