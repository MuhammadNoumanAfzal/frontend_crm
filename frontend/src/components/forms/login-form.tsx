"use client";

import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/lib/query/hooks";
import { getDecodedToken, setToken } from "@/lib/auth/session";
import { sanitizeText } from "@/lib/utils/sanitize";
import { ArrowBigRightDashIcon } from "@/components/ui/arrow-big-right-dash";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const form = useForm<LoginInput>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors;
      if (issues.email?.[0]) form.setError("email", { message: issues.email[0] });
      if (issues.password?.[0]) form.setError("password", { message: issues.password[0] });
      return;
    }

    try {
      const data = await loginMutation.mutateAsync({
        email: sanitizeText(parsed.data.email),
        password: parsed.data.password,
      });

      setToken(data.token);
      const decoded = getDecodedToken(data.token);
      const role = decoded?.role;
      router.replace(role === "ADMIN" ? "/admin" : "/portal");
      toast.success("Welcome back");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
    }
  });

  return (
    <Card className="rounded-xl border-border bg-card/90 shadow-none ring-1 ring-border/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-2xl">Secure Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" {...form.register("password")} />
            {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
          </div>
          <Button type="submit" disabled={loginMutation.isPending} className="w-full">
            <ArrowBigRightDashIcon className="size-4" />
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
