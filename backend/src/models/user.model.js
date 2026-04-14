import mongoose from "mongoose";

const usersSchema = new mongoose.Schema({
    name:{
        type:String,
        required: true
    },
    email:{
        type:String,
        required: true,
        unique: true
    },
    password:{
        type:String,
        required: true
    },
    role:{
        type:String,
        enum:["Admin","Cashier"],
        default:"Cashier"
    }
},{
    timestamps:true
});

export default mongoose.model("User", userSchema);