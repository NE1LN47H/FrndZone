import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    phone: "",
    fullName: "",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Check for password reset token in URL and handle auth state changes
  useEffect(() => {
    const checkPasswordReset = async () => {
      // Check URL hash for Supabase auth tokens
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      
      // Also check query params (some Supabase setups use these)
      const queryParams = new URLSearchParams(window.location.search);
      const queryType = queryParams.get("type");
      
      if (type === "recovery" || queryType === "recovery") {
        // Check if we have a session (user is authenticated via recovery token)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && (type === "recovery" || queryType === "recovery")) {
          setIsResetPassword(true);
          setIsLogin(false);
          setIsForgotPassword(false);
          
          // Clear the hash from URL
          window.history.replaceState(null, "", location.pathname);
        }
      }
    };

    checkPasswordReset();

    // Listen for auth state changes (when Supabase processes the recovery token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        // Check if this is a recovery flow
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get("type");
        const queryParams = new URLSearchParams(window.location.search);
        const queryType = queryParams.get("type");
        
        if (type === "recovery" || queryType === "recovery") {
          setIsResetPassword(true);
          setIsLogin(false);
          setIsForgotPassword(false);
          
          // Clear the hash from URL
          window.history.replaceState(null, "", location.pathname);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;
      toast.success("Password updated successfully!");
      setFormData({ ...formData, password: "", confirmPassword: "" });
      setIsResetPassword(false);
      setIsLogin(true);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        if (data.user) {
          toast.success("Welcome back!");
          navigate("/");
        }
      } else {
        // Check if username or phone already exists
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("username, phone_number")
          .or(`username.eq.${formData.username},phone_number.eq.${formData.phone}`);

        if (existingProfiles && existingProfiles.length > 0) {
          const existing = existingProfiles[0];
          if (existing.username === formData.username) {
            throw new Error("Username already taken");
          }
          if (existing.phone_number === formData.phone) {
            throw new Error("Phone number already registered");
          }
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          options: {
            data: {
              username: formData.username,
              full_name: formData.fullName,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;
        if (data.user) {
          toast.success("Account created! Welcome to FrndZone");
          navigate("/");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">FrndZone</h1>
            <p className="text-muted-foreground">
              {isResetPassword
                ? "Set your new password"
                : isForgotPassword
                ? "Reset your password"
                : isLogin
                ? "Welcome back"
                : "Join the moment"}
            </p>
          </div>

          <form
            onSubmit={
              isResetPassword
                ? handleResetPassword
                : isForgotPassword
                ? handleForgotPassword
                : handleSubmit
            }
            className="space-y-4"
          >
            {!isLogin && !isForgotPassword && !isResetPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required={!isLogin}
                    minLength={3}
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {!isResetPassword && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {!isForgotPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={6}
                  />
                </div>
                {isResetPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isResetPassword
                    ? "Updating password..."
                    : isForgotPassword
                    ? "Sending..."
                    : isLogin
                    ? "Signing in..."
                    : "Creating account..."}
                </>
              ) : isResetPassword ? (
                "Update Password"
              ) : isForgotPassword ? (
                "Send Reset Link"
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isLogin && !isForgotPassword && !isResetPassword && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full"
              >
                Forgot password?
              </button>
            )}
            
            {!isResetPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsForgotPassword(false);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isForgotPassword
                  ? "Back to sign in"
                  : isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
