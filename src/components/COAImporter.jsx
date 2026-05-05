import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, Check, X, AlertCircle, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useEffect } from 'react';

const COAImporter = ({ onClose }) => {
  const { addCustomCategories, preferences, t } = useFinance();
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    const csvContent = "Account Name,Type,Description\n" +
      "Salary,Income,Primary income source\n" +
      "Bonus,Income,Performance bonuses\n" +
      "Rent,Expense,Monthly housing\n" +
      "Groceries,Expense,Food and supplies\n" +
      "Electricity,Expense,Utility bill\n" +
      "Office Supplies,Expense,Work related expenses";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ChartOfAccounts_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text) => {
    // Split lines and handle potential empty lines
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error("File appears to be empty or missing data.");

    // Detect separator (comma or tab)
    const headerLine = lines[0];
    const separator = headerLine.includes('\t') ? '\t' : ',';
    
    // Simple parser that handles basic quoting
    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(v => v.replace(/^"|"$/g, ''));
    };

    const headers = parseLine(lines[0]);
    
    // Identify key columns (QuickBooks names vs Template names)
    const nameIndex = headers.findIndex(h => /name|account/i.test(h));
    const typeIndex = headers.findIndex(h => /type/i.test(h));

    if (nameIndex === -1 || typeIndex === -1) {
      throw new Error("Could not find 'Account Name' or 'Type' columns in the file.");
    }

    return lines.slice(1).map((line, idx) => {
      const values = parseLine(line);
      const name = values[nameIndex];
      const rawType = values[typeIndex] || '';
      
      let type = 'expense';
      const upperType = rawType.toUpperCase();
      
      if (upperType.includes('INCOME') || upperType.includes('REVENUE')) {
        type = 'income';
      } else if (
        upperType.includes('EXPENSE') || 
        upperType.includes('COST OF GOODS') || 
        upperType.includes('OTHER EXPENSE')
      ) {
        type = 'expense';
      } else {
        return null; 
      }

      if (!name) return null;

      // Check if it already exists in preferences
      const existing = preferences.customCategories?.[type] || [];
      const isDuplicate = existing.some(c => c.id.toLowerCase() === name.toLowerCase());

      return {
        id: `preview-${idx}`,
        name: name,
        type: type,
        selected: !isDuplicate,
        isDuplicate: isDuplicate
      };
    }).filter(Boolean);
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const data = parseCSV(text);
        if (data.length === 0) {
          setError("No valid income or expense accounts found in the file.");
        } else {
          setPreviewData(data);
        }
      } catch (err) {
        setError(err.message);
        setFile(null);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setLoading(false);
    };
    reader.readAsText(selectedFile);
  };

  const toggleSelection = (id) => {
    setPreviewData(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleImport = () => {
    const toImport = previewData
      .filter(item => item.selected)
      .map(item => ({ type: item.type, name: item.name }));

    if (toImport.length === 0) {
      setError("Please select at least one category to import.");
      return;
    }

    addCustomCategories(toImport);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-ultra bg-black/95 backdrop-blur-md overflow-y-auto py-10 px-4"
    >
      <div 
        className="bg-[#181818] border-2 border-white/10 w-full max-w-2xl mx-auto rounded-3xl flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-2xl text-primary">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tight">Import Chart of Accounts</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Import categories from QuickBooks or CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!file ? (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current.click()}
                className="group border-2 border-dashed border-white/10 rounded-3xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all shadow-xl group-hover:shadow-primary/30 border-2 border-primary/20">
                  <Upload size={40} />
                </div>
                <h4 className="font-black text-2xl uppercase mb-3 group-hover:text-primary transition-colors">Select your file</h4>
                <p className="text-sm text-text-muted max-w-xs mx-auto mb-8 font-bold">Upload a QuickBooks CSV export or use our template to instantly create your categories.</p>
                
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current.click(); }}
                  className="px-10 py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  Click here to Browse
                </button>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".csv,.txt"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left"
                >
                  <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Download size={20} />
                  </div>
                  <div>
                    <span className="block text-xs font-black uppercase tracking-widest text-blue-400">Template</span>
                    <span className="text-[10px] text-text-muted">Download CSV Example</span>
                  </div>
                </button>
                <div className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl text-left opacity-70">
                  <div className="p-3 bg-lime/20 text-lime rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="block text-xs font-black uppercase tracking-widest text-lime">Compatibility</span>
                    <span className="text-[10px] text-text-muted">QuickBooks CSV Exports</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-primary">QuickBooks Export Guide</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] leading-relaxed text-text-muted font-bold">
                  <div className="space-y-2">
                    <p className="text-white">QB ONLINE:</p>
                    <p>1. Gear Icon → Chart of Accounts</p>
                    <p>2. Click "Run Report"</p>
                    <p>3. Click Export Icon → "Export to CSV"</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-white">QB DESKTOP:</p>
                    <p>1. Lists → Chart of Accounts</p>
                    <p>2. Account (Bottom) → Print List</p>
                    <p>3. Choose "File" & "Comma Delimited"</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview List */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText size={14} /> Preview Categories ({previewData.length})
                </h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPreviewData(prev => prev.map(p => ({ ...p, selected: true })))}
                    className="text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-white"
                  >
                    Select All
                  </button>
                  <span className="text-white/20">|</span>
                  <button 
                    onClick={() => setPreviewData(prev => prev.map(p => ({ ...p, selected: false })))}
                    className="text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-white"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2 scrollbar-thin flex-1">
                {previewData.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => !item.isDuplicate && toggleSelection(item.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${item.isDuplicate ? 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed' : item.selected ? 'bg-primary/10 border-primary/30 cursor-pointer' : 'bg-white/5 border-white/5 opacity-60 cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${item.selected ? 'bg-primary text-black' : item.isDuplicate ? 'bg-white/5 text-text-muted' : 'bg-white/10'}`}>
                        {item.selected ? <Check size={14} strokeWidth={4} /> : item.isDuplicate && <X size={14} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">{item.name}</p>
                          {item.isDuplicate && <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-text-muted font-black uppercase">Already Exists</span>}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${item.type === 'income' ? 'text-success' : 'text-danger'}`}>
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3 text-danger text-xs font-bold">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="sticky bottom-0 bg-[#181818] pt-6 pb-2 mt-auto border-t border-white/5 flex gap-4">
                <button 
                  onClick={() => { setFile(null); setPreviewData([]); }}
                  className="flex-1 h-14 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleImport}
                  className="flex-[2] h-14 bg-primary text-black font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Confirm Import <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/5 text-center">
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-[0.2em]">
            Tip: Map "Income" or "Expense" types in your CSV to auto-detect categories.
          </p>
        </div>
      </div>
    </div>
  );
};

export default COAImporter;
