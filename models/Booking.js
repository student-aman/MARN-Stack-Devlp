const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    serviceId: {
        type: String, // Service ID from the Service model
        required: true
    },
    serviceTitle: {
        type: String, // Service Title
        required: true
    },
    vendorName: {
        type: String, // Vendor's Name
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true,
        match: [/.+@.+\..+/, 'Please fill a valid email address'] // Basic email validation
    },
    customerPhone: {
        type: String,
        required: true
    },
    preferredDate: {
        type: Date, // Date format for preferred service date
        required: true
    },
    message: {
        type: String,
        default: '' // Customer's additional message
    },
    bookingDate: {
        type: Date,
        default: Date.now // When the booking was made
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], // Status of the booking
        default: 'Pending'
    }
});

module.exports = mongoose.model('Booking', bookingSchema);
