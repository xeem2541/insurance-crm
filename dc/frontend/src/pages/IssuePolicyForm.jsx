import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Form, Button, Row, Col, Accordion, Card, Badge } from 'react-bootstrap';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { useDropzone } from 'react-dropzone';
import ThaiAddressSelect from '../components/ThaiAddressSelect';
import { carBrands, carModels } from '../data/carData';

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

const DateSelector = ({ value, onChange }) => {
  const initialParts = value ? value.split('-') : ['', '', ''];
  const [y, setY] = React.useState(initialParts[0]);
  const [m, setM] = React.useState(initialParts[1] ? parseInt(initialParts[1], 10).toString() : '');
  const [d, setD] = React.useState(initialParts[2] ? parseInt(initialParts[2], 10).toString() : '');
  const [lastEmitted, setLastEmitted] = React.useState(value || '');

  React.useEffect(() => {
    if (value !== lastEmitted) {
      const parts = value ? value.split('-') : ['', '', ''];
      setY(parts[0] || '');
      setM(parts[1] ? parseInt(parts[1], 10).toString() : '');
      setD(parts[2] ? parseInt(parts[2], 10).toString() : '');
      setLastEmitted(value || '');
    }
  }, [value, lastEmitted]);

  const currentYear = new Date().getFullYear();
  // Range: 100 years past to 10 years future
  const years = Array.from({length: 111}, (_, i) => currentYear + 10 - i);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const fullMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const days = Array.from({length: 31}, (_, i) => i + 1);

  const handleChange = (part, val) => {
    let newY = y, newM = m, newD = d;
    if (part === 'y') { newY = val; setY(val); }
    if (part === 'm') { newM = val; setM(val); }
    if (part === 'd') { newD = val; setD(val); }

    let emitVal = '';
    if (newY && newM && newD) {
      emitVal = `${newY}-${newM.padStart(2, '0')}-${newD.padStart(2, '0')}`;
    }
    
    // Only emit if the complete value changed
    if (emitVal !== lastEmitted) {
      setLastEmitted(emitVal);
      onChange(emitVal);
    }
  };

  return (
    <div>
      <div className="d-flex gap-1">
        <Form.Select value={d ? parseInt(d, 10).toString() : ''} onChange={e => handleChange('d', e.target.value)} size="sm">
          <option value="">วัน</option>
          {days.map(day => <option key={day} value={day}>{day}</option>)}
        </Form.Select>
        <Form.Select value={m ? parseInt(m, 10).toString() : ''} onChange={e => handleChange('m', e.target.value)} size="sm">
          <option value="">เดือน</option>
          {months.map((month, idx) => <option key={idx} value={idx+1}>{month}</option>)}
        </Form.Select>
        <Form.Select value={y} onChange={e => handleChange('y', e.target.value)} size="sm">
          <option value="">ปี(ค.ศ.)</option>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </Form.Select>
      </div>
      {d && m && y && (
        <small className="text-success d-block mt-1 fw-bold">
          <i className="bi bi-calendar-check me-1"></i>
          {`${parseInt(d, 10)} ${fullMonths[parseInt(m, 10) - 1]} พ.ศ. ${parseInt(y, 10) + 543}`}
        </small>
      )}
    </div>
  );
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
    plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: ''
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

  const [followUp, setFollowUp] = useState({
    status: 'รอดำเนินการ', next_date: '', note: ''
  });

  const [files, setFiles] = useState([]);
  const [ocrLoading, setOcrLoading] = useState(false);

  const handleAIExtract = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setOcrLoading(true);
    try {
      const res = await api.post('/ai-ocr/extract', formData);
      const data = res.data;
      
      if (data.customer) setCustomer(prev => ({ ...prev, ...data.customer }));
      if (data.vehicle) setVehicle(prev => ({ ...prev, ...data.vehicle }));
      if (data.policy) setPolicy(prev => ({ ...prev, ...data.policy }));
      
      alert('ดึงข้อมูลจากรูปภาพสำเร็จ! กรุณาตรวจสอบความถูกต้องก่อนบันทึกอีกครั้งนะครับ');
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการดึงข้อมูลด้วย AI');
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
    const dob = e.target.value;
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
    if (policy.start_date) {
      const start = new Date(policy.start_date);
      start.setFullYear(start.getFullYear() + 1);
      const nextYearStr = start.toISOString().split('T')[0];
      
      setPolicy(prev => {
        if (prev.expiry_date !== nextYearStr) {
          return { ...prev, expiry_date: nextYearStr };
        }
        return prev;
      });

      setFollowUp(prev => {
        if (prev.next_date !== nextYearStr) {
          return { ...prev, next_date: nextYearStr };
        }
        return prev;
      });
    }
  }, [policy.start_date]);

  const loadCustomerOptions = (inputValue) => {
    return new Promise(resolve => {
      if (!inputValue || inputValue.length < 2) return resolve([]);
      if (window.customerSearchTimeout) clearTimeout(window.customerSearchTimeout);
      window.customerSearchTimeout = setTimeout(async () => {
        try {
          const res = await api.get(`/customers?search=${inputValue}`);
          resolve(res.data.map(c => ({
            label: `${c.phone} - ${c.first_name} ${c.last_name}`,
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
          const v = res.data[0];
          setVehicle({
            ...vehicle,
            ...v,
            tax_expiry: v.tax_expiry ? v.tax_expiry.split('T')[0] : '',
            id: v.id
          });
          setVehicleSearchText(v.plate_no); // visually show it
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
  
  const setDateToday = (isPrb) => {
    const today = new Date();
    const start = today.toISOString().split('T')[0];
    const endObj = new Date(today.setFullYear(today.getFullYear() + 1));
    const end = endObj.toISOString().split('T')[0];
    if (isPrb) {
      setPolicy({...policy, prb_start_date: start, prb_expiry_date: end});
    } else {
      setPolicy({...policy, start_date: start, expiry_date: end});
    }
  };

  const setDateTomorrow = (isPrb) => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const start = tmr.toISOString().split('T')[0];
    const endObj = new Date(tmr.setFullYear(tmr.getFullYear() + 1));
    const end = endObj.toISOString().split('T')[0];
    if (isPrb) {
      setPolicy({...policy, prb_start_date: start, prb_expiry_date: end});
    } else {
      setPolicy({...policy, start_date: start, expiry_date: end});
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
        installmentSchedule
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

  return (
    <div className="container-fluid pb-5 mobile-pb">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold"><i className="bi bi-file-earmark-plus-fill text-primary"></i> เพิ่มลูกค้าใหม่ / ออกกรมธรรม์ใหม่ (Single Page Form)</h2>
      </div>

      <div className="card border-0 shadow-sm mb-4 bg-gradient" style={{ background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' }}>
        <div className="card-body text-center py-4">
          <h4 className="fw-bold text-dark mb-3">✨ สแกนรูปด้วย AI แม่นยำ 100%</h4>
          {ocrLoading ? (
            <div className="d-flex align-items-center justify-content-center text-primary fw-bold">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              กำลังใช้ Gemini AI อ่านเอกสาร... (อาจใช้เวลา 10-20 วินาที)
            </div>
          ) : (
            <label className="btn btn-dark btn-lg fw-bold px-5 rounded-pill shadow-sm">
              <i className="bi bi-camera-fill me-2"></i> ถ่ายรูป / อัปโหลดตารางกรมธรรม์
              <input type="file" accept="image/*" capture="environment" className="d-none" onChange={handleAIExtract} />
            </label>
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

      <Form onSubmit={handleSubmit}>
        <Accordion defaultActiveKey={['0', '1', '2', '3', '4', '5']} alwaysOpen>
          
          {/* Section 1: Customer */}
          <Accordion.Item eventKey="0" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-person-lines-fill me-2"></i>ส่วนที่ 1 : ข้อมูลลูกค้า</h5></Accordion.Header>
            <Accordion.Body>
              <div className="mb-4 bg-light p-3 rounded border">
                <Form.Label className="fw-bold text-primary"><i className="bi bi-search"></i> ค้นหาและดึงข้อมูลลูกค้าเก่าอัตโนมัติ (พิมพ์ชื่อ หรือ เบอร์โทร)</Form.Label>
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
                  placeholder="พิมพ์เบอร์โทร, ชื่อ, นามสกุล หรือเลขบัตรประชาชน..."
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
                  <DateSelector value={customer.dob} onChange={val => handleDobChange({ target: { value: val } })} />
                </Col>
                <Col md={1}>
                  <Form.Label>อายุ</Form.Label>
                  <Form.Control type="number" value={customer.age || ''} onChange={e => setCustomer({...customer, age: e.target.value})} />
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
                    <Form.Select value={vehicle.brand} onChange={e => setVehicle({...vehicle, brand: e.target.value, model: ''})}>
                      <option value="">เลือกยี่ห้อ...</option>
                      {carBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label>รุ่นรถ (Model)</Form.Label>
                    <Form.Select value={vehicle.model} onChange={e => setVehicle({...vehicle, model: e.target.value})}>
                      <option value="">เลือกรุ่น...</option>
                      {(carModels[vehicle.brand] || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </Form.Select>
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
                    <Form.Select value={vehicle.color} onChange={e => setVehicle({...vehicle, color: e.target.value})}>
                      <option value="">สี...</option>
                      {['ขาว', 'ดำ', 'เทา', 'บรอนซ์เงิน', 'บรอนซ์ทอง', 'แดง', 'น้ำเงิน', 'ฟ้า', 'น้ำตาล', 'เขียว', 'เหลือง', 'ส้ม', 'ชมพู', 'อื่นๆ'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Form.Select>
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
                    <Form.Label>เลขตัวถัง (VIN / Chassis No)</Form.Label>
                    <Form.Control type="text" value={vehicle.vin} onChange={e => setVehicle({...vehicle, vin: e.target.value})} />
                  </Col>
                  <Col md={4}>
                    <Form.Label>เลขเครื่องยนต์</Form.Label>
                    <Form.Control type="text" value={vehicle.engine_no} onChange={e => setVehicle({...vehicle, engine_no: e.target.value})} />
                  </Col>
                </Row>

                <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลภาษี และ พ.ร.บ.</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Label>ทุนประกันรถ</Form.Label>
                    <Form.Control type="number" step="0.01" value={vehicle.sum_insured} onChange={e => setVehicle({...vehicle, sum_insured: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>วันภาษีรถหมดอายุ</Form.Label>
                    <Form.Control type="date" value={vehicle.tax_expiry} onChange={e => setVehicle({...vehicle, tax_expiry: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="mb-0">วันเริ่มคุ้มครอง พ.ร.บ.</Form.Label>
                      <div>
                        <Button variant="outline-primary" size="sm" className="me-1 py-0" style={{fontSize:'0.75rem'}} onClick={() => setDateToday(true)}>วันนี้</Button>
                        <Button variant="outline-secondary" size="sm" className="py-0" style={{fontSize:'0.75rem'}} onClick={() => setDateTomorrow(true)}>พรุ่งนี้</Button>
                      </div>
                    </div>
                    <Form.Control type="date" value={policy.prb_start_date || ''} onChange={e => {
                      const start = e.target.value;
                      let end = policy.prb_expiry_date;
                      if (start) {
                        const d = new Date(start);
                        d.setFullYear(d.getFullYear() + 1);
                        end = d.toISOString().split('T')[0];
                      }
                      setPolicy({...policy, prb_start_date: start, prb_expiry_date: end});
                    }} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>วันสิ้นสุดคุ้มครอง พ.ร.บ.</Form.Label>
                    <Form.Control type="date" value={policy.prb_expiry_date} onChange={e => setPolicy({...policy, prb_expiry_date: e.target.value})} />
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
                  <Select options={companies} value={companies.find(c => c.value === policy.company)} onChange={opt => setPolicy({...policy, company: opt?.value || ''})} isClearable />
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
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="mb-0">วันเริ่มคุ้มครอง</Form.Label>
                    <div>
                      <Button variant="outline-primary" size="sm" className="me-1 py-0" style={{fontSize:'0.75rem'}} onClick={() => setDateToday(false)}>วันนี้</Button>
                      <Button variant="outline-secondary" size="sm" className="py-0" style={{fontSize:'0.75rem'}} onClick={() => setDateTomorrow(false)}>พรุ่งนี้</Button>
                    </div>
                  </div>
                  <Form.Control type="date" value={policy.start_date} onChange={e => {
                      const start = e.target.value;
                      let end = policy.expiry_date;
                      if (start) {
                        const d = new Date(start);
                        d.setFullYear(d.getFullYear() + 1);
                        end = d.toISOString().split('T')[0];
                      }
                      setPolicy({...policy, start_date: start, expiry_date: end});
                    }} />
                </Col>
                <Col md={6}>
                  <div className="mb-1"><Form.Label className="mb-0">วันสิ้นสุดคุ้มครอง</Form.Label></div>
                  <Form.Control type="date" value={policy.expiry_date} onChange={e => setPolicy({...policy, expiry_date: e.target.value})} />
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
                      <Form.Control type="date" value={payment.pay_date} onChange={e => setPayment({...payment, pay_date: e.target.value})} />
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
                      <Form.Control type="date" value={payment.pay_date} onChange={e => setPayment({...payment, pay_date: e.target.value})} />
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
                  <Form.Control type="date" value={followUp.next_date} onChange={e => setFollowUp({...followUp, next_date: e.target.value})} />
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
                <label className="btn btn-outline-primary fw-bold px-4 rounded-pill">
                  <i className="bi bi-camera-fill me-2"></i> เปิดกล้องถ่ายรูป
                  <input type="file" accept="image/*" capture="environment" className="d-none" multiple onChange={(e) => {
                    const selected = Array.from(e.target.files);
                    if(selected.length > 0) onDrop(selected);
                  }} />
                </label>
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
                                <img src={f.preview} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' }} />
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

      </Form>
    </div>
  );
};

export default IssuePolicyForm;
