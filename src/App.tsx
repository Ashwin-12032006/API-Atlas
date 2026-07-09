import './App.css';

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-background">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 object-cover w-full h-full"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      {/* Main Layout Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        
        {/* Navigation Bar */}
        <header className="w-full max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <a 
            href="/" 
            className="text-3xl tracking-tight text-foreground transition-opacity hover:opacity-90"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Velorah<sup className="text-xs">®</sup>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-foreground transition-colors">
              Home
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Studio
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              About
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Journal
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Reach Us
            </a>
          </nav>

          <button className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-transform duration-300 ease-out cursor-pointer">
            Begin Journey
          </button>
        </header>

        {/* Hero Content Section */}
        <main className="flex flex-col items-center justify-center text-center px-6 max-w-7xl mx-auto mb-auto mt-auto">
          <h1 
            className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-5xl font-normal text-foreground animate-fade-rise"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Where <em className="not-italic text-muted-foreground">dreams</em> rise <br />
            <em className="not-italic text-muted-foreground">through the silence.</em>
          </h1>
          
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mt-8 leading-relaxed animate-fade-rise-delay">
            We're designing tools for deep thinkers, bold creators, and quiet rebels. Amid the chaos, we build digital spaces for sharp focus and inspired work.
          </p>

          <button className="liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-12 hover:scale-[1.03] transition-transform duration-300 ease-out cursor-pointer animate-fade-rise-delay-2">
            Begin Journey
          </button>
        </main>

        {/* Empty Footer for spacing layout balance */}
        <footer className="w-full py-6"></footer>
      </div>
    </div>
  );
}
