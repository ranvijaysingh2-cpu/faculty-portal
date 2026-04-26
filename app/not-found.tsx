import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {/* 404 number */}
        <div className="text-[80px] font-black text-[#FFC700] leading-none tracking-[-4px] mb-4 select-none">
          404
        </div>

        {/* Text */}
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-3">
          Page not found
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-block px-7 py-3 bg-[#FFC700] text-black font-bold text-sm rounded-xl hover:bg-[#E6B400] transition-colors"
        >
          ← Back to Portal
        </Link>
      </div>

      {/* Subtle sparkle */}
      <span className="fixed bottom-7 right-7 text-xl text-[#FFC700]/30 pointer-events-none select-none" aria-hidden>✦</span>
    </div>
  );
}
