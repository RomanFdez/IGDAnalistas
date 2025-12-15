import mongoose from 'mongoose';

const WeekLockSchema = new mongoose.Schema({
    weekId: { type: String, required: true, unique: true },
    isLocked: { type: Boolean, default: false }
});

export default mongoose.model('WeekLock', WeekLockSchema);
