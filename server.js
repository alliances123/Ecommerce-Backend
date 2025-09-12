
//--- libraries imports ---//
import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import Product from './models/product.js';
import UserName from './models/Register.js';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

//--- active .env ---//
dotenv.config();

//--- connect our project with Express ---//
const app = express();
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT || 5000; // project PORT

//--- use cors ---//
app.use(cors({
  origin: ['http://localhost:5173', 'https://vite-frontend-git-main-abdelrahman-mohameds-projects-ccc05873.vercel.app'],
  credentials: true
}));

//--- uploads check ---//
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Created uploads folder ✅');
}

//--- multer uploads images ---//
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

//--- routes ---//
app.get('/', (req, res) => {
  res.send('Server is working ✅');
});

//=== products ===//

//--- post products ---//

app.post('/products', async (req, res) => {
  const product = req.body;
  if (!product.name || !product.price || !product.image || product.image.length === 0) {
    return res.status(400).json({ success: false, message: 'Please enter all fields' });
  }
  try {
    const newProduct = new Product(product);
    await newProduct.save();
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save product' });
  }
});

//--- fetch products ---//
app.get('/api/products', async (req, res) => {
  try {
    const getProduct = await Product.find({});
    res.status(200).json({ success: true, message: 'Fetched', data: getProduct });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cannot fetch data' });
  }
});

//--- update product ---//
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ success: true, message: 'Updated', data: updatedProduct });
  } catch (error) {
    res.status(400).json({ success: false, message: "Can't update", error: error.message });
  }
});

//--- delete product ---//
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Cannot delete' });
  }
});

//=== user ===//

//--- register logic ---//
app.post('/register', async (req, res) => {
  const userRegister = req.body;
  if (!userRegister.userName || !userRegister.email || !userRegister.password) {
    return res.status(400).json({ success: false, message: 'Error : Please Enter All Fields' });
  }

  const checkEmail = await UserName.findOne({ email: userRegister.email }); // check the email already exist or not
  if (checkEmail) return res.status(401).json({ message: 'This Email Already Exist' });

  const hashPassword = await bcrypt.hash(userRegister.password, 10);
  userRegister.password = hashPassword;

  try {
    const newRegister = new UserName(userRegister);
    await newRegister.save();
    res.status(201).json({ success: true, data: newRegister });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error : cant save this register' });
  }
});

