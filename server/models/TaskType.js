import mongoose from 'mongoose';

const TaskTypeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    color: { type: String },
    structural: { type: Boolean, default: false },
    computesInWeek: { type: Boolean, default: true },
    subtractsFromBudget: { type: Boolean, default: true }
});

export default mongoose.model('TaskType', TaskTypeSchema);
