import mongoose from "mongoose";

const userScema = new  mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email:{
        type: String,
      required: true,
      unique:true,
    },
    password: {
      type: String,
      required: true,
    },
    role:{
        type:String,
        enum:['user' ,'admin'],
        default:'user',
    },
    isVerified:{
        type: Boolean,
        default:false,  
    },
  },
  { timestamps: true },
);

const User = mongoose.model('User',userScema);
export default User;
