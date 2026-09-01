import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../services/api';
import { Form, Button, Row, Col, Accordion, Card, Badge, Modal } from 'react-bootstrap';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import CreatableSelect from 'react-select/creatable';
import { useDropzone } from 'react-dropzone';
import ThaiAddressSelect from '../components/ThaiAddressSelect';
import AiAccuracyHero from '../components/AiAccuracyHero';
import { carBrands, carModels } from '../data/carData';
import { formatPhone, formatIdCard, getUpcomingAnniversary, normalizeDate, addOneYear } from '../utils/formUtils';
import thaiData from '../data/thai_address.json';

const DEFAULT_SERVER_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const GEMINI_EXTRACT_PROMPT = `คุณคือระบบ AI OCR อัจฉริยะที่เชี่ยวชาญที่สุดในการวิเคราะห์และดึงข้อมูลจากเอกสารการประกันภัยของประเทศไทย ทั้งประกันภัยรถยนต์ (Motor Insurance ได้แก่ ตารางกรมธรรม์สมัครใจ, ตารางกรมธรรม์ภาคบังคับ/พ.ร.บ., เล่มทะเบียนรถ) และประกันภัยอื่นๆ ที่ไม่ใช่รถยนต์ (Non-Motor Insurance) รวมถึงใบเสร็จรับเงิน และสลิปการโอนเงิน
จงวิเคราะห์ภาพถ่ายที่ส่งมาอย่างละเอียด ดึงข้อมูลด้วยความถูกต้องแม่นยำสูงสุด 100% ตอบกลับในรูปแบบ JSON Object ตามโครงสร้างที่กำหนดเท่านั้น
โครงสร้าง JSON:
{
  "document_type": "voluntary_policy | prb_policy | non_motor_policy | vehicle_book | payment_slip | unknown",
  "customer": {
    "prefix": "",
    "first_name": "",
    "last_name": "",
    "phone": "",
    "alt_phone": "",
    "id_card_no": "",
    "dob": "",
    "age": null,
    "address": "",
    "moo": "",
    "soi": "",
    "road": "",
    "sub_district": "",
    "district": "",
    "province": "",
    "zipcode": ""
  },
  "vehicle": {
    "vehicle_type": "",
    "brand": "",
    "model": "",
    "year": "",
    "color": "",
    "plate_no": "",
    "plate_province": "",
    "vin": "",
    "engine_no": "",
    "registration_date": "",
    "sum_insured": ""
  },
  "policy": {
    "company": "",
    "type": "",
    "category": "motor หรือ non-motor",
    "policy_no": "",
    "sum_insured": "",
    "net_premium": "",
    "stamp_duty": "",
    "vat": "",
    "total_premium": "",
    "start_date": "YYYY-MM-DD",
    "expiry_date": "YYYY-MM-DD"
  }
}`;



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
      if (cleaned.length === 13) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += parseInt(cleaned.charAt(i), 10) * (13 - i);
        }
        const checkDigit = (11 - (sum % 11)) % 10;
        if (checkDigit !== parseInt(cleaned.charAt(12), 10)) {
          if (!sanitized.validation) sanitized.validation = { is_clear: true, warning_message: '', is_expired: false };
          const idWarning = 'เลขบัตรประชาชนตรวจสอบสูตร Check Digit ไม่ผ่าน (อาจมีตัวเลขผิดพลาดในรูปภาพ)';
          sanitized.validation.warning_message = sanitized.validation.warning_message 
            ? `${sanitized.validation.warning_message} * ${idWarning}` 
            : idWarning;
        }
      }
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

