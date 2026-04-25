
import sys

path = 'src/components/Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # 1. Add date field to Quick Transfer
    if '<div className="flex gap-2 items-end">' in line and '665' in str(lines.index(line)+1): # Match approximate location
         pass # Handled in block
    
    # Actually, let's just use string replacement for the unique blocks
    new_lines.append(line)

content = "".join(lines)

# Add Date input to Quick Transfer
old_block = """                <div className="flex gap-2 items-end">
                   <div className="flex-1">
                      <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">Amount</label>
                      <input 
                       type="number" 
                       placeholder="0.00" 
                       className="font-black"
                       value={qtAmount}
                       onChange={(e) => setQtAmount(e.target.value)}
                     />
                   </div>
                   <button 
                     onClick={handleQuickTransfer}
                     disabled={loading || !qtTarget || !qtAmount}
                     className="btn btn-primary px-5 py-3.5 rounded-xl disabled:opacity-50"
                   >
                     {loading ? <Loader2 className="animate-spin text-black" size={20} /> : <Send size={20} className="text-black" />}
                   </button>
                </div>"""

new_block = """                <div className="flex gap-2 items-end">
                   <div className="flex-1">
                      <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">Amount</label>
                      <input 
                       type="number" 
                       placeholder="0.00" 
                       className="font-black"
                       value={qtAmount}
                       onChange={(e) => setQtAmount(e.target.value)}
                     />
                   </div>
                   <div className="w-32">
                      <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">Date</label>
                      <input 
                       type="date" 
                       className="font-bold text-xs"
                       value={qtDate}
                       onChange={(e) => setQtDate(e.target.value)}
                     />
                   </div>
                   <button 
                    onClick={handleQuickTransfer}
                    disabled={loading || !qtTarget || !qtAmount}
                    className="btn btn-primary px-5 py-3.5 rounded-xl disabled:opacity-50"
                   >
                     {loading ? <Loader2 className="animate-spin text-black" size={20} /> : <Send size={20} className="text-black" />}
                   </button>
                </div>"""

# Replace ONLY if exact match
if old_block in content:
    content = content.replace(old_block, new_block)
else:
    # Try with slightly different indentation if needed, but the view_file showed this.
    # Actually, I'll just write it back
    pass

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
