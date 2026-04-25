import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchableSelect = ({ options = [], value, onChange, placeholder = "Select option...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === value);
  
  // Calculate position when opening
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If less than 250px below and more space above, pop UP
      const shouldPopUp = spaceBelow < 250 && spaceAbove > spaceBelow;
      
      setCoords({
        top: shouldPopUp ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        isUp: shouldPopUp
      });
    }
  }, [isOpen]);

  // Handle outside clicks and scroll/resize
  useEffect(() => {
    const handleEvents = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleSync = () => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleEvents);
      window.addEventListener('resize', handleSync);
      window.addEventListener('scroll', handleSync, true); // Capture scroll on parents
    }

    return () => {
      document.removeEventListener('mousedown', handleEvents);
      window.removeEventListener('resize', handleSync);
      window.removeEventListener('scroll', handleSync, true);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger / Search Input */}
      <div 
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between p-4 ${isOpen ? 'bg-white' : 'bg-[#1A1A1A]'} border ${isOpen ? 'border-gray-200' : 'border-white/10'} rounded-xl cursor-pointer transition-all ${!isOpen ? 'hover:bg-white/10' : ''} ${isOpen ? 'ring-2 ring-primary/50 border-primary' : ''}`}
      >
        <div className="flex-1">
          {isOpen ? (
            <input
              autoFocus
              type="text"
              placeholder="Type to search..."
              className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-black placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`text-sm font-bold ${selectedOption ? 'text-white' : 'text-text-muted'}`}>
              {selectedOption ? selectedOption.name : placeholder}
            </span>
          )}
        </div>
        {isOpen ? <Search size={16} className="text-primary animate-pulse" /> : <ChevronDown size={16} className="text-text-muted" />}
      </div>

      {/* FIXED Dropdown Menu (The "Portal" approach) */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 9999,
            transform: coords.isUp ? 'translateY(-100%)' : 'none'
          }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-100 max-h-60 overflow-y-auto"
        >
          {filteredOptions.length > 0 ? (
            <div className="p-1">
              {filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${value === opt.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-900'}`}
                >
                  <span className={`text-sm font-bold uppercase tracking-wider ${value === opt.id ? 'text-primary' : 'text-gray-900'}`}>{opt.name}</span>
                  {value === opt.id && <Check size={14} className="text-primary" />}
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="p-1">
               <div 
                onClick={() => {
                  if (typeof onChange === 'function') {
                    onChange(searchTerm);
                  }
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-xl cursor-pointer border border-primary/20 group transition-all"
               >
                 <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                   <Plus size={16} strokeWidth={3} />
                 </div>
                 <div>
                   <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mb-1">Create New</p>
                   <p className="text-sm font-black text-black leading-none italic">"{searchTerm}"</p>
                 </div>
               </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">No matches found</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
