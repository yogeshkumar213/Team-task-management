import express from "express";
import { body, param } from "express-validator";
import { protect, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

const router = express.Router();

function projectQueryFor(user) {
  if (user.role === "Admin") return {};
  return { members: user._id };
}

router.get("/", protect, async (req, res, next) => {
  try {
    const projects = await Project.find(projectQueryFor(req.user))
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .sort({ createdAt: -1 });

    const taskCounts = await Task.aggregate([
      { $match: { project: { $in: projects.map((project) => project._id) } } },
      { $group: { _id: "$project", total: { $sum: 1 } } }
    ]);
    const countsByProject = new Map(taskCounts.map((item) => [String(item._id), item.total]));

    res.json(
      projects.map((project) => ({
        ...project.toObject(),
        taskCount: countsByProject.get(String(project._id)) || 0
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  requireAdmin,
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Project name is required"),
    body("description").optional().trim().isLength({ max: 800 }).withMessage("Description is too long"),
    body("members").optional().isArray().withMessage("Members must be a list")
  ],
  validate,
  async (req, res, next) => {
    try {
      const memberIds = Array.from(new Set([...(req.body.members || []), String(req.user._id)]));
      const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
      if (memberCount !== memberIds.length) {
        return res.status(422).json({ message: "One or more selected members do not exist" });
      }

      const project = await Project.create({
        name: req.body.name,
        description: req.body.description,
        owner: req.user._id,
        members: memberIds
      });

      const populated = await project.populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" }
      ]);
      res.status(201).json(populated);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/members",
  protect,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid project id"),
    body("members").isArray({ min: 1 }).withMessage("Choose at least one member")
  ],
  validate,
  async (req, res, next) => {
    try {
      const memberIds = Array.from(new Set([...req.body.members, String(req.user._id)]));
      const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
      if (memberCount !== memberIds.length) {
        return res.status(422).json({ message: "One or more selected members do not exist" });
      }

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { members: memberIds },
        { new: true }
      )
        .populate("owner", "name email role")
        .populate("members", "name email role");

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
