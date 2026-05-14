import React from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  LogOut,
  Plus,
  Shield,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./state/AuthContext.jsx";

const statuses = ["Todo", "In Progress", "Done"];
const priorities = ["Low", "Medium", "High"];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function AuthPage() {
  const { login, signup, user } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  if (user) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await signup(form);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Ethara Workspace</p>
          <h1>Run projects with clear ownership.</h1>
          <p className="subtle">Create projects, assign work, and track overdue tasks from one role-aware dashboard.</p>
        </div>

        <div className="auth-card">
          <div className="segmented">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Signup</button>
          </div>

          <form onSubmit={submit} className="stack">
            {mode === "signup" && (
              <>
                <label>
                  Name
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
              </>
            )}
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit">{mode === "login" ? "Login" : "Create account"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <FolderKanban size={28} />
          <div>
            <strong>TaskFlow</strong>
            <span>{user.role}</span>
          </div>
        </div>
        <nav>
          <a href="#dashboard"><BarChart3 size={18} />Dashboard</a>
          <a href="#projects"><Users size={18} />Projects</a>
          <a href="#tasks"><ClipboardList size={18} />Tasks</a>
        </nav>
        <button className="ghost logout" onClick={logout}><LogOut size={18} />Logout</button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <article className={cx("stat", tone)}>
      <Icon size={24} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Dashboard({ summary }) {
  return (
    <section id="dashboard" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Team Analytics</h2>
        </div>
      </div>
      <div className="stats-grid">
        <Stat icon={ClipboardList} label="Total tasks" value={summary?.totalTasks || 0} tone="blue" />
        <Stat icon={CalendarClock} label="Overdue" value={summary?.overdueCount || 0} tone="red" />
        <Stat icon={CheckCircle2} label="Done" value={summary?.byStatus?.Done || 0} tone="green" />
        <Stat icon={Shield} label="In progress" value={summary?.byStatus?.["In Progress"] || 0} tone="amber" />
      </div>
    </section>
  );
}

function Projects({ projects, users, isAdmin, onCreateProject }) {
  const [form, setForm] = useState({ name: "", description: "", members: [] });

  const submit = async (event) => {
    event.preventDefault();
    await onCreateProject(form);
    setForm({ name: "", description: "", members: [] });
  };

  return (
    <section id="projects" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Active Workspaces</h2>
        </div>
      </div>
      {isAdmin && (
        <form className="toolbar-form" onSubmit={submit}>
          <input placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select multiple value={form.members} onChange={(e) => setForm({ ...form, members: Array.from(e.target.selectedOptions, (option) => option.value) })}>
            {users.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
          </select>
          <button className="primary" type="submit"><Plus size={17} />Project</button>
        </form>
      )}
      <div className="project-grid">
        {projects.map((project) => (
          <article className="card" key={project._id}>
            <div className="card-head">
              <h3>{project.name}</h3>
              <span>{project.taskCount} tasks</span>
            </div>
            <p>{project.description || "No description yet."}</p>
            <div className="avatars">
              {project.members?.map((member) => <span key={member._id}>{member.name.slice(0, 2).toUpperCase()}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Tasks({ tasks, projects, users, isAdmin, onCreateTask, onUpdateStatus }) {
  const [form, setForm] = useState({
    title: "",
    project: "",
    assignee: "",
    dueDate: "",
    priority: "Medium"
  });

  const projectMembers = useMemo(() => {
    const project = projects.find((item) => item._id === form.project);
    return project?.members || users;
  }, [form.project, projects, users]);

  const submit = async (event) => {
    event.preventDefault();
    await onCreateTask(form);
    setForm({ title: "", project: "", assignee: "", dueDate: "", priority: "Medium" });
  };

  return (
    <section id="tasks" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Tasks</p>
          <h2>Assignments</h2>
        </div>
      </div>
      {isAdmin && (
        <form className="toolbar-form" onSubmit={submit}>
          <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value, assignee: "" })} required>
            <option value="">Project</option>
            {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select>
          <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} required>
            <option value="">Assignee</option>
            {projectMembers.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
          </select>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
          <button className="primary" type="submit"><Plus size={17} />Task</button>
        </form>
      )}
      <div className="task-list">
        {tasks.map((task) => (
          <article className="task-row" key={task._id}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.project?.name} • {task.assignee?.name} • Due {new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
            <span className={cx("pill", task.priority.toLowerCase())}>{task.priority}</span>
            <select value={task.status} onChange={(e) => onUpdateStatus(task._id, e.target.value)}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </article>
        ))}
      </div>
    </section>
  );
}

function Home() {
  const { user } = useAuth();
  const [state, setState] = useState({ users: [], projects: [], tasks: [], summary: null });
  const [error, setError] = useState("");
  const isAdmin = user.role === "Admin";

  const load = async () => {
    const [usersRes, projectsRes, tasksRes, dashboardRes] = await Promise.all([
      api.get("/users"),
      api.get("/projects"),
      api.get("/tasks"),
      api.get("/dashboard")
    ]);
    setState({
      users: usersRes.data,
      projects: projectsRes.data,
      tasks: tasksRes.data,
      summary: dashboardRes.data
    });
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || "Could not load dashboard"));
  }, []);

  const createProject = async (payload) => {
    setError("");
    try {
      await api.post("/projects", payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create project");
    }
  };

  const createTask = async (payload) => {
    setError("");
    try {
      await api.post("/tasks", payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create task");
    }
  };

  const updateStatus = async (taskId, status) => {
    setError("");
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update task");
    }
  };

  return (
    <Layout>
      <header className="topbar">
        <div>
          <p className="eyebrow">Welcome, {user.name}</p>
          <h1>Ethara Workspace</h1>
        </div>
        <span className="role-badge">{user.role}</span>
      </header>
      {error && <p className="error banner">{error}</p>}
      <Dashboard summary={state.summary} />
      <Projects projects={state.projects} users={state.users} isAdmin={isAdmin} onCreateProject={createProject} />
      <Tasks tasks={state.tasks} projects={state.projects} users={state.users} isAdmin={isAdmin} onCreateTask={createTask} onUpdateStatus={updateStatus} />
    </Layout>
  );
}

export default function App() {
  const { user } = useAuth();
  return user ? <Home /> : <AuthPage />;
}
