import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError}  from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken =  user.genAccessToken()
        const refreshToken = user.genRefreshToken()
        console.log(`${accessToken} \n ${refreshToken}`);
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false}) //Saving refresh token to the user's data for easier login

        return{accessToken,refreshToken}

    } catch (error) {
        throw new ApiError("500","Something went wrong while generating access and refresh token")
    }
}
const registerUser= asyncHandler(async (req,res)=>{
    /* Steps to be checked:
    1.Get details from user
    2. Validate the info 
    3. Check if the user already exists
    4. Check for any image submission and upload the image to cloudinary
    5.Get the url for the image from cloudinary
    6.Create user object and an entry in the database
    7.Remove password and ref token from response
    8.Check for creation and return response*/

    const {fullName,email,username,password}=req.body // gets data from any forms
    console.log("fullName: ",fullName)

    //Checking if any of the required fields are empty or not
    
    if(
    [fullName,email,password,username].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    } 

    const existingUser = await User.findOne({
        $or:[{ username },{ email }]
    })

    if(existingUser){
        throw  new ApiError(409,"User with the username or email already exists")
    }
    
    
    const avatarLocalPath = req.files?.avatar[0].path

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0 ){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){ //Checks for avatar upload
        throw new ApiError(400,"Avatar is required")
    }

   const user = await User.create({ // Creates an entry in the database
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "", // As coverimage is not a required field we check for it's existence
        email,
        password,
        username: username.toLowerCase(),

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"// the '-' sign indicates which fields are to be deselected 
    )//By default all fields are selected

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered succesfully")
    )
    
});
const loginUser = (async(req,res) => {
    /*Steps for login:
    1.Take details from user
    2. Validate info
    3.Check for user in db
    5.Get password
    6.Access and refresh token(Forgot)
    7.Then login depending on the validation*/

    const {username,email,password} = req.body
    if(!username && !email){ //Check whether username or email is given or not
        throw new ApiError(400 , "Username or email required")
    }

    const user=await User.findOne({
        $or:[{username} ,{email}] //finding by username or email
    }).select("+password")
    
    if(!user){
        throw new ApiError(400,"User does not exist")
    }
    
    const passCheck = await user.isPasswordCorrect(password)

    if(!passCheck){
        throw new ApiError(401,"Invalid user credentials")
    }
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggednInUser = await User.findById(user._id).select("-password -refreshToken")

    const option = {      //creating a characteristics of the cookie to be sent
        httpOnly :true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,option)
    .cookie("refreshToken",refreshToken,option)
    .json(new ApiResponse(200,
        {
            user: loggednInUser , accessToken ,refreshToken
        },
        "User logged in successfully"
    ))
})

const logOutUser = asyncHandler(async(req , res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken: undefined
        }
    },{
        new: true
    })

    const option = {      //creating a characteristics of the cookie to be sent
        httpOnly :true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",option)
    .clearCookie("refreshToken",option)
    .json(new ApiResponse(200,{},"User logged out"))
    
})

const refreshAccessToken = asyncHandler(async(req , res)=>{
    const incomingRefreshToken =req.cookie.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)//verifies the refresh token with the secret
    
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingRefreshToken!=user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
        const option = {
            httpOnly : true,
            secure : true
        }
        const {accessToken,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",newRefreshToken,option)
        .json(new ApiResponse(200,{accessToken,refreshToken: newRefreshToken},"Access token refreshed"))
    
    } catch (error) {
       throw new ApiError(401 , error?.message|| "Invaid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req ,res)=>{
    const {oldPassword,newPassword} = req.body
    
    const user = await User.findById(req.user._id)

    const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200,{},"Password changed succesfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(200, req.user , "Current user fetched succesfully")
}) //    Code , Object to be returned , Message to be delivered

const updateAccountDetails = asyncHandler(async(req,res) =>{
    const {fullName,email} = req.body
    
    if(!fullName || !email){
        throw new ApiError(400 , "All fields are required")
    }

    const user = User.findByIdAndUpdate(req.user._id,
        {
        $set : {
            fullName,
            email : this.email
        }
    },
    {new:true}).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user , "Account details updated sucessfully"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set: {
            avatar: avatar.url
        }
    },{new : true}).select("-password")
    
    return res.status(200).json(new ApiResponse(200,user,"Avatar updated succesfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400 , "Cover Image file is missing")
    }

    const avatar = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading the cover iamge")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set: {
            coverImage: coverImage.url
        }
    },{new : true}).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Cover Image updated succesfully"))
})

export {registerUser,
     loginUser,
     logOutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage}