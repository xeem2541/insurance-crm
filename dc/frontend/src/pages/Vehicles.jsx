import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import { carBrands, carModels } from '../data/carData';

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543; // convert to Buddhist Era
  return `${day}/${month}/${year}`;
};

const provincesList = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 
  'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 
  'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 
  'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
].map(p => ({ value: p, label: p }));

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Master Data
  const [vehicleTypes, setVehicleTypes] = useState([]);

  const [formData, setFormData] = useState({
    id: null, customer_id: '', vehicle_type: '', brand: '', model: '', year: '', color: '', 
    plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: '', act_expiry: ''
  });

  const fetchData = async () => {
    try {
      const [vehRes, custRes, mdRes] = await Promise.all([
        api.get(`/vehicles?search=${search}`),
        api.get('/customers'),
        api.get('/master-data?category=VehicleType')
      ]);
      setVehicles(vehRes.data);
      setCustomers(custRes.data);
      setVehicleTypes(mdRes.data.map(m => ({ value: m.value, label: m.value })));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenModal = (v = null) => {
    if (v) {
      setFormData({
        id: v.id, customer_id: v.customer_id, vehicle_type: v.vehicle_type, brand: v.brand, 
        model: v.model, year: v.year, color: v.color, plate_no: v.plate_no, plate_province: v.plate_province, 
        vin: v.vin, engine_no: v.engine_no, sum_insured: v.sum_insured, 
        tax_expiry: v.tax_expiry ? v.tax_expiry.split('T')[0] : '', 
        act_expiry: v.act_expiry ? v.act_expiry.split('T')[0] : ''
      });
    } else {
      setFormData({
        id: null, customer_id: '', vehicle_type: '', brand: '', model: '', year: '', color: '', 
        plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: '', act_expiry: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/vehicles/${formData.id}`, formData);
      } else {
        await api.post('/vehicles', formData);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('ยืนยันการลบข้อมูลรถยนต์?')) {
      try {
        await api.delete(`/vehicles/${id}`);
        fetchData();
      } catch (error) {
        alert('เกิดข้อผิดพลาด');
      }
    }
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.customer_code} - ${c.first_name} ${c.last_name}` }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">ข้อมูลรถยนต์ (Vehicles)</h2>
        <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
          + เพิ่มรถยนต์
        </button>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <input 
            type="text" 
            className="form-control form-control-lg" 
            placeholder="ค้นหาทะเบียนรถ, ชื่อลูกค้า, เลขตัวถัง..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>ทะเบียนรถ</th>
                <th>ลูกค้า</th>
                <th>ยี่ห้อ/รุ่น</th>
                <th>ประเภทรถ</th>
                <th>วันหมดภาษี</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length > 0 ? vehicles.map(v => (
                <tr key={v.id}>
                  <td><strong>{v.plate_no} {v.plate_province}</strong></td>
                  <td>{v.first_name} {v.last_name}</td>
                  <td>{v.brand} {v.model} ({v.year})</td>
                  <td>{v.vehicle_type}</td>
                  <td>{v.tax_expiry ? formatThaiDate(v.tax_expiry) : '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(v)}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(v.id)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-4">ไม่พบข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{formData.id ? 'แก้ไขข้อมูลรถยนต์' : 'เพิ่มรถยนต์ใหม่'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-12">
                <Form.Label>ลูกค้า <span className="text-danger">*</span></Form.Label>
                <Select
                  options={customerOptions}
                  value={customerOptions.find(c => c.value === formData.customer_id)}
                  onChange={option => setFormData({...formData, customer_id: option?.value || ''})}
                  isDisabled={formData.id !== null}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                  required
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ทะเบียนรถ <span className="text-danger">*</span></Form.Label>
                <Form.Control type="text" value={formData.plate_no} onChange={e => setFormData({...formData, plate_no: e.target.value})} required />
              </div>
              <div className="col-md-6">
                <Form.Label>จังหวัดทะเบียน</Form.Label>
                <Select 
                  options={provincesList} 
                  value={provincesList.find(p => p.value === formData.plate_province)} 
                  onChange={opt => setFormData({...formData, plate_province: opt?.value || ''})} 
                  isClearable 
                  placeholder="เลือกจังหวัด..."
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ประเภทรถ <span className="text-danger">*</span></Form.Label>
                <Select
                  options={vehicleTypes}
                  value={vehicleTypes.find(t => t.value === formData.vehicle_type)}
                  onChange={option => setFormData({...formData, vehicle_type: option?.value || ''})}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                  required
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ยี่ห้อ (Brand)</Form.Label>
                <Form.Select value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value, model: ''})}>
                  <option value="">เลือกยี่ห้อ...</option>
                  {carBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>รุ่น (Model)</Form.Label>
                <Form.Select value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}>
                  <option value="">เลือกรุ่น...</option>
                  {(carModels[formData.brand] || []).map(m => <option key={m} value={m}>{m}</option>)}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>ปีจดทะเบียน (Year)</Form.Label>
                <Form.Select value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
                  <option value="">เลือกปี...</option>
                  {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>สีรถ</Form.Label>
                <Form.Select value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}>
                  <option value="">เลือกสี...</option>
                  {['ขาว', 'ดำ', 'เทา', 'บรอนซ์เงิน', 'บรอนซ์ทอง', 'แดง', 'น้ำเงิน', 'ฟ้า', 'น้ำตาล', 'เขียว', 'เหลือง', 'ส้ม', 'ชมพู', 'อื่นๆ'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>ทุนประกันที่แนะนำ (บาท)</Form.Label>
                <Form.Control type="number" step="0.01" value={formData.sum_insured} onChange={e => setFormData({...formData, sum_insured: e.target.value})} />
              </div>
              <div className="col-md-6">
                <Form.Label>เลขตัวถัง (VIN)</Form.Label>
                <Form.Control type="text" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} />
              </div>
              <div className="col-md-6">
                <Form.Label>เลขเครื่องยนต์</Form.Label>
                <Form.Control type="text" value={formData.engine_no} onChange={e => setFormData({...formData, engine_no: e.target.value})} />
              </div>
              <div className="col-md-6">
                <Form.Label>วันหมดอายุภาษี (ป้ายวงกลม)</Form.Label>
                <Form.Control type="date" value={formData.tax_expiry} onChange={e => setFormData({...formData, tax_expiry: e.target.value})} />
              </div>
              <div className="col-md-6">
                <Form.Label>วันหมดอายุ พ.ร.บ.</Form.Label>
                <Form.Control type="date" value={formData.act_expiry} onChange={e => setFormData({...formData, act_expiry: e.target.value})} />
              </div>
            </div>
            <div className="text-end mt-4">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="submit">บันทึกข้อมูล</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Vehicles;
