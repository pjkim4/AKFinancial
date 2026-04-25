import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Search, ChevronDown, Check, Plus, Edit2, Trash2 } from 'lucide-react';

const SearchableSelect = ({ options = [], value, onChange, onEdit, onDelete, placeholder = "Select option...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === value);
  
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldPopUp = spaceBelow < 250 && spaceAbove > spaceBelow;
      
      setCoords({
        top: shouldPopUp ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        isUp: shouldPopUp
      });
    }
  }, [isOpen]);

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
        const windowHeight = window.innerHeight;
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldPopUp = spaceBelow < 250 && spaceAbove > spaceBelow;
        
        setCoords({
          top: shouldPopUp ? rect.top - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          isUp: shouldPopUp
        });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleEvents);
      window.addEventListener('resize', handleSync);
      window.addEventListener('scroll', handleSync, true);
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
        className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${!isOpen ? 'hover:bg-white/10' : ''}`}
        style={{ 
          backgroundColor: isOpen ? '#FFFFFF' : '#1A1A1A',
          borderColor: isOpen ? '#00D1FF' : 'rgba(255,255,255,0.1)',
          boxShadow: isOpen ? '0 0 0 2px rgba(0,209,255,0.2)' : 'none'
        }}
      >
        <div className="flex-1">
          {isOpen ? (
            <input
              autoFocus
              type="text"
              placeholder="TYPE TO SEARCH..."
              className="w-full bg-transparent border-none p-0 focus:ring-0 text-lg font-black uppercase tracking-tight"
              style={{ 
                color: '#000000', 
                WebkitTextFillColor: '#000000',
                backgroundColor: 'transparent'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-black uppercase tracking-wider" style={{ color: selectedOption ? '#FFFFFF' : '#94A3B8' }}>
              {selectedOption ? selectedOption.name : placeholder}
            </span>
          )}
        </div>
        {isOpen ? <Search size={20} style={{ color: '#00D1FF' }} /> : <ChevronDown size={20} style={{ color: '#94A3B8' }} />}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: coords.isUp ? 'auto' : 'calc(100% + 8px)',
            bottom: coords.isUp ? 'calc(100% + 8px)' : 'auto',
            left: 0,
            width: '100%',
            zIndex: 99999,
            maxHeight: '300px'
          }}

          className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-y-auto animate-in fade-in zoom-in duration-100 flex flex-col"
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredOptions.length > 0 ? (
              <div className="p-2 space-y-1">

              {filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between p-4 px-6 rounded-xl transition-colors ${value === opt.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-gray-100'}`}

                >
                  <div 
                    className="flex-1 flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <span className={`text-sm font-black uppercase tracking-widest ${value === opt.id ? 'text-primary' : 'text-black'}`}>{opt.name}</span>
                    {value === opt.id && <Check size={16} className="text-primary" strokeWidth={3} />}
                  </div>
                  
                  {opt.isCustom && (
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                       <button 
                        onClick={(e) => { e.stopPropagation(); onEdit?.(opt.id, opt.name); }} 
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100"
                       >
                         <Edit2 size={16}/>
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); onDelete?.(opt.id); }} 
                        className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100"
                       >
                         <Trash2 size={16}/>
                       </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="p-2">
               <div 
                onClick={() => {
                  if (typeof onChange === 'function') onChange(searchTerm);
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


          {/* PERMANENT ADD NEW BUTTON AT BOTTOM */}
          {!searchTerm && (
            <div className="p-2 border-t border-gray-100 bg-gray-50/50">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const name = prompt('Enter new category name:');
                  if (name) {
                    if (typeof onChange === 'function') onChange(name);
                    setIsOpen(false);
                  }
                }}
                className="w-full p-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/10 rounded-xl transition-all border-2 border-dashed border-primary/20"
              >
                <Plus size={14} strokeWidth={3} />
                Add New Category
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
