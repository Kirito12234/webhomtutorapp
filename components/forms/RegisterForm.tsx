"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Registration data:", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      // Redirect to dashboard after successful registration
      router.push("/auth/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full Name"
        type="text"
        placeholder="Enter your full name"
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="w-full"
        >
          Create Account
        </Button>
      </div>
    </form>
  );
}


