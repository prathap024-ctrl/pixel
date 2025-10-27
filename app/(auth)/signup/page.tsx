import SignupForm from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="py-10 px-4">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
