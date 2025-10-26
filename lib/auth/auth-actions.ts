"use server";

import { auth } from "@/lib/auth";

export const SignUp = async (data: any) => {
  try {
    const response = await auth.api.signUpEmail({
      body: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: data.password,
      },
      asResponse: true,
    });
    if (!response.user) {
      throw new Error("User not found");
    }
  } catch (error) {
    throw error;
  }
};

export const SignIn = async (data: any) => {
  try {
    const response = await auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
      asResponse: true,
    });
    if (!response) {
      throw new Error("User not found");
    }
  } catch (error) {
    throw error;
  }
};
