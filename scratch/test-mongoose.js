const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/smart_agri_suite';

async function test() {
    console.log("Connecting to MongoDB...");
    try {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected!");
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
        
        const count = await mongoose.connection.db.collection('inventories').countDocuments();
        console.log("Inventories count:", count);
        
        await mongoose.disconnect();
        console.log("Disconnected.");
    } catch (err) {
        console.error("Mongoose test failed:", err.message);
    }
}

test();
