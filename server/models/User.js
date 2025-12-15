import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Keeping string ID for compatibility
    name: { type: String, required: true },
    password: { type: String, required: true },
    roles: [{ type: String }],
    active: { type: Boolean, default: true }
});

export default mongoose.model('User', UserSchema);
