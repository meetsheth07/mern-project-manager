import { user as User } from "../models/user.models.js";
import { apiResponse } from "../utils/api-response.js";
import { apiError } from "../utils/api-errors.js";
import asyncHandler from "../utils/async-handler.js";
import { sendEmail, emailVerificationmailGenContent } from "../utils/mail.js";
import crypto from "node:crypto";

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
  const { token } = req.params;
  if (!token) throw new apiError(400, "Verification token is required");

  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const found = await User.findOne({
    emailVerficationToken: hashed,
    emailVerficationExpiry: { $gt: Date.now() },
  });

  if (!found) {
    throw new apiError(400, "Invalid or expired verification token");
  }

  found.isEmailVerified = true;
  found.emailVerficationToken = undefined;
  found.emailVerficationExpiry = undefined;
  await found.save({ validateBeforeSave: false });

  return res.status(200).json(new apiResponse(200, "Email verified successfully", { user: found }));
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

const getCurrentUser = asyncHandler(async(req , res)=>{
   return res.status(200).json(
    new apiResponse(200,
      req.user,
      "current user fetched successfully"
    )
   )
})

export { registerUser, verifyEmail ,login, logoutUser, getCurrentUser};  