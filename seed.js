require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const connectDB = require('./config/db'); // Your DB connection function
const Service = require('./models/Service'); // Service model

// Connect to DB
connectDB();

const services = [
    // Existing services from your code with updated image URLs
    {
        "id": 'web-design-1',
        "title": 'Modern Website Design',
        "description": 'I will create a stunning, responsive, and SEO-friendly website for your business or personal brand.',
        "vendorName": 'John Doe',
        "vendorImage": 'https://media.istockphoto.com/id/814394872/photo/portrait-of-young-indian-businessman-against-view-of-the-city-in-bangkok-thailand.webp?a=1&s=612x612&w=0&k=20&c=DVkinZVMJFg3qrWxH6d85Clj4H7X63_Q4I0KPBPIk6w=',
        "rating": 4.9,
        "reviewsCount": 120,
        "price": 5000,
        "imageUrl": 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Updated URL
        "category": 'it-tech',
        "location": 'ludhiana'
    },
    {
        "id": "plumbing-repair-1",
        "title": "Emergency Plumbing Repair",
        "description": "Quick and reliable solutions for all your plumbing issues, available 24/7 for emergencies.",
        "vendorName": "Jane Smith",
        "vendorImage": "https://images.unsplash.com/photo-1538978939284-4ecb3fc4ad5e?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "rating": 4.7,
        "reviewsCount": 85,
        "price": 800,
        "imageUrl": "https://images.pexels.com/photos/4489719/pexels-photo-4489719.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "category": "home-services",
        "location": "chandigarh"
    },
    {
        "id": "logo-design-1",
        "title": "Professional Logo Design",
        "description": "Get a unique and memorable logo that perfectly represents your brand identity.",
        "vendorName": "Alice Johnson",
        "vendorImage": "https://images.unsplash.com/photo-1659353220869-69b81aa34051?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDF8fHxlbnwwfHx8fHw%3D",
        "rating": 4.8,
        "reviewsCount": 95,
        "price": 2500,
        "imageUrl": "https://images.pexels.com/photos/29672341/pexels-photo-29672341.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "category": "design-creative",
        "location": "mohali"
    },
    {
        "id": "ac-repair-1",
        "title": "Expert AC Repair & Service",
        "description": "Fast and efficient AC repair and maintenance to keep you cool all summer.",
        "vendorName": "Bob Williams",
        "vendorImage": "https://images.unsplash.com/photo-1736939561648-bafddedd9f5e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDJ8fHxlbnwwfHx8fHw%3D",
        "rating": 4.6,
        "reviewsCount": 70,
        "price": 700,
        "imageUrl": "https://images.pexels.com/photos/8985709/pexels-photo-8985709.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "category": "home-services",
        "location": "ludhiana"
    },
    {
        "id": "web-design-2",
        "title": "Advanced E-commerce Website",
        "description": "Building robust and scalable e-commerce platforms for online businesses.",
        "vendorName": "Sarah Connor",
        "vendorImage": "https://images.unsplash.com/photo-1747817330507-3d008dc5b324?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDMxfHx8ZW58MHx8fHx8 ",
        "rating": 4.9,
        "reviewsCount": 60,
        "price": 15000,
        "imageUrl": "https://images.pexels.com/photos/5082237/pexels-photo-5082237.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "category": "it-tech",
        "location": "mohali"
    },
    {
        "id": "event-planner-1",
        "title": "Professional Event Planning",
        "description": "Full event management for weddings, birthdays, and corporate events.",
        "vendorName": "Priya Singh",
        "vendorImage": "https://images.unsplash.com/photo-1650398121383-9ed394fd7811?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D ",
        "rating": 4.9,
        "reviewsCount": 150,
        "price": 10000,
        "imageUrl": "https://images.pexels.com/photos/8761310/pexels-photo-8761310.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "category": "events",
        "location": "chandigarh"
    },
    // New services I provided earlier with updated image URLs
    {
        "id": "service-005",
        "title": "Professional Photography",
        "description": "Capture your special moments with our expert photographers for events, portraits, and commercial needs. High-quality images guaranteed.",
        "category": "Events & Parties",
        "price": 7500,
        "vendorName": "Pixel Perfect Studio",
        "imageUrl": "https://images.pexels.com/photos/20419527/pexels-photo-20419527/free-photo-of-brunette-woman-moving-lamp-stand-in-studio.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "vendorImage": "https://plus.unsplash.com/premium_photo-1661418115591-f86017c31e6f?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "location": "Delhi"
    },
    {
        "id": "service-006",
        "title": "Home Cleaning Services",
        "description": "Deep cleaning for your home, including kitchen, bathrooms, and living areas. Professional and reliable staff for a sparkling clean home.",
        "category": "Home Services",
        "price": 2500,
        "vendorName": "Sparkle & Shine Cleaners",
        "imageUrl": "https://images.pexels.com/photos/6196688/pexels-photo-6196688.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "vendorImage": "https://images.unsplash.com/photo-1612766984776-6c4a90efd479?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE3fHx8ZW58MHx8fHx8",
        "location": "Mumbai"
    },
    {
        "id": "service-007",
        "title": "Custom Web Development",
        "description": "Get a custom-built website tailored to your business needs. Responsive design, secure, and SEO-friendly solutions.",
        "category": "IT & Tech",
        "price": 25000,
        "vendorName": "CodeCrafters Solutions",
        "imageUrl": "https://images.pexels.com/photos/3153204/pexels-photo-3153204.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "vendorImage": "https://images.unsplash.com/photo-1611470748921-539d32443457?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDMwfHx8ZW58MHx8fHx8",
        "location": "Bangalore"
    },
    {
        "id": "service-008",
        "title": "Interior Design Consultation",
        "description": "Transform your living or workspace with expert interior design advice. From concept to execution, we guide you every step of the way.",
        "category": "Design & Creative",
        "price": 6000,
        "vendorName": "Aesthetic Spaces",
        "imageUrl": "https://images.pexels.com/photos/5922201/pexels-photo-5922201.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "vendorImage": "https://plus.unsplash.com/premium_photo-1682092105693-1a2566cf2ee1?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjV8fGN1c3RvbWVyJTIwUmFodWwlMjBTaW5naHxlbnwwfHwwfHx8MA%3D%3D",
        "location": "Pune"
    },
    {
        "id": "service-009",
        "title": "Yoga & Fitness Coaching",
        "description": "Personalized yoga and fitness coaching sessions at your home or online. Improve flexibility, strength, and mental well-being.",
        "category": "Health & Wellness",
        "price": 1800,
        "vendorName": "Zen Life Coaches",
        "imageUrl": "https://images.pexels.com/photos/8436426/pexels-photo-8436426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "vendorImage": "https://images.unsplash.com/photo-1720787202594-0a3e944ad63f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjR8fGN1c3RvbWVyJTIwUmFodWwlMjBTaW5naHxlbnwwfHwwfHx8MA%3D%3D",
        "location": "Hyderabad" // Original location, will remain for this entry
    },
    {
        "id": "service-010",
        "title": "Digital Marketing Strategy",
        "description": "Boost your online presence with a comprehensive digital marketing strategy. SEO, social media, and content marketing solutions.",
        "vendorName": "Growth Gurus",
        "price": 12000,
        "imageUrl": "https://images.pexels.com/photos/29930929/pexels-photo-29930929.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "vendorImage": "https://images.unsplash.com/photo-1702974981922-3d115838f311?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDQ2fHx8ZW58MHx8fHx8",
        "category": "IT & Tech",
        "location": "Chennai"
    },
    {
        "id": "service-011",
        "title": "Event Planning & Management",
        "description": "From small gatherings to large corporate events, we handle all aspects of planning, coordination, and execution for a seamless experience.",
        "category": "Events & Parties",
        "price": 15000,
        "vendorName": "Grand Occasions Planners",
        "imageUrl": "https://images.pexels.com/photos/12903285/pexels-photo-12903285.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Updated URL
        "vendorImage": "https://images.unsplash.com/photo-1705921269918-5934e61b7429?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDM3fHx8ZW58MHx8fHx8",
        "location": "Kolkata"
    },
    {
        "id": "service-012",
        "title": "AC Repair & Servicing",
        "description": "Expert repair and routine servicing for all types of air conditioners. Quick response and reliable service to keep you cool.",
        "category": "Home Services",
        "price": 800,
        "vendorName": "Cool Comfort Solutions",
        "imageUrl": "https://media.istockphoto.com/id/1338330108/photo/image-of-indian-handymen-installing-an-air-conditioning-extractor-unit-in-apartment-domestic.webp?a=1&b=1&s=612x612&w=0&k=20&c=JWZybpLLxanqh5xQ-AT6xqs70_EtgQo6gfZND4Ns5tU=", // This one was not in your list, keeping placeholder or you can provide a new one
        "vendorImage": "https://plus.unsplash.com/premium_photo-1661416428884-4df6b7a2f236?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDQ0fHx8ZW58MHx8fHx8",
        "location": "Ahmedabad"
    },
    // NEW ENTRY: Yoga & Fitness Coaching for Ludhiana
    {
        "id": "yoga-ludhiana-1", // Unique ID for this new service
        "title": "Yoga & Fitness Coaching",
        "description": "Personalized yoga and fitness coaching sessions at your home or online in Ludhiana. Improve flexibility, strength, and mental well-being.",
        "category": "Health & Wellness",
        "price": 1800,
        "vendorName": "Ludhiana Yoga Hub",
        "imageUrl": "https://images.pexels.com/photos/8436426/pexels-photo-8436426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
        "vendorImage": "https://images.unsplash.com/photo-1720787202594-0a3e944ad63f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjR8fGN1c3RvbWVyJTIwUmFodWwlMjBTaW5naHxlbnwwfHwwfHx8MA%3D%3D",
        "location": "ludhiana" // This is the key change for your search
    }
];

const importData = async () => {
    try {
        await Service.deleteMany(); // Clear existing services (optional, but good for fresh start)
        await Service.insertMany(services);
        console.log('✅ Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`❌ Error importing data: ${error.message}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await Service.deleteMany();
        console.log('🗑️ Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`❌ Error destroying data: ${error.message}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData(); // To destroy: node seed.js -d
} else {
    importData(); // To import: node seed.js
}
