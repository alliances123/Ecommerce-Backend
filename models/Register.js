import mongoose from 'mongoose';

const registerSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  PhoneNumber: {
    type: String,
    required: false
  },
  Address: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: true
  },
  image: {
    type: String,
  },
  banner: {
    type: String,
  },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 }
    }
  ],
  savedProducts: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 }
    }
  ]
}, {
  timestamps: true // createdAt, updatedAt
});

const UserName = mongoose.model('UserName', registerSchema);

export default UserName;
