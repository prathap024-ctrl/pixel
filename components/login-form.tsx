"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zodLoginSchema } from "@/zod/auth";
import React, { memo } from "react";
import { LoginSchema } from "@/types/auth";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";
import { ThemedLogo } from "@/lib/assets";
import Link from "next/link";

function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(zodLoginSchema),
  });

  const onSubmit: SubmitHandler<LoginSchema> = async (data) => {
    setIsLoading(true);
    await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
        callbackURL: "/",
        rememberMe: false,
      },
      {
        onRequest: () => {
          setIsLoading(true);
          toast.loading("Logging in...", {
            duration: 5000,
            closeButton: true,
          });
        },
        onSuccess: () => {
          setIsLoading(false);
          toast.dismiss();
          toast.success("Login successful", {
            description: "You are now logged in",
            duration: 5000,
            closeButton: true,
          });
        },
        onError: () => {
          setIsLoading(false);
          toast.dismiss();
          toast.error("Login failed", {
            description: "Invalid email or password",
            duration: 5000,
            closeButton: true,
          });
        },
      }
    );
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <ThemedLogo className="h-12 w-auto" variant="word" />
          </div>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                  required
                />
                {errors.email?.message && (
                  <FieldError className="text-red-600">
                    {errors.email.message}
                  </FieldError>
                )}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  {...register("password")}
                />
                {errors.password?.message && (
                  <FieldError className="text-red-600">
                    {errors.password.message}
                  </FieldError>
                )}
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner />
                      <span>Loading...</span>
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                <Button variant="outline" type="button">
                  Login with Google
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(LoginForm);
