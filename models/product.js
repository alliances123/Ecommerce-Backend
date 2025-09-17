import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nickName: {
    type: String,
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'EGY'
  },
  image: [
    {
      type: String,
      required: true
    }
  ],
  dis: {
    type: String,
  },
  category: {
    type: String,
  },
  rate: {
    type: Number,
  },
  details: {
    type: Number,
  },
  quantity: {
    type: String,
  },
  color: [
    {
      name: { type: String },
      bg: { type: String },
      text: { type: String }
    }
  ],
  inStock: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;
