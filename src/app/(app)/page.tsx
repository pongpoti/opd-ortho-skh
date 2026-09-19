import { AnimatedLogo } from "@/components/animated-logo";

export default function Home() {
  return (
    <div className="flex h-full min-h-[65vh] items-center justify-center">
      <AnimatedLogo className="w-full max-w-4xl" />
    </div>
  );
}
