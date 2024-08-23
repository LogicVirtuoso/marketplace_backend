const Blog = require("../model/blogs");

const getRecentBlogs = async (req, res) => {
  try {
    const recentData = await Blog.find({}).sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ msg: "Success", data: recentData, success: true });
  } catch (err) {
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const saveBlog = async (req, res) => {
  const { title, image, link } = req.body;
  try {
    let blog = await Blog.findOne({
      title: { $regex: title, $options: "i" },
    });
    if (blog) {
      res.status(200).json({ msg: "Already stored", success: true });
    } else {
      blog = await Blog.create({
        title,
        image,
        link,
      });
      res.status(200).json({ msg: "Success", success: true, data: blog });
    }
  } catch (e) {
    console.log("error in saving blog", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const updateBlog = async (req, res) => {
  const { title, image, link } = req.body;
  try {
    await Blog.findOneAndUpdate(
      {
        title: { $regex: title, $options: "i" },
      },
      {
        image,
        link,
      }
    );
    res.status(200).json({ msg: "Success", success: true });
  } catch (e) {
    console.log("error in saving blog", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const deleteBlog = async (req, res) => {
  const { title } = req.body;
  try {
    await Blog.findOneAndDelete({
      title: { $regex: title, $options: "i" },
    });
    res.status(200).json({ msg: "Success", success: true });
  } catch (e) {
    console.log("error in deleting blog", e);
    res.status(500).json({ msg: "Something went wrong", e });
  }
};

module.exports = {
  getRecentBlogs,
  saveBlog,
  updateBlog,
  deleteBlog,
};
