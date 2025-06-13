import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken"; // It is a bearer token 
import bcrypt from "bcrypt";
import { use } from "react";

const userSchema = new Schema({
username:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true
},
email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
},
fullName:{
    type:String,
    required:true,
    trim:true,
    index:true
},
avatar:{
    type:String,//URL 
    required:true
},
coverImage:{
    type:String
},
watchHistory:{
    type:Schema.Types.ObjectId,
    ref:"Video"
},
password:{
    type:String,
required:[true,"Password is required"]
},
refreshToken:{
    type:String
}
},{timestamps:true})

userSchema.pre("save",async function(next) {
    if(!this.isModified("password")) return next(); // Ensures password gets saved only when changed

    this.password = await bcrypt.hash(this.password, 10) // Used for encrypting password
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){

    return await bcrypt.compare(password,this.password) // compares the encrypted and given password
}

userSchema.methods.genAccessToken = function(){
    return jwt.sign({
        _id:this._id,
         username: this.username,
        email: this.email,
        fullName:this.fullName,

   },
   process.env.ACCESS_TOKEN_SECRET,
   {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
   }
)
}

userSchema.methods.genRefreshToken = function(){
    return jwt.sign({
        _id:this._id,
        email: this.email,
        username: this.username,
        fullName:this.fullName,

   },
   process.env.REFRESH_TOKEN_SECRET,
   {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
   }
)
}
export const User = mongoose.model('User',userSchema)