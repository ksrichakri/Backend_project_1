import { Router } from "express";
import { loginUser, logOutUser, registerUser,refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
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
export default router