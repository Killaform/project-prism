import React from 'react';
import { Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-8 py-6 px-4">
      <div className="container mx-auto text-center">
        <div className="flex items-center justify-center mb-2">
          <Globe size={18} className="mr-2 text-purple-600" />
          <span className="text-gray-700 font-medium">Perspective Engine</span>
        </div>
        <p className="text-gray-500 text-sm">
          A Multi-Perspective Search Engine &copy; {new Date().getFullYear()}
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Providing balanced information from diverse sources
        </p>
      </div>
    </footer>
  );
};

export default Footer;
