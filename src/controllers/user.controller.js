import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/apiError.js'
import User  from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import ApiResponse from '../utils/apiResponse.js' 
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async(userId) => {
    try{
       const user = await User.findById(userId);
       const accessToken = user.generateAccessToken();
       const refreshToken = user.generateRefreshToken();

       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave: false});

       return {accessToken, refreshToken}

    } catch(error){
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res) =>{
    const {fullName, email, password, username} = req.body; // taking data from frontend

    // validating data
    if(
        [fullName,email,password,username].some((field) => field?.trim() =="")
    ){
        throw new ApiError(400,"All fields are required")
    }
    
    // Check whether the username or email already exists 

    const existedUser = await User.findOne({
        $or: [ {username},{email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // Uploading files on Cloundinary

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(new ApiResponse(200,createdUser,"User Registered Successfully"));
})

const loginUser = asyncHandler(async (req,res)=>{
    // get data from frontend
    const {email,username,password} = req.body;

    // Check whether username or email provided
    if(!email && !username){
        throw new ApiError(400, "username or email is required")
    }

    // if provided search the user in the database either on the basis of email or username
    const user = await User.findOne(
        {
            $or: [{username}, {email}]
        }
    )
    
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    // check whether password provided by user is correct or not

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    // generating access and refresh token and saving it in the database
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // creating cookie
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )

})

const logoutUser = asyncHandler(async (req,res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {} , "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req,res)=> {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(401, "Invalid refresh token");
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

   const{accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

   return res
   .status(200)
   .cookie("accessToken", accessToken,options)
   .cookie("refreshToken", newRefreshToken,options)
   .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access token refreshed"
        )
   )
})

export {registerUser, loginUser, logoutUser,refreshAccessToken}