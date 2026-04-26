
/**
 * Generates an IIF file content for QuickBooks Desktop
 * @param {Array} transactions - List of transaction objects
 * @param {Array} accounts - List of account objects (to match account names)
 * @param {string} fileName - Default filename
 */
export const exportToIIF = (transactions, accounts, fileName = 'QuickBooks_Export') => {
  // IIF Header
  let iifContent = "!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\n";
  iifContent += "!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\n";
  iifContent += "!ENDTRNS\n";

  transactions.forEach(t => {
    // Format date: MM/DD/YYYY
    const [year, month, day] = t.date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    
    const amount = Number(t.amount);
    const trnsAmount = t.type === 'Income' ? amount : -amount;
    const splAmount = -trnsAmount;

    // Get the account name
    const account = accounts.find(a => a.id === t.account_id);
    const accountName = account ? account.name : 'Unknown Account';

    // TRNS line (The bank/asset account side)
    iifContent += `TRNS\tGENERAL JOURNAL\t${formattedDate}\t${accountName}\t${(t.description || '').replace(/\t/g, ' ')}\t\t${trnsAmount.toFixed(2)}\t\t${t.category}\n`;
    
    // SPL line (The category/expense side)
    iifContent += `SPL\tGENERAL JOURNAL\t${formattedDate}\t${t.category}\t\t\t${splAmount.toFixed(2)}\t\t${(t.description || '').replace(/\t/g, ' ')}\n`;
    
    iifContent += "ENDTRNS\n";
  });

  try {
    const blob = new Blob([iifContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${fileName}.iif`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 500);
    return { success: true };
  } catch (err) {
    console.error('IIF Export failed:', err);
    return { error: err };
  }
};
