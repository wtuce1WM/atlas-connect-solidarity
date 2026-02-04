import { useState } from "react";
import { Menu, X, User, Globe } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-black/20 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <Globe className="h-8 w-8 text-gold" />
          <span className="font-serif text-xl font-bold text-white">
            Solidarity<span className="text-gold">MA</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#services" className="text-white/90 transition-colors hover:text-gold">
            Services
          </a>
          <a href="#jobs" className="text-white/90 transition-colors hover:text-gold">
            Jobs
          </a>
          <a href="#about" className="text-white/90 transition-colors hover:text-gold">
            About
          </a>
          <a href="#contact" className="text-white/90 transition-colors hover:text-gold">
            Contact
          </a>
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-4 md:flex">
          <button className="flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-white transition-all hover:border-gold hover:text-gold">
            <User className="h-4 w-4" />
            Sign In
          </button>
          <button className="rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground transition-all hover:bg-gold/90">
            Join Now
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="text-white md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-white/10 bg-black/90 backdrop-blur-lg md:hidden">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-6">
            <a href="#services" className="text-white/90 transition-colors hover:text-gold">
              Services
            </a>
            <a href="#jobs" className="text-white/90 transition-colors hover:text-gold">
              Jobs
            </a>
            <a href="#about" className="text-white/90 transition-colors hover:text-gold">
              About
            </a>
            <a href="#contact" className="text-white/90 transition-colors hover:text-gold">
              Contact
            </a>
            <hr className="border-white/20" />
            <button className="flex items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-white">
              <User className="h-4 w-4" />
              Sign In
            </button>
            <button className="rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground">
              Join Now
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