//--- login logic ---//
app.post('/login', async (req, res) => {
  try {
    const userLogIn = req.body;
    if (!userLogIn.email || !userLogIn.password) {
      return res.status(400).json({ success: false, message: 'Error: Please Enter All Fields' });
    }

    const checkEmailLogIn = await UserName.findOne({ email: userLogIn.email });
    if (!checkEmailLogIn) return res.status(401).json({ message: 'this email does not exist' });

    const isPasswordCorrect = await bcrypt.compare(userLogIn.password, checkEmailLogIn.password);

    if (!isPasswordCorrect) return res.status(401).json({ message: 'invalid password' });

    const token = jwt.sign({ id: checkEmailLogIn._id, email: checkEmailLogIn.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({ success: true, message: 'Logged in successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

//--- logout logic ---//
app.post('/logout', async (req, res) => {
  try {
    res.cookie('token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0) });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'cannot log out' });
  }
});

//--- get user info logic ---//
app.get('/user', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserName.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

//--- update userName ---//
app.put('/user/update', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'invalid token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUserUpdate = await UserName.findOneAndUpdate(
      { _id: decoded.id },
      { $set: req.body },
      { new: true }
    ).select("-password");

    if (!currentUserUpdate) {
      return res.status(400).json({ success: false, message: 'invalid inputs' });
    }

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      user: currentUserUpdate
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'cant update this account: ' + error.message
    });
  }
});



//--- delete the account ---//
app.delete('/delete_account', async (req, res) => {
  try {
    const token = req.cookies.token
    if (!token) return res.status(401).json({ success: false, message: 'no account to delete' }) // check the use token

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) // get user token const
    } catch (err) {
      return res.status(401).json({ success: false, message: 'invalid token' })
    }
    const user = await UserName.findById(decoded.id); // user
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const isMatch = await bcrypt.compare(req.body.password, user.password); // compare passwords

    if (isMatch) {
      if (user.email === "admin@gmail.com") {
        return res.status(403).json({ message: "cant delete the admin account" });
      } else {
        await user.deleteOne()
        res.cookie('token', '', {
          httpOnly: true,
          expires: new Date(0),
          sameSite: 'Strict',
          secure: true
        });
        res.json({ success: true, message: "Account deleted successfully" });
      }
    } else {
      return res.status(401).json({ success: false, message: "wrong password" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'failed to delete this account' })
  }
})

//--- Upload image ---//
app.post('/uploadImage', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const { userId } = req.body;

  try {
    const user = await UserName.findByIdAndUpdate(userId, { image: req.file.filename }, { new: true });
    res.status(200).json({ success: true, message: 'Image uploaded', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Cannot upload image' });
  }
});

//--- get user image logic ---//
app.get('/user/image/:id', async (req, res) => {
  try {
    const user = await UserName.findById(req.params.id);
    if (!user || !user.image) return res.status(404).send('No image found');

    res.sendFile(path.resolve('uploads', user.image));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cannot get image' });
  }
});

//--- post user banner logic ---//
app.post('/uploadBanner', upload.single('image'), async (req, res) => {
  const { userId } = req.body;
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const user = await UserName.findByIdAndUpdate(userId, { banner: req.file.filename }, { new: true });
    res.status(200).json({ success: true, message: 'banner uploaded', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Cannot upload banner' });
  }
});

//--- get user banner logic ---//
app.get('/user/banner/:id', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  try {
    const user = await UserName.findById(req.params.id);
    if (!user || !user.banner) return res.status(404).send('No banner found');

    res.sendFile(path.resolve('uploads', user.banner));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cannot get banner' });
  }
});

//=== carts ===//

//--- add cart logic server ---//
app.post('/addCart', async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ success: false, message: 'Missing userId or productId' });
  }

  try {
    const user = await UserName.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingItem = user.cart.find(item => item.productId.toString() === productId); // exist cart const

    if (existingItem) { // check the cart is already exist or not
      existingItem.quantity += 1;
    } else {
      user.cart.push({ productId });
    }

    await user.save(); //save a new user with his carts 
    res.status(200).json({ success: true, message: 'Product added to cart', cart: user.cart }); // success

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' }); // error
  }
});

//--- grt cart ---//
app.get('/getCart/:userId', async (req, res) => {
  try {
    const user = await UserName.findById(req.params.userId).populate('cart.productId');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, cart: user.cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//--- delete cart ---//
app.delete("/removeCart", async (req, res) => {
  const { userId, productId } = req.body;

  try {
    const user = await UserName.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.cart = user.cart.filter(
      (item) => item.productId.toString() !== productId // filter carts
    );

    await user.save(); // event loop
    res.json({ success: true, message: "Product removed from cart", cart: user.cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//--- edit cart ---//
app.put("/updateCart", async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    const user = await UserName.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const productInCart = user.cart.find(
      (item) => item.productId.toString() === productId
    );

    if (!productInCart) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    productInCart.quantity = quantity; // نغير الكمية لأي رقم نبعته

    await user.save();
    res.json({ success: true, message: "Cart updated", cart: user.cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//--- clear cart ---//
app.delete("/clearCart/:userId", async (req, res) => {
  try {
    const user = await UserName.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.cart = []; // نفرغ الكارت
    await user.save();

    res.json({ success: true, message: "Cart cleared successfully", cart: user.cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//--- Start server ---//
connectDB().then(() => {
  app.listen(port, () => {
    console.log('Server started at http://localhost:' + port);
  });
});
