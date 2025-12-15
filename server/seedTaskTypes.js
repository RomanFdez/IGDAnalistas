import mongoose from 'mongoose';
import TaskType from './models/TaskType.js';
import 'dotenv/config';

// DB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://igdapp:Castellae1259@192.168.1.63/igdanalistas?authSource=admin';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ DB Error:', err);
        process.exit(1);
    });

const taskTypes = [
    { id: 'TRABAJADO', label: 'Trabajado', color: '#E8F5E9' },     // Verde
    { id: 'JIRA', label: 'Jira', color: '#A5D6A7' },          // Verde más oscuro (Green 200)
    { id: 'YA_IMPUTADO', label: 'Ya imputado', color: '#E3F2FD' }, // Azul
    { id: 'PRE_IMPUTADO', label: 'Pre-imputado', color: '#90CAF9' }, // Azul más oscuro (Blue 200)
    { id: 'SIN_PROYECTO', label: 'Sin proyecto', color: '#F5F5F5' }, // Gris
    { id: 'PENDIENTE', label: 'Pendiente', color: '#FCE4EC' },    // Rosa
    { id: 'REGULARIZADO', label: 'Regularizado', color: '#FFE0B2' }, // Naranja
    { id: 'RECUPERADO', label: 'Recuperado', color: '#E1BEE7' },  // Morado
    { id: 'VACACIONES', label: 'Vacaciones', color: '#ECEFF1' },  // Gris Blue
    { id: 'ENFERMEDAD', label: 'Enfermedad', color: '#CFD8DC' },  // Gris Blue darker
    { id: 'FESTIVO', label: 'Festivo', color: '#B0BEC5' }         // Gris Blue darkest
];

const seed = async () => {
    try {
        console.log('Cleaning existing TaskTypes...');
        await TaskType.deleteMany({});

        console.log('Inserting new TaskTypes...');
        await TaskType.insertMany(taskTypes);

        console.log('✅ Task Types seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding:', error);
        process.exit(1);
    }
};

seed();
