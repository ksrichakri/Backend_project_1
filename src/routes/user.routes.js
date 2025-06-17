import { Router } from "express";
import { loginUser, logOutUser, registerUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";
const router = Router()


//injecting middleware
router.route("/register").post(upload.fields([
    {name:"avatar",
        maxCount:1
    },
    {name:"coverImage",
        maxCount: 1
    }
]),registerUser)
//router.route("/login").post(login)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT,logOutUser)

router.route("/refresh_token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT , changeCurrentPassword)

router.route("/current-user").get(verifyJWT , getCurrentUser)

router.route("/update-account").patch(verifyJWT , updateAccountDetails)

router.route("/avatar").patch(verifyJWT , upload.single("avatar") , updateUserAvatar)

router.route("/cover-image").patch(verifyJWT , upload.single("/coverImage") , updateUserCoverImage)

router.route("/c/:username").get(verifyJWT , getUserChannelProfile) // we have to write the /c/: because we are using params to get info 

router.route("/history").get(verifyJWT , getWatchHistory)
export default router