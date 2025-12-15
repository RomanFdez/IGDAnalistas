import mongoose from 'mongoose';

const ImputationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    weekId: { type: String, required: true },
    taskId: { type: String, required: true },
    userId: { type: String, required: true }, // Reference to User.id (string)
    hours: {
        mon: { type: Number, default: 0 },
        tue: { type: Number, default: 0 },
        wed: { type: Number, default: 0 },
        thu: { type: Number, default: 0 },
        fri: { type: Number, default: 0 },
        sat: { type: Number, default: 0 },
        sun: { type: Number, default: 0 }
    },
    type: { type: String }, // Task Type ID
    seg: { type: Boolean, default: false },
    status: { type: String, default: 'DRAFT' }
});

export default mongoose.model('Imputation', ImputationSchema);
