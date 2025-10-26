export interface LoginSchema {
  email: string;
  password: string;
}

export interface SignUpSchema extends LoginSchema {
  name: string;
  phone: string;
  confirmPassword: string;
}
