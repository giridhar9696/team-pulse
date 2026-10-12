import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Eye, EyeOff, KeyRound, ShieldCheck, UserRound, Zap } from "lucide-react";
import { BrandMark } from "../../components/ui/BrandMark";
import { FieldShell, TextInput } from "../../components/ui/FormControls";
import { Tabs } from "../../components/ui/Tabs";
import { Toast } from "../../components/ui/Toast";
import { demoCredentials } from "../../data/demoData";
import { useAuth } from "./authContext";
import type { UserRole } from "./authService";

type LoginErrors = {
  identifier?: string;
  password?: string;
};

export function LoginPage() {
  const [role, setRole] = useState<UserRole>("employee");
  const [identifier, setIdentifier] = useState(demoCredentials.employee.employeeId);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [navigate, user]);

  function selectRole(nextRole: UserRole) {
    setRole(nextRole);
    setIdentifier(nextRole === "admin" ? demoCredentials.admin.email : demoCredentials.employee.employeeId);
    setPassword("");
    setErrors({});
    setStatus(null);
  }

  function fillDemo(nextRole: UserRole) {
    setRole(nextRole);
    setIdentifier(nextRole === "admin" ? demoCredentials.admin.email : demoCredentials.employee.employeeId);
    setPassword(nextRole === "admin" ? demoCredentials.admin.password : demoCredentials.employee.password);
    setErrors({});
    setStatus(null);
  }

  function validate() {
    const nextErrors: LoginErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = role === "admin" ? "Admin email is required." : "Employee ID is required.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const authenticated = await login({ role, identifier, password });
      const requestedPath = location.state && typeof location.state === "object" && "from" in location.state
        ? String(location.state.from)
        : `/${authenticated.role}`;
      navigate(requestedPath.startsWith(`/${authenticated.role}`) ? requestedPath : `/${authenticated.role}`, {
        replace: true,
      });
    } catch {
      setStatus("Credentials did not match the selected demo role.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const identifierLabel = role === "admin" ? "Admin email" : "Employee ID";
  const identifierHint = role === "admin" ? demoCredentials.admin.email : demoCredentials.employee.employeeId;

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <BrandMark stacked />
        <div className="login-panel__intro">
          <p className="eyebrow">AUTH-v2.8 / Prototype access boundary</p>
          <h1 id="login-title">Every Task. One Team. On Track.</h1>
          <p>
            Role-aware demo access for the shared UI stage. Frontend route guards
            are for prototype flow only and are not production security.
          </p>
        </div>
        <div className="pulse-mesh" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="credential-grid">
          <article>
            <ShieldCheck size={20} />
            <h2>Admin</h2>
            <p>{demoCredentials.admin.email}</p>
          </article>
          <article>
            <UserRound size={20} />
            <h2>Employee</h2>
            <p>{demoCredentials.employee.employeeId}</p>
          </article>
        </div>
      </section>
      <form className="login-card" aria-label="Demo login form" onSubmit={handleSubmit} noValidate>
        <div>
          <p className="eyebrow">Select clearance identity</p>
          <Tabs
            label="Login role"
            value={role}
            onChange={selectRole}
            items={[
              { value: "employee", label: "Employee", icon: <Badge size={16} /> },
              { value: "admin", label: "Admin", icon: <ShieldCheck size={16} /> },
            ]}
          />
        </div>
        <div className="quick-fill">
          <button type="button" onClick={() => fillDemo("employee")}>
            <Zap size={15} />
            Quick fill Employee
          </button>
          <button type="button" onClick={() => fillDemo("admin")}>
            <ShieldCheck size={15} />
            Quick fill Admin
          </button>
        </div>
        {status && (
          <Toast
            tone="error"
            title="Invalid credentials"
            message={status}
            onDismiss={() => setStatus(null)}
          />
        )}
        <FieldShell id="identity" label={identifierLabel} hint={identifierHint} error={errors.identifier}>
          <TextInput
            id="identity"
            name="identity"
            autoComplete="username"
            value={identifier}
            placeholder={identifierHint}
            error={errors.identifier}
            icon={role === "admin" ? <UserRound size={17} /> : <Badge size={17} />}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </FieldShell>
        <FieldShell id="password" label="Access passkey" hint="Demo only" error={errors.password}>
          <TextInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            placeholder="Enter password"
            error={errors.password}
            icon={<KeyRound size={17} />}
            trailing={
              <button
                className="input-action"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            onChange={(event) => setPassword(event.target.value)}
          />
        </FieldShell>
        <button className="button button--primary button--full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Verifying..." : `Enter ${role === "admin" ? "Admin" : "Employee"} panel`}
        </button>
      </form>
    </main>
  );
}
