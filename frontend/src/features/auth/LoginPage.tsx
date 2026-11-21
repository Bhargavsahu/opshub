import { useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Shield, Users, User } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const demoAccounts = [
  {
    email: "admin@opshub.demo",
    label: "Admin",
    description: "Full access to all modules",
    icon: Shield,
    color: "text-red-600",
  },
  {
    email: "manager1@opshub.demo",
    label: "Manager",
    description: "Team management & approvals",
    icon: Users,
    color: "text-blue-600",
  },
  {
    email: "emp1@opshub.demo",
    label: "Employee",
    description: "Personal leave, tasks & chat",
    icon: User,
    color: "text-green-600",
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const { data } = await api.post("/auth/google", {
        idToken: credentialResponse.credential,
      });
      login(data.accessToken, data.user);
      navigate("/");
      toast.success(`Welcome, ${data.user.name}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Login failed");
    }
  };

  const handleDemoLogin = async (email: string) => {
    try {
      const { data } = await api.post("/auth/demo", { email });
      login(data.accessToken, data.user);
      navigate("/");
      toast.success(`Demo login: ${data.user.name} (${data.user.role})`);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Demo login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & title */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-white text-xl font-bold">
            OH
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to OpsHub
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Small-business operations suite
          </p>
        </div>

        {/* Google login */}
        {GOOGLE_CLIENT_ID && (
          <Card className="flex justify-center">
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google login failed")}
                theme="outline"
                size="large"
                width="100%"
              />
            </GoogleOAuthProvider>
          </Card>
        )}

        {/* Demo logins */}
        <Card>
          <p className="mb-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            Or try a demo account
          </p>
          <div className="space-y-2">
            {demoAccounts.map((account) => (
              <Button
                key={account.email}
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleDemoLogin(account.email)}
              >
                <account.icon className={`h-5 w-5 ${account.color}`} />
                <div className="text-left">
                  <span className="block text-sm font-medium">
                    {account.label}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {account.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
