import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Form, Button, Row, Col, Accordion, Card, Badge, Modal } from 'react-bootstrap';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import CreatableSelect from 'react-select/creatable';
import { useDropzone } from 'react-dropzone';
import ThaiAddressSelect from '../components/ThaiAddressSelect';
import { carBrands, carModels } from '../data/carData';
import thaiData from '../data/thai_address.json';

const formatPhone = (val) => {
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

const formatIdCard = (val) => {
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

const getUpcomingAnniversary = (dateStr) => {
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

const addOneYear = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

const normalizeDate = (val) => {
  if (!val) return '';
  let s = val.toString().trim();
  if (!s) return '';

  // Clean prefix like "วันที่" or "เมื่อวันที่" or "เวลา"
  s = s.replace(/^(วันที่|เมื่อวันที่|เวลา)\s*/, '').trim();

  // 1. Try YYYY-MM-DD or YYYY/MM/DD
  let match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    let year = parseInt(match[1], 10);
    let month = match[2].padStart(2, '0');
    let day = match[3].padStart(2, '0');
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  // 2. Try DD/MM/YYYY or DD-MM-YYYY
  match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let year = parseInt(match[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  // 3. Try DD/MM/YY or DD-MM-YY (e.g. 15/12/66)
  match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let yy = parseInt(match[3], 10);
    let year = yy + 2500; // Assume BE first, e.g. 66 -> 2566
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  // Fallback: If it contains Thai month names (e.g., "15 ม.ค. 2566" or "15 มกราคม 2566")
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

  // If it's already in YYYY-MM-DD check if it's BE
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

const findMatchingCompany = (extractedCompany, companyList) => {
  if (!extractedCompany || !companyList.length) return '';
  const s = extractedCompany.toString();
  
  const stripAffixes = (name) => {
    if (!name) return '';
    return name
      .toString()
      .replace(/\s+/g, '')
      .replace(/บริษัท/g, '')
      .replace(/บมจ\.?/g, '')
      .replace(/จำกัด/g, '')
      .replace(/\(?มหาชน\)?/g, '')
      .toLowerCase();
  };

  const cleanExtracted = stripAffixes(s);
  if (!cleanExtracted) return s;
  
  // 1. Exact match on stripped names
  let found = companyList.find(c => stripAffixes(c.value) === cleanExtracted);
  if (found) return found.value;
  
  // 2. Extracted contains option name
  found = companyList.find(c => {
    const cleanVal = stripAffixes(c.value);
    return cleanVal && cleanExtracted.includes(cleanVal);
  });
  if (found) return found.value;

  // 3. Option name contains extracted name
  found = companyList.find(c => {
    const cleanVal = stripAffixes(c.value);
    return cleanVal && cleanVal.includes(cleanExtracted);
  });
  if (found) return found.value;
  
  return s;
};

const findMatchingType = (extractedType, motorTypes, nonMotorTypesList) => {
  if (!extractedType) return null;
  const cleanExtracted = extractedType.toString().replace(/\s+/g, '').replace(/[.+]/g, '').toLowerCase();
  
  // Check for พ.ร.บ. / พรบ
  if (cleanExtracted.includes('พรบ') || cleanExtracted.includes('พ.ร.บ.') || cleanExtracted.includes('พ.ร.บ')) {
    const found = motorTypes.find(t => t.value.includes('พ.ร.บ.'));
    if (found) return { category: 'motor', type: found.value, non_motor_type_id: '' };
  }

  // Pre-normalize common Thai policy type spellings to match the new 'ประกันภัยรถยนต์ประเภท X' naming convention
  let lookupType = cleanExtracted;
  if (cleanExtracted.includes('ชั้น1') || cleanExtracted.includes('ประเภท1') || cleanExtracted === '1') {
    lookupType = 'ประเภท1';
  } else if (cleanExtracted.includes('2+') || cleanExtracted.includes('2พลัส') || cleanExtracted.includes('ชั้น2+') || cleanExtracted.includes('ประเภท2+')) {
    lookupType = 'ประเภท2พลัส';
  } else if (cleanExtracted.includes('3+') || cleanExtracted.includes('3พลัส') || cleanExtracted.includes('ชั้น3+') || cleanExtracted.includes('ประเภท3+')) {
    lookupType = 'ประเภท3พลัส';
  } else if (cleanExtracted.includes('ชั้น2') || cleanExtracted.includes('ประเภท2') || cleanExtracted === '2') {
    lookupType = 'ประเภท2';
  } else if (cleanExtracted.includes('ชั้น3') || cleanExtracted.includes('ประเภท3') || cleanExtracted === '3') {
    lookupType = 'ประเภท3';
  }

  // 1. Search in Motor Types
  for (const t of motorTypes) {
    const cleanVal = t.value.toString().replace(/\s+/g, '').replace(/[.+]/g, '').toLowerCase();
    if (lookupType.includes(cleanVal) || cleanVal.includes(lookupType)) {
      return { category: 'motor', type: t.value, non_motor_type_id: '' };
    }
  }

  // 2. Search in Non-Motor Types
  for (const t of nonMotorTypesList) {
    const cleanVal = t.label.toString().replace(/\s+/g, '').replace(/[.+]/g, '').toLowerCase();
    if (cleanExtracted.includes(cleanVal) || cleanVal.includes(cleanExtracted)) {
      return { category: 'non-motor', type: t.label, non_motor_type_id: t.value };
    }
  }

  return null;
};

const findMatchingBrand = (extractedBrand, brandsList) => {
  if (!extractedBrand || !brandsList.length) return '';
  const cleanExtracted = extractedBrand.toString().replace(/\s+/g, '').toLowerCase();
  
  const found = brandsList.find(b => {
    const cleanBrand = b.toString().replace(/\s+/g, '').toLowerCase();
    return cleanBrand === cleanExtracted || cleanBrand.includes(cleanExtracted) || cleanExtracted.includes(cleanBrand);
  });
  return found || extractedBrand.toString();
};

const findMatchingModel = (extractedModel, brand, modelsMap) => {
  if (!extractedModel) return '';
  if (!brand || !modelsMap[brand]) return extractedModel.toString();
  const cleanExtracted = extractedModel.toString().replace(/\s+/g, '').toLowerCase();
  
  const found = modelsMap[brand].find(m => {
    const cleanModel = m.toString().replace(/\s+/g, '').toLowerCase();
    return cleanModel === cleanExtracted || cleanModel.includes(cleanExtracted) || cleanExtracted.includes(cleanModel);
  });
  return found || extractedModel.toString();
};

const findMatchingVehicleType = (extractedType, vehicleTypesList) => {
  if (!extractedType || !vehicleTypesList.length) return '';
  const cleanExtracted = extractedType.toString().replace(/\s+/g, '').replace(/ยนต์/g, '').toLowerCase();

  // Mapping rules based on keywords
  let targetKeyword = '';
  if (cleanExtracted.includes('มอเตอร์ไซค์') || cleanExtracted.includes('จักรยานยนต์') || cleanExtracted.includes('มอไซ') || cleanExtracted.includes('มอร์เตอร์ไซค์')) {
    targetKeyword = 'รถจักรยานยนต์';
  } else if (cleanExtracted.includes('4ประตู') || cleanExtracted.includes('ดับเบิ้ลแค็บ') || cleanExtracted.includes('ดับเบิลแค็บ') || (cleanExtracted.includes('กระบะ') && cleanExtracted.includes('4'))) {
    targetKeyword = 'รถยนต์บรรทุกส่วนบุคคล (ดับเบิลแค็บ 4 ประตู)';
  } else if (cleanExtracted.includes('กระบะ') || cleanExtracted.includes('บรรทุกส่วนบุคคล') || cleanExtracted.includes('แค็บ') || cleanExtracted.includes('ตอนเดียว')) {
    targetKeyword = 'รถยนต์บรรทุกส่วนบุคคล (กระบะตอนเดียว/แค็บ)';
  } else if (cleanExtracted.includes('เก๋ง') || cleanExtracted.includes('นั่งส่วนบุคคล') || cleanExtracted.includes('ไม่เกิน7คน')) {
    targetKeyword = 'รถยนต์นั่งส่วนบุคคลไม่เกิน 7 คน';
  } else if (cleanExtracted.includes('โดยสาร') || cleanExtracted.includes('รถบัส') || cleanExtracted.includes('ตู้')) {
    targetKeyword = 'รถยนต์โดยสาร';
  } else if (cleanExtracted.includes('6ล้อ') || cleanExtracted.includes('หกล้อ')) {
    targetKeyword = 'รถบรรทุก 6 ล้อ หรือ รถยนต์บรรทุก';
  } else if (cleanExtracted.includes('10ล้อ') || cleanExtracted.includes('สิบล้อ')) {
    targetKeyword = 'รถบรรทุก 10 ล้อ หรือ รถยนต์บรรทุก';
  } else if (cleanExtracted.includes('ลากจูง') || cleanExtracted.includes('พ่วง') || cleanExtracted.includes('กึ่งพ่วง')) {
    targetKeyword = 'รถลากจูงและรถกึ่งพ่วง / รถพ่วง';
  } else if (cleanExtracted.includes('เกษตร') || cleanExtracted.includes('ไถ') || cleanExtracted.includes('เกี่ยวข้าว') || cleanExtracted.includes('ตัดอ้อย')) {
    targetKeyword = 'รถเพื่อการเกษตร (เช่น รถไถนา รถเกี่ยวข้าว รถตัดอ้อย)';
  }

  if (targetKeyword) {
    const found = vehicleTypesList.find(t => t.value === targetKeyword);
    if (found) return found.value;
  }

  // Fallback to substring matching
  const foundSub = vehicleTypesList.find(t => {
    const val = t.value.toString().replace(/\s+/g, '').replace(/ยนต์/g, '').toLowerCase();
    return val.includes(cleanExtracted) || cleanExtracted.includes(val);
  });
  if (foundSub) return foundSub.value;

  return extractedType.toString();
};

const findMatchingColor = (extractedColor) => {
  if (!extractedColor) return '';
  const clean = extractedColor.toString().replace(/\s+/g, '').replace(/สี/g, '').trim();
  const standardColors = ['ขาว', 'ดำ', 'เทา', 'บรอนซ์เงิน', 'บรอนซ์ทอง', 'แดง', 'น้ำเงิน', 'ฟ้า', 'น้ำตาล', 'เขียว', 'เหลือง', 'ส้ม', 'ชมพู'];
  
  // 1. Exact match
  let found = standardColors.find(c => c === clean);
  if (found) return found;

  // 2. Keyword match
  if (clean.includes('ขาว')) return 'ขาว';
  if (clean.includes('ดำ')) return 'ดำ';
  if (clean.includes('เทา')) return 'เทา';
  if (clean.includes('บรอนซ์เงิน') || clean.includes('เงิน') || clean.includes('บรอนส์เงิน') || clean.includes('บรอนเงิน')) return 'บรอนซ์เงิน';
  if (clean.includes('บรอนซ์ทอง') || clean.includes('ทอง') || clean.includes('บรอนส์ทอง') || clean.includes('บรอนทอง')) return 'บรอนซ์ทอง';
  if (clean.includes('บรอนซ์') || clean.includes('บรอนส์')) return 'บรอนซ์เงิน'; // default fallback for bronze is silver
  if (clean.includes('แดง')) return 'แดง';
  if (clean.includes('น้ำเงิน')) return 'น้ำเงิน';
  if (clean.includes('ฟ้า')) return 'ฟ้า';
  if (clean.includes('น้ำตาล')) return 'น้ำตาล';
  if (clean.includes('เขียว')) return 'เขียว';
  if (clean.includes('เหลือง')) return 'เหลือง';
  if (clean.includes('ส้ม')) return 'ส้ม';
  if (clean.includes('ชมพู')) return 'ชมพู';
  
  return clean || extractedColor.toString();
};

const cleanAndExtractAddressFields = (customerObj) => {
  if (!customerObj) return customerObj;
  let { address, moo, soi, road } = customerObj;
  
  address = address !== undefined && address !== null ? address.toString() : '';
  moo = moo !== undefined && moo !== null ? moo.toString() : '';
  soi = soi !== undefined && soi !== null ? soi.toString() : '';
  road = road !== undefined && road !== null ? road.toString() : '';

  // 1. If moo is empty but address contains "หมู่" or "ม.", try to extract it
  if (!moo && address) {
    const mooMatch = address.match(/หมู่ที่\s*(\d+|[ก-ฮ]+)/) || address.match(/หมู่\s*(\d+|[ก-ฮ]+)/) || address.match(/ม\.\s*(\d+|[ก-ฮ]+)/);
    if (mooMatch) {
      moo = mooMatch[1].toString();
    }
  }

  // 2. If soi is empty but address contains "ซอย" or "ซ.", try to extract it
  if (!soi && address) {
    const soiMatch = address.match(/ซอย\s*([ก-ฮa-zA-Z0-9\s]+)/) || address.match(/ซ\.\s*([ก-ฮa-zA-Z0-9\s]+)/);
    if (soiMatch) {
      soi = soiMatch[1].split(' ')[0].toString(); // take first word
    }
  }

  // 3. Clean address of "หมู่", "ซอย", "ถนน"
  if (address) {
    // Remove หมู่ที่ X, หมู่ X, ม. X
    address = address.replace(/หมู่ที่\s*\d+/g, '')
                     .replace(/หมู่\s*\d+/g, '')
                     .replace(/ม\.\s*\d+/g, '')
                     .replace(/หมู่ที่\s*[ก-ฮ]+/g, '')
                     .replace(/หมู่\s*[ก-ฮ]+/g, '')
                     .replace(/ม\.\s*[ก-ฮ]+/g, '');
    
    // Remove ซอย X, ซ. X
    address = address.replace(/ซอย\s*[ก-ฮa-zA-Z0-9]+/g, '')
                     .replace(/ซ\.\s*[ก-ฮa-zA-Z0-9]+/g, '');
                     
    // Remove ถนน X, ถ. X
    address = address.replace(/ถนน\s*[ก-ฮa-zA-Z0-9]+/g, '')
                     .replace(/ถ\.\s*[ก-ฮa-zA-Z0-9]+/g, '');

    // Remove "บ้านเลขที่" and "เลขที่"
    address = address.replace(/บ้านเลขที่\s*/g, '').replace(/เลขที่\s*/g, '');

    // Clean up spaces, commas, slashes at the end
    address = address.replace(/[,.\-\s]+$/, '').replace(/^\s+/, '').replace(/\s+/g, ' ').trim();
  }

  // 4. Clean moo string to only have the number or keyword (e.g. if it is "หมู่ที่ 5" or "หมู่ 5" -> "5")
  if (moo) {
    moo = moo.replace(/หมู่ที่/g, '').replace(/หมู่/g, '').replace(/ม\./g, '').trim();
  }

  return { ...customerObj, address, moo, soi, road };
};

const translateThaiNumerals = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const thNums = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return obj.replace(/[๐-๙]/g, (m) => thNums.indexOf(m));
  }
  if (Array.isArray(obj)) {
    return obj.map(item => translateThaiNumerals(item));
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const key in obj) {
      cleaned[key] = translateThaiNumerals(obj[key]);
    }
    return cleaned;
  }
  return obj;
};

const findBestAddressMatch = (extractedSub, extractedDist, extractedProv, extractedZip) => {
  if (!thaiData || !Array.isArray(thaiData)) return null;

  const cleanStr = (str) => {
    if (!str) return '';
    return str
      .toString()
      .replace(/ตำบล|แขวง|อำเภอ|เขต|จังหวัด|ต\.|อ\.|จ\.|ข\./g, '')
      .replace(/^(ตำบล|แขวง|อำเภอ|เขต|จังหวัด|ต|อ|จ|ข)\s+/, '')
      .replace(/\s+/g, '')
      .trim();
  };

  const getJaccardSimilarity = (str1, str2) => {
    const s1 = cleanStr(str1);
    const s2 = cleanStr(str2);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    const set1 = new Set(s1);
    const set2 = new Set(s2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  };

  const sSub = cleanStr(extractedSub);
  const sDist = cleanStr(extractedDist);
  const sProv = cleanStr(extractedProv);
  const sZip = extractedZip ? extractedZip.toString().replace(/\D/g, '').slice(0, 5) : '';

  let targetProv = sProv;
  if (sProv.includes('กรุงเทพ') || sProv.includes('กทม')) {
    targetProv = 'กรุงเทพมหานคร';
  }

  let candidates = thaiData;

  // Pass 1: Filter by exact zipcode if present
  if (sZip && sZip.length === 5) {
    const zipMatches = thaiData.filter(item => item.zipcode.toString() === sZip);
    if (zipMatches.length > 0) {
      candidates = zipMatches;
    }
  }

  // Pass 2: Filter by province if targetProv is matched reasonably
  if (targetProv) {
    let bestProv = '';
    let maxProvSim = 0;
    const uniqueProvinces = [...new Set(thaiData.map(item => item.province))];
    uniqueProvinces.forEach(p => {
      const sim = getJaccardSimilarity(targetProv, p);
      if (sim > maxProvSim) {
        maxProvSim = sim;
        bestProv = p;
      }
    });

    if (maxProvSim > 0.4) {
      candidates = candidates.filter(item => item.province === bestProv);
    }
  }

  // Pass 3: Score remaining candidates
  let bestMatch = null;
  let maxScore = -1;

  candidates.forEach(item => {
    let score = 0;

    if (targetProv) {
      score += getJaccardSimilarity(targetProv, item.province) * 10;
    } else {
      score += 5;
    }

    if (sDist) {
      score += getJaccardSimilarity(sDist, item.amphoe) * 15;
    }

    if (sSub) {
      score += getJaccardSimilarity(sSub, item.district) * 20;
    }

    if (sZip && item.zipcode.toString() === sZip) {
      score += 10;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  });

  return bestMatch;
};

const sanitizeAIResponse = (data) => {
  if (!data) return data;
  
  // 1. Convert all Thai numerals to Arabic numerals
  let sanitized = translateThaiNumerals(data);
  
  // 2. Sanitize Customer fields
  if (sanitized.customer) {
    // Phone validation
    if (sanitized.customer.phone) {
      const cleaned = sanitized.customer.phone.replace(/\D/g, '');
      sanitized.customer.phone = (cleaned.length === 9 || cleaned.length === 10) ? cleaned : '';
    } else {
      sanitized.customer.phone = '';
    }
    
    if (sanitized.customer.alt_phone) {
      const cleaned = sanitized.customer.alt_phone.replace(/\D/g, '');
      sanitized.customer.alt_phone = (cleaned.length === 9 || cleaned.length === 10) ? cleaned : '';
    } else {
      sanitized.customer.alt_phone = '';
    }
    
    // ID Card validation
    if (sanitized.customer.id_card_no) {
      const cleaned = sanitized.customer.id_card_no.replace(/\D/g, '');
      sanitized.customer.id_card_no = (cleaned.length === 13) ? cleaned : '';
    } else {
      sanitized.customer.id_card_no = '';
    }

    // Address fields validation & Auto-correction using Jaccard Similarity and thaiData
    const matchedAddress = findBestAddressMatch(
      sanitized.customer.sub_district,
      sanitized.customer.district,
      sanitized.customer.province,
      sanitized.customer.zipcode
    );

    if (matchedAddress) {
      // Always set province
      sanitized.customer.province = matchedAddress.province;
      
      // Set district if we extracted it OR if the matched address uniquely has it
      if (sanitized.customer.district) {
        sanitized.customer.district = matchedAddress.amphoe;
      } else {
        const zipMatches = thaiData.filter(item => item.zipcode.toString() === matchedAddress.zipcode.toString());
        const uniqueAmphoes = [...new Set(zipMatches.map(item => item.amphoe))];
        if (uniqueAmphoes.length === 1) {
          sanitized.customer.district = matchedAddress.amphoe;
        } else {
          sanitized.customer.district = '';
        }
      }

      // Set sub_district if we extracted it OR if the matched address uniquely identifies it
      if (sanitized.customer.sub_district) {
        sanitized.customer.sub_district = matchedAddress.district;
      } else {
        const zipMatches = thaiData.filter(item => item.zipcode.toString() === matchedAddress.zipcode.toString());
        const uniqueDistricts = [...new Set(zipMatches.map(item => item.district))];
        if (uniqueDistricts.length === 1) {
          sanitized.customer.sub_district = matchedAddress.district;
        } else {
          sanitized.customer.sub_district = '';
        }
      }

      // Always set zipcode
      sanitized.customer.zipcode = matchedAddress.zipcode.toString();
    } else {
      // Fallback
      if (sanitized.customer.sub_district) {
        sanitized.customer.sub_district = sanitized.customer.sub_district
          .replace(/ตำบล|แขวง|ต\.|ข\./g, '')
          .trim();
      }
      if (sanitized.customer.district) {
        sanitized.customer.district = sanitized.customer.district
          .replace(/อำเภอ|เขต|อ\.|ข\./g, '')
          .trim();
      }
      if (sanitized.customer.province) {
        sanitized.customer.province = sanitized.customer.province
          .replace(/จังหวัด|จ\./g, '')
          .trim();
        if (sanitized.customer.province.includes('กรุงเทพ') || sanitized.customer.province.includes('กทม')) {
          sanitized.customer.province = 'กรุงเทพมหานคร';
        }
      }
      if (sanitized.customer.zipcode) {
        sanitized.customer.zipcode = sanitized.customer.zipcode.replace(/\D/g, '').slice(0, 5);
      }
    }
  }

  // 3. Sanitize Vehicle fields (VIN, Engine No)
  if (sanitized.vehicle) {
    if (sanitized.vehicle.vin) {
      sanitized.vehicle.vin = sanitized.vehicle.vin.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    if (sanitized.vehicle.engine_no) {
      sanitized.vehicle.engine_no = sanitized.vehicle.engine_no.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
  }
  
  return sanitized;
};

// Helper for adaptive contrast / shadow removal (CamScanner-style)
const removeShadowsAndEnhance = (originalCanvas) => {
  const width = originalCanvas.width;
  const height = originalCanvas.height;
  
  // 1. Create a small canvas to extract the background illumination (shadow map)
  const bgCanvas = document.createElement('canvas');
  // 1/16th size for fast processing and natural smooth blur
  const bgW = Math.max(16, Math.floor(width / 16));
  const bgH = Math.max(16, Math.floor(height / 16));
  bgCanvas.width = bgW;
  bgCanvas.height = bgH;
  
  const bgCtx = bgCanvas.getContext('2d');
  bgCtx.drawImage(originalCanvas, 0, 0, bgW, bgH);
  
  const bgData = bgCtx.getImageData(0, 0, bgW, bgH);
  const bgPixels = bgData.data;
  
  // Simple horizontal and vertical box blur helper function
  const size = bgW * bgH;
  const r = new Uint8Array(size);
  const g = new Uint8Array(size);
  const b = new Uint8Array(size);
  
  for (let i = 0; i < size; i++) {
    r[i] = bgPixels[i * 4];
    g[i] = bgPixels[i * 4 + 1];
    b[i] = bgPixels[i * 4 + 2];
  }
  
  const blurPass = (channel, pixels, w, h, radius, offset) => {
    const temp = new Uint8Array(channel.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const nx = x + k;
          if (nx >= 0 && nx < w) {
            val += channel[y * w + nx];
            count++;
          }
        }
        temp[y * w + x] = Math.floor(val / count);
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let val = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const ny = y + k;
          if (ny >= 0 && ny < h) {
            val += temp[ny * w + x];
            count++;
          }
        }
        pixels[(y * w + x) * 4 + offset] = Math.floor(val / count);
      }
    }
  };

  const radius = 2;
  blurPass(r, bgPixels, bgW, bgH, radius, 0);
  blurPass(g, bgPixels, bgW, bgH, radius, 1);
  blurPass(b, bgPixels, bgW, bgH, radius, 2);
  
  bgCtx.putImageData(bgData, 0, 0);
  
  // 2. Prepare destination canvas
  const destCanvas = document.createElement('canvas');
  destCanvas.width = width;
  destCanvas.height = height;
  const destCtx = destCanvas.getContext('2d');
  
  // Draw the blurred background stretched to full size
  destCtx.drawImage(bgCanvas, 0, 0, width, height);
  const bgFullData = destCtx.getImageData(0, 0, width, height);
  const bgFullPixels = bgFullData.data;
  
  // Draw the original image again
  destCtx.drawImage(originalCanvas, 0, 0, width, height);
  const origData = destCtx.getImageData(0, 0, width, height);
  const origPixels = origData.data;
  
  // 3. Divide original by background to flatten shadows (Retinex division)
  for (let i = 0; i < origPixels.length; i += 4) {
    let origR = origPixels[i];
    let bgR = bgFullPixels[i];
    // Use a stronger division factor (215 instead of 230) to push paper backgrounds to pure white
    origPixels[i] = Math.min(255, Math.floor((origR / (bgR || 1)) * 215));
    
    let origG = origPixels[i + 1];
    let bgG = bgFullPixels[i + 1];
    origPixels[i + 1] = Math.min(255, Math.floor((origG / (bgG || 1)) * 215));
    
    let origB = origPixels[i + 2];
    let bgB = bgFullPixels[i + 2];
    origPixels[i + 2] = Math.min(255, Math.floor((origB / (bgB || 1)) * 215));
  }
  
  destCtx.putImageData(origData, 0, 0);
  
  // 4. Boost overall contrast and sharpen text edges using GPU-accelerated canvas filter (contrast 1.45)
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.filter = 'contrast(1.45) brightness(1.00) saturate(1.05)';
  finalCtx.drawImage(destCanvas, 0, 0);
  
  return finalCanvas;
};

const compressImage = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Apply CamScanner-style shadow removal & enhancement
        let processedCanvas = canvas;
        try {
          processedCanvas = removeShadowsAndEnhance(canvas);
        } catch (enhanceError) {
          console.warn("Image enhancement failed, falling back to original:", enhanceError);
        }

        processedCanvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const IssuePolicyForm = () => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Master Data Options
  const [companies, setCompanies] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [nonMotorTypes, setNonMotorTypes] = useState([]);
  const [policyTypes, setPolicyTypes] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [jobStatuses, setJobStatuses] = useState([]);
  const [docTypes, setDocTypes] = useState([]);

  // Form State
  const [customer, setCustomer] = useState({
    id: null, prefix: 'นาย', first_name: '', last_name: '', id_card_no: '', dob: '', age: '',
    phone: '', alt_phone: '', email: '', line_id: '', facebook: '', occupation: '',
    address: '', moo: '', soi: '', road: '', sub_district: '', district: '', province: '', zipcode: '', note: ''
  });
  const [customerSearchText, setCustomerSearchText] = useState('');

  const [vehicle, setVehicle] = useState({
    vehicle_type: '', brand: '', model: '', year: '', color: '', 
    plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: '',
    registration_date: ''
  });
  const [vehicleSearchText, setVehicleSearchText] = useState('');

  const [policy, setPolicy] = useState({
    category: 'motor', // 'motor' or 'non-motor'
    company: '', type: '', policy_no: '', sum_insured: '', 
    net_premium: '', stamp_duty: '', vat: '', total_premium: '',
    prb_start_date: '', prb_expiry_date: '', start_date: '', expiry_date: '',
    non_motor_type_id: '', additional_data: {}, insured_name: '', status: 'รอดำเนินการ'
  });

  const [payment, setPayment] = useState({
    payment_method: 'เงินสด',
    installments: 1,
    pay_date: '',
    status: 'รอชำระ'
  });

  const [installmentSchedule, setInstallmentSchedule] = useState([]);

  // Refs for tracking start dates to auto-calculate expiry dates (+1 year)
  const prevStartDateRef = useRef(policy.start_date);
  const prevPrbStartDateRef = useRef(policy.prb_start_date);
  const prevExpiryDateRef = useRef(policy.expiry_date);

  const [followUp, setFollowUp] = useState({
    status: 'รอดำเนินการ', next_date: '', note: ''
  });

  const [files, setFiles] = useState([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [aiWarning, setAiWarning] = useState('');
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [rawAiData, setRawAiData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const cameraScanInputRef = useRef(null);

  const handleAIExtract = async (e) => {
    const rawFiles = Array.from(e.target.files);
    if (!rawFiles.length) return;

    let geminiApiKey = localStorage.getItem('geminiApiKey');
    if (!geminiApiKey) {
      geminiApiKey = window.prompt('ระบบจำเป็นต้องใช้ Gemini API Key ในการอ่านรูปภาพ (ฟรี 100%)\nกรุณาใส่ API Key ของคุณที่ได้จาก Google AI Studio:');
      if (!geminiApiKey) {
        e.target.value = null;
        return;
      }
      localStorage.setItem('geminiApiKey', geminiApiKey);
    }

    const currentLength = files.length;

    // Auto-add AI scanned files to attachments state with temporary status note
    const newFiles = rawFiles.map(file => ({
      file,
      type_id: 1, // default "ตารางกรมธรรม์"
      note: 'กำลังรอการสแกนด้วย AI...',
      preview: URL.createObjectURL(file)
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setActivePreviewIdx(currentLength);

    setOcrLoading(true);

    try {
      // Loop through each file sequentially to ensure 100% accuracy and prevent mixed data
      for (let idx = 0; idx < rawFiles.length; idx++) {
        const file = rawFiles[idx];
        const fileIndex = currentLength + idx;

        // Update active preview index to highlight the current file being scanned
        setActivePreviewIdx(fileIndex);

        // Update status note for the currently scanning file
        setFiles(prev => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex].note = 'กำลังอ่านข้อมูลด้วย AI...';
          }
          return updated;
        });

        // Increase image resolution and compression quality for sharper text details in AI OCR
        const compressedFile = await compressImage(file, 4096, 4096, 0.95);

        const formData = new FormData();
        formData.append('images', compressedFile); // Send exactly 1 image

        const res = await api.post('/ai-ocr/extract', formData, {
          headers: { 'x-gemini-api-key': geminiApiKey } 
        });

        const data = sanitizeAIResponse(res.data);

        // Save the raw AI extraction for accuracy comparison
        setRawAiData({
          document_type: data.document_type,
          customer: data.customer ? { ...data.customer } : null,
          vehicle: data.vehicle ? { ...data.vehicle } : null,
          policy: data.policy ? { ...data.policy } : null
        });

        // Auto-link existing customer by checking phone number or ID card in background
        if (data.customer && (data.customer.phone || data.customer.id_card_no)) {
          const lookupVal = (data.customer.id_card_no || '').replace(/\D/g, '') || (data.customer.phone || '').replace(/\D/g, '');
          if (lookupVal && lookupVal.length >= 9) {
            try {
              const checkRes = await api.get(`/customers?search=${lookupVal}`);
              if (checkRes.data && checkRes.data.length > 0) {
                const cleanLookup = lookupVal.replace(/\D/g, '');
                const matchedCustomer = checkRes.data.find(c => {
                  const cleanCustPhone = (c.phone || '').replace(/\D/g, '');
                  const cleanCustId = (c.id_card_no || '').replace(/\D/g, '');
                  return (cleanCustPhone && cleanCustPhone === cleanLookup) || 
                         (cleanCustId && cleanCustId === cleanLookup);
                });
                if (matchedCustomer) {
                  // Merge the existing customer ID, code, and details into the extracted data object
                  data.customer = {
                    ...data.customer,
                    ...matchedCustomer,
                    dob: matchedCustomer.dob ? matchedCustomer.dob.split('T')[0] : data.customer.dob,
                    id: matchedCustomer.id
                  };
                  
                  // Suppressed notice banner as per user request to keep UI clean, while keeping background auto-linking active
                  // const notice = `ตรวจพบลูกค้าเก่าในระบบ: ${matchedCustomer.prefix || ''}${matchedCustomer.first_name} ${matchedCustomer.last_name || ''} (ระบบทำการเชื่อมโยงข้อมูลอัตโนมัติ)`;
                  // setAiWarning(prev => prev ? `${prev} | ${notice}` : notice);

                  // Fetch their latest vehicle and merge into data.vehicle
                  try {
                    const vehRes = await api.get(`/vehicles?customer_id=${matchedCustomer.id}`);
                    if (vehRes.data && vehRes.data.length > 0) {
                      const latestVehicle = vehRes.data[0];
                      data.vehicle = {
                        ...data.vehicle,
                        ...latestVehicle,
                        tax_expiry: latestVehicle.tax_expiry ? latestVehicle.tax_expiry.split('T')[0] : (data.vehicle ? data.vehicle.tax_expiry : ''),
                        id: latestVehicle.id
                      };
                      setVehicleSearchText(latestVehicle.plate_no); // visually show it
                    }
                  } catch (vErr) {
                    console.error('Error fetching auto-linked customer vehicle:', vErr);
                  }
                }
              }
            } catch (cErr) {
              console.error('Error during customer auto-link check:', cErr);
            }
          }
        }

        // Append warnings if any
        if (data.validation && data.validation.warning_message) {
          setAiWarning(prev => prev ? `${prev} | ${data.validation.warning_message}` : data.validation.warning_message);
        }

        // Handle payment slip auto-population
        if (data.document_type === 'payment_slip' && data.payment_slip_data) {
          const slip = data.payment_slip_data;
          setPayment(prev => ({
            ...prev,
            payment_method: 'เงินสด',
            pay_date: slip.transfer_date_time ? normalizeDate(slip.transfer_date_time) : prev.pay_date,
            status: 'ชำระครบแล้ว'
          }));
          
          let bankText = '';
          if (slip.bank_sender || slip.bank_receiver) {
            bankText = ` (${slip.bank_sender || ''} -> ${slip.bank_receiver || ''})`;
          }
          let slipNotice = `ตรวจพบสลิปโอนเงิน ยอดโอน: ฿${parseFloat(slip.amount || 0).toLocaleString()}${bankText} วันที่โอน: ${slip.transfer_date_time || ''}`;
          setAiWarning(prev => prev ? `${prev} | ${slipNotice}` : slipNotice);
        }

        // Auto-set the document type in the files state for this specific file
        let detectedTypeId = 1; // default to policy
        if (data.document_type === 'vehicle_book') detectedTypeId = 4;
        else if (data.document_type === 'payment_slip') detectedTypeId = 2;
        
        let docLabel = 'กรมธรรม์';
        if (data.document_type === 'payment_slip') docLabel = 'สลิปโอนเงิน';
        else if (data.document_type === 'vehicle_book') docLabel = 'ทะเบียนรถ';
        else if (data.document_type === 'non_motor_policy') docLabel = 'กรมธรรม์ Non-Motor';
        
        setFiles(prev => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex] = {
              ...updated[fileIndex],
              type_id: detectedTypeId,
              note: `สแกนด้วย AI: ${docLabel}`
            };
          }
          return updated;
        });
        
        // Auto-normalize any extracted dates (e.g. converting BE to AD)
        if (data.customer && data.customer.dob) {
          data.customer.dob = normalizeDate(data.customer.dob);
        }
        if (data.vehicle && data.vehicle.registration_date) {
          data.vehicle.registration_date = normalizeDate(data.vehicle.registration_date);
        }
        if (data.policy) {
          if (data.policy.start_date) data.policy.start_date = normalizeDate(data.policy.start_date);
          if (data.policy.expiry_date) data.policy.expiry_date = normalizeDate(data.policy.expiry_date);
        }
        
        if (data.customer) {
          let calculatedAge = data.customer.age;
          if (data.customer.dob) {
            const birthDate = new Date(data.customer.dob);
            const today = new Date();
            calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
          }

          const cleanedCustomer = cleanAndExtractAddressFields(data.customer);
          setCustomer(prev => {
            const merged = { ...prev };
            Object.keys(cleanedCustomer).forEach(key => {
              const val = cleanedCustomer[key];
              if (val !== '' && val !== null && val !== undefined) {
                merged[key] = val;
              }
            });
            if (calculatedAge) merged.age = calculatedAge;
            return merged;
          });
        }

        if (data.vehicle) {
          const matchedBrand = data.vehicle.brand ? findMatchingBrand(data.vehicle.brand, carBrands) : '';
          const matchedModel = data.vehicle.model ? findMatchingModel(data.vehicle.model, matchedBrand, carModels) : '';
          const matchedVehicleType = data.vehicle.vehicle_type ? findMatchingVehicleType(data.vehicle.vehicle_type, vehicleTypes) : '';
          const matchedColor = data.vehicle.color ? findMatchingColor(data.vehicle.color) : '';

          setVehicle(prev => {
            const merged = { ...prev };
            const rawVehicle = data.vehicle;
            Object.keys(rawVehicle).forEach(key => {
              const val = rawVehicle[key];
              if (val !== '' && val !== null && val !== undefined) {
                merged[key] = val;
              }
            });
            if (matchedBrand) merged.brand = matchedBrand;
            if (matchedModel) merged.model = matchedModel;
            if (matchedVehicleType) merged.vehicle_type = matchedVehicleType;
            if (matchedColor) merged.color = matchedColor;
            return merged;
          });
        }

        if (data.policy) {
          const matchedCompany = data.policy.company ? findMatchingCompany(data.policy.company, companies) : '';
          const matchedTypeInfo = data.policy.type ? findMatchingType(data.policy.type, policyTypes, nonMotorTypes) : null;

          setPolicy(prev => {
            const merged = { ...prev };
            const rawPolicy = data.policy;
            Object.keys(rawPolicy).forEach(key => {
              const val = rawPolicy[key];
              if (val !== '' && val !== null && val !== undefined) {
                merged[key] = val;
              }
            });
            if (matchedCompany) merged.company = matchedCompany;
            
            if (data.document_type === 'prb_policy') {
              merged.prb_start_date = data.policy.start_date || merged.prb_start_date || '';
              merged.prb_expiry_date = data.policy.expiry_date || merged.prb_expiry_date || '';
            } else {
              merged.start_date = data.policy.start_date || merged.start_date || '';
              merged.expiry_date = data.policy.expiry_date || merged.expiry_date || '';
            }

            if (matchedTypeInfo) {
              merged.category = matchedTypeInfo.category;
              merged.type = matchedTypeInfo.type;
              merged.non_motor_type_id = matchedTypeInfo.non_motor_type_id;
            } else {
              // Fallback mapping for non-motor policy types
              if (data.document_type === 'non_motor_policy') {
                merged.category = 'non-motor';
              }
              
              if (merged.category === 'non-motor' && !merged.non_motor_type_id && rawPolicy.type) {
                const cleanType = rawPolicy.type.toString().toLowerCase();
                const found = nonMotorTypes.find(t => {
                  const cleanLabel = t.label.toLowerCase();
                  return cleanLabel.includes(cleanType) || cleanType.includes(cleanLabel) || 
                         (cleanType.includes('pa') && cleanLabel.includes('pa')) ||
                         (cleanType.includes('อุบัติเหตุ') && cleanLabel.includes('อุบัติเหตุ')) ||
                         (cleanType.includes('สุขภาพ') && cleanLabel.includes('สุขภาพ')) ||
                         (cleanType.includes('อัคคีภัย') && cleanLabel.includes('อัคคีภัย')) ||
                         (cleanType.includes('ไฟไหม้') && cleanLabel.includes('ไฟไหม้')) ||
                         (cleanType.includes('ขนส่ง') && cleanLabel.includes('ขนส่ง')) ||
                         (cleanType.includes('ชีวิต') && cleanLabel.includes('life'));
                });
                if (found) {
                  merged.non_motor_type_id = found.value;
                  merged.type = found.label;
                }
              }
            }
            return merged;
          });
        }
      }
      
      alert('ดึงข้อมูลจากรูปภาพทั้งหมดสำเร็จ! กรุณาตรวจสอบความถูกต้องก่อนบันทึกอีกครั้งนะครับ');
    } catch (err) {
      setFiles(prev => {
        const reverted = prev.slice(0, currentLength);
        for (let i = currentLength; i < prev.length; i++) {
          if (prev[i].preview) URL.revokeObjectURL(prev[i].preview);
        }
        return reverted;
      });
      if (err.response?.data?.error === 'GEMINI_API_KEY_REQUIRED' || err.response?.data?.error === 'OPENAI_API_KEY_REQUIRED') {
        alert('API Key ของ Gemini ไม่ถูกต้องหรือหมดอายุ กรุณาตั้งค่าใหม่ครับ');
        localStorage.removeItem('geminiApiKey');
      } else {
        const errorMsg = err.response?.data?.error || err.message || JSON.stringify(err.response?.data);
        alert(`เกิดข้อผิดพลาดในการดึงข้อมูลด้วย AI: ${errorMsg}`);
      }
    } finally {
      setOcrLoading(false);
      e.target.value = null;
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const mdRes = await api.get('/master-data');
      const md = mdRes.data;
      setCompanies(md.filter(m => m.category === 'InsuranceCompany').map(m => ({ value: m.value, label: m.value })));
      setVehicleTypes(md.filter(m => m.category === 'VehicleType').map(m => ({ value: m.value, label: m.value })));
      setJobStatuses(md.filter(m => m.category === 'JobStatus').map(m => ({ value: m.value, label: m.value })));
      setPolicyTypes(md.filter(m => m.category === 'PolicyType').map(m => ({ value: m.value, label: m.value })));
      
      const nmRes = await api.get('/non-motor-policies/types');
      setNonMotorTypes(nmRes.data.map(t => ({ value: t.id, label: t.name })));

      // Default Document Types fallback if api fails
      setDocTypes([
        { id: 1, name: 'ตารางกรมธรรม์' }, { id: 2, name: 'ใบเสร็จรับเงิน' },
        { id: 3, name: 'สำเนาบัตรประชาชน' }, { id: 4, name: 'สำเนาทะเบียนรถ' },
        { id: 5, name: 'รูปถ่ายรถยนต์' }, { id: 6, name: 'อื่นๆ' }
      ]);
      
      // Hardcode provinces for simplicity, or we could fetch from an API
      setProvinces([
        'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 
        'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 
        'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 
        'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 
        'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 
        'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 
        'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 
        'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
      ].map(p => ({ value: p, label: p })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDobChange = (e) => {
    const dob = normalizeDate(e.target.value);
    let age = '';
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    setCustomer({ ...customer, dob, age });
  };

  useEffect(() => {
    if (policy.net_premium || policy.type || policy.category || policy.non_motor_type_id) {
      const net = parseFloat(policy.net_premium) || 0;

      let commPercent = policy.commission_percent;
      
      const typeLabel = policy.type || nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))?.label || '';
      
      if (policy.category === 'motor') {
        if (typeLabel.includes('ชั้น 1')) commPercent = 18;
        else if (typeLabel.includes('ชั้น 2+')) commPercent = 25;
        else if (typeLabel.includes('ชั้น 3+')) commPercent = 25;
        else if (typeLabel.includes('ชั้น 3')) commPercent = 18;
        else if (typeLabel.includes('ชั้น 2')) commPercent = 18;
      } else {
        if (typeLabel.includes('ขนส่ง')) commPercent = 10;
        else if (typeLabel.includes('อัคคีภัย') || typeLabel.includes('ไฟไหม้')) commPercent = 23;
        else if (typeLabel.includes('PA') || typeLabel.includes('อุบัติเหตุ')) commPercent = 18;
      }

      const commBaht = parseFloat((net * ((commPercent || 0) / 100)).toFixed(2));

      // Only update if values actually changed to prevent infinite loops
      if (
        policy.commission_percent !== commPercent ||
        policy.commission_baht !== commBaht
      ) {
        setPolicy(prev => ({
          ...prev,
          commission_percent: commPercent,
          commission_baht: commBaht
        }));
      }
    }
  }, [policy.net_premium, policy.type, policy.category, policy.non_motor_type_id, policy.commission_percent]);

  const handlePremiumChange = (field, val) => {
    const newPolicy = { ...policy, [field]: val };
    
    if (field === 'net_premium') {
      const net = parseFloat(val) || 0;
      const stamp = Math.ceil(net * 0.004);
      const vat = parseFloat(((net + stamp) * 0.07).toFixed(2));
      const total = net + stamp + vat;
      
      newPolicy.stamp_duty = stamp;
      newPolicy.vat = vat;
      newPolicy.total_premium = total.toFixed(2);
      newPolicy.commission_baht = parseFloat((net * ((newPolicy.commission_percent || 0) / 100)).toFixed(2));
    } else if (field === 'stamp_duty' || field === 'vat') {
      const net = parseFloat(newPolicy.net_premium) || 0;
      const stamp = parseFloat(newPolicy.stamp_duty) || 0;
      const vat = parseFloat(newPolicy.vat) || 0;
      const total = net + stamp + vat;
      newPolicy.total_premium = total.toFixed(2);
    }
    
    setPolicy(newPolicy);
  };

  useEffect(() => {
    if (payment.payment_method === 'เงินผ่อน' && payment.installments > 1 && policy.total_premium > 0) {
      const schedule = [];
      const total = parseFloat(policy.total_premium) || 0;
      const firstAmount = Math.round((total * 0.37) * 100) / 100;
      const balance = total - firstAmount;
      const remainingCount = payment.installments - 1;
      const remainingAmount = Math.round((balance / remainingCount) * 100) / 100;

      let currentDate = payment.pay_date ? new Date(payment.pay_date) : new Date();

      for (let i = 1; i <= payment.installments; i++) {
        let amt = i === 1 ? firstAmount : remainingAmount;
        
        // Adjust last installment for rounding errors
        if (i === parseInt(payment.installments)) {
          const sumSoFar = firstAmount + (remainingAmount * (remainingCount - 1));
          amt = Math.round((total - sumSoFar) * 100) / 100;
        }

        const dueDate = new Date(currentDate);
        if (i > 1) {
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
        }

        schedule.push({
          installment_no: i,
          due_date: dueDate.toISOString().split('T')[0],
          amount: amt,
          status: 'รอชำระ'
        });
      }
      setInstallmentSchedule(schedule);
    } else {
      setInstallmentSchedule([]);
    }
  }, [payment.payment_method, payment.installments, payment.pay_date, policy.total_premium]);



  useEffect(() => {
    if (vehicle.registration_date) {
      const nextAnniversary = getUpcomingAnniversary(vehicle.registration_date);
      if (nextAnniversary) {
        setVehicle(prev => {
          if (!prev.tax_expiry) {
            return { ...prev, tax_expiry: nextAnniversary };
          }
          return prev;
        });
        setPolicy(prev => {
          let updates = {};
          if (!prev.prb_start_date) updates.prb_start_date = nextAnniversary;
          if (!prev.start_date) updates.start_date = nextAnniversary;
          return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
        });
      }
    }
  }, [vehicle.registration_date]);

  useEffect(() => {
    if (policy.category === 'motor' && vehicle.sum_insured && vehicle.sum_insured !== policy.sum_insured) {
      setPolicy(prev => ({ ...prev, sum_insured: vehicle.sum_insured }));
    }
  }, [vehicle.sum_insured, policy.category]);

  useEffect(() => {
    const targetDate = policy.start_date || policy.prb_start_date;
    if (targetDate) {
      setPayment(prev => {
        if (prev.pay_date !== targetDate) {
          return { ...prev, pay_date: targetDate };
        }
        return prev;
      });
    }
  }, [policy.start_date, policy.prb_start_date]);

  useEffect(() => {
    if (policy.start_date && policy.start_date !== prevStartDateRef.current) {
      prevStartDateRef.current = policy.start_date;
      const nextYr = addOneYear(policy.start_date);
      setPolicy(prev => {
        if (prev.expiry_date !== nextYr) {
          return { ...prev, expiry_date: nextYr };
        }
        return prev;
      });
    } else if (!policy.start_date) {
      prevStartDateRef.current = '';
    }
  }, [policy.start_date]);

  useEffect(() => {
    if (policy.prb_start_date && policy.prb_start_date !== prevPrbStartDateRef.current) {
      prevPrbStartDateRef.current = policy.prb_start_date;
      const nextYr = addOneYear(policy.prb_start_date);
      setPolicy(prev => {
        if (prev.prb_expiry_date !== nextYr) {
          return { ...prev, prb_expiry_date: nextYr };
        }
        return prev;
      });
    } else if (!policy.prb_start_date) {
      prevPrbStartDateRef.current = '';
    }
  }, [policy.prb_start_date]);

  useEffect(() => {
    if (policy.expiry_date && policy.expiry_date !== prevExpiryDateRef.current) {
      prevExpiryDateRef.current = policy.expiry_date;
      setFollowUp(prev => {
        if (prev.next_date !== policy.expiry_date) {
          return { ...prev, next_date: policy.expiry_date };
        }
        return prev;
      });
    } else if (!policy.expiry_date) {
      prevExpiryDateRef.current = '';
    }
  }, [policy.expiry_date]);

  const loadCustomerOptions = (inputValue) => {
    return new Promise(resolve => {
      if (!inputValue || inputValue.length < 2) return resolve([]);
      if (window.customerSearchTimeout) clearTimeout(window.customerSearchTimeout);
      window.customerSearchTimeout = setTimeout(async () => {
        try {
          const res = await api.get(`/customers?search=${inputValue}`);
          resolve(res.data.map(c => ({
            label: `${c.phone} - ${c.first_name} ${c.last_name}${c.plate_no ? ` (ทะเบียน: ${c.plate_no})` : ''}`,
            value: c
          })));
        } catch (err) {
          resolve([]);
        }
      }, 400);
    });
  };

  const handleCustomerSelect = async (selectedOption) => {
    if (selectedOption && selectedOption.value) {
      const c = selectedOption.value;
      setCustomer({
        ...customer,
        ...c,
        dob: c.dob ? c.dob.split('T')[0] : '',
        id: c.id
      });

      // Auto-fetch latest vehicle for this customer
      try {
        const res = await api.get(`/vehicles?customer_id=${c.id}`);
        if (res.data && res.data.length > 0) {
          // Find the vehicle matching search text if possible
          let matchedVehicle = res.data[0];
          if (customerSearchText) {
            const cleanSearchText = customerSearchText.replace(/[\s-]/g, '').toLowerCase();
            const found = res.data.find(v => {
              const cleanPlate = (v.plate_no || '').replace(/[\s-]/g, '').toLowerCase();
              const cleanVin = (v.vin || '').replace(/[\s-]/g, '').toLowerCase();
              const cleanEngine = (v.engine_no || '').replace(/[\s-]/g, '').toLowerCase();
              return cleanPlate.includes(cleanSearchText) || 
                     cleanSearchText.includes(cleanPlate) ||
                     cleanVin.includes(cleanSearchText) ||
                     cleanEngine.includes(cleanSearchText);
            });
            if (found) {
              matchedVehicle = found;
            }
          }

          setVehicle({
            ...vehicle,
            ...matchedVehicle,
            tax_expiry: matchedVehicle.tax_expiry ? matchedVehicle.tax_expiry.split('T')[0] : '',
            id: matchedVehicle.id
          });
          setVehicleSearchText(matchedVehicle.plate_no); // visually show it
        }
      } catch (err) {
        console.error('Error fetching customer vehicle:', err);
      }
    }
  };

  const loadVehicleOptions = (inputValue) => {
    return new Promise(resolve => {
      if (!inputValue || inputValue.length < 2) return resolve([]);
      if (window.vehicleSearchTimeout) clearTimeout(window.vehicleSearchTimeout);
      window.vehicleSearchTimeout = setTimeout(async () => {
        try {
          const res = await api.get(`/vehicles?search=${inputValue}`);
          resolve(res.data.map(v => ({
            label: `ทะเบียน: ${v.plate_no} ${v.plate_province ? `(${v.plate_province})` : ''} - ${v.brand} ${v.model}`,
            value: v
          })));
        } catch (err) {
          resolve([]);
        }
      }, 400);
    });
  };

  const handleVehicleSelect = (selectedOption) => {
    if (selectedOption && selectedOption.value) {
      const v = selectedOption.value;
      setVehicle({
        ...vehicle,
        ...v,
        tax_expiry: v.tax_expiry ? v.tax_expiry.split('T')[0] : '',
        id: v.id
      });
    }
  };
  

  const onDrop = (acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      type_id: 6, // default "อื่นๆ"
      note: '',
      preview: URL.createObjectURL(file)
    }));
    setFiles([...files, ...newFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (index) => {
    const newFiles = [...files];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview);
    }
    newFiles.splice(index, 1);
    setFiles(newFiles);

    if (newFiles.length === 0) {
      setCustomer({
        id: null, prefix: 'นาย', first_name: '', last_name: '', id_card_no: '', dob: '', age: '',
        phone: '', alt_phone: '', email: '', line_id: '', facebook: '', occupation: '',
        address: '', moo: '', soi: '', road: '', sub_district: '', district: '', province: '', zipcode: '', note: ''
      });
      setVehicle({
        vehicle_type: '', brand: '', model: '', year: '', color: '', 
        plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: '',
        registration_date: ''
      });
      setPolicy({
        category: 'motor',
        company: '', type: '', policy_no: '', sum_insured: '', 
        net_premium: '', stamp_duty: '', vat: '', total_premium: '',
        prb_start_date: '', prb_expiry_date: '', start_date: '', expiry_date: '',
        non_motor_type_id: '', additional_data: {}, insured_name: '', status: 'รอดำเนินการ'
      });
      setPayment({
        payment_method: 'เงินสด',
        installments: 1,
        pay_date: '',
        status: 'รอชำระ'
      });
      setFollowUp({
        status: 'รอดำเนินการ', next_date: '', note: ''
      });
      setAiWarning('');
    }
  };

  const updateFileData = (index, field, value) => {
    const newFiles = [...files];
    newFiles[index][field] = value;
    setFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Form validation has been removed as per user request
    // that it should be able to save even if not fully filtered/filled.

    setLoading(true);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      
      const payload = {
        customer,
        vehicle,
        policy,
        payment,
        followUp,
        installmentSchedule,
        rawAiData
      };
      
      formData.append('data', JSON.stringify(payload));

      const fileDataList = files.map(f => ({ type_id: f.type_id, note: f.note }));
      formData.append('fileData', JSON.stringify(fileDataList));

      files.forEach(f => {
        formData.append('files', f.file);
      });

      const res = await api.post('/issue-policy', formData);

      setSuccessMsg({
        text: 'บันทึกข้อมูลลูกค้าและกรมธรรม์สำเร็จ!',
        customerName: `${customer.first_name} ${customer.last_name}`,
        policyNo: policy.policy_no || '(สร้างใหม่อัตโนมัติ)',
        company: policy.company,
        type: policy.type || (nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))?.label),
        totalPremium: policy.total_premium,
        commission: policy.commission_baht,
        status: followUp.status
      });

      // Cleanup memory
      files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      window.scrollTo(0, 0);
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล (Rollback เรียบร้อยแล้ว)');
    } finally {
      setLoading(false);
    }
  };

  const imageFiles = files.filter(f => f.file.type.startsWith('image/'));
  const validActiveIdx = activePreviewIdx >= imageFiles.length ? 0 : activePreviewIdx;

  return (
    <div className="container-fluid pb-5 mobile-pb">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold"><i className="bi bi-file-earmark-plus-fill text-primary"></i> เพิ่มลูกค้าใหม่ / ออกกรมธรรม์ใหม่ (Single Page Form)</h2>
      </div>

      <div className="card border-0 mb-4 overflow-hidden position-relative" style={{ 
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
        borderRadius: '20px'
      }}>
        {/* Decorative glowing orb */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%', zIndex: 0
        }}></div>
        
        <div className="card-body text-center py-5 position-relative" style={{ zIndex: 1 }}>
          <h3 className="fw-bold mb-3" style={{ color: '#00ff88', textShadow: '0 0 15px rgba(0,255,136,0.4)', letterSpacing: '0.5px' }}>
            <i className="bi bi-magic me-2"></i> สแกนรูปด้วย AI แม่นยำ 100%
          </h3>
          
          <div className="mb-4 d-flex justify-content-center align-items-center gap-2">
            <span className="badge rounded-pill px-3 py-2 shadow-sm" style={{ 
              background: 'linear-gradient(45deg, #FFD700, #FDB931)', 
              color: '#333',
              border: '1px solid rgba(255,215,0,0.5)'
            }}>
              <i className="bi bi-cpu-fill me-1"></i> ขับเคลื่อนโดย Gemini AI
            </span>
            <button className="btn btn-sm btn-outline-light rounded-pill px-3 opacity-75 hover-opacity-100" onClick={() => {
              const key = window.prompt('กรุณาใส่ Gemini API Key ใหม่ (ขอรับฟรีได้ที่ aistudio.google.com):', localStorage.getItem('geminiApiKey') || '');
              if(key) localStorage.setItem('geminiApiKey', key);
            }}>
              <i className="bi bi-gear-fill me-1"></i> ตั้งค่า API Key
            </button>
          </div>

          {ocrLoading ? (
            <div className="d-flex flex-column align-items-center justify-content-center fw-bold mt-4" style={{ color: '#00ff88' }}>
              <div className="spinner-border mb-3" role="status" style={{ width: '3rem', height: '3rem', borderWidth: '0.25em' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="fs-5 tracking-wide">กำลังประมวลผลด้วย Gemini AI... (10-20 วินาที)</span>
            </div>
          ) : (
            <div className="mt-4 d-flex flex-wrap justify-content-center gap-3">
              <Button className="btn btn-lg fw-bold px-4 py-3 rounded-pill shadow-lg" style={{ 
                background: 'linear-gradient(45deg, #00b09b, #96c93d)', 
                color: '#fff', 
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 176, 155, 0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)'; }}
              onClick={() => cameraScanInputRef.current && cameraScanInputRef.current.click()}
              >
                <i className="bi bi-camera-fill me-2 fs-4 align-middle"></i> 
                <span className="align-middle">เปิดกล้องถ่ายรูปสแกน</span>
              </Button>

              <Button className="btn btn-lg fw-bold px-4 py-3 rounded-pill shadow-lg btn-outline-light" style={{ 
                border: '2px solid rgba(255,255,255,0.4)',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'transparent'; }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <i className="bi bi-folder-fill me-2 fs-4 align-middle"></i> 
                <span className="align-middle">เลือกรูปภาพ/ไฟล์ในเครื่อง</span>
              </Button>

              <input type="file" ref={cameraScanInputRef} accept="image/*" capture="environment" className="d-none" onChange={handleAIExtract} />
              <input type="file" ref={fileInputRef} accept="image/*" className="d-none" multiple onChange={handleAIExtract} />
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success shadow-sm border-0 mb-4 p-4">
          <h4 className="alert-heading fw-bold"><i className="bi bi-check-circle-fill me-2"></i>{successMsg.text}</h4>
          <hr />
          <Row>
            <Col md={4}><p className="mb-1"><strong>ลูกค้า:</strong> {successMsg.customerName}</p></Col>
            <Col md={4}><p className="mb-1"><strong>เลขกรมธรรม์:</strong> {successMsg.policyNo}</p></Col>
            <Col md={4}><p className="mb-1"><strong>สถานะงาน:</strong> <Badge bg="success">{successMsg.status}</Badge></p></Col>
            <Col md={4}><p className="mb-1"><strong>บริษัทประกัน:</strong> {successMsg.company}</p></Col>
            <Col md={4}><p className="mb-1"><strong>ประเภท:</strong> {successMsg.type}</p></Col>
            <Col md={4}><p className="mb-0 text-danger fw-bold"><strong>คอมมิชชัน:</strong> ฿{successMsg.commission}</p></Col>
          </Row>
          <div className="mt-3">
            <Button variant="outline-success" className="me-2 fw-bold" onClick={() => window.location.reload()}>+ ออกกรมธรรม์ใหม่</Button>
          </div>
        </div>
      )}

      {aiWarning && (
        <div className="alert alert-warning shadow-sm border-0 mb-4 p-4 rounded-3" style={{ borderLeft: '5px solid #ffc107', backgroundColor: '#fff9e6' }}>
          <h5 className="alert-heading fw-bold text-warning-emphasis mb-2">
            <i className="bi bi-exclamation-triangle-fill me-2"></i> คำแนะนำ / ข้อแนะนำจาก AI
          </h5>
          <p className="mb-0 fs-6 text-dark" style={{ lineHeight: '1.6' }}>{aiWarning}</p>
        </div>
      )}

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col lg={imageFiles.length > 0 ? 8 : 12} style={{ transition: 'all 0.3s ease' }}>
            <Accordion defaultActiveKey={['0', '1', '2', '3', '4', '5']} alwaysOpen>
          
          {/* Section 1: Customer */}
          <Accordion.Item eventKey="0" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-person-lines-fill me-2"></i>ส่วนที่ 1 : ข้อมูลลูกค้า</h5></Accordion.Header>
            <Accordion.Body>
              <div className="mb-4 bg-light p-3 rounded border">
                <Form.Label className="fw-bold text-primary"><i className="bi bi-search"></i> ค้นหาและดึงข้อมูลลูกค้าเก่าอัตโนมัติ (พิมพ์ชื่อ, เบอร์โทร หรือทะเบียนรถ)</Form.Label>
                <AsyncSelect 
                  cacheOptions 
                  loadOptions={loadCustomerOptions} 
                  defaultOptions={false}
                  onChange={handleCustomerSelect}
                  inputValue={customerSearchText}
                  onInputChange={(val, { action }) => {
                    if (action === 'input-change') {
                      setCustomerSearchText(val);
                    } else if (action === 'set-value') {
                      setCustomerSearchText('');
                    }
                  }}
                  onBlur={() => {
                    // Auto-fill field if not found
                    if (customerSearchText && !customer.id) {
                      const digits = customerSearchText.replace(/\D/g, '');
                      if (digits.length >= 9) {
                        setCustomer(prev => ({...prev, phone: formatPhone(digits)}));
                      } else if (!/^\d+$/.test(customerSearchText)) {
                        setCustomer(prev => ({...prev, first_name: customerSearchText}));
                      }
                    }
                  }}
                  placeholder="พิมพ์เบอร์โทร, ชื่อ, นามสกุล, เลขบัตรประชาชน หรือทะเบียนรถ..."
                  noOptionsMessage={() => "ไม่พบข้อมูลลูกค้า (หรือพิมพ์อย่างน้อย 2 ตัวอักษร)"}
                  loadingMessage={() => "กำลังค้นหา..."}
                  isClearable
                />
              </div>
              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลส่วนตัว</h6>
              <Row className="g-3 mb-4">
                <Col md={2}>
                  <Form.Label>คำนำหน้า</Form.Label>
                  <Form.Select value={customer.prefix} onChange={e => setCustomer({...customer, prefix: e.target.value})}>
                    <option>นาย</option><option>นาง</option><option>นางสาว</option><option>บริษัท</option><option>หจก.</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>ชื่อ <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" value={customer.first_name} onChange={e => setCustomer({...customer, first_name: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>นามสกุล <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" value={customer.last_name} onChange={e => setCustomer({...customer, last_name: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>วันเดือนปีเกิด</Form.Label>
                  <Form.Control type="date" value={customer.dob} onChange={handleDobChange} />
                </Col>
                <Col md={1}>
                  <Form.Label>อายุ</Form.Label>
                  <Form.Control type="number" value={customer.age || ''} onChange={e => setCustomer({...customer, age: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>เลขบัตรประชาชน</Form.Label>
                  <Form.Control type="text" inputMode="numeric" value={formatIdCard(customer.id_card_no)} onChange={e => setCustomer({...customer, id_card_no: e.target.value.replace(/\D/g, '')})} maxLength={17} />
                </Col>
                <Col md={3}>
                  <Form.Label>เบอร์โทรศัพท์ <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" inputMode="numeric" value={customer.phone} onChange={e => setCustomer({...customer, phone: formatPhone(e.target.value)})} maxLength={12} />
                </Col>
                <Col md={3}>
                  <Form.Label>เบอร์สำรอง</Form.Label>
                  <Form.Control type="text" inputMode="numeric" value={customer.alt_phone} onChange={e => setCustomer({...customer, alt_phone: formatPhone(e.target.value)})} maxLength={12} />
                </Col>
                <Col md={3}>
                  <Form.Label>LINE ID</Form.Label>
                  <Form.Control type="text" value={customer.line_id} onChange={e => setCustomer({...customer, line_id: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>Facebook</Form.Label>
                  <Form.Control type="text" value={customer.facebook} onChange={e => setCustomer({...customer, facebook: e.target.value})} />
                </Col>
              </Row>

              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลที่อยู่</h6>
              <Row className="g-3 mb-4">
                <ThaiAddressSelect 
                  province={customer.province}
                  district={customer.district}
                  sub_district={customer.sub_district}
                  zipcode={customer.zipcode}
                  onChange={(addr) => setCustomer(prev => ({ ...prev, ...addr }))}
                />
                <Col md={2}>
                  <Form.Label>บ้านเลขที่</Form.Label>
                  <Form.Control type="text" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
                </Col>
                <Col md={2}>
                  <Form.Label>หมู่</Form.Label>
                  <Form.Control type="text" value={customer.moo} onChange={e => setCustomer({...customer, moo: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>ซอย</Form.Label>
                  <Form.Control type="text" value={customer.soi} onChange={e => setCustomer({...customer, soi: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>ถนน</Form.Label>
                  <Form.Control type="text" value={customer.road} onChange={e => setCustomer({...customer, road: e.target.value})} />
                </Col>
              </Row>

              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลเพิ่มเติม</h6>
              <Row className="g-3">
                <Col md={12}>
                  <Form.Label>หมายเหตุลูกค้า</Form.Label>
                  <Form.Control as="textarea" rows={2} value={customer.note} onChange={e => setCustomer({...customer, note: e.target.value})} />
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* No manual Type Selection needed, it's combined below */}

          {/* Section 2: Vehicle (Conditional) */}
          {policy.category === 'motor' && (
            <Accordion.Item eventKey="1" className="mb-3 border-0 shadow-sm rounded">
              <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-car-front-fill me-2"></i>ส่วนที่ 2 : ข้อมูลรถยนต์</h5></Accordion.Header>
              <Accordion.Body>
                <div className="mb-4 bg-light p-3 rounded border">
                  <Form.Label className="fw-bold text-primary"><i className="bi bi-search"></i> ค้นหาและดึงข้อมูลรถยนต์เก่าอัตโนมัติ (พิมพ์เลขทะเบียน)</Form.Label>
                  <AsyncSelect 
                    cacheOptions 
                    loadOptions={loadVehicleOptions} 
                    defaultOptions={false}
                    onChange={handleVehicleSelect}
                    inputValue={vehicleSearchText}
                    onInputChange={(val, { action }) => {
                      if (action === 'input-change') {
                        setVehicleSearchText(val);
                      } else if (action === 'set-value') {
                        setVehicleSearchText('');
                      }
                    }}
                    onBlur={() => {
                      if (vehicleSearchText && !vehicle.id) {
                        setVehicle(prev => ({...prev, plate_no: vehicleSearchText}));
                      }
                    }}
                    placeholder="พิมพ์เลขทะเบียนรถ..."
                    noOptionsMessage={() => "ไม่พบข้อมูลรถ (หรือพิมพ์อย่างน้อย 2 ตัวอักษร)"}
                    loadingMessage={() => "กำลังค้นหา..."}
                    isClearable
                  />
                </div>
                <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลรถ และ ทะเบียน</h6>
                <Row className="g-3 mb-4">
                  <Col md={2}>
                    <Form.Label>ประเภทรถ</Form.Label>
                    <Select options={vehicleTypes} value={vehicleTypes.find(t => t.value === vehicle.vehicle_type)} onChange={opt => setVehicle({...vehicle, vehicle_type: opt?.value || ''})} isClearable />
                  </Col>
                  <Col md={3}>
                    <Form.Label>ยี่ห้อรถ (Brand)</Form.Label>
                    <CreatableSelect
                      options={carBrands.map(b => ({ value: b, label: b }))}
                      value={vehicle.brand ? { value: vehicle.brand, label: vehicle.brand } : null}
                      onChange={opt => setVehicle({...vehicle, brand: opt?.value || '', model: ''})}
                      isClearable
                      placeholder="เลือก หรือ พิมพ์ยี่ห้อ..."
                      formatCreateLabel={(inputValue) => `ใช้ยี่ห้อ: "${inputValue}"`}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>รุ่นรถ (Model)</Form.Label>
                    <CreatableSelect
                      options={(carModels[vehicle.brand] || []).map(m => ({ value: m, label: m }))}
                      value={vehicle.model ? { value: vehicle.model, label: vehicle.model } : null}
                      onChange={opt => setVehicle({...vehicle, model: opt?.value || ''})}
                      isClearable
                      placeholder="เลือก หรือ พิมพ์รุ่น..."
                      formatCreateLabel={(inputValue) => `ใช้รุ่น: "${inputValue}"`}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>ปีรถ</Form.Label>
                    <Form.Select value={vehicle.year} onChange={e => setVehicle({...vehicle, year: e.target.value})}>
                      <option value="">ปี...</option>
                      {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Form.Label>สีรถ</Form.Label>
                    <CreatableSelect
                      options={['ขาว', 'ดำ', 'เทา', 'บรอนซ์เงิน', 'บรอนซ์ทอง', 'แดง', 'น้ำเงิน', 'ฟ้า', 'น้ำตาล', 'เขียว', 'เหลือง', 'ส้ม', 'ชมพู'].map(c => ({ value: c, label: c }))}
                      value={vehicle.color ? { value: vehicle.color, label: vehicle.color } : null}
                      onChange={opt => setVehicle({...vehicle, color: opt?.value || ''})}
                      isClearable
                      placeholder="เลือก หรือ พิมพ์สี..."
                      formatCreateLabel={(inputValue) => `ใช้สี: "${inputValue}"`}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>เลขทะเบียน <span className="text-danger">*</span></Form.Label>
                    <Form.Control type="text" value={vehicle.plate_no} onChange={e => setVehicle({...vehicle, plate_no: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>จังหวัดทะเบียนรถ</Form.Label>
                    <Select options={provinces} value={provinces.find(p => p.value === vehicle.plate_province)} onChange={opt => setVehicle({...vehicle, plate_province: opt?.value || ''})} isClearable />
                  </Col>
                </Row>

                <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลทางเทคนิค</h6>
                <Row className="g-3 mb-4">
                  <Col md={4}>
                    <Form.Label>
                      เลขตัวถัง (VIN / Chassis No)
                      {vehicle.vin && vehicle.vin.replace(/\s+/g, '').length !== 17 && (
                        <span className="text-warning ms-2 fw-bold animate-pulse" style={{ fontSize: '0.8rem' }}>
                          <i className="bi bi-exclamation-triangle-fill me-1"></i>
                          ควรมี 17 หลัก (ระบุ {vehicle.vin.replace(/\s+/g, '').length} หลัก)
                        </span>
                      )}
                    </Form.Label>
                    <Form.Control 
                      type="text" 
                      className={`text-uppercase ${vehicle.vin && vehicle.vin.replace(/\s+/g, '').length !== 17 ? 'border-warning shadow-sm bg-warning-subtle' : ''}`}
                      style={{ transition: 'all 0.3s' }}
                      value={vehicle.vin} 
                      onChange={e => setVehicle({...vehicle, vin: e.target.value.toUpperCase()})} 
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label>เลขเครื่องยนต์</Form.Label>
                    <Form.Control type="text" value={vehicle.engine_no} onChange={e => setVehicle({...vehicle, engine_no: e.target.value})} />
                  </Col>
                </Row>

                <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลภาษี และ พ.ร.บ.</h6>
                <Row className="g-3">
                  <Col md={2}>
                    <Form.Label>ทุนประกันรถ</Form.Label>
                    <Form.Control type="number" step="0.01" value={vehicle.sum_insured} onChange={e => setVehicle({...vehicle, sum_insured: e.target.value})} />
                  </Col>
                  <Col md={2}>
                    <Form.Label>วันจดทะเบียนรถ</Form.Label>
                    <Form.Control type="date" value={vehicle.registration_date || ''} onChange={e => setVehicle({...vehicle, registration_date: normalizeDate(e.target.value)})} />
                  </Col>
                  <Col md={2}>
                    <Form.Label>วันภาษีรถหมดอายุ</Form.Label>
                    <Form.Control type="date" value={vehicle.tax_expiry} onChange={e => setVehicle({...vehicle, tax_expiry: normalizeDate(e.target.value)})} />
                  </Col>
                  <Col md={3}>
                    <div className="mb-1"><Form.Label className="mb-0">วันเริ่มคุ้มครอง พ.ร.บ.</Form.Label></div>
                    <Form.Control type="date" value={policy.prb_start_date || ''} onChange={e => setPolicy({...policy, prb_start_date: normalizeDate(e.target.value)})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>วันสิ้นสุดคุ้มครอง พ.ร.บ.</Form.Label>
                    <Form.Control type="date" value={policy.prb_expiry_date} onChange={e => setPolicy({...policy, prb_expiry_date: normalizeDate(e.target.value)})} />
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {/* Section 3: Policy */}
          <Accordion.Item eventKey="2" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-shield-check me-2"></i>ส่วนที่ 3 : ข้อมูลกรมธรรม์</h5></Accordion.Header>
            <Accordion.Body>
              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">รายละเอียดกรมธรรม์</h6>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Form.Label>บริษัทประกัน <span className="text-danger">*</span></Form.Label>
                  <CreatableSelect 
                    options={companies} 
                    value={policy.company ? { value: policy.company, label: policy.company } : null} 
                    onChange={opt => setPolicy({...policy, company: opt?.value || ''})} 
                    isClearable 
                    placeholder="เลือก หรือ พิมพ์ชื่อบริษัท..."
                    formatCreateLabel={(inputValue) => `ใช้ชื่อ: "${inputValue}"`}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>ประเภทประกันภัย <span className="text-danger">*</span></Form.Label>
                  <Select 
                    options={[
                      { label: 'ประกันภัยรถยนต์ (Motor)', options: policyTypes },
                      { label: 'ประกันภัยอื่นๆ (Non-Motor)', options: nonMotorTypes }
                    ]} 
                    value={
                      policy.category === 'motor' 
                        ? policyTypes.find(t => t.value === policy.type)
                        : nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))
                    } 
                    onChange={opt => {
                      const label = opt ? opt.label : '';
                      const isMotor = opt && typeof opt.value === 'string';
                      setPolicy({
                        ...policy, 
                        non_motor_type_id: isMotor ? '' : (opt?.value || ''),
                        type: label,
                        type_name: label,
                        category: isMotor ? 'motor' : 'non-motor'
                      });
                    }} 
                    isClearable 
                    placeholder="เลือกประเภทประกันภัย..."
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>เลขกรมธรรม์</Form.Label>
                  <Form.Control type="text" value={policy.policy_no} onChange={e => setPolicy({...policy, policy_no: e.target.value})} placeholder="พิมพ์เลขกรมธรรม์ หรือ เว้นว่างไว้เพื่อรัน Auto" />
                </Col>

                {policy.category === 'non-motor' && (
                  <>
                    <Col md={6}>
                      <Form.Label>ชื่อผู้เอาประกัน (ถ้าไม่ระบุใช้ชื่อลูกค้า)</Form.Label>
                      <Form.Control type="text" value={policy.insured_name} onChange={e => setPolicy({...policy, insured_name: e.target.value})} />
                    </Col>
                    <Col md={6}>
                      <Form.Label>ทุนประกันรวม</Form.Label>
                      <Form.Control type="number" step="0.01" value={policy.sum_insured} onChange={e => setPolicy({...policy, sum_insured: e.target.value})} />
                    </Col>
                  </>
                )}

                <Col md={6}>
                  <div className="mb-1"><Form.Label className="mb-0">วันเริ่มคุ้มครอง</Form.Label></div>
                  <Form.Control type="date" value={policy.start_date} onChange={e => setPolicy({...policy, start_date: normalizeDate(e.target.value)})} />
                </Col>
                <Col md={6}>
                  <div className="mb-1"><Form.Label className="mb-0">วันสิ้นสุดคุ้มครอง</Form.Label></div>
                  <Form.Control type="date" value={policy.expiry_date} onChange={e => setPolicy({...policy, expiry_date: normalizeDate(e.target.value)})} />
                </Col>
              </Row>

              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h6 className="text-primary fw-bold mb-0">ข้อมูลเบี้ยประกันและการคำนวณ</h6>
              </div>
              
              <Row className="g-3">
                <Col md={3}>
                  <Form.Label>เบี้ยสุทธิ <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="number" inputMode="decimal" step="0.01" value={policy.net_premium} onChange={e => handlePremiumChange('net_premium', e.target.value)} />
                </Col>
                <Col md={2}>
                  <Form.Label>อากร</Form.Label>
                  <Form.Control type="number" step="0.01" value={policy.stamp_duty} onChange={e => handlePremiumChange('stamp_duty', e.target.value)} />
                </Col>
                <Col md={3}>
                  <Form.Label>VAT</Form.Label>
                  <Form.Control type="number" step="0.01" value={policy.vat} onChange={e => handlePremiumChange('vat', e.target.value)} />
                </Col>
                <Col md={4}>
                  <Form.Label className="fw-bold text-success">เบี้ยรวม (Total)</Form.Label>
                  <Form.Control type="number" step="0.01" className="bg-light fw-bold text-success" value={policy.total_premium} onChange={e => handlePremiumChange('total_premium', e.target.value)} />
                </Col>

                <Col md={12} className="mt-4"><hr/></Col>

                <Col md={3}>
                  <Form.Label>เปอร์เซ็นต์คอมมิชชัน (%)</Form.Label>
                  <Form.Control type="number" step="0.01" value={policy.commission_percent || ''} onChange={e => setPolicy({...policy, commission_percent: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label className="fw-bold text-danger">ค่าคอมมิชชัน (บาท)</Form.Label>
                  <Form.Control type="number" step="0.01" className="bg-light fw-bold text-danger" value={policy.commission_baht || ''} onChange={e => setPolicy({...policy, commission_baht: e.target.value})} />
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Section 4: Payment */}
          <Accordion.Item eventKey="3" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-wallet2 me-2"></i>ส่วนที่ 4 : การชำระเงิน</h5></Accordion.Header>
            <Accordion.Body>
              <div className="mb-4 d-flex gap-4 p-3 bg-light rounded border">
                <Form.Check 
                  type="radio" 
                  id="pay-cash" 
                  label={<span className="fw-bold fs-5 text-success"><i className="bi bi-cash-coin me-2"></i>เงินสด</span>}
                  name="paymentMethod" 
                  checked={payment.payment_method === 'เงินสด'} 
                  onChange={() => setPayment({...payment, payment_method: 'เงินสด', installments: 1})} 
                />
                <Form.Check 
                  type="radio" 
                  id="pay-installment" 
                  label={<span className="fw-bold fs-5 text-primary"><i className="bi bi-credit-card me-2"></i>เงินผ่อน</span>}
                  name="paymentMethod" 
                  checked={payment.payment_method === 'เงินผ่อน'} 
                  onChange={() => setPayment({...payment, payment_method: 'เงินผ่อน', installments: 3})} 
                />
              </div>

              {payment.payment_method === 'เงินสด' && (
                <div className="p-4 border rounded bg-white shadow-sm mb-3">
                  <h6 className="text-success fw-bold mb-3 border-bottom pb-2">รายละเอียดชำระเงินสด</h6>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Label>ยอดชำระทั้งหมด</Form.Label>
                      <Form.Control type="text" readOnly className="bg-light fw-bold text-success fs-5" value={`฿${(policy.total_premium || 0).toLocaleString()}`} />
                    </Col>
                    <Col md={4}>
                      <Form.Label>วันที่ชำระเงิน</Form.Label>
                      <Form.Control type="date" value={payment.pay_date} onChange={e => setPayment({...payment, pay_date: normalizeDate(e.target.value)})} />
                    </Col>
                    <Col md={4}>
                      <Form.Label>สถานะการชำระเงิน</Form.Label>
                      <Form.Select value={payment.status} onChange={e => setPayment({...payment, status: e.target.value})}>
                        <option value="รอชำระ">รอชำระ</option>
                        <option value="ชำระครบแล้ว">ชำระครบแล้ว</option>
                      </Form.Select>
                    </Col>
                  </Row>
                </div>
              )}

              {payment.payment_method === 'เงินผ่อน' && (
                <div className="p-4 border border-primary rounded bg-white shadow-sm mb-3">
                  <h6 className="text-primary fw-bold mb-3 border-bottom pb-2">รายละเอียดเงินผ่อน</h6>
                  <Row className="g-3 mb-4">
                    <Col md={4}>
                      <Form.Label>จำนวนงวดผ่อน <span className="text-danger">*</span></Form.Label>
                      <Form.Select value={payment.installments} onChange={e => setPayment({...payment, installments: parseInt(e.target.value)})}>
                        {[2,3,4,5,6,7,8,9,10].map(n => (
                          <option key={n} value={n}>{n} งวด</option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <Form.Label>ยอดชำระทั้งหมด (เบี้ยรวม)</Form.Label>
                      <Form.Control type="text" readOnly className="bg-light fw-bold text-primary" value={`฿${(policy.total_premium || 0).toLocaleString()}`} />
                    </Col>
                    <Col md={4}>
                      <Form.Label>วันที่เริ่มผ่อนงวดแรก</Form.Label>
                      <Form.Control type="date" value={payment.pay_date} onChange={e => setPayment({...payment, pay_date: normalizeDate(e.target.value)})} />
                    </Col>
                  </Row>

                  {installmentSchedule.length > 0 && (
                    <div className="mt-4">
                      <h6 className="fw-bold text-secondary mb-3"><i className="bi bi-table me-2"></i>ตารางงวดชำระอัตโนมัติ (งวดแรก 37%)</h6>
                      <div className="table-responsive">
                        <table className="table table-bordered table-hover align-middle text-center mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>งวดที่</th>
                              <th>วันที่ครบกำหนด</th>
                              <th className="text-end">จำนวนเงิน</th>
                              <th>สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {installmentSchedule.map((inst) => (
                              <tr key={inst.installment_no}>
                                <td><span className="badge bg-primary rounded-circle p-2">{inst.installment_no}</span></td>
                                <td><span className="fw-bold text-danger">{inst.due_date}</span></td>
                                <td className="text-end fw-bold">฿{inst.amount.toLocaleString()}</td>
                                <td><span className="badge bg-warning text-dark">{inst.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          {/* Section 5: Follow Up */}
          <Accordion.Item eventKey="4" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-calendar-check me-2"></i>ส่วนที่ 5 : งานติดตาม</h5></Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>สถานะงาน (Policy Status) <span className="text-danger">*</span></Form.Label>
                  <Select options={jobStatuses} value={jobStatuses.find(j => j.value === followUp.status)} onChange={opt => setFollowUp({...followUp, status: opt?.value || 'รอดำเนินการ'})} />
                </Col>
                <Col md={4}>
                  <Form.Label>วันที่ติดตามครั้งถัดไป</Form.Label>
                  <Form.Control type="date" value={followUp.next_date} onChange={e => setFollowUp({...followUp, next_date: normalizeDate(e.target.value)})} />
                </Col>
                <Col md={4}>
                  <Form.Label>ผู้ดูแลลูกค้า (Sales)</Form.Label>
                  <Form.Control type="text" value="(อ้างอิงตามแอคเคาท์ปัจจุบัน)" disabled className="bg-light" />
                </Col>
                <Col md={12}>
                  <Form.Label>หมายเหตุติดตามงาน</Form.Label>
                  <Form.Control as="textarea" rows={2} value={followUp.note} onChange={e => setFollowUp({...followUp, note: e.target.value})} />
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Section 6: Attachments */}
          <Accordion.Item eventKey="5" className="mb-4 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-paperclip me-2"></i>ส่วนที่ 6 : เอกสารแนบ</h5></Accordion.Header>
            <Accordion.Body>
              <div {...getRootProps()} className={`p-4 mb-3 text-center border rounded-3 ${isDragActive ? 'bg-primary text-white border-primary' : 'bg-light border-dashed'}`} style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: 'pointer' }}>
                <input {...getInputProps()} />
                <i className="bi bi-cloud-arrow-up-fill" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-2">แตะเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวาง</h5>
                <p className="mb-0 opacity-75 small">รองรับไฟล์: PDF, JPG, PNG</p>
              </div>
              <div className="text-center mb-4">
                <Button variant="outline-primary" className="fw-bold px-4 rounded-pill" onClick={() => cameraInputRef.current && cameraInputRef.current.click()}>
                  <i className="bi bi-camera-fill me-2"></i> เปิดกล้องถ่ายรูป
                </Button>
                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="d-none" onChange={(e) => {
                  const selected = Array.from(e.target.files);
                  if(selected.length > 0) onDrop(selected);
                }} />
              </div>

              {files.length > 0 && (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ไฟล์</th>
                        <th>ประเภทเอกสาร</th>
                        <th>หมายเหตุ</th>
                        <th className="text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((f, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="d-flex align-items-center">
                              {f.file.type.includes('image') ? (
                                <img 
                                  src={f.preview} 
                                  alt="preview" 
                                  title="คลิกเพื่อดูรูปขนาดใหญ่"
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px', cursor: 'pointer' }} 
                                  onClick={() => setPreviewModalUrl(f.preview)}
                                />
                              ) : (
                                <i className="bi bi-file-earmark-pdf-fill text-danger me-2" style={{ fontSize: '1.5rem' }}></i>
                              )}
                              <span className="text-truncate" style={{ maxWidth: '200px' }} title={f.file.name}>{f.file.name}</span>
                            </div>
                          </td>
                          <td>
                            <Form.Select size="sm" value={f.type_id} onChange={e => updateFileData(idx, 'type_id', e.target.value)}>
                              {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control size="sm" type="text" placeholder="ระบุเพิ่มเติม..." value={f.note} onChange={e => updateFileData(idx, 'note', e.target.value)} />
                          </td>
                          <td className="text-center">
                            <Button variant="outline-danger" size="sm" onClick={() => removeFile(idx)}><i className="bi bi-trash"></i></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        {/* Action Buttons */}
        <div className="card shadow-sm border-0 sticky-bottom mb-2" style={{ bottom: '0', zIndex: 1030 }}>
          <div className="card-body bg-white rounded-3 d-flex flex-column flex-lg-row justify-content-between align-items-center p-2 p-lg-3 gap-2">
            <div className="d-none d-lg-block">
              <Button variant="outline-secondary" className="me-2 fw-bold" onClick={() => alert('ฟังก์ชันอยู่ระหว่างพัฒนา')}><i className="bi bi-file-earmark-text"></i> พิมพ์ใบเสนอราคา</Button>
              <Button variant="outline-secondary" className="me-2 fw-bold" onClick={() => alert('ฟังก์ชันอยู่ระหว่างพัฒนา')}><i className="bi bi-receipt"></i> พิมพ์ใบแจ้งชำระ</Button>
            </div>
            <div className="d-flex w-100 w-lg-auto gap-2">
              <Button variant="outline-primary" className="fw-bold w-100 w-lg-auto" onClick={() => setFollowUp({...followUp, status: 'แบบร่าง'})}>
                <i className="bi bi-save"></i><span className="d-none d-sm-inline"> บันทึกร่าง</span>
              </Button>
              <Button variant="success" size="lg" type="submit" disabled={loading} className="fw-bold w-100 w-lg-auto shadow-sm" style={{flex: 2}}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1" /> กำลังบันทึก...</> : <><i className="bi bi-check-circle-fill me-1"></i> บันทึกข้อมูล</>}
              </Button>
            </div>
          </div>
        </div>
          </Col>
          
          {imageFiles.length > 0 && (
            <Col lg={4} className="d-none d-lg-block">
              <div className="sticky-top" style={{ top: '20px', zIndex: 1000 }}>
                <Card className="border-0 shadow rounded-3">
                  <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-2">
                    <h6 className="mb-0 fw-bold"><i className="bi bi-eye-fill me-1"></i> พรีวิวเอกสารแนบ</h6>
                    <div className="d-flex align-items-center gap-2">
                      {imageFiles.length > 1 && (
                        <div className="btn-group btn-group-sm">
                          <Button variant="light" size="sm" className="py-0 px-2" disabled={validActiveIdx === 0} onClick={() => {
                            setActivePreviewIdx(prev => Math.max(0, prev - 1));
                            setZoomLevel(1);
                            setRotation(0);
                          }}><i className="bi bi-chevron-left"></i></Button>
                          <Button variant="light" size="sm" className="py-0 px-2" disabled={validActiveIdx === imageFiles.length - 1} onClick={() => {
                            setActivePreviewIdx(prev => Math.min(imageFiles.length - 1, prev + 1));
                            setZoomLevel(1);
                            setRotation(0);
                          }}><i className="bi bi-chevron-right"></i></Button>
                        </div>
                      )}
                      <span className="badge bg-light text-primary">
                        {validActiveIdx + 1} / {imageFiles.length}
                      </span>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-2 bg-dark text-center rounded-bottom overflow-hidden position-relative d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '350px' }}>
                    {imageFiles[validActiveIdx] && (
                      <div className="overflow-auto w-100 d-flex align-items-center justify-content-center" style={{ maxHeight: '480px', minHeight: '300px' }}>
                        <img 
                          src={imageFiles[validActiveIdx].preview} 
                          alt="Document Preview" 
                          style={{
                            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                            transition: 'transform 0.2s ease-in-out',
                            maxWidth: '100%',
                            maxHeight: '400px',
                            objectFit: 'contain'
                          }} 
                        />
                      </div>
                    )}
                  </Card.Body>
                  <Card.Footer className="bg-light d-flex justify-content-between align-items-center py-2">
                    <span className="small text-muted text-truncate" style={{ maxWidth: '150px' }}>
                      {imageFiles[validActiveIdx]?.file.name}
                    </span>
                    <div className="btn-group">
                      <Button variant="danger" size="sm" title="ลบรูปภาพนี้" onClick={() => {
                        const actualIdx = files.findIndex(f => f === imageFiles[validActiveIdx]);
                        if (actualIdx !== -1) {
                          removeFile(actualIdx);
                        }
                      }}>
                        <i className="bi bi-trash"></i> ลบรูป
                      </Button>
                      <Button variant="outline-secondary" size="sm" title="ซูมเข้า" onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}>
                        <i className="bi bi-zoom-in"></i>
                      </Button>
                      <Button variant="outline-secondary" size="sm" title="ซูมออก" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}>
                        <i className="bi bi-zoom-out"></i>
                      </Button>
                      <Button variant="outline-secondary" size="sm" title="หมุนรูป" onClick={() => setRotation(r => (r + 90) % 360)}>
                        <i className="bi bi-arrow-clockwise"></i>
                      </Button>
                      <Button variant="outline-danger" size="sm" title="รีเซ็ต" onClick={() => { setZoomLevel(1); setRotation(0); }}>
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </div>
            </Col>
          )}
        </Row>
      </Form>

      {/* Floating Preview Button for Mobile/Tablet */}
      {imageFiles.length > 0 && (
        <div className="d-lg-none position-fixed" style={{ bottom: '70px', right: '15px', zIndex: 1040 }}>
          <Button 
            variant="success" 
            className="rounded-pill shadow-lg d-flex align-items-center gap-2 px-3 py-2 fw-bold" 
            onClick={() => {
              setPreviewModalUrl(imageFiles[validActiveIdx]?.preview);
              setZoomLevel(1);
              setRotation(0);
            }}
            style={{ 
              border: '2px solid #fff',
              background: 'linear-gradient(45deg, #00b09b, #96c93d)',
            }}
          >
            <i className="bi bi-eye-fill"></i> ดูเอกสารแนบ ({validActiveIdx + 1}/{imageFiles.length})
          </Button>
        </div>
      )}

      {/* Modal Preview for images */}
      <Modal show={previewModalUrl !== null} onHide={() => setPreviewModalUrl(null)} size="lg" centered>
        <Modal.Header closeButton className="py-2">
          <Modal.Title className="fs-6 fw-bold"><i className="bi bi-image me-1"></i> พรีวิวเอกสารแนบ</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 bg-dark text-center overflow-auto" style={{ maxHeight: '80vh' }}>
          {previewModalUrl && (
            <div className="p-2 d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
              <img 
                src={previewModalUrl} 
                alt="Preview Modal" 
                style={{ 
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain' 
                }} 
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light py-1 d-flex justify-content-between align-items-center">
          {imageFiles.length > 1 && (
            <div className="btn-group btn-group-sm">
              <Button variant="outline-secondary" size="sm" disabled={validActiveIdx === 0} onClick={() => {
                const newIdx = Math.max(0, validActiveIdx - 1);
                setActivePreviewIdx(newIdx);
                setPreviewModalUrl(imageFiles[newIdx]?.preview);
                setZoomLevel(1);
                setRotation(0);
              }}><i className="bi bi-chevron-left"></i></Button>
              <Button variant="outline-secondary" size="sm" disabled={validActiveIdx === imageFiles.length - 1} onClick={() => {
                const newIdx = Math.min(imageFiles.length - 1, validActiveIdx + 1);
                setActivePreviewIdx(newIdx);
                setPreviewModalUrl(imageFiles[newIdx]?.preview);
                setZoomLevel(1);
                setRotation(0);
              }}><i className="bi bi-chevron-right"></i></Button>
            </div>
          )}
          <div className="btn-group btn-group-sm ms-auto">
            <Button variant="danger" size="sm" title="ลบรูปภาพนี้" onClick={() => {
              const actualIdx = files.findIndex(f => f === imageFiles[validActiveIdx]);
              if (actualIdx !== -1) {
                removeFile(actualIdx);
                if (imageFiles.length <= 1) {
                  setPreviewModalUrl(null);
                } else {
                  const newIdx = Math.max(0, validActiveIdx - 1);
                  const nextImages = imageFiles.filter((_, i) => i !== validActiveIdx);
                  if (nextImages.length > 0) {
                    const nextActiveIdx = Math.min(nextImages.length - 1, newIdx);
                    setActivePreviewIdx(nextActiveIdx);
                    setPreviewModalUrl(nextImages[nextActiveIdx]?.preview);
                  } else {
                    setPreviewModalUrl(null);
                  }
                }
              }
            }}>
              <i className="bi bi-trash"></i> ลบรูป
            </Button>
            <Button variant="outline-secondary" size="sm" title="ซูมเข้า" onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}>
              <i className="bi bi-zoom-in"></i>
            </Button>
            <Button variant="outline-secondary" size="sm" title="ซูมออก" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}>
              <i className="bi bi-zoom-out"></i>
            </Button>
            <Button variant="outline-secondary" size="sm" title="หมุนรูป" onClick={() => setRotation(r => (r + 90) % 360)}>
              <i className="bi bi-arrow-clockwise"></i>
            </Button>
            <Button variant="outline-danger" size="sm" title="รีเซ็ต" onClick={() => { setZoomLevel(1); setRotation(0); }}>
              <i className="bi bi-arrow-counterclockwise"></i>
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default IssuePolicyForm;
