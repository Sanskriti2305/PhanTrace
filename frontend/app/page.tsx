import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a0a00]">

      {/* Navbar */}
      <nav className="flex justify-between items-center px-12 py-6 absolute w-full z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-7 w-7" />
          <span className="text-white font-black text-xl tracking-tight">
            Phan<span className="text-[#FF6B2B]">Trace</span>
          </span>
        </div>
        <button className="border border-white/20 text-white/70 px-5 py-2 rounded-full text-sm font-medium hover:border-white/50 hover:text-white transition">
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 min-h-screen overflow-hidden">

        {/* BG */}
        <img
          src="/bb.jfif"
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0500]/90 via-[#0d0500]/75 to-[#0d0500]/90" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-5 max-w-3xl mx-auto">

          {/* Pill label */}
          <span className="border border-[#FF6B2B]/40 text-[#FF6B2B] text-xs font-semibold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full">
            AI-Powered Sports Media Protection
          </span>

          {/* Product name */}
          <h1
            className="text-9xl font-black text-white tracking-tighter leading-none"
            style={{ textShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
          >
            Phan<span className="text-[#FF6B2B]">Trace</span>
          </h1>

          {/* Thin divider */}
          <div className="flex items-center gap-4 w-full justify-center">
            <div className="h-[1px] w-16 bg-white/20" />
            <div className="h-[2px] w-8 bg-[#FF6B2B] rounded-full" />
            <div className="h-[1px] w-16 bg-white/20" />
          </div>

          {/* Headline */}
          <h2
            className="text-3xl font-semibold text-white/90 leading-snug"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
          >
            Your content is being stolen.{" "}
            <span className="text-[#FF6B2B] font-bold">We find it.</span>
          </h2>

          {/* Subtitle */}
          <p
            className="text-lg text-[#e6a88c] max-w-md leading-relaxed tracking-widest uppercase"
            style={{ fontFamily: "'Anton', 'Arial Black', Impact, sans-serif", fontWeight: 900 }}
          >
            Fingerprint. Hunt. Protect.
          </p>

          {/* CTA */}
          <Link href="/upload">
          <button className="mt-4 bg-[#FF6B2B] hover:bg-[#e55a1f] transition-all duration-200 text-white px-10 py-4 rounded-full text-sm font-bold tracking-wide uppercase shadow-xl shadow-orange-950/60 hover:scale-105">
            Protect Your Content
          </button>
          </Link>

        </div>
      </section>

    </main>
  )
}