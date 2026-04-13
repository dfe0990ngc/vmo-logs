import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { appName } from '../../lib/utils';
import Logo from '../../assets/images/vmo.jpg';
import { useAuth } from '../../context/AuthContext';

interface NavigationProps {
  showLoginButton?: boolean;
}

export default function Navigation({ showLoginButton = true }: NavigationProps) {
  const { setShowAuth } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="top-0 z-50 sticky bg-[#007a8b]/95 shadow-lg backdrop-blur-sm">
      <div className="mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigation('/')}>
            <div className="flex justify-center items-center w-10 sm:w-12 h-10 sm:h-12">
              <img src={Logo} alt="Logo" className="rounded-full min-w-10 sm:min-w-12 min-h-10 sm:min-h-12" />
            </div>
            <div className="text-white">
              <div className="font-bold text-base sm:text-xl leading-tight">{ appName }</div>
              <div className="text-blue-100 text-xs sm:text-sm">Santa Cruz, Davao del Sur</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {showLoginButton && (
              <Button
                onClick={() => setShowAuth(true)}
                variant="outline"
                size="sm"
                className="bg-transparent hover:bg-white ml-2 px-4 py-2 border-2 border-white font-semibold text-white hover:text-[#007a8b] hover:scale-105 transition-all"
              >
                Staff Login
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden hover:bg-white/10 p-2 rounded-lg text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden py-4 border-white/20 border-t overflow-hidden"
            >
              <div className="flex flex-col space-y-2">
                {showLoginButton && (
                  <Button
                    onClick={() => {
                      setShowAuth(true);
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="bg-transparent hover:bg-white mx-4 mt-2 border-2 border-white font-semibold text-white hover:text-[#008ea2] transition-all"
                  >
                    Member Login
                  </Button>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}