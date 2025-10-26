import z from "zod";

export const zodLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const zodSignUpSchema = zodLoginSchema
  .extend({
    name: z.string(),
    phone: z.string().optional(),
    confirmPassword: z.string(),
  })
  .refine((data: any) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

