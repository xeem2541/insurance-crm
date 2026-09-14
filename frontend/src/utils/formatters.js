export const formatPhone = (val) => {
  if (!val) return '';
  const cleaned = ('' + val).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (match) {
    let parts = [];
    if (match[1]) parts.push(match[1]);
    if (match[2]) parts.push(match[2]);
    if (match[3]) parts.push(match[3]);
    return parts.join('-');
  }
  return val;
};

export const formatIdCard = (val) => {
  if (!val) return '';
  const cleaned = ('' + val).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,1})(\d{0,4})(\d{0,5})(\d{0,2})(\d{0,1})$/);
  if (match) {
    let parts = [];
    if (match[1]) parts.push(match[1]);
    if (match[2]) parts.push(match[2]);
    if (match[3]) parts.push(match[3]);
    if (match[4]) parts.push(match[4]);
    if (match[5]) parts.push(match[5]);
    return parts.join('-');
  }
  return val;
};
