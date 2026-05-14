import express from "express";
import { protect } from "../middleware/auth.js";
import Task from "../models/Task.js";

const router = express.Router();

router.get("/", protect, async (req, res, next) => {
  try {
    const baseQuery = req.user.role === "Admin" ? {} : { assignee: req.user._id };
    const now = new Date();

    const [tasks, statusCounts, overdueCount] = await Promise.all([
      Task.find(baseQuery)
        .populate("project", "name")
        .populate("assignee", "name email role")
        .sort({ updatedAt: -1 })
        .limit(8),
      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Task.countDocuments({ ...baseQuery, status: { $ne: "Done" }, dueDate: { $lt: now } })
    ]);

    const byStatus = { Todo: 0, "In Progress": 0, Done: 0 };
    statusCounts.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    res.json({
      totalTasks: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      byStatus,
      overdueCount,
      recentTasks: tasks
    });
  } catch (error) {
    next(error);
  }
});

export default router;
