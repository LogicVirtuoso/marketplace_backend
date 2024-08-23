/**
 * @swagger
 *   components:
 *     schemas:
 *       NewBlog:
 *         type: object
 *         required:
 *           - title
 *           - image
 *           - link
 *         properties:
 *           title:
 *             type: string
 *             description: The title of the blog.
 *             example: Advantage of the BlockChain
 *           image:
 *             type: string
 *             description: path of the image in the blog.
 *             example: /uploads/blogs/62f68b6fe407a30b20bcb5cb.png
 *           link:
 *             type: string
 *             description: link of the blogs.
 *             example: https://hbr.org/2017/01/the-truth-about-blockchain
 *       Blog:
 *         allOf:
 *           - type: array
 *             items:
 *              $ref: '#/components/schemas/NewBlog'
 *
 */
const router = require("express").Router();
const {
  getRecentBlogs,
  saveBlog,
  updateBlog,
  deleteBlog,
} = require("../controller/blog");

/**
 * @swagger
 * /blog/recent:
 *   get:
 *     summary: Retrieve recent blogs.
 *     tags:
 *       - Blogs
 *     responses:
 *       200:
 *         description: Recent blogs.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Blog'
 *       500:
 *            description: Interval Error.
 */
router.get("/recent", getRecentBlogs);

router.post("/save", saveBlog);

module.exports = router;
