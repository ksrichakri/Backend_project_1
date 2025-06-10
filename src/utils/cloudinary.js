import {v2 as cloudinary} from "cloudinary"
import { response } from "express";
import fs from "fs"

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

     const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null;

        const response= await cloudinary.uploader.upload(localFilePath , {
            resource_type : "auto"
        })
        //console.log("The file has been uploaded successfully ",response.url);
        fs.unlinkSync(localFilePath)//removes file from local system as it is uploaded to cloud
        return response
        
    } catch (error) {
        fs.unlinkSync(localFilePath) // removes the temp file when the upload operation fails
        return null
    }
     }

     export {uploadOnCloudinary}
/*await cloudinary.uploader
       .upload(
           'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )*/