import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    code: { type: String },
    name: { type: String, required: true },
    description: { type: String },
    permanent: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    targetRoles: [{ type: String }],
    assignedUserIds: [{ type: String }], // Array of User IDs
    isGlobal: { type: Boolean, default: false },
    utes: { type: Number, default: 0 }, // Budget in hours
    hito: { type: String } // Added hito field
});

export default mongoose.model('Task', TaskSchema);
