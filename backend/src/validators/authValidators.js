import { z } from "zod";

const emailSchema = z
  .string({
    required_error: "Email is required",
    invalid_type_error: "Email must be a string",
  })
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Please provide a valid email address")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string({
    required_error: "Password is required",
    invalid_type_error: "Password must be a string",
  })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/\d/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character")
  .refine((value) => !/\s/.test(value), "Password must not contain spaces");

const nameSchema = z
  .string({
    required_error: "Full name is required",
    invalid_type_error: "Full name must be a string",
  })
  .trim()
  .min(2, "Full name must be at least 2 characters")
  .max(100, "Full name cannot exceed 100 characters")
  .regex(/^[A-Za-z\s.'-]+$/, "Full name contains invalid characters")
  .transform((value) => value.replace(/\s+/g, " "));

export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string({
        required_error: "Confirm password is required",
        invalid_type_error: "Confirm password must be a string",
      })
      .min(1, "Confirm password is required"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    })
    .min(1, "Password is required")
    .max(128, "Password cannot exceed 128 characters"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({
        required_error: "Current password is required",
        invalid_type_error: "Current password must be a string",
      })
      .min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmNewPassword: z
      .string({
        required_error: "Confirm new password is required",
        invalid_type_error: "Confirm new password must be a string",
      })
      .min(1, "Confirm new password is required"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmNewPassword"],
        message: "New passwords do not match",
      });
    }

    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must be different from current password",
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z
      .string({
        required_error: "Reset token is required",
        invalid_type_error: "Reset token must be a string",
      })
      .trim()
      .min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z
      .string({
        required_error: "Confirm password is required",
        invalid_type_error: "Confirm password must be a string",
      })
      .min(1, "Confirm password is required"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export const authValidators = {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};

export default authValidators;
