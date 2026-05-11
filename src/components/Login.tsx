import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { getMe, getPostLoginPath, login as loginApi } from "../api/authApi";
interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const previous = document.title;
    document.title = "Laminar · Sign in";
    return () => {
      document.title = previous;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = (await loginApi(username.trim(), password)) as {
        token?: string;
        access_token?: string;
        accessToken?: string;
        refresh_token?: string;
        refreshToken?: string;
        user?: { username?: string; email?: string };
      };

      const accessToken =
        response?.access_token ?? response?.accessToken ?? response?.token;
      const refreshToken = response?.refresh_token ?? response?.refreshToken;

      if (accessToken) {
        localStorage.setItem("access_token", accessToken);
      }
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }

      const resolvedUsername =
        response?.user?.username ?? response?.user?.email ?? username.trim();
      onLogin(resolvedUsername);
      try {
        const me = await getMe();
        navigate(getPostLoginPath(me.role));
      } catch {
        navigate("/dashboard");
      }
    } catch (err) {
      const fallback = "Invalid username or password";
      const detail = (
        err as {
          response?: {
            data?: {
              detail?: string | Array<{ msg?: string }>;
              message?: string;
            };
          };
        }
      )?.response?.data?.detail;
      const detailMessage =
        Array.isArray(detail) && detail.length > 0
          ? detail[0]?.msg || fallback
          : typeof detail === "string"
          ? detail
          : "";
      const message =
        detailMessage ||
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.message ||
        fallback;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #38BDF8 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
            Laminar Aviation
          </h1>
          <p className="text-blue-950 text-base sm:text-lg font-medium drop-shadow-sm">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="border px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: "#fee2e2",
                  borderColor: "#f87171",
                  color: "#991b1b",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11"
              style={{ backgroundColor: "#3B82F6" }}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm">
              Contact your administrator for credentials
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-950/90 text-sm font-medium mt-8 drop-shadow-sm">
          © 2026 Aircraft Fleet Management System
        </p>
      </div>
    </div>
  );
}
