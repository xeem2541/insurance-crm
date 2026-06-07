import React, { useMemo } from 'react';
import Select from 'react-select';
import thaiData from '../data/thai_address.json';

const ThaiAddressSelect = ({ province, district, sub_district, zipcode, onChange }) => {
  
  // Get unique provinces
  const provinces = useMemo(() => {
    const unique = [...new Set(thaiData.map(item => item.province))];
    return unique.sort().map(p => ({ value: p, label: p }));
  }, []);

  // Get unique districts (amphoe) for selected province
  const districts = useMemo(() => {
    if (!province) return [];
    const filtered = thaiData.filter(item => item.province === province);
    const unique = [...new Set(filtered.map(item => item.amphoe))];
    return unique.sort().map(d => ({ value: d, label: d }));
  }, [province]);

  // Get unique sub_districts (district in json) for selected amphoe
  const subDistricts = useMemo(() => {
    if (!province || !district) return [];
    const filtered = thaiData.filter(item => item.province === province && item.amphoe === district);
    const unique = [...new Set(filtered.map(item => item.district))];
    return unique.sort().map(s => ({ value: s, label: s }));
  }, [province, district]);

  const handleProvinceChange = (option) => {
    onChange({ province: option?.value || '', district: '', sub_district: '', zipcode: '' });
  };

  const handleDistrictChange = (option) => {
    onChange({ province, district: option?.value || '', sub_district: '', zipcode: '' });
  };

  const handleSubDistrictChange = (option) => {
    const sub = option?.value || '';
    let zip = '';
    if (sub) {
       const found = thaiData.find(item => item.province === province && item.amphoe === district && item.district === sub);
       if (found) zip = found.zipcode.toString();
    }
    onChange({ province, district, sub_district: sub, zipcode: zip });
  };

  const handleZipcodeChange = (e) => {
    const zip = e.target.value;
    if (zip.length === 5) {
      const matches = thaiData.filter(item => item.zipcode.toString() === zip);
      if (matches.length > 0) {
        const match = matches[0];
        const sub = matches.length === 1 ? match.district : '';
        onChange({ province: match.province, district: match.amphoe, sub_district: sub, zipcode: zip });
        return;
      }
    }
    onChange({ province, district, sub_district, zipcode: zip });
  };

  return (
    <>
      <div className="col-md-3">
        <label className="form-label">จังหวัด</label>
        <Select 
          options={provinces} 
          value={provinces.find(p => p.value === province) || null} 
          onChange={handleProvinceChange}
          placeholder="เลือกจังหวัด..."
          isClearable
        />
      </div>
      <div className="col-md-3">
        <label className="form-label">อำเภอ / เขต</label>
        <Select 
          options={districts} 
          value={districts.find(d => d.value === district) || null} 
          onChange={handleDistrictChange}
          placeholder="เลือกอำเภอ..."
          isClearable
          isDisabled={!province}
        />
      </div>
      <div className="col-md-3">
        <label className="form-label">ตำบล / แขวง</label>
        <Select 
          options={subDistricts} 
          value={subDistricts.find(s => s.value === sub_district) || null} 
          onChange={handleSubDistrictChange}
          placeholder="เลือกตำบล..."
          isClearable
          isDisabled={!district}
        />
      </div>
      <div className="col-md-3">
        <label className="form-label">รหัสไปรษณีย์</label>
        <input 
          type="text" 
          inputMode="numeric"
          pattern="[0-9]*"
          className="form-control" 
          value={zipcode || ''} 
          onChange={handleZipcodeChange}
          placeholder="กรอกรหัสไปรษณีย์..."
          maxLength={5}
        />
      </div>
    </>
  );
};

export default ThaiAddressSelect;
