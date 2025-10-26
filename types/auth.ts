export interface LoginSchema {
  email: string;
  password: string;
}

export interface SignUpSchema {
  email: string;
  password: string;
  name: string;
  phone: string;
  confirmPassword: string;
}