const IssuePolicyNonMotorForm = () => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // --- MULTI-PACKAGE STATE & HELPERS ---
  const createEmptyPackage = () => ({
    id: Date.now() + Math.random(),
    customer: {
      id: null, prefix: 'นาย', first_name: '', last_name: '', id_card_no: '', dob: '', age: '',
      phone: '', alt_phone: '', email: '', line_id: '', facebook: '', occupation: '',
      address: '', moo: '', soi: '', road: '', sub_district: '', district: '', province: '', zipcode: '', note: ''
    },
    vehicle: {
      vehicle_type: '', brand: '', model: '', year: '', color: '', 
      plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: '',
      registration_date: ''
    },
    policy: {
      category: 'motor',
      company: '', type: '', policy_no: '', sum_insured: '', 
      net_premium: '', stamp_duty: '', vat: '', total_premium: '',
      prb_start_date: '', prb_expiry_date: '', start_date: '', expiry_date: '',
      non_motor_type_id: '', additional_data: {}, insured_name: '', status: 'รอดำเนินการ',
      job_type: 'งานใหม่',
      repair_type: 'อู่'
    },
    payment: {
      payment_method: 'เงินสด',
      installments: 1,
      pay_date: '',
      status: 'รอชำระ'
    },
    followUp: {
      status: 'รอดำเนินการ', next_date: '', note: ''
    },
    installmentSchedule: [],
    files: [],
    rawAiData: null,
    aiWarning: ''
  });

  const [packages, setPackages] = useState([]);
  const [activePackageIdx, setActivePackageIdx] = useState(0);

  // Initialize with 1 empty package on mount
  useEffect(() => {
    setPackages([createEmptyPackage()]);
  }, []);

  const loadPackage = (pkg) => {
    if (!pkg) return;
    setCustomer(pkg.customer);
    setVehicle(pkg.vehicle);
    setPolicy(pkg.policy);
    setPayment(pkg.payment);
    setFollowUp(pkg.followUp || { status: 'รอดำเนินการ', next_date: '', note: '' });
    setInstallmentSchedule(pkg.installmentSchedule || []);
    setFiles(pkg.files || []);
    setRawAiData(pkg.rawAiData || null);
    setAiWarning(pkg.aiWarning || '');
    
    setCustomerSearchText(pkg.customer.first_name ? `${pkg.customer.first_name} ${pkg.customer.last_name || ''}` : '');
    setVehicleSearchText(pkg.vehicle.plate_no || '');
  };

  const handleSwitchPackage = (targetIdx) => {
    if (targetIdx === activePackageIdx) return;
    
    // Save current active package first
    const currentPkg = {
      id: packages[activePackageIdx]?.id || Date.now(),
      customer,
      vehicle,
      policy,
      payment,
      followUp,
      installmentSchedule,
      files,
      rawAiData,
      aiWarning
    };

    setPackages(prev => {
      const updated = [...prev];
      if (updated[activePackageIdx]) {
        updated[activePackageIdx] = currentPkg;
      }
      
      const targetPkg = updated[targetIdx];
      if (targetPkg) {
        loadPackage(targetPkg);
        setActivePackageIdx(targetIdx);
      }
      return updated;
    });
  };

  const handleAddPackage = () => {
    const currentPkg = {
      id: packages[activePackageIdx]?.id || Date.now(),
      customer,
      vehicle,
      policy,
      payment,
      followUp,
      installmentSchedule,
      files,
      rawAiData,
      aiWarning
    };

    setPackages(prev => {
      const updated = [...prev];
      if (updated[activePackageIdx]) {
        updated[activePackageIdx] = currentPkg;
      }
      const newPkg = createEmptyPackage();
      const nextList = [...updated, newPkg];
      
      setTimeout(() => {
        loadPackage(newPkg);
        setActivePackageIdx(nextList.length - 1);
      }, 0);
      
      return nextList;
    });
  };

  const handleDeletePackage = (idxToDelete) => {
    if (packages.length <= 1) {
      alert("ต้องมีชุดข้อมูลอย่างน้อย 1 ชุดในระบบ");
      return;
    }
    
    const confirmDelete = window.confirm(`คุณแน่ใจว่าต้องการลบ ชุดข้อมูลที่ ${idxToDelete + 1} หรือไม่?`);
    if (!confirmDelete) return;

    const pkgToDelete = packages[idxToDelete];
    if (pkgToDelete && pkgToDelete.files) {
      pkgToDelete.files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    }

    setPackages(prev => {
      const remaining = prev.filter((_, idx) => idx !== idxToDelete);
      
      let nextIdx = activePackageIdx;
      if (activePackageIdx === idxToDelete) {
        nextIdx = 0;
      } else if (activePackageIdx > idxToDelete) {
        nextIdx = activePackageIdx - 1;
      }
      
      setTimeout(() => {
        loadPackage(remaining[nextIdx]);
        setActivePackageIdx(nextIdx);
      }, 0);
      
      return remaining;
    });
  };
  // -------------------------------------
  
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
    category: 'non-motor',
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
  const [ocrSeconds, setOcrSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (ocrLoading) {
      setOcrSeconds(0);
      interval = setInterval(() => {
        setOcrSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setOcrSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [ocrLoading]);

  const [aiWarning, setAiWarning] = useState('');
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [rawAiData, setRawAiData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const [showCameraHelp, setShowCameraHelp] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('geminiApiKey') || '');
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [apiKeyTestLoading, setApiKeyTestLoading] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState(null);
  const [aiAccuracyRate, setAiAccuracyRate] = useState(98.5);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const cameraScanInputRef = useRef(null);

  const handleTestApiKey = async (keyToTest) => {
    const key = (keyToTest !== undefined ? keyToTest : apiKeyInput || DEFAULT_SERVER_KEY).trim();
    if (!key) {
      setApiKeyTestResult({ success: false, message: 'กรุณากรอก API Key ก่อนทำการทดสอบ' });
      return;
    }
    setApiKeyTestLoading(true);
    setApiKeyTestResult(null);
    const start = Date.now();
    try {
      // 1. Direct Ping to Google Gemini API (Works everywhere on web & mobile without server dependency)
      const res = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        { timeout: 8000 }
      );
      const elapsed = Date.now() - start;
      const models = res.data?.models || [];
      setApiKeyTestResult({
        success: true,
        message: `✅ เชื่อมต่อ Google Gemini AI สำเร็จ (${elapsed}ms) - คีย์ถูกต้องพร้อมใช้งาน!`
      });
    } catch (directErr) {
      const rawMsg = directErr.response?.data?.error?.message || '';
      if (rawMsg) {
        let friendlyMsg = `Google API แจ้งเตือน: ${rawMsg}`;
        if (rawMsg.includes('invalid authentication credentials') || rawMsg.includes('OAuth 2') || rawMsg.includes('login cookie')) {
          friendlyMsg = '❌ รูปแบบ API Key ไม่ถูกต้อง: กรุณาใช้ Gemini API Key จาก Google AI Studio (คีย์ที่ถูกต้องจะขึ้นต้นด้วย "AIzaSy...") ไม่ใช่ OAuth Token หรือ Token อื่น';
        } else if (rawMsg.includes('API key not valid') || rawMsg.includes('API_KEY_INVALID')) {
          friendlyMsg = '❌ API Key ไม่ถูกต้อง หรือถูกระงับ/ยกเลิกแล้ว: กรุณาตรวจสอบหรือสร้าง API Key ใหม่ที่ Google AI Studio';
        } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota') || rawMsg.includes('RATE_LIMIT')) {
          friendlyMsg = '⚠️ โควตาการใช้งานเต็มชั่วคราว (Quota Exceeded): กรุณารอสักครู่แล้วลองใหม่ หรือสร้าง API Key จากโปรเจกต์ใหม่ใน Google AI Studio';
        }

        setApiKeyTestResult({
          success: false,
          message: friendlyMsg
        });
        return;
      }
      // 2. Server fallback if available
      try {
        const serverRes = await api.post('/ai-ocr/test-key', { apiKey: key });
        setApiKeyTestResult({ success: true, message: serverRes.data.message });
      } catch (err) {
        const msg = err.response?.data?.message || directErr.message || 'ไม่สามารถเชื่อมต่อกับ Google AI ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือความถูกต้องของ API Key';
        setApiKeyTestResult({ success: false, message: msg });
      }
    } finally {
      setApiKeyTestLoading(false);
    }
  };

  const fileToBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const extractDirectFromGemini = async (files, apiKey) => {
    try {
      const parts = [{ text: GEMINI_EXTRACT_PROMPT }];
      for (const file of files) {
        const base64Data = await fileToBase64(file);
        const mimeType = file.type || 'image/jpeg';
        parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }

      const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let lastErr = null;
      
      for (const modelName of modelsToTry) {
        try {
          const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              contents: [
                { parts }
              ],
              generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
            },
            { timeout: 35000 }
          );
          const jsonText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            return JSON.parse(jsonText);
          }
        } catch (err) {
          lastErr = err;
          console.warn(`Direct model ${modelName} error:`, err.response?.data || err.message);
        }
      }
      throw lastErr || new Error('Direct Gemini extraction failed');
    } catch (e) {
      throw e;
    }
  };

  const handleAIExtract = async (e) => {
    const rawFiles = Array.from(e.target.files);
    if (!rawFiles.length) return;

    let geminiApiKey = localStorage.getItem('geminiApiKey') || '';

    setOcrLoading(true);
    setOcrSeconds(0);

    try {
      let currentPackages = [...packages];
      let currentActiveIdx = activePackageIdx;

      // Ensure we have a valid active package
      if (!currentPackages[currentActiveIdx]) {
        currentPackages[currentActiveIdx] = createEmptyPackage();
      }

      // 1. Compress all files and build FormData
      const formData = new FormData();
      const compressedFiles = [];
      for (const file of rawFiles) {
        const compressedFile = await compressImage(file, 4096, 4096, 0.95);
        compressedFiles.push(compressedFile);
        formData.append('images', compressedFile);
      }

      const headers = {};
      if (geminiApiKey) {
        headers['x-gemini-api-key'] = geminiApiKey;
      }

      // 2. Call API (Backend handles multiple images automatically)
      let rawAiRes = null;
      try {
        const res = await api.post('/ai-ocr/extract', formData, { headers });
        rawAiRes = res.data;
      } catch (serverErr) {
        console.warn('Server OCR route not available, falling back to direct client-side Gemini Vision...', serverErr.message);
        const activeKey = geminiApiKey || DEFAULT_SERVER_KEY;
        rawAiRes = await extractDirectFromGemini(compressedFiles, activeKey);
      }

      const data = sanitizeAIResponse(rawAiRes);

      let detectedTypeId = 1; 
      if (data.document_type === 'vehicle_book') detectedTypeId = 4;
      else if (data.document_type === 'payment_slip') detectedTypeId = 2;
      
      let docLabel = 'กรมธรรม์';
      if (data.document_type === 'payment_slip') docLabel = 'สลิปโอนเงิน';
      else if (data.document_type === 'vehicle_book') docLabel = 'ทะเบียนรถ';
      else if (data.document_type === 'non_motor_policy') docLabel = 'กรมธรรม์ Non-Motor';

      // Create fileObjs for all uploaded files
      const fileObjs = rawFiles.map((f, i) => ({
        file: f,
        type_id: i === 0 ? detectedTypeId : 1, 
        note: `สแกนด้วย AI: ${docLabel}`,
        preview: URL.createObjectURL(f)
      }));

      if (data.customer && data.customer.dob) data.customer.dob = normalizeDate(data.customer.dob);
      if (data.vehicle && data.vehicle.registration_date) data.vehicle.registration_date = normalizeDate(data.vehicle.registration_date);
      if (data.policy) {
        if (data.policy.start_date) data.policy.start_date = normalizeDate(data.policy.start_date);
        if (data.policy.expiry_date) data.policy.expiry_date = normalizeDate(data.policy.expiry_date);
      }

      // Get current package data so we MERGE instead of OVERWRITE
      const currentPkg = currentPackages[currentActiveIdx];
      
      // Customer
      let pkgCustomer = { ...currentPkg.customer };
      if (data.customer) {
        let calculatedAge = data.customer.age;
        if (data.customer.dob) {
          const birthDate = new Date(data.customer.dob);
          const today = new Date();
          calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
        }
        const cleanedCustomer = cleanAndExtractAddressFields(data.customer);
        Object.keys(cleanedCustomer).forEach(key => {
          if (cleanedCustomer[key] !== '' && cleanedCustomer[key] !== null && cleanedCustomer[key] !== undefined) {
            pkgCustomer[key] = cleanedCustomer[key]; // overwrite with new AI data if it exists
          }
        });
        if (calculatedAge) pkgCustomer.age = calculatedAge;
      }

      // Vehicle
      let pkgVehicle = { ...currentPkg.vehicle };
      if (data.vehicle) {
        const matchedBrand = data.vehicle.brand ? findMatchingBrand(data.vehicle.brand, carBrands) : '';
        const matchedModel = data.vehicle.model ? findMatchingModel(data.vehicle.model, matchedBrand, carModels) : '';
        const matchedVehicleType = data.vehicle.vehicle_type ? findMatchingVehicleType(data.vehicle.vehicle_type, vehicleTypes) : '';
        const matchedColor = data.vehicle.color ? findMatchingColor(data.vehicle.color) : '';

        const rawVehicle = data.vehicle;
        Object.keys(rawVehicle).forEach(key => {
          if (rawVehicle[key] !== '' && rawVehicle[key] !== null && rawVehicle[key] !== undefined) {
            pkgVehicle[key] = rawVehicle[key];
          }
        });
        if (matchedBrand) pkgVehicle.brand = matchedBrand;
        if (matchedModel) pkgVehicle.model = matchedModel;
        if (matchedVehicleType) pkgVehicle.vehicle_type = matchedVehicleType;
        if (matchedColor) pkgVehicle.color = matchedColor;
      }

      // Policy
      let pkgPolicy = { ...currentPkg.policy };
      if (data.policy) {
        const matchedCompany = data.policy.company ? findMatchingCompany(data.policy.company, companies) : '';
        const matchedTypeInfo = data.policy.type ? findMatchingType(data.policy.type, policyTypes, nonMotorTypes) : null;

        const rawPolicy = data.policy;
        Object.keys(rawPolicy).forEach(key => {
          if (rawPolicy[key] !== '' && rawPolicy[key] !== null && rawPolicy[key] !== undefined) {
            pkgPolicy[key] = rawPolicy[key];
          }
        });
        if (matchedCompany) pkgPolicy.company = matchedCompany;
        
        if (data.document_type === 'prb_policy') {
          pkgPolicy.prb_start_date = data.policy.start_date || pkgPolicy.prb_start_date || '';
          pkgPolicy.prb_expiry_date = data.policy.expiry_date || pkgPolicy.prb_expiry_date || '';
        } else {
          pkgPolicy.start_date = data.policy.start_date || pkgPolicy.start_date || '';
          pkgPolicy.expiry_date = data.policy.expiry_date || pkgPolicy.expiry_date || '';
        }

        if (matchedTypeInfo) {
          pkgPolicy.category = matchedTypeInfo.category;
          pkgPolicy.type = matchedTypeInfo.type;
          pkgPolicy.non_motor_type_id = matchedTypeInfo.non_motor_type_id;
        } else {
          if (data.document_type === 'non_motor_policy') pkgPolicy.category = 'non-motor';
          
          if (pkgPolicy.category === 'non-motor' && !pkgPolicy.non_motor_type_id && rawPolicy.type) {
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
                     (cleanType.includes('ชีวิต') && cleanLabel.includes('life')) ||
                     (cleanType.includes('โจรกรรม') && cleanLabel.includes('โจรกรรม'));
            });
            if (found) {
              pkgPolicy.non_motor_type_id = found.value;
              pkgPolicy.type = found.label;
            }
          }
        }
      }

      // Payment
      let pkgPayment = { ...currentPkg.payment };
      if (data.document_type === 'payment_slip' && data.payment_slip_data) {
        const slip = data.payment_slip_data;
        pkgPayment.payment_method = 'เงินสด';
        pkgPayment.pay_date = slip.transfer_date_time ? normalizeDate(slip.transfer_date_time) : pkgPayment.pay_date;
        pkgPayment.status = 'ชำระครบแล้ว';
      }

      // Warnings
      let warningMsg = data.validation?.warning_message || '';
      if (data.document_type === 'payment_slip' && data.payment_slip_data) {
        const slip = data.payment_slip_data;
        let bankText = '';
        if (slip.bank_sender || slip.bank_receiver) {
          bankText = ` (${slip.bank_sender || ''} -> ${slip.bank_receiver || ''})`;
        }
        let slipNotice = `ตรวจพบสลิปโอนเงิน ยอดโอน: ฿${parseFloat(slip.amount || 0).toLocaleString()}${bankText} วันที่โอน: ${slip.transfer_date_time || ''}`;
        warningMsg = warningMsg ? `${warningMsg} | ${slipNotice}` : slipNotice;
      }
      if (currentPkg.aiWarning) {
        warningMsg = currentPkg.aiWarning + (warningMsg ? ' | ' + warningMsg : '');
      }

      // Merge files array
      let pkgFiles = [...(currentPkg.files || []), ...fileObjs];

      // Assemble merged package
      currentPackages[currentActiveIdx] = {
        ...currentPkg,
        customer: pkgCustomer,
        vehicle: pkgVehicle,
        policy: pkgPolicy,
        payment: pkgPayment,
        files: pkgFiles,
        rawAiData: {
          document_type: data.document_type,
          customer: data.customer ? { ...data.customer } : null,
          vehicle: data.vehicle ? { ...data.vehicle } : null,
          policy: data.policy ? { ...data.policy } : null
        },
        aiWarning: warningMsg
      };

      setPackages(currentPackages);
      setActivePackageIdx(currentActiveIdx);
      loadPackage(currentPackages[currentActiveIdx]);

      alert('สแกนและเพิ่มข้อมูลลงในชุดปัจจุบันเรียบร้อยแล้ว!');
    } catch (err) {
      const errCode = err.response?.data?.error;
      let errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      if (typeof errMsg === 'object') {
        errMsg = errMsg.message || JSON.stringify(errMsg);
      }
      if (errCode === 'GEMINI_API_KEY_REQUIRED' || errCode === 'INVALID_GEMINI_API_KEY') {
        setShowApiKeyModal(true);
        setApiKeyTestResult({
          success: false,
          message: `${errMsg} กรุณากรอก Gemini API Key เพื่อเริ่มใช้งาน (ขอรับฟรีได้ที่ Google AI Studio)`
        });
      } else {
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลด้วย AI: ' + errMsg);
      }
    } finally {
      setOcrLoading(false);
      if (e.target) e.target.value = null; // reset input
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

      // Dynamic AI accuracy stats from system
      try {
        const statsRes = await api.get('/dashboard/stats');
        const total = statsRes.data?.aiStats?.total_scans || 0;
        const corrected = statsRes.data?.aiCorrectionStats?.correction_scans || 0;
        if (total > 0) {
          const calcAccuracy = Math.max(85, Math.min(99.9, ((total - corrected) / total) * 100));
          setAiAccuracyRate(parseFloat(calcAccuracy.toFixed(1)));
        } else {
          setAiAccuracyRate(98.5);
        }
      } catch (statsErr) {
        // Fallback to default high precision rate
        setAiAccuracyRate(98.5);
      }
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

  // --- Auto-Save Draft Logic ---
  const DRAFT_KEY = 'draft_IssuePolicyNonMotorForm';
  
  // Load draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.customer) setCustomer(parsed.customer);
        if (parsed.vehicle) setVehicle(parsed.vehicle); // Even for non-motor, keep it if it exists
        if (parsed.policy) setPolicy(parsed.policy);
        if (parsed.payment) setPayment(parsed.payment);
        if (parsed.installmentSchedule) setInstallmentSchedule(parsed.installmentSchedule);
        if (parsed.followUp) setFollowUp(parsed.followUp);
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  }, []);

  // Save draft when data changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Don't save if it's completely empty (or just default values)
      if (customer.first_name || policy.policy_no || policy.company) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          customer, vehicle, policy, payment, installmentSchedule, followUp
        }));
      }
    }, 1000); // 1-second debounce
    return () => clearTimeout(timeout);
  }, [customer, vehicle, policy, payment, installmentSchedule, followUp]);
  // -----------------------------

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

  const uploadFileToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset');

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const resourceType = isPdf ? 'raw' : 'image';

    const response = await fetch(`https://api.cloudinary.com/v1_1/djnuhaq6b/${resourceType}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Failed to upload to Cloudinary');
    }

    const result = await response.json();
    return {
      secure_url: result.secure_url,
      bytes: result.bytes,
      format: result.secure_url.includes('.pdf') ? 'application/pdf' : `image/${result.format}`
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    try {
      const fileDataList = [];
      const formData = new FormData();

      if (isLocalhost) {
        // LOCAL MODE: Save directly to computer folder (uploads)
        files.forEach((f, idx) => {
          formData.append('files', f.file);
          fileDataList.push({
            type_id: f.type_id,
            note: f.note || '',
            name: f.file.name
          });
        });
      } else {
        // CLOUD MODE: Upload all files to Cloudinary sequentially
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          let fileUrl = f.file_path;
          let bytes = f.file.size;
          let format = f.file.type;

          if (!fileUrl) {
            try {
              const uploadRes = await uploadFileToCloudinary(f.file);
              fileUrl = uploadRes.secure_url;
              bytes = uploadRes.bytes;
              format = uploadRes.format;
            } catch (uploadErr) {
              console.error("Cloudinary upload failed, falling back to local:", uploadErr);
            }
          }

          fileDataList.push({
            type_id: f.type_id,
            note: f.note || '',
            name: f.file.name,
            file_path: fileUrl,
            file_type: format,
            file_size: bytes
          });
        }
      }

      // 2. Prepare payload
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
      formData.append('fileData', JSON.stringify(fileDataList));

      const res = await api.post('/issue-policy', formData);

      setSuccessMsg({
        text: 'บันทึกข้อมูลลูกค้าและกรมธรรม์สำเร็จ!',
        customerName: `${customer.first_name} ` + customer.last_name,
        policyNo: policy.policy_no || '(สร้างใหม่อัตโนมัติ)',
        company: policy.company,
        type: policy.type || (nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))?.label),
        totalPremium: policy.total_premium,
        commission: policy.commission_baht,
        status: followUp.status
      });

      // Cleanup memory of the saved package
      files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      window.scrollTo(0, 0);

      // Remove the saved package and transition to next remaining
      setPackages(prev => {
        const remaining = prev.filter((_, idx) => idx !== activePackageIdx);
        if (remaining.length === 0) {
          const empty = createEmptyPackage();
          setTimeout(() => {
            loadPackage(empty);
            setActivePackageIdx(0);
          }, 0);
          return [empty];
        } else {
          const nextIdx = 0;
          setTimeout(() => {
            loadPackage(remaining[nextIdx]);
            setActivePackageIdx(nextIdx);
          }, 0);
          return remaining;
        }
      });
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

      {/* Package Tabs Selector UI removed per user request */}

      {/* Dynamic AI Accuracy Hero Section */}
      <AiAccuracyHero 
        accuracyRate={aiAccuracyRate}
        ocrLoading={ocrLoading}
        ocrSeconds={ocrSeconds}
        onOpenSettings={() => {
          setApiKeyInput(localStorage.getItem('geminiApiKey') || '');
          setApiKeyTestResult(null);
          setShowApiKeyModal(true);
        }}
        onCameraClick={() => cameraScanInputRef.current && cameraScanInputRef.current.click()}
        onFileClick={() => fileInputRef.current && fileInputRef.current.click()}
        onHelpClick={() => setShowCameraHelp(true)}
      />
      <input type="file" ref={cameraScanInputRef} accept="image/*" capture="environment" className="d-none" onChange={handleAIExtract} />
      <input type="file" ref={fileInputRef} accept="image/*" className="d-none" multiple onChange={handleAIExtract} />

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

          {/* Section 3: Policy */}
          <Accordion.Item eventKey="2" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-shield-check me-2"></i>ส่วนที่ 3 : ข้อมูลกรมธรรม์</h5></Accordion.Header>
            <Accordion.Body>
              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">รายละเอียดกรมธรรม์</h6>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Form.Label>ประเภทงาน <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    value={policy.job_type || 'งานใหม่'} 
                    onChange={e => setPolicy({...policy, job_type: e.target.value})}
                  >
                    <option value="งานใหม่">งานใหม่ (New)</option>
                    <option value="งานต่ออายุ">งานต่ออายุ (Renewal)</option>
                    <option value="โอนโค้ด">งานโอนโค้ด (Transfer)</option>
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>บริษัทประกัน <span className="text-danger">*</span></Form.Label>
                  <CreatableSelect noOptionsMessage={() => "ไม่พบข้อมูล"} 
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
                  <Select noOptionsMessage={() => "ไม่พบข้อมูล"} 
                    options={nonMotorTypes} 
                    value={nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))} 
                    onChange={opt => {
                      const label = opt ? opt.label : '';
                      setPolicy({
                        ...policy, 
                        non_motor_type_id: opt?.value || '',
                        type: label,
                        type_name: label,
                        category: 'non-motor'
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

                {policy.category === 'motor' && (
                  <Col md={4}>
                    <Form.Label>ประเภทการซ่อม</Form.Label>
                    <Form.Select 
                      value={policy.repair_type || 'อู่'} 
                      onChange={e => setPolicy({...policy, repair_type: e.target.value})}
                    >
                      <option value="อู่">ซ่อมอู่ (Contract Garage)</option>
                      <option value="ศูนย์">ซ่อมศูนย์ / ซ่อมห้าง (Dealer Service)</option>
                    </Form.Select>
                  </Col>
                )}

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
                  <Select noOptionsMessage={() => "ไม่พบข้อมูล"} options={jobStatuses} value={jobStatuses.find(j => j.value === followUp.status)} onChange={opt => setFollowUp({...followUp, status: opt?.value || 'รอดำเนินการ'})} />
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
                  <i className="bi bi-camera-fill me-2"></i> เปิดกล้อง / เลือกรูปจากเครื่อง
                </Button>
                <div className="mt-2 text-muted small">
                  <i className="bi bi-info-circle me-1"></i> แนะนำ: ถ่ายภาพด้วยกล้องหลัก 1x หรือเลือกหลายรูปจากอัลบั้ม
                </div>
                <input type="file" multiple ref={cameraInputRef} accept="image/*" className="d-none" onChange={(e) => {
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
          <div className="card-body bg-white rounded-3 d-flex flex-column flex-lg-row justify-content-end align-items-center p-2 p-lg-3 gap-2">
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

      {/* Camera 48MP Help Modal */}
      <Modal show={showCameraHelp} onHide={() => setShowCameraHelp(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold"><i className="bi bi-camera-fill me-2"></i>วิธีเปิดโหมดกล้องความละเอียดสูง (48MP/50MP) บนมือถือ</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <h5 className="fw-bold text-primary mb-3"><i className="bi bi-apple me-2"></i>สำหรับ iPhone (iOS 16+)</h5>
          <ol className="ps-3 mb-4">
            <li className="mb-2">ไปที่ <strong>การตั้งค่า (Settings)</strong> &gt; <strong>กล้อง (Camera)</strong></li>
            <li className="mb-2">แตะที่ <strong>รูปแบบ (Formats)</strong></li>
            <li className="mb-2">เปิดใช้งานสวิตช์ <strong>การควบคุม ProRAW และความละเอียด (ProRAW & Resolution Control)</strong></li>
            <li className="mb-2">ตั้งค่าเริ่มต้นเป็น <strong>HEIF Max (สูงสุด 48MP)</strong> หรือ <strong>ProRAW Max</strong></li>
            <li className="mb-2"><strong>เวลาถ่ายรูป:</strong> ในแอปกล้องปกติ ให้แตะปุ่ม <strong>HEIF MAX / RAW MAX</strong> ที่มุมขวาบนให้ทำงาน (ไม่มีเส้นขีดทับ)</li>
          </ol>
          <hr />
          <h5 className="fw-bold text-success mt-3 mb-3"><i className="bi bi-android2 me-2"></i>สำหรับ Android (Samsung, Xiaomi, OPPO, vivo)</h5>
          <ol className="ps-3">
            <li className="mb-2">เปิดแอป <strong>กล้องถ่ายรูป (Camera)</strong></li>
            <li className="mb-2">แตะเลือกสัญลักษณ์อัตราส่วนรูปภาพ (ปกติเขียนว่า <strong>[4:3]</strong> หรือ <strong>[3:4]</strong>) ที่แถบเครื่องมือด่วนด้านบน</li>
            <li className="mb-2">แตะเลือก <strong>[4:3 50MP]</strong>, <strong>[4:3 48MP]</strong>, หรือ <strong>[108MP/200MP]</strong> เพื่อเปิดใช้งานโหมดกล้องหลักความละเอียดเต็มพิกเซล</li>
            <li className="mb-2"><em>*หรือเลื่อนไปที่โหมด <strong>&quot;เพิ่มเติม&quot; (More)</strong> &gt; เลือกโหมด <strong>&quot;ความละเอียดสูง&quot; (Hi-Res / Ultra HD)</strong></em></li>
          </ol>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCameraHelp(false)} className="fw-bold px-4 rounded-pill">
            เข้าใจแล้ว
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Gemini API Key Settings & Test Modal */}
      <Modal show={showApiKeyModal} onHide={() => setShowApiKeyModal(false)} centered backdrop="static">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5 text-primary">
            <i className="bi bi-key-fill me-2"></i>ตั้งค่า Gemini AI API Key
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="text-muted small mb-3">
            ระบบใช้ Gemini AI ในการอ่านเอกสารตารางกรมธรรม์และเล่มทะเบียน สามารถขอรับ API Key ได้ฟรีจาก Google AI Studio
          </p>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold small text-secondary">
              Gemini API Key
              {localStorage.getItem('geminiApiKey') && (
                <span className="badge bg-success-subtle text-success ms-2">บันทึกอยู่ในเครื่องแล้ว</span>
              )}
            </Form.Label>
            <div className="input-group">
              <Form.Control
                type={showApiKeyText ? "text" : "password"}
                placeholder="วาง API Key ที่นี่ (เช่น AIzaSy...)"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setApiKeyTestResult(null);
                }}
                className="font-monospace"
              />
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowApiKeyText(!showApiKeyText)}
                title={showApiKeyText ? "ซ่อนคีย์" : "แสดงคีย์"}
              >
                <i className={`bi bi-eye${showApiKeyText ? '-slash' : ''}`}></i>
              </Button>
            </div>
          </Form.Group>

          {apiKeyTestResult && (
            <div className={`alert alert-${apiKeyTestResult.success ? 'success' : 'danger'} py-2 px-3 small mb-3 border-0 rounded-3`}>
              <i className={`bi bi-${apiKeyTestResult.success ? 'check-circle-fill' : 'exclamation-circle-fill'} me-2`}></i>
              {apiKeyTestResult.message}
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 mb-2">
            <div>
              <div className="fw-bold small text-dark"><i className="bi bi-info-circle text-primary me-1"></i>ยังไม่มี API Key?</div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>ขอรับฟรี 100% ไม่ต้องผูกบัตรเครดิต</div>
            </div>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-sm btn-outline-primary fw-bold"
            >
              รับ API Key ฟรี <i className="bi bi-box-arrow-up-right ms-1"></i>
            </a>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 d-flex justify-content-between">
          <Button 
            variant="outline-danger" 
            size="sm"
            onClick={() => {
              localStorage.removeItem('geminiApiKey');
              setApiKeyInput('');
              setApiKeyTestResult({ success: true, message: 'ล้างค่า API Key เรียบร้อยแล้ว (จะใช้คีย์ของระบบ Server ถ้ามี)' });
            }}
          >
            <i className="bi bi-trash me-1"></i> ล้างคีย์
          </Button>

          <div className="d-flex gap-2">
            <Button 
              variant="outline-info" 
              size="sm"
              disabled={apiKeyTestLoading || !apiKeyInput.trim()}
              onClick={() => handleTestApiKey(apiKeyInput)}
              className="fw-bold"
            >
              {apiKeyTestLoading ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>กำลังทดสอบ...</>
              ) : (
                <><i className="bi bi-broadcast me-1"></i>ทดสอบเชื่อมต่อ</>
              )}
            </Button>

            <Button 
              variant="primary" 
              size="sm"
              className="fw-bold px-3"
              onClick={() => {
                if (apiKeyInput.trim()) {
                  localStorage.setItem('geminiApiKey', apiKeyInput.trim());
                } else {
                  localStorage.removeItem('geminiApiKey');
                }
                setShowApiKeyModal(false);
              }}
            >
              <i className="bi bi-check-lg me-1"></i> บันทึกและปิด
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default IssuePolicyNonMotorForm;
