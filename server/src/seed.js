// import dotenv from "dotenv";
// import path from "path";
// import { fileURLToPath } from "url";
// import { connectDb } from "./config/db.js";
// import Project from "./models/Project.js";
// import Task from "./models/Task.js";
// import User from "./models/User.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// dotenv.config({ path: path.resolve(__dirname, "../.env") });

// async function seed() {
//   await connectDb();
//   await Promise.all([Task.deleteMany(), Project.deleteMany(), User.deleteMany()]);

//   const [admin, member] = await User.create([
//     {
//       name: "Yogesh Admin",
//       email: "admin@example.com",
//       password: "Password123!",
//       role: "Admin"
//     },
//     {
//       name: "Yogesh Member",
//       email: "member@example.com",
//       password: "Password123!",
//       role: "Member"
//     }
//   ]);

//   const project = await Project.create({
//     name: "Website Redesign",
//     description: "Launch a refreshed product website with clear ownership and status tracking.",
//     owner: admin._id,
//     members: [admin._id, member._id]
//   });

//   const tomorrow = new Date();
//   tomorrow.setDate(tomorrow.getDate() + 1);
//   const yesterday = new Date();
//   yesterday.setDate(yesterday.getDate() - 1);

//   await Task.create([
//     {
//       title: "Create dashboard wireframe",
//       description: "Draft the main dashboard and task summary layout.",
//       project: project._id,
//       assignee: member._id,
//       createdBy: admin._id,
//       dueDate: tomorrow,
//       priority: "High",
//       status: "In Progress"
//     },
//     {
//       title: "Review project copy",
//       description: "Check page copy for clarity before handoff.",
//       project: project._id,
//       assignee: admin._id,
//       createdBy: admin._id,
//       dueDate: yesterday,
//       priority: "Medium",
//       status: "Todo"
//     }
//   ]);

//   console.log("Seed data created");
//   process.exit(0);
// }

// seed().catch((error) => {
//   console.error(error);
//   process.exit(1);
// });
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb } from "./config/db.js";
import Project from "./models/Project.js";
import Task from "./models/Task.js";
import User from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function seed() {
  await connectDb();

  // delete only tasks and projects
  // users remain safe
  await Promise.all([
    Task.deleteMany(),
    Project.deleteMany()
  ]);

  // create fixed demo admin if not exists
  let admin = await User.findOne({ email: "admin@ethara.ai" });

  if (!admin) {
    admin = await User.create({
      name: "Ethara Admin",
      email: "admin@ethara.ai",
      password: "Password123!",
      role: "Admin"
    });
  }

  // create fixed demo member if not exists
  let member = await User.findOne({ email: "member@ethara.ai" });

  if (!member) {
    member = await User.create({
      name: "Ethara Member",
      email: "member@ethara.ai",
      password: "Password123!",
      role: "Member"
    });
  }

  // create demo project
  const project = await Project.create({
    name: "Ethara Workspace",
    description:
      "AI-powered team collaboration workspace with smart task management and project tracking.",
    owner: admin._id,
    members: [admin._id, member._id]
  });

  // dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // create demo tasks
  await Task.create([
    {
      title: "Design analytics dashboard",
      description:
        "Create a modern analytics overview section for the Ethara workspace.",
      project: project._id,
      assignee: member._id,
      createdBy: admin._id,
      dueDate: tomorrow,
      priority: "High",
      status: "In Progress"
    },
    {
      title: "Review workspace structure",
      description:
        "Check project flow and optimize task management experience.",
      project: project._id,
      assignee: admin._id,
      createdBy: admin._id,
      dueDate: yesterday,
      priority: "Medium",
      status: "Todo"
    }
  ]);

  console.log("Seed data created successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
