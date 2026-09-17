const Blog = require("../models/Blog");

const createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;

    const blog = await Blog.create({
      title,
      content,
    });

    res.status(201).json({
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create blog",
      error: error.message,
    });
  }
};


const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });

    res.status(200).json({
      count: blogs.length,
      blogs,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blogs",
      error: error.message,
    });
  }
};

const getBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    res.status(200).json({
      blog,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};


const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const blog = await Blog.findByIdAndUpdate(
      id,
      {
        title,
        content,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    res.status(200).json({
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update blog",
      error: error.message,
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    res.status(200).json({
      message: "Blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete blog",
      error: error.message,
    });
  }
};

module.exports = {
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
};