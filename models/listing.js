const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./reviews.js");


const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    image: {
        type: String,
        default:
            "https://www.dellaresorts.com/new-images/gvr-rooms-new-1.webp",
        set: (v) =>
            v === ""
                ? "https://www.dellaresorts.com/new-images/gvr-rooms-new-1.webp"
                : v,
    },
    price: {
        type: Number,
        required: true,
        default: 0,
    },
    address: {
        type: String,
    },
    country: {
        type: String,
        required: true,
    },
    reviews : [
        {
            type : Schema.Types.ObjectId,
            ref : "Review",
        }
    ],
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User",
    },
})

listingSchema.post("findOneAndDelete", async(listing) => {
    if(listing){
        await Review.deleteMany( {_id: {$in: listing.reviews}});
    }
})

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;


