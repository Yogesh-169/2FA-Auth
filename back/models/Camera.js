import mongoose from "mongoose";

const CameraSchema = new mongoose.Schema({
    name: String,
    status: String,
});

export default mongoose.model("Camera", CameraSchema);