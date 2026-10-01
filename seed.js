require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in the environment variables.');
    process.exit(1);
}

const TestSchema = new mongoose.Schema({
    name: String,
    createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('Test', TestSchema);

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await TestModel.deleteMany({});
        console.log('Cleared existing data');

        // Insert seed data
        const seedData = [
            { name: 'Mario' },
            { name: 'Luigi' },
            { name: 'Jak' },
            { name: 'Daxter' }
        ];
        await TestModel.insertMany(seedData);
        console.log('Inserted seed data');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

seedDatabase();