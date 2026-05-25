import { LoginForm } from "@/components/forms/login-form";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(210,71,38,0.14),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(210,71,38,0.08),transparent_50%)]" />
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
