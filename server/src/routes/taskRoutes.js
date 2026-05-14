import express from "express";
import { body, param } from "express-validator";
import mongoose from "mongoose";
import { protect, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";

const router = express.Router();

async function canAccessProject(user, projectId) {
  if (user.role === "Admin") return Project.findById(projectId);
  return Project.findOne({ _id: projectId, members: user._id });
}

function visibleTaskQuery(user) {
  if (user.role === "Admin") return {};
  return { assignee: user._id };
}

router.get("/", protect, async (req, res, next) => {
  try {
    const filters = visibleTaskQuery(req.user);
    if (req.query.project && mongoose.Types.ObjectId.isValid(req.query.project)) {
      filters.project = req.query.project;
    }

    const tasks = await Task.find(filters)
      .populate("project", "name")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  requireAdmin,
  [
    body("title").trim().isLength({ min: 2 }).withMessage("Task title is required"),
    body("project").isMongoId().withMessage("Valid project is required"),
    body("assignee").isMongoId().withMessage("Valid assignee is required"),
    body("dueDate").isISO8601().withMessage("Valid due date is required"),
    body("priority").optional().isIn(["Low", "Medium", "High"]).withMessage("Invalid priority"),
    body("status").optional().isIn(["Todo", "In Progress", "Done"]).withMessage("Invalid status")
  ],
  validate,
  async (req, res, next) => {
    try {
      const project = await Project.findOne({
        _id: req.body.project,
        members: req.body.assignee
      });
      if (!project) {
        return res.status(422).json({ message: "Assignee must be a member of the project" });
      }

      const task = await Task.create({
        title: req.body.title,
        description: req.body.description,
        project: req.body.project,
        assignee: req.body.assignee,
        createdBy: req.user._id,
        dueDate: req.body.dueDate,
        priority: req.body.priority,
        status: req.body.status
      });

      const populated = await task.populate([
        { path: "project", select: "name" },
        { path: "assignee", select: "name email role" },
        { path: "createdBy", select: "name email role" }
      ]);
      res.status(201).json(populated);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  protect,
  [
    param("id").isMongoId().withMessage("Invalid task id"),
    body("status").optional().isIn(["Todo", "In Progress", "Done"]).withMessage("Invalid status"),
    body("title").optional().trim().isLength({ min: 2 }).withMessage("Task title is required"),
    body("assignee").optional().isMongoId().withMessage("Valid assignee is required"),
    body("dueDate").optional().isISO8601().withMessage("Valid due date is required")
  ],
  validate,
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const project = await canAccessProject(req.user, task.project);
      const isOwnTask = String(task.assignee) === String(req.user._id);
      if (!project || (req.user.role !== "Admin" && !isOwnTask)) {
        return res.status(403).json({ message: "You cannot update this task" });
      }

      const adminFields = ["title", "description", "assignee", "dueDate", "priority"];
      for (const field of adminFields) {
        if (req.body[field] !== undefined) {
          if (req.user.role !== "Admin") {
            return res.status(403).json({ message: "Only admins can edit task details" });
          }
          task[field] = req.body[field];
        }
      }

      if (req.body.assignee && !project.members.some((id) => String(id) === req.body.assignee)) {
        return res.status(422).json({ message: "Assignee must be a member of the project" });
      }

      if (req.body.status !== undefined) {
        task.status = req.body.status;
      }

      await task.save();
      const populated = await task.populate([
        { path: "project", select: "name" },
        { path: "assignee", select: "name email role" },
        { path: "createdBy", select: "name email role" }
      ]);
      res.json(populated);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
