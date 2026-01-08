import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
	console.error('❌ MONGO_URI not set in .env');
	process.exit(1);
}

async function clearDatabase() {
	try {
		console.log('🔗 Connecting to MongoDB...');
		await mongoose.connect(mongoURI, {
			maxPoolSize: 5,
			serverSelectionTimeoutMS: 8000,
		});
		console.log('✅ Connected');
		console.log(`📊 Database: ${mongoose.connection.name}`);

		// Destructive action warning
		console.log('⚠️  WARNING: Dropping entire database...');
		await mongoose.connection.dropDatabase();
		console.log('🗑️  Database dropped successfully');

		// Optional: ensure clean disconnect
		await mongoose.disconnect();
		console.log('🔌 Disconnected');
		process.exit(0);
	} catch (err) {
		console.error('❌ Failed to clear database:', err.message);
		try { await mongoose.disconnect(); } catch {}
		process.exit(1);
	}
}

clearDatabase();
