/**
 * @swagger
 *   components:
 *     schemas:
 *       NewNotification:
 *         type: object
 *         required:
 *           - to
 *           - read
 *           - content
 *         properties:
 *           to:
 *             type: array
 *             items:
 *               type: string
 *             description: account addresses of user.
 *             example: ["0x937B52690883994B0549b6a3093356b83a1F59a0", "0xfc218564694314ebF4a4E53D661aC85a1B13b734"]
 *           read:
 *             type: boolean
 *             description: reflect if the user read the notification.
 *             example: true
 *           content:
 *             type: string
 *             description: the content of the notification.
 *             example: your account is locked.
 *       Notification:
 *           allOf:
 *               - type: object
 *                 properties:
 *                   _id:
 *                       type: integer
 *                       description: The auto-generated id of the notification.
 *                       example: 0
 *               - $ref: '#/components/schemas/NewNotification'
 *
 */

const router = require("express").Router();
const { authenticateUser } = require("../middleware/auth");

const {
  getNotifications,
  markAsReadNotification,
  markAllAsReadNotification,
} = require("../controller/notification");

router.post("/get", getNotifications);

router.post("/mark-one", authenticateUser, markAsReadNotification);
router.post("/mark-all", authenticateUser, markAllAsReadNotification);

module.exports = router;
