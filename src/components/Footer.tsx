import { Globe, Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-8 w-8 text-gold" />
              <span className="font-serif text-xl font-bold">
                Solidarity<span className="text-gold">MA</span>
              </span>
            </div>
            <p className="mb-6 text-background/70">
              Empowering Moroccan communities through accessible work opportunities and trusted services.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/60 transition-colors hover:text-gold">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/60 transition-colors hover:text-gold">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/60 transition-colors hover:text-gold">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">Services</h4>
            <ul className="space-y-2 text-background/70">
              <li><a href="#" className="transition-colors hover:text-gold">Find Services</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">Post a Job</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">Become a Provider</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">Business Solutions</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">Company</h4>
            <ul className="space-y-2 text-background/70">
              <li><a href="#" className="transition-colors hover:text-gold">About Us</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">Our Mission</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">Careers</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">Press</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">Contact</h4>
            <ul className="space-y-3 text-background/70">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" />
                Casablanca, Morocco
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold" />
                +212 5XX-XXXXXX
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold" />
                contact@solidarityma.com
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 md:flex-row">
          <p className="text-sm text-background/50">
            © 2024 SolidarityMA. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-background/50">
            <a href="#" className="transition-colors hover:text-gold">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-gold">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-gold">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
