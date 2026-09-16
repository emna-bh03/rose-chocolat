/**
 * parseFlexNumber - Accepte tous les formats numeriques courants
 * Exemples: "1" "1,5" "1.5" "0.850" "0,850" "1 000" "1.000,75"
 */
export function parseFlexNumber(str) {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  
  let s = String(str).trim();
  
  // 1. Supprimer les espaces (ex: "1 000" -> "1000")
  s = s.replace(/\s/g, '');
  
  // 2. Si contient a la fois points et virgules (ex: "1.000,50" ou "1,000.50")
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Format europeen "1.000,50" -> "1000.50"
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Format US "1,000.50" -> "1000.50"
      s = s.replace(/,/g, '');
    }
  } 
  // 3. S'il y a PLUSIEURS points (ex: "1.000.000")
  else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }
  // 4. S'il y a PLUSIEURS virgules (ex: "1,000,000")
  else if ((s.match(/,/g) || []).length > 1) {
    s = s.replace(/,/g, '');
  }
  // 5. S'il y a UN SEUL point ou UNE SEULE virgule (ex: "0.850", "0,850", "1.5", "12,500")
  else {
    s = s.replace(',', '.');
  }

  const result = parseFloat(s);
  return isNaN(result) ? 0 : result;
}

/**
 * formatNumber - Formate un nombre pour affichage
 */
export function formatNumber(num, decimals = 2) {
  const n = parseFloat(num) || 0;
  return n % 1 === 0 && decimals === 0 ? n.toString() : n.toFixed(decimals);
}

/**
 * isValidNumber - Verifie si la valeur est un nombre valide
 */
export function isValidNumber(str) {
  const n = parseFlexNumber(str);
  return !isNaN(n) && n >= 0;
}
