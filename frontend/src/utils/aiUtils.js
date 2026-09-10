import thaiData from '../data/thai_address.json';

export const GEMINI_EXTRACT_PROMPT = `คุณคือระบบ AI OCR อัจฉริยะที่เชี่ยวชาญที่สุดในการวิเคราะห์และดึงข้อมูลจากเอกสารการประกันภัยของประเทศไทย ทั้งประกันภัยรถยนต์ (Motor Insurance ได้แก่ ตารางกรมธรรม์สมัครใจ, ตารางกรมธรรม์ภาคบังคับ/พ.ร.บ., เล่มทะเบียนรถ) และประกันภัยอื่นๆ ที่ไม่ใช่รถยนต์ (Non-Motor Insurance) รวมถึงใบเสร็จรับเงิน และสลิปการโอนเงิน
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

export const findMatchingCompany = (extractedCompany, companyList) => {
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

export const findMatchingType = (extractedType, motorTypes, nonMotorTypesList) => {
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
  if (motorTypes && motorTypes.length) {
    for (const t of motorTypes) {
      const cleanVal = t.value.toString().replace(/\s+/g, '').replace(/[.+]/g, '').toLowerCase();
      if (lookupType.includes(cleanVal) || cleanVal.includes(lookupType)) {
        return { category: 'motor', type: t.value, non_motor_type_id: '' };
      }
    }
  }

  // 2. Search in Non-Motor Types
  if (nonMotorTypesList && nonMotorTypesList.length) {
    for (const t of nonMotorTypesList) {
      const cleanVal = t.label.toString().replace(/\s+/g, '').replace(/[.+]/g, '').toLowerCase();
      if (cleanExtracted.includes(cleanVal) || cleanVal.includes(cleanExtracted)) {
        return { category: 'non-motor', type: t.label, non_motor_type_id: t.value };
      }
    }
  }

  return null;
};

export const findMatchingBrand = (extractedBrand, brandsList) => {
  if (!extractedBrand || !brandsList.length) return '';
  const cleanExtracted = extractedBrand.toString().replace(/\s+/g, '').toLowerCase();
  
  const found = brandsList.find(b => {
    const cleanBrand = b.toString().replace(/\s+/g, '').toLowerCase();
    return cleanBrand === cleanExtracted || cleanBrand.includes(cleanExtracted) || cleanExtracted.includes(cleanBrand);
  });
  return found || extractedBrand.toString();
};

export const findMatchingModel = (extractedModel, brand, modelsMap) => {
  if (!extractedModel) return '';
  if (!brand || !modelsMap[brand]) return extractedModel.toString();
  const cleanExtracted = extractedModel.toString().replace(/\s+/g, '').toLowerCase();
  
  const found = modelsMap[brand].find(m => {
    const cleanModel = m.toString().replace(/\s+/g, '').toLowerCase();
    return cleanModel === cleanExtracted || cleanModel.includes(cleanExtracted) || cleanExtracted.includes(cleanModel);
  });
  return found || extractedModel.toString();
};

export const findMatchingVehicleType = (extractedType, vehicleTypesList) => {
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

export const findMatchingColor = (extractedColor) => {
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

export const cleanAndExtractAddressFields = (customerObj) => {
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

export const translateThaiNumerals = (obj) => {
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

export const findBestAddressMatch = (extractedSub, extractedDist, extractedProv, extractedZip) => {
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

export const sanitizeAIResponse = (data) => {
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

export const removeShadowsAndEnhance = (originalCanvas) => {
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

export const compressImage = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.8) => {
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
