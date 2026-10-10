import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  FileCode2,
  FolderLock,
  Gauge,
  History,
  KeyRound,
  Layers,
  Link2,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Upload,
  UserRound,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://sweb-be.onrender.com/api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

const navItems = [
  { key: "overview", label: "Security Dashboard", icon: Gauge },
  { key: "workspace", label: "Monaco Code Studio", icon: FileCode2 },
  { key: "functions", label: "Module Registry", icon: Layers },
  { key: "upload", label: "Upload .Wasm", icon: Upload },
  { key: "audit", label: "Cryptographic Audit Trail", icon: Link2 },
  { key: "keys", label: "Ed25519 Key Vault", icon: KeyRound },
  { key: "history", label: "Execution Telemetry", icon: History },
  { key: "events", label: "Security Incidents", icon: ShieldAlert },
  { key: "policies", label: "Sandbox Policies", icon: Lock },
  { key: "settings", label: "Runtime Posture", icon: Terminal },
];

const defaultLogin = { username: "admin", password: "Admin123!" };

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("wasmToken") || "");
  const [page, setPage] = useState("overview");
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [functions, setFunctions] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [events, setEvents] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [keys, setKeys] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Workspace / Studio states
  const [editorWat, setEditorWat] = useState("");
  const [functionNameInput, setFunctionNameInput] = useState("custom_fn");
  const [selectedTemplateId, setSelectedTemplateId] = useState("fibonacci");
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [inputArgs, setInputArgs] = useState("10");
  const [entryPoint, setEntryPoint] = useState("fibonacci");
  const [validationReport, setValidationReport] = useState(null);
  const [lastExecutionResult, setLastExecutionResult] = useState(null);

  // Audit verification state
  const [auditVerification, setAuditVerification] = useState(null);
  const [verifyingAudit, setVerifyingAudit] = useState(false);

  useEffect(() => {
    API.defaults.headers.common.Authorization = token ? `Bearer ${token}` : "";
    if (token) {
      loadSession();
      loadAllData();
    }
  }, [token]);

  const loadSession = async () => {
    try {
      const response = await API.get("/auth/me");
      setCurrentUser(response.data);
    } catch {
      setToken("");
      localStorage.removeItem("wasmToken");
      setCurrentUser(null);
    }
  };

  const loadAllData = async () => {
    try {
      const [
        dashRes,
        funcsRes,
        execsRes,
        eventsRes,
        policiesRes,
        keysRes,
        auditRes,
        templatesRes,
      ] = await Promise.all([
        API.get("/dashboard"),
        API.get("/functions"),
        API.get("/executions"),
        API.get("/security-events"),
        API.get("/policies"),
        API.get("/keys"),
        API.get("/audit"),
        API.get("/templates"),
      ]);
      setDashboard(dashRes.data);
      setFunctions(funcsRes.data);
      setExecutions(execsRes.data);
      setEvents(eventsRes.data);
      setPolicies(policiesRes.data);
      setKeys(keysRes.data);
      setAuditLog(auditRes.data);
      setTemplates(templatesRes.data);

      if (!selectedModuleId && funcsRes.data.length > 0) {
        setSelectedModuleId(funcsRes.data[0].id);
      }
      if (!selectedPolicyId && policiesRes.data.length > 0) {
        const standard =
          policiesRes.data.find((p) => p.name === "Standard") ||
          policiesRes.data[0];
        setSelectedPolicyId(standard.id);
      }

      // Pre-load default template if editor is empty
      if (!editorWat && templatesRes.data.length > 0) {
        const fib =
          templatesRes.data.find((t) => t.id === "fibonacci") ||
          templatesRes.data[0];
        setEditorWat(fib.wat);
        setSelectedTemplateId(fib.id);
        setEntryPoint(fib.entry_point);
        setInputArgs(fib.default_args.join(", "));
        setFunctionNameInput(fib.name);
      }
    } catch (error) {
      console.error("Failed to load initial sandbox data", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await API.post("/auth/login", loginForm);
      const nextToken = res.data.token;
      localStorage.setItem("wasmToken", nextToken);
      setToken(nextToken);
      setStatusMessage(
        "Authentication successful. Connected to WebAssembly Micro-VM control plane.",
      );
    } catch (err) {
      setStatusMessage(
        err.response?.data?.detail || "Login failed. Check credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await API.post("/auth/register", registerForm);
      const nextToken = res.data.token;
      localStorage.setItem("wasmToken", nextToken);
      setToken(nextToken);
      setStatusMessage("Developer account registered successfully.");
    } catch (err) {
      setStatusMessage(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setEditorWat(tmpl.wat);
      setFunctionNameInput(tmpl.name);
      setEntryPoint(tmpl.entry_point);
      setInputArgs(tmpl.default_args.join(", "));
      setValidationReport(null);
    }
  };

  const handleValidateWat = async () => {
    try {
      setLoading(true);
      const res = await API.post("/functions/validate", {
        source_wat: editorWat,
        policy_id: selectedPolicyId,
      });
      setValidationReport(res.data);
      setStatusMessage(
        `Validation completed: Risk Level ${res.data.risk_level} (Score ${res.data.risk_score}/100)`,
      );
    } catch (err) {
      setStatusMessage(err.response?.data?.detail || "Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompileAndStore = async () => {
    try {
      setLoading(true);
      const res = await API.post("/functions/compile", {
        name: functionNameInput || "sandbox_function",
        description: `Compiled from WebAssembly Text Format (${entryPoint})`,
        source_wat: editorWat,
      });
      setStatusMessage(
        `Module '${res.data.name}' compiled & registered with SHA-256: ${res.data.sha256_hash.slice(0, 16)}...`,
      );
      await loadAllData();
      setSelectedModuleId(res.data.id);
    } catch (err) {
      setStatusMessage(err.response?.data?.detail || "Compilation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSandbox = async () => {
    const targetModule =
      functions.find((f) => f.id === Number(selectedModuleId)) || functions[0];
    if (!targetModule) {
      setStatusMessage("Please select or compile a WebAssembly module first.");
      return;
    }

    // Parse args
    const parsedArgs = inputArgs
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (Number.isNaN(Number(s)) ? s : Number(s)));

    try {
      setLoading(true);
      const res = await API.post("/executions/run", {
        module_id: targetModule.id,
        function_name:
          entryPoint || targetModule.abi_metadata?.entry_point || "add",
        args: parsedArgs,
        policy_id: selectedPolicyId,
      });
      setLastExecutionResult(res.data);
      setStatusMessage(
        `Execution finished with status: ${res.data.execution_status.toUpperCase()} (${res.data.worker_exit_reason})`,
      );
      await loadAllData();
    } catch (err) {
      setStatusMessage(
        err.response?.data?.detail || "Execution request failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAuditChain = async () => {
    try {
      setVerifyingAudit(true);
      const res = await API.post("/audit/verify");
      setAuditVerification(res.data);
      setStatusMessage(res.data.message);
    } catch (err) {
      setStatusMessage("Audit chain verification failed.");
    } finally {
      setVerifyingAudit(false);
    }
  };

  const handleSimulateTamper = async () => {
    try {
      const res = await API.post("/audit/simulate-tamper");
      setStatusMessage(res.data.message);
      await loadAllData();
      handleVerifyAuditChain();
    } catch (err) {
      setStatusMessage(
        err.response?.data?.detail || "Tamper simulation failed.",
      );
    }
  };

  const handleRestoreChain = async () => {
    try {
      const res = await API.post("/audit/restore-chain");
      setStatusMessage(res.data.message);
      await loadAllData();
      handleVerifyAuditChain();
    } catch (err) {
      setStatusMessage("Failed to restore chain.");
    }
  };

  const handleGenerateKey = async () => {
    const keyName = prompt(
      "Enter a name for the new Ed25519 signing key:",
      `dev-key-${Date.now().toString().slice(-4)}`,
    );
    if (!keyName) return;
    try {
      await API.post("/keys/generate", { key_name: keyName });
      setStatusMessage(`Generated new Ed25519 keypair '${keyName}'.`);
      await loadAllData();
    } catch (err) {
      setStatusMessage("Key generation failed.");
    }
  };

  const handleSignFunction = async (fnId) => {
    if (keys.length === 0) {
      alert("Generate an Ed25519 signing key first in the Key Vault.");
      setPage("keys");
      return;
    }
    try {
      await API.post(`/functions/${fnId}/sign`, { key_id: keys[0].id });
      setStatusMessage(
        `Function cryptographically signed with Ed25519 key: ${keys[0].key_name}`,
      );
      await loadAllData();
    } catch (err) {
      setStatusMessage("Signing failed.");
    }
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);
    form.append(
      "name",
      e.target.name.value || file.name.replace(/\.wasm$/i, ""),
    );
    form.append(
      "description",
      e.target.description.value || "Uploaded WebAssembly binary",
    );

    try {
      setLoading(true);
      const res = await API.post("/functions/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatusMessage(
        `Module '${res.data.name}' uploaded and verified successfully.`,
      );
      await loadAllData();
      setSelectedModuleId(res.data.id);
      setPage("workspace");
    } catch (err) {
      setStatusMessage(err.response?.data?.detail || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wasmToken");
    setToken("");
    setCurrentUser(null);
    setPage("overview");
  };

  const visibleNav = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return navItems;
    return navItems.filter((item) => item.key !== "policies");
  }, [currentUser]);

  // Auth Screen
  if (!token || !currentUser) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <span className="badge">
              <ShieldCheck size={14} /> Cryptographic Sandbox
            </span>
            <h1>WebAssembly Micro-VM Control Plane</h1>
            <p>
              Isolated execution runtime for untrusted serverless functions with
              memory safety and Ed25519 integrity.
            </p>
          </div>

          <div className="tab-row">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Sign In
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Create Developer Account
            </button>
          </div>

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="auth-form">
              <label>
                Username
                <input
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                  placeholder="admin"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  placeholder="••••••••••••"
                  required
                />
              </label>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Lock size={16} />
                )}
                Authenticate to Sandbox
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <label>
                Developer Username
                <input
                  value={registerForm.username}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      username: e.target.value,
                    })
                  }
                  placeholder="dev_user"
                  required
                />
              </label>
              <label>
                Work Email
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  placeholder="dev@example.org"
                  required
                />
              </label>
              <label>
                Secure Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="••••••••••••"
                  required
                />
              </label>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Register Tenant & Generate Keypair
              </button>
            </form>
          )}

          <div className="helper-box">
            <ShieldCheck size={16} />
            <span>
              Default Administrator: <strong>admin</strong> /{" "}
              <strong>Admin123!</strong>
            </span>
          </div>

          {statusMessage && <div className="message-box">{statusMessage}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="brand-wrap">
            <div className="brand-mark">
              <Cpu size={22} />
            </div>
            <div>
              <strong>Wasm Micro-VM</strong>
              <small>Cryptographic Sandbox</small>
            </div>
          </div>

          <nav className="sidebar-nav">
            {visibleNav.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={page === key ? "nav-item active" : "nav-item"}
                onClick={() => setPage(key)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <button className="nav-item danger" onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Isolated Sandbox Runtime</p>
            <h2>
              {page === "overview"
                ? "Security Operations Dashboard"
                : page === "workspace"
                  ? "Monaco Code Studio & Execution Sandbox"
                  : page === "audit"
                    ? "Cryptographic Hash-Chained Audit Ledger"
                    : page.toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="user-pill">
              <UserRound size={15} />
              <span>{currentUser?.username}</span>
              <span className="tag neutral ml-1">{currentUser?.role}</span>
            </div>
          </div>
        </header>

        {statusMessage && (
          <div className="message-box mb-5">
            <Activity size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* PAGE 1: OVERVIEW / DASHBOARD */}
        {page === "overview" && dashboard && (
          <div className="page-stack">
            {/* Real Stats Grid */}
            <div className="stats-grid">
              <div className="metric-card">
                <div className="icon-box cyan">
                  <FileCode2 size={22} />
                </div>
                <div>
                  <span>Registered Modules</span>
                  <strong>{dashboard.total_functions}</strong>
                </div>
              </div>
              <div className="metric-card">
                <div className="icon-box green">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <span>Successful Runs</span>
                  <strong>{dashboard.successful_executions}</strong>
                </div>
              </div>
              <div className="metric-card">
                <div className="icon-box amber">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <span>Trapped / Failed</span>
                  <strong>{dashboard.failed_executions}</strong>
                </div>
              </div>
              <div className="metric-card">
                <div className="icon-box red">
                  <Lock size={22} />
                </div>
                <div>
                  <span>Blocked Violations</span>
                  <strong>{dashboard.blocked_executions}</strong>
                </div>
              </div>
              <div className="metric-card">
                <div className="icon-box purple">
                  <Cpu size={22} />
                </div>
                <div>
                  <span>Avg Duration / Fuel</span>
                  <strong className="text-xl">
                    {dashboard.avg_duration_ms} ms /{" "}
                    {dashboard.avg_fuel_consumed}
                  </strong>
                </div>
              </div>
            </div>

            {/* Micro-VM Worker Health Banner */}
            <div className="panel bg-slate-900/80 border-sky-500/20">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 relative" />
                  </div>
                  <div>
                    <strong className="text-white text-base">
                      Execution Worker Subprocess:{" "}
                      {dashboard.worker_health.status.toUpperCase()}
                    </strong>
                    <p className="text-slate-400 text-xs m-0">
                      Runtime: {dashboard.worker_health.runtime}{" "}
                      {dashboard.worker_health.runtime_version} | Isolation:{" "}
                      {dashboard.worker_health.worker_mode} | Latency:{" "}
                      {dashboard.worker_health.probe_latency_ms} ms
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag success">Fuel Metering Enforced</span>
                  <span className="tag success">Linear Memory Capped</span>
                  <span className="tag success">Ambient Syscalls Denied</span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="panel-grid two-col">
              <div className="panel">
                <div className="panel-header">
                  <h3>Execution Activity by Date</h3>
                </div>
                {dashboard.function_activity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart
                      data={dashboard.function_activity.map((a) => ({
                        day: a.name,
                        count: a.executions,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#38bdf8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    No execution records logged yet.
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Containment Outcome Distribution</h3>
                </div>
                {dashboard.total_executions > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={dashboard.execution_status_counts.filter(
                          (c) => c.value > 0,
                        )}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={5}
                      >
                        {dashboard.execution_status_counts.map((entry, idx) => (
                          <Cell
                            key={entry.name}
                            fill={
                              ["#22c55e", "#f59e0b", "#ef4444", "#a855f7"][
                                idx % 4
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    No execution telemetry recorded yet. Run a function to
                    generate authentic metrics.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Feeds */}
            <div className="panel-grid two-col">
              <div className="panel">
                <div className="panel-header">
                  <h3>Recent Security Incidents</h3>
                  <button
                    className="secondary-btn text-xs"
                    onClick={() => setPage("events")}
                  >
                    View All
                  </button>
                </div>
                {dashboard.recent_events.length > 0 ? (
                  <ul className="event-list">
                    {dashboard.recent_events.map((ev) => (
                      <li key={ev.id} className="event-item">
                        <span
                          className={`pill ${ev.severity === "critical" ? "high" : ev.severity}`}
                        >
                          {ev.severity}
                        </span>
                        <div>
                          <strong>{ev.event_type}</strong>
                          <p>{ev.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    Zero security incidents recorded.
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Recent Executions</h3>
                  <button
                    className="secondary-btn text-xs"
                    onClick={() => setPage("history")}
                  >
                    Full Telemetry
                  </button>
                </div>
                {dashboard.recent_executions.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Fuel</th>
                        <th>Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recent_executions.map((ex) => (
                        <tr key={ex.id}>
                          <td>
                            <span
                              className={`tag ${ex.execution_status === "success" ? "success" : ex.execution_status === "blocked" ? "danger" : "warning"}`}
                            >
                              {ex.execution_status}
                            </span>
                          </td>
                          <td>{ex.execution_time_ms} ms</td>
                          <td>{ex.fuel_consumed?.toLocaleString()}</td>
                          <td className="text-xs text-slate-400">
                            {ex.worker_exit_reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">No executions executed yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: MONACO CODE STUDIO & SANDBOX WORKSPACE */}
        {page === "workspace" && (
          <div className="page-stack">
            {/* Template Selector Bar */}
            <div className="panel py-3 px-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="text-sky-400" size={18} />
                <span className="font-semibold text-sm text-slate-200">
                  Load Test Vectors & Workloads:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedTemplateId === tmpl.id
                        ? tmpl.category === "attack"
                          ? "bg-rose-600 text-white shadow-md shadow-rose-900/40"
                          : "bg-sky-600 text-white shadow-md shadow-sky-900/40"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                  >
                    {tmpl.category === "attack" ? "⚠️ " : "⚡ "}
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="workspace-grid">
              {/* Left Pane: Monaco Code Editor */}
              <div className="panel flex flex-col gap-3">
                <div className="panel-header mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal size={18} className="text-sky-400" />
                    <h3>WebAssembly Text Format (WAT) Source Studio</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="secondary-btn text-xs"
                      onClick={handleValidateWat}
                      disabled={loading}
                    >
                      <ShieldCheck size={14} /> Validate AST
                    </button>
                    <button
                      className="primary-btn text-xs"
                      onClick={handleCompileAndStore}
                      disabled={loading}
                    >
                      <Cpu size={14} /> Compile & Register Module
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={functionNameInput}
                    onChange={(e) => setFunctionNameInput(e.target.value)}
                    placeholder="Function Identifier"
                    className="text-xs py-1.5 px-3 flex-1"
                  />
                  <span className="text-xs text-slate-400">Entry Export:</span>
                  <input
                    value={entryPoint}
                    onChange={(e) => setEntryPoint(e.target.value)}
                    placeholder="entry function"
                    className="text-xs py-1.5 px-3 w-32"
                  />
                </div>

                <div className="editor-container h-[420px]">
                  <Editor
                    height="100%"
                    defaultLanguage="scheme"
                    value={editorWat}
                    onChange={(val) => setEditorWat(val || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>

                {/* Validation Feedback Card */}
                {validationReport && (
                  <div
                    className={`p-4 rounded-xl border ${validationReport.is_valid ? "bg-slate-900/90 border-emerald-500/30" : "bg-red-950/40 border-rose-500/40"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs uppercase tracking-wider text-slate-300">
                        Pre-Flight Structural Validation
                      </span>
                      <span
                        className={`tag ${validationReport.is_valid ? "success" : "danger"}`}
                      >
                        {validationReport.is_valid ? "VALIDATED" : "REJECTED"}{" "}
                        (Risk Score: {validationReport.risk_score}/100)
                      </span>
                    </div>
                    {validationReport.errors?.length > 0 && (
                      <div className="text-rose-400 text-xs mb-2">
                        {validationReport.errors.map((e, idx) => (
                          <p key={idx} className="m-0">
                            • {e}
                          </p>
                        ))}
                      </div>
                    )}
                    {validationReport.findings?.map((f, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-300 flex items-center gap-2 mt-1"
                      >
                        <span
                          className={`pill ${f.severity.toLowerCase()} text-[10px]`}
                        >
                          {f.severity}
                        </span>
                        <span>{f.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Pane: Sandbox Invocation & Telemetry */}
              <div className="panel flex flex-col gap-4">
                <div className="panel-header mb-1">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-amber-400" />
                    <h3>Sandbox Micro-VM Invocation</h3>
                  </div>
                </div>

                {/* Module Selector */}
                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Target Registered Module:
                  <select
                    value={selectedModuleId || ""}
                    onChange={(e) =>
                      setSelectedModuleId(Number(e.target.value))
                    }
                    className="text-sm py-2"
                  >
                    {functions.map((fn) => (
                      <option key={fn.id} value={fn.id}>
                        {fn.name} ({fn.module_filename}) - SHA-256:{" "}
                        {fn.sha256_hash.slice(0, 10)}...
                      </option>
                    ))}
                  </select>
                </label>

                {/* Policy Selector */}
                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Enforcement Policy:
                  <select
                    value={selectedPolicyId || ""}
                    onChange={(e) =>
                      setSelectedPolicyId(Number(e.target.value))
                    }
                    className="text-sm py-2"
                  >
                    {policies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Max Fuel: {p.max_fuel.toLocaleString()} |
                        Memory: {(p.max_memory_bytes / 1048576).toFixed(0)}MB |
                        Timeout: {p.timeout_ms}ms)
                      </option>
                    ))}
                  </select>
                </label>

                {/* Args Editor */}
                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Input Arguments (comma separated):
                  <input
                    value={inputArgs}
                    onChange={(e) => setInputArgs(e.target.value)}
                    placeholder="10, 20"
                    className="text-sm py-2"
                  />
                </label>

                <button
                  className="primary-btn w-full py-3"
                  onClick={handleExecuteSandbox}
                  disabled={loading || functions.length === 0}
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                  Launch in Isolated Sandbox Worker
                </button>

                {/* Real Execution Telemetry Card */}
                {lastExecutionResult && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 mt-2 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Execution Outcome
                      </span>
                      <span
                        className={`tag ${lastExecutionResult.execution_status === "success" ? "success" : lastExecutionResult.execution_status === "blocked" ? "danger" : "warning"}`}
                      >
                        {lastExecutionResult.execution_status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">
                          Wall-Clock Duration:
                        </span>
                        <strong className="text-sky-400 text-sm">
                          {lastExecutionResult.execution_time_ms} ms
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Fuel Metered:
                        </span>
                        <strong className="text-amber-400 text-sm">
                          {lastExecutionResult.fuel_consumed?.toLocaleString()}{" "}
                          units
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Memory Allocated:
                        </span>
                        <strong className="text-emerald-400 text-sm">
                          {(
                            (lastExecutionResult.memory_consumed_bytes || 0) /
                            1024
                          ).toFixed(1)}{" "}
                          KB
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Worker Reason:
                        </span>
                        <strong className="text-slate-200 text-sm">
                          {lastExecutionResult.worker_exit_reason}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-slate-400 text-xs block mb-1">
                        Return Value:
                      </span>
                      <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-sm text-emerald-400 break-all">
                        {lastExecutionResult.output_json?.result !== undefined
                          ? JSON.stringify(
                              lastExecutionResult.output_json.result,
                            )
                          : lastExecutionResult.error_message || "None"}
                      </div>
                    </div>

                    {lastExecutionResult.error_message && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                        <strong>Sandbox Trapped: </strong>
                        {lastExecutionResult.error_message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3: MODULE REGISTRY */}
        {page === "functions" && (
          <div className="page-stack">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Registered WebAssembly Modules</h3>
                  <p className="text-slate-400 text-xs m-0">
                    Stored bytecodes with cryptographic digests, ABI metadata,
                    and Ed25519 signatures.
                  </p>
                </div>
                <button
                  className="primary-btn text-xs"
                  onClick={() => setPage("workspace")}
                >
                  + New Module
                </button>
              </div>

              {functions.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Module Name</th>
                      <th>SHA-256 Digest</th>
                      <th>Size</th>
                      <th>Ed25519 Signature</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {functions.map((fn) => (
                      <tr key={fn.id}>
                        <td>
                          <strong>{fn.name}</strong>
                          <span className="text-slate-400 text-xs block">
                            {fn.module_filename}
                          </span>
                        </td>
                        <td>
                          <span className="hash-badge">
                            {fn.sha256_hash.slice(0, 16)}...
                          </span>
                        </td>
                        <td>{(fn.module_size / 1024).toFixed(1)} KB</td>
                        <td>
                          {fn.signature_status === "verified" ? (
                            <span className="tag success">
                              <ShieldCheck size={12} /> Verified
                            </span>
                          ) : (
                            <button
                              className="secondary-btn text-xs py-1 px-2"
                              onClick={() => handleSignFunction(fn.id)}
                            >
                              <KeyRound size={12} /> Sign Module
                            </button>
                          )}
                        </td>
                        <td>
                          <span className="tag info">{fn.status}</span>
                        </td>
                        <td>
                          <button
                            className="secondary-btn text-xs py-1 px-2"
                            onClick={() => {
                              setSelectedModuleId(fn.id);
                              setPage("workspace");
                            }}
                          >
                            <Play size={12} /> Run in Sandbox
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  No WebAssembly modules registered yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 4: UPLOAD .WASM */}
        {page === "upload" && (
          <div className="page-stack">
            <div className="panel max-w-xl mx-auto w-full">
              <div className="panel-header">
                <h3>Upload Compiled WebAssembly (.wasm)</h3>
              </div>
              <form onSubmit={handleUploadFile} className="stack-form">
                <label>
                  Function Name
                  <input name="name" placeholder="image_filter_wasm" required />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Describe the serverless module functionality..."
                  />
                </label>
                <label>
                  WebAssembly Binary (.wasm file)
                  <input type="file" name="file" accept=".wasm" required />
                </label>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
                  Validate, Hash & Store
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PAGE 5: CRYPTOGRAPHIC AUDIT TRAIL */}
        {page === "audit" && (
          <div className="page-stack">
            <div className="panel">
              <div className="panel-header flex-wrap gap-3">
                <div>
                  <h3>Immutable Cryptographically Chained Audit Ledger</h3>
                  <p className="text-slate-400 text-xs m-0">
                    Each action is hashed using SHA-256 and chained to the
                    previous block:{" "}
                    <code className="text-sky-400">
                      Block_Hash = SHA256(Prev_Hash + Seq + Payload)
                    </code>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="primary-btn text-xs"
                    onClick={handleVerifyAuditChain}
                    disabled={verifyingAudit}
                  >
                    {verifyingAudit ? (
                      <RefreshCw className="animate-spin" size={14} />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    Verify Entire Hash Chain
                  </button>
                  <button
                    className="secondary-btn text-xs text-rose-300"
                    onClick={handleSimulateTamper}
                  >
                    <AlertOctagon size={14} /> Simulate Attacker Tamper
                  </button>
                  <button
                    className="secondary-btn text-xs text-emerald-300"
                    onClick={handleRestoreChain}
                  >
                    <RotateCcw size={14} /> Restore Authentic Ledger
                  </button>
                </div>
              </div>

              {/* Verification Verdict Banner */}
              {auditVerification && (
                <div
                  className={`p-4 rounded-xl mb-4 border ${auditVerification.is_valid ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-rose-950/40 border-rose-500/40 text-rose-300"}`}
                >
                  <div className="flex items-center gap-3">
                    {auditVerification.is_valid ? (
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    ) : (
                      <AlertOctagon size={24} className="text-rose-400" />
                    )}
                    <div>
                      <strong className="text-base block">
                        {auditVerification.is_valid
                          ? "CRYPTOGRAPHIC INTEGRITY VERIFIED"
                          : "TAMPER DETECTED: HASH CHAIN BROKEN"}
                      </strong>
                      <span className="text-xs">
                        {auditVerification.message}
                      </span>
                      {auditVerification.latest_block_hash && (
                        <div className="mt-1 text-[11px] font-mono text-slate-400">
                          Latest Block Digest:{" "}
                          {auditVerification.latest_block_hash}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Block Chain Cards */}
              <div className="block-chain-container">
                {auditLog.map((entry, idx) => (
                  <div key={entry.id}>
                    <div
                      className={`audit-card ${auditVerification?.broken_block_index === entry.sequence_number ? "corrupted" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="tag info">
                            Block #{entry.sequence_number}
                          </span>
                          <strong className="text-sm text-slate-200">
                            {entry.event_type}
                          </strong>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-slate-400 block">Actor:</span>
                          <span className="text-slate-200 font-semibold">
                            {entry.actor_username}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">
                            Resource:
                          </span>
                          <span className="text-slate-200">
                            {entry.resource_type} ({entry.resource_id})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">
                            Payload Digest:
                          </span>
                          <span className="hash-badge">
                            {entry.payload_hash.slice(0, 16)}...
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 text-[11px] font-mono flex flex-wrap justify-between gap-2 text-slate-400">
                        <div>
                          <span>Prev Hash: </span>
                          <span className="text-slate-500">
                            {entry.previous_hash.slice(0, 20)}...
                          </span>
                        </div>
                        <div>
                          <span>Block Hash: </span>
                          <span className="text-sky-400 font-semibold">
                            {entry.entry_hash.slice(0, 24)}...
                          </span>
                        </div>
                      </div>
                    </div>
                    {idx < auditLog.length - 1 && (
                      <div className="chain-connector" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 6: ED25519 KEY VAULT */}
        {page === "keys" && (
          <div className="page-stack">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Tenant Cryptographic Key Vault</h3>
                  <p className="text-slate-400 text-xs m-0">
                    Asymmetric Ed25519 keypairs for digitally signing untrusted
                    serverless binaries.
                  </p>
                </div>
                <button
                  className="primary-btn text-xs"
                  onClick={handleGenerateKey}
                >
                  <KeyRound size={14} /> Generate New Keypair
                </button>
              </div>

              {keys.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-700/60 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-sm text-sky-400">
                          {k.key_name}
                        </strong>
                        <span className="tag success">Active</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Algorithm:{" "}
                        <span className="text-slate-200 font-semibold uppercase">
                          {k.algorithm}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Created:{" "}
                        <span className="text-slate-300">
                          {new Date(k.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-[11px] text-slate-400 block mb-1">
                          Public Key (PEM):
                        </span>
                        <pre className="p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-300 overflow-x-auto m-0">
                          {k.public_key}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <KeyRound size={32} className="mx-auto text-slate-600 mb-2" />
                  <h4>No Signing Keys Found</h4>
                  <p>
                    Generate an Ed25519 keypair to sign your serverless modules
                    and satisfy strict execution policies.
                  </p>
                  <button
                    className="primary-btn text-xs"
                    onClick={handleGenerateKey}
                  >
                    Generate Keypair
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 7: EXECUTION HISTORY */}
        {page === "history" && (
          <div className="page-stack">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Execution Telemetry & Audit Records</h3>
                  <p className="text-slate-400 text-xs m-0">
                    Every sandboxed execution attempt with recorded resource
                    utilization.
                  </p>
                </div>
              </div>

              {executions.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Fuel Consumed</th>
                      <th>Memory</th>
                      <th>Exit Code</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((ex) => (
                      <tr key={ex.id}>
                        <td>#{ex.id}</td>
                        <td>
                          <span
                            className={`tag ${ex.execution_status === "success" ? "success" : ex.execution_status === "blocked" ? "danger" : "warning"}`}
                          >
                            {ex.execution_status}
                          </span>
                        </td>
                        <td>{ex.execution_time_ms} ms</td>
                        <td>{ex.fuel_consumed?.toLocaleString()}</td>
                        <td>
                          {((ex.memory_consumed_bytes || 0) / 1024).toFixed(1)}{" "}
                          KB
                        </td>
                        <td className="text-xs text-slate-300">
                          {ex.worker_exit_reason}
                        </td>
                        <td className="text-xs text-slate-400">
                          {new Date(ex.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  No execution records logged. Run functions from the workspace
                  to record telemetry.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 8: SECURITY INCIDENTS */}
        {page === "events" && (
          <div className="page-stack">
            <div className="panel">
              <div className="panel-header">
                <h3>Security Event Log & Intrusion Prevention</h3>
              </div>
              {events.length > 0 ? (
                <ul className="event-list">
                  {events.map((ev) => (
                    <li key={ev.id} className="event-item">
                      <span
                        className={`pill ${ev.severity === "critical" ? "high" : ev.severity}`}
                      >
                        {ev.severity}
                      </span>
                      <div>
                        <div className="flex items-center gap-3">
                          <strong>{ev.event_type}</strong>
                          <small className="text-slate-400">
                            {new Date(ev.created_at).toLocaleString()}
                          </small>
                        </div>
                        <p>{ev.description}</p>
                        {ev.metadata_json &&
                          Object.keys(ev.metadata_json).length > 0 && (
                            <pre className="mt-2 p-2 rounded bg-slate-950 text-[11px] font-mono text-slate-300 m-0">
                              {JSON.stringify(ev.metadata_json, null, 2)}
                            </pre>
                          )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  No security incidents detected.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 9: POLICIES */}
        {page === "policies" && (
          <div className="page-stack">
            <div className="panel">
              <div className="panel-header">
                <h3>Sandbox Execution Policies</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {policies.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-700/60 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-base text-slate-200">
                        {p.name}
                      </strong>
                      <span
                        className={`tag ${p.require_signature ? "warning" : "info"}`}
                      >
                        {p.require_signature ? "Signed Only" : "Open"}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">{p.description}</p>
                    <div className="mt-2 text-xs space-y-1 text-slate-300">
                      <div>
                        Max Fuel Budget:{" "}
                        <strong className="text-amber-400">
                          {p.max_fuel.toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        Memory Limit:{" "}
                        <strong className="text-emerald-400">
                          {(p.max_memory_bytes / 1048576).toFixed(0)} MB
                        </strong>
                      </div>
                      <div>
                        Watchdog Timeout:{" "}
                        <strong className="text-sky-400">
                          {p.timeout_ms} ms
                        </strong>
                      </div>
                      <div>
                        Max Module Size:{" "}
                        <strong>
                          {(p.max_module_size / 1048576).toFixed(0)} MB
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 10: SETTINGS & RUNTIME POSTURE */}
        {page === "settings" && (
          <div className="page-stack">
            <div className="panel">
              <div className="panel-header">
                <h3>Sandbox Architecture & Runtime Posture</h3>
              </div>
              <div className="info-list text-sm">
                <div>
                  <span>WebAssembly Engine</span>
                  <strong>Wasmtime 32.0.0 (Cranelift compiler)</strong>
                </div>
                <div>
                  <span>Isolation Model</span>
                  <strong>
                    Dedicated Subprocess Micro-VM with Process & Memory Jail
                  </strong>
                </div>
                <div>
                  <span>CPU Metering</span>
                  <strong>
                    Instruction-level Fuel Counter (`cfg.consume_fuel = True`)
                  </strong>
                </div>
                <div>
                  <span>Memory Isolation</span>
                  <strong>
                    Linear Memory Resource Limiter (`store.set_limits`)
                  </strong>
                </div>
                <div>
                  <span>Recursion Protection</span>
                  <strong>Wasm Max Stack Depth (1MB Guard Page)</strong>
                </div>
                <div>
                  <span>Cryptographic Gate</span>
                  <strong>
                    Ed25519 Asymmetric Signatures & SHA-256 Digest Verification
                  </strong>
                </div>
                <div>
                  <span>Audit Ledger</span>
                  <strong>
                    Immutable Cryptographic Hash Chaining with Genesis Root
                  </strong>
                </div>
                <div>
                  <span>Authenticated Tenant</span>
                  <strong>
                    {currentUser.username} ({currentUser.role})
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
