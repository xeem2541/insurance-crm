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

export const getUpcomingAnniversary = (dateStr) => {
  if (!dateStr) return '';
  const regDate = new Date(dateStr);
  if (isNaN(regDate.getTime())) return '';
  
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const anniversary = new Date(regDate);
  anniversary.setFullYear(currentYear);
  
  if (anniversary <= today) {
    anniversary.setFullYear(currentYear + 1);
  }
  
  return anniversary.toISOString().split('T')[0];
};

export const addOneYear = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

export const normalizeDate = (val) => {
  if (!val) return '';
  let s = val.toString().trim();
  if (!s) return '';

  s = s.replace(/^(วันที่|เมื่อวันที่|เวลา)\s*/, '').trim();

  let match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    let year = parseInt(match[1], 10);
    let month = match[2].padStart(2, '0');
    let day = match[3].padStart(2, '0');
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let year = parseInt(match[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let yy = parseInt(match[3], 10);
    let year = yy + 2500; 
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  const thMonths = {
    'ม.ค.': '01', 'มกราคม': '01',
    'ก.พ.': '02', 'กุมภาพันธ์': '02',
    'มี.ค.': '03', 'มีนาคม': '03',
    'เม.ย.': '04', 'เมษายน': '04',
    'พ.ค.': '05', 'พฤษภาคม': '05',
    'มิ.ย.': '06', 'มิถุนายน': '06',
    'ก.ค.': '07', 'กรกฎาคม': '07',
    'ส.ค.': '08', 'สิงหาคม': '08',
    'ก.ย.': '09', 'กันยายน': '09',
    'ต.ค.': '10', 'ตุลาคม': '10',
    'พ.ย.': '11', 'พฤศจิกายน': '11',
    'ธ.ค.': '12', 'ธันวาคม': '12'
  };
  
  for (const [key, value] of Object.entries(thMonths)) {
    if (s.includes(key)) {
      const dayMatch = s.match(/^(\d{1,2})/);
      const yearMatch = s.match(/(\d{4})/);
      if (dayMatch && yearMatch) {
        let day = dayMatch[1].padStart(2, '0');
        let year = parseInt(yearMatch[1], 10);
        if (year > 2400) year -= 543;
        return `${year}-${value}-${day}`;
      }
    }
  }

  const parts = s.split('-');
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    if (year > 2400) {
      year -= 543;
      return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  return val;
};
