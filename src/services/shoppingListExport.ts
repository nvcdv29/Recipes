import { jsPDF } from 'jspdf';
import { ShoppingList } from '../types';

export function exportShoppingListToPDF(list: ShoppingList) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text(list.name, 20, 20);
  
  doc.setFontSize(12);
  let y = 30;
  
  // Group by category
  const grouped: Record<string, typeof list.items> = {};
  list.items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  
  for (const [category, items] of Object.entries(grouped)) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.text(category, 20, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    for (const item of items) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const qtyStr = item.quantity ? `${item.quantity} ` : '';
      const checkMark = item.checked ? '[x]' : '[ ]';
      doc.text(`${checkMark} ${qtyStr}${item.ingredient}`, 25, y);
      y += 6;
    }
    y += 4;
  }
  
  doc.save(`${list.name.replace(/\s+/g, '_')}.pdf`);
}

export async function shareShoppingList(list: ShoppingList) {
  const textLines = [`*${list.name}*\n`];
  
  const grouped: Record<string, typeof list.items> = {};
  list.items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  
  for (const [category, items] of Object.entries(grouped)) {
    textLines.push(`\n${category}:`);
    for (const item of items) {
      const qtyStr = item.quantity ? `${item.quantity} ` : '';
      const checkMark = item.checked ? '☑' : '☐';
      textLines.push(`${checkMark} ${qtyStr}${item.ingredient}`);
    }
  }
  
  const text = textLines.join('\n');
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: list.name,
        text: text,
      });
      return true;
    } catch (e) {
      console.warn("Share failed", e);
    }
  }
  
  // Fallback copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    console.error("Copy failed", e);
    return false;
  }
}
