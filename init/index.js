const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/listing.js");
const Review = require("../models/reviews.js");

main().then(()=>{
    console.log("connected successfully");
}).catch((err)=>{
    console.log(err);    
})

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');
}

const initdB = async () => {
    await Listing.deleteMany({});
    initdata.data =  initdata.data.map((obj) => ({...obj, owner : "6a40206fab011d32f5b45f24"}));
    await Listing.insertMany(initdata.data);
    console.log("data was initialized");
}

initdB();