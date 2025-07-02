const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Unique ID for the service
    title: { type: String, required: true },
    description: { type: String, required: true },
    vendorName: { type: String, required: true },
    vendorImage: { type: String, default: '/images/default-user.jpg' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: '/images/default-service.jpg' },
    category: { type: String, required: true },
    location: { type: String, required: true },
});

module.exports = mongoose.model('Service', serviceSchema);