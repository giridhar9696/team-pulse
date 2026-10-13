import { type FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge, Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { BrandMark } from "../../components/ui/BrandMark";
import { FieldShell, TextInput } from "../../components/ui/FormControls";
import { Tabs } from "../../components/ui/Tabs";
import { Toast } from "../../components/ui/Toast";
import { configurationError } from '../../lib/supabase';
import { useAuth } from "./authContext";
import type { UserRole } from "./authService";

type LoginErrors = {
  identifier?: string;
  password?: string;
};

export function LoginPage() {
  const [role, setRole] = useState<UserRole>("employee");
  const [identifier, setIdentifier] = useState("");
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
    setPassword("");
    setErrors({});
    setStatus(null);
  }

  function validate() {
    const nextErrors: LoginErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = "Account email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      nextErrors.identifier = "Enter your account email.";
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
    } catch (failure) {
      setStatus(failure instanceof Error ? failure.message : "Unable to sign in. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const identifierLabel = "Account email";
  const identifierHint = "you@organization.com";

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <BrandMark stacked />
        <div className="login-panel__intro">
          <p className="eyebrow">Your team workspace</p>
          <h1 id="login-title">Every Task. One Team. On Track.</h1>
          <p>
            Sign in with your organization account to manage projects and assigned work.
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
            <p>Manage projects and review work.</p>
          </article>
          <article>
            <UserRound size={20} />
            <h2>Employee</h2>
            <p>Track assignments and submit work.</p>
          </article>
        </div>
      </section>
      <form className="login-card" aria-label="Login form" onSubmit={handleSubmit} noValidate>
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
        {configurationError && <p role="alert">{configurationError}</p>}
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
            type="email"
            autoComplete="username"
            value={identifier}
            placeholder={identifierHint}
            error={errors.identifier}
            icon={role === "admin" ? <UserRound size={17} /> : <Badge size={17} />}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </FieldShell>
        <FieldShell id="password" label="Password" error={errors.password}>
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
        <button className="button button--primary button--full" type="submit" disabled={isSubmitting || Boolean(configurationError)}>
          {isSubmitting ? "Verifying..." : `Enter ${role === "admin" ? "Admin" : "Employee"} panel`}
        </button>
        <Link to="/forgot-password">Forgot password?</Link>
      </form>
    </main>
  );
}
