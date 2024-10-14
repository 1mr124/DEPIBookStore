const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Book = require("../models/Book");
const authenticateToken = require("../middleware/authenticateToken"); // Middleware for checking token

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Change to your desired uploads directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST: /books/post - Submit a new Book (Protected route)
router.post("/post", authenticateToken, upload.single('coverImage'), async (req, res) => {
  const { title, author, price, stock, description } = req.body;
  const userId = req.user.userId; // Access the userId from token

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // Mandatory fields check
  if (!title || !author || !price || !stock) {
    return res.status(400).json({ message: "Title, author, price, and stock are required fields." });
  }

  // Validate stock and price are positive numbers
  if (price < 0 || stock < 0) {
    return res.status(400).json({ message: "Price and stock must be positive values." });
  }

  try {
    // Create a new book object
    const newBook = new Book({
      title,
      author,
      price,
      stock,
      description,
      addedBy: userId,
    });

    // Attach cover image path if provided
    if (req.file) {
      newBook.coverImage = req.file.path; // Save the file path if coverImage is uploaded
    }

    await newBook.save();
    res.status(201).json({ message: "Book added successfully!", book: newBook });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A book with the same title and author already exists." });
    }
    console.error(error);
    res.status(500).json({ message: "Server error. Could not add book." });
  }
});

// GET : /books/search - Search for books by title or author
router.get("/search", async (req, res) => {
  const { query } = req.query; // `query` will be the search input
  console.log(query);
  

  // Check if query is a valid string
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: "Invalid search query." });
  }

  try {
    const books = await Book.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } }
      ]
    });

    console.log(books);
    
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Could not fetch books." });
  }
});

module.exports = router;
