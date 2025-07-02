

import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();
const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () =>
            console.log(" Database connected")
        );
        mongoose.connection.on("error", (err) =>
            console.error(" Database connection error:", err)
        );

       
        await mongoose.connect(`${process.env.MONGO_URI}/smartculinary_DB`)
        
    } catch (error) {
        console.error(" Error connecting to the database:", error);
        process.exit(1);
    }
};

export default connectDB;

