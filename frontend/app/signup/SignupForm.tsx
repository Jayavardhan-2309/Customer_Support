import { Organization } from "@/types/customTypes";

type Props = {
  email: string;
  error: string;
  loading: boolean;
  organizationId: number | null;
  organizationName: string;
  organizations: Organization[];
  password: string;
  role: "user" | "admin";
  setEmail: (value: string) => void;
  setOrganizationId: (value: number | null) => void;
  setOrganizationName: (value: string) => void;
  setPassword: (value: string) => void;
  setRole: (value: "user" | "admin") => void;
  setShowPassword: (value: boolean) => void;
  setUsername: (value: string) => void;
  showPassword: boolean;
  username: string;
};

const parseOrganizationId = (value: string) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export function SignupForm(props: Readonly<Props>) {
  const {
    email,
    error,
    loading,
    organizationId,
    organizationName,
    organizations,
    password,
    role,
    setEmail,
    setOrganizationId,
    setOrganizationName,
    setPassword,
    setRole,
    setShowPassword,
    setUsername,
    showPassword,
    username,
  } = props;

  return (
    <div className="mt-8 space-y-5">
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
        <input
          id="signup-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="signup-username" className="block text-sm font-medium text-slate-400 mb-1">Username</label>
        <input
          id="signup-username"
          placeholder="your username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-slate-400 mb-1">Password</label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="signup-role" className="block text-sm font-medium text-slate-400 mb-1">Role</label>
        <select
          id="signup-role"
          value={role}
          onChange={(event) => setRole(event.target.value as "user" | "admin")}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {role === "admin" && (
        <div>
          <label htmlFor="signup-organization-name" className="block text-sm font-medium text-slate-400 mb-1">Organization Name</label>
          <input
            id="signup-organization-name"
            placeholder="Your company / bank name"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
      {role === "user" && (
        <div>
          <label htmlFor="signup-organization" className="block text-sm font-medium text-slate-400 mb-1">Organization</label>
          <select
            id="signup-organization"
            value={organizationId ?? ""}
            onChange={(event) => setOrganizationId(parseOrganizationId(event.target.value))}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select organization</option>
            {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
        </div>
      )}
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-all"
      >
        {loading ? "Signing up..." : "Sign Up"}
      </button>
    </div>
  );
}
