import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import ThaiAddressSelect from '../components/ThaiAddressSelect';

import * as XLSX from 'xlsx';

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

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // Month filter
  const [showModal, setShowModal] = useState(false);
  
  // Master Data
  const [leadSources, setLeadSources] = useState([]);
  
  const prefixes = ['นาย', 'นาง', 'นางสาว', 'บริษัท', 'หจก.', 'คุณ'];

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
    setFormData({ ...formData, dob, age });
  };

  const exportToExcel = () => {
    const dataToExport = customers.map(c => ({
      'รหัสลูกค้า': c.customer_code,
      'คำนำหน้า': c.prefix || '',
      'ชื่อ': c.first_name,
      'นามสกุล': c.last_name,
      'เบอร์โทรศัพท์': c.phone,
      'อีเมล': c.email || '',
      'LINE ID': c.line_id || '',
      'สถานะลูกค้า': c.customer_status,
      'สถานะการขาย': c.lead_status,
      'ที่มา': c.source || '',
      'วันที่สร้าง': c.created_at ? c.created_at.split('T')[0] : ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "customers_export.xlsx");
  };

  const [formData, setFormData] = useState({
    customer_code: '', prefix: '', first_name: '', last_name: '', phone: '', alt_phone: '', email: '', 
    line_id: '', facebook: '', dob: '', age: '', id_card_no: '', address: '', sub_district: '', district: '', province: '', zipcode: '',
    occupation: '', secondary_contact: '', customer_status: 'ลูกค้าใหม่', lead_status: 'สนใจ', source: '', note: ''
  });

  const fetchData = async () => {
    try {
      const [custRes, mdRes] = await Promise.all([
        api.get(`/customers?search=${search}&month=${selectedMonth}`),
        api.get('/master-data')
      ]);
      setCustomers(custRes.data);
      const md = mdRes.data;
      setLeadSources(md.filter(m => m.category === 'LeadSource').map(m => ({ value: m.value, label: m.value })));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedMonth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/customers/${formData.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const openEdit = (c) => {
    setFormData({ 
      ...c, 
      dob: c.dob ? c.dob.split('T')[0] : '',
      customer_status: c.customer_status || 'ลูกค้าใหม่',
      lead_status: c.lead_status || 'สนใจ',
      source: c.source || ''
    });
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    if (status === 'ลูกค้า VIP' || status === 'ปิดการขาย') return <span className="badge bg-success">{status}</span>;
    if (status === 'ลูกค้าหาย' || status === 'ไม่สนใจ') return <span className="badge bg-danger">{status}</span>;
    return <span className="badge bg-primary">{status}</span>;
  };

  const statusOptions = [
    { value: 'ลูกค้าใหม่', label: 'ลูกค้าใหม่' },
    { value: 'ลูกค้าปัจจุบัน', label: 'ลูกค้าปัจจุบัน' },
    { value: 'ลูกค้าต่ออายุ', label: 'ลูกค้าต่ออายุ' },
    { value: 'ลูกค้าหาย', label: 'ลูกค้าหาย' },
    { value: 'ลูกค้า VIP', label: 'ลูกค้า VIP' }
  ];

  const leadOptions = [
    { value: 'สนใจ', label: 'สนใจ' },
    { value: 'ส่งราคาแล้ว', label: 'ส่งราคาแล้ว' },
    { value: 'รอตัดสินใจ', label: 'รอตัดสินใจ' },
    { value: 'ติดตามครั้งที่ 1', label: 'ติดตามครั้งที่ 1' },
    { value: 'ติดตามครั้งที่ 2', label: 'ติดตามครั้งที่ 2' },
    { value: 'ปิดการขาย', label: 'ปิดการขาย' },
    { value: 'ไม่สนใจ', label: 'ไม่สนใจ' }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">ข้อมูลลูกค้า (CRM)</h2>
        <div>
          <button className="btn btn-outline-success fw-bold me-2" onClick={exportToExcel}>
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button className="btn btn-primary fw-bold" onClick={() => { 
            setFormData({
              customer_code: '', prefix: '', first_name: '', last_name: '', phone: '', alt_phone: '', email: '', 
              line_id: '', facebook: '', dob: '', age: '', id_card_no: '', address: '', sub_district: '', district: '', province: '', zipcode: '',
              occupation: '', secondary_contact: '', customer_status: 'ลูกค้าใหม่', lead_status: 'สนใจ', source: '', note: ''
            }); 
            setShowModal(true); 
          }}>
            + เพิ่มลูกค้าใหม่
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body d-flex gap-2 flex-wrap">
          <input 
            type="text" 
            className="form-control form-control-lg flex-grow-1" 
            placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตรประชาชน..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ minWidth: '200px' }}
          />
          <input 
            type="month" 
            className="form-control form-control-lg" 
            style={{ maxWidth: '200px' }}
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
          />
          <button className="btn btn-success fw-bold px-4" onClick={fetchData}>
            <i className="bi bi-funnel-fill"></i> กรองข้อมูล
          </button>
          {selectedMonth && (
            <button className="btn btn-outline-secondary fw-bold" onClick={() => setSelectedMonth('')}>
              ล้างค่า
            </button>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>รหัสลูกค้า</th>
                <th>ชื่อ - นามสกุล</th>
                <th>ข้อมูลติดต่อ</th>
                <th>ทะเบียนรถ</th>
                <th>ประเภทประกันภัย</th>
                <th>สถานะลูกค้า</th>
                <th>สถานะการขาย</th>
                <th>ที่มา (Source)</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? customers.map(c => (
                <tr key={c.id}>
                  <td><span className="badge bg-secondary">{c.customer_code}</span></td>
                  <td><strong>{c.prefix}{c.first_name} {c.last_name}</strong></td>
                  <td>
                    <div className="small"><i className="bi bi-telephone-fill text-muted"></i> {c.phone}</div>
                    {c.line_id && <div className="small text-success"><i className="bi bi-line"></i> {c.line_id}</div>}
                  </td>
                  <td><span className="fw-bold text-dark">{c.plate_no || '-'}</span></td>
                  <td>{c.motor_type || c.non_motor_type ? <span className={`badge ${c.motor_type ? 'bg-primary' : 'bg-info'}`}>{c.motor_type || c.non_motor_type}</span> : '-'}</td>
                  <td>{getStatusBadge(c.customer_status)}</td>
                  <td>{getStatusBadge(c.lead_status)}</td>
                  <td>{c.source || '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(c)}>
                      <i className="bi bi-pencil-square"></i> แก้ไข
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="9" className="text-center py-4">ไม่พบข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{formData.id ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row g-3">
              <h5 className="text-primary border-bottom pb-2">ข้อมูลส่วนตัว</h5>
              <div className="col-md-3">
                <Form.Label>รหัสลูกค้า</Form.Label>
                <Form.Control type="text" value={formData.customer_code} onChange={e => setFormData({...formData, customer_code: e.target.value})} required disabled={!!formData.id} placeholder="CUS-YYYY-XXXX" />
              </div>
              <div className="col-md-4">
                <Form.Label>เลขบัตรประชาชน / เลขนิติบุคคล</Form.Label>
                <Form.Control type="text" value={formData.id_card_no || ''} onChange={e => setFormData({...formData, id_card_no: formatIdCard(e.target.value)})} maxLength={17} />
              </div>
              <div className="col-md-2">
                <Form.Label>คำนำหน้า</Form.Label>
                <Form.Select value={formData.prefix || ''} onChange={e => setFormData({...formData, prefix: e.target.value})}>
                  <option value="">เลือก...</option>
                  {prefixes.map(p => <option key={p} value={p}>{p}</option>)}
                </Form.Select>
              </div>
              <div className="col-md-4">
                <Form.Label>ชื่อ <span className="text-danger">*</span></Form.Label>
                <Form.Control type="text" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
              </div>
              <div className="col-md-4">
                <Form.Label>นามสกุล <span className="text-danger">*</span></Form.Label>
                <Form.Control type="text" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
              </div>
              <div className="col-md-4">
                <Form.Label>วันเกิด</Form.Label>
                <Form.Control type="date" value={formData.dob || ''} onChange={handleDobChange} />
              </div>
              <div className="col-md-2">
                <Form.Label>อายุ (ปี)</Form.Label>
                <Form.Control type="number" value={formData.age || ''} readOnly className="bg-light" />
              </div>
              <div className="col-md-2">
                <Form.Label>อาชีพ</Form.Label>
                <Form.Control type="text" value={formData.occupation || ''} onChange={e => setFormData({...formData, occupation: e.target.value})} />
              </div>

              <h5 className="text-primary border-bottom pb-2 mt-4">ข้อมูลติดต่อ</h5>
              <div className="col-md-3">
                <Form.Label>เบอร์โทรศัพท์ <span className="text-danger">*</span></Form.Label>
                <Form.Control required type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} maxLength={12} />
              </div>
              <div className="col-md-3">
                <Form.Label>เบอร์สำรอง</Form.Label>
                <Form.Control type="text" value={formData.alt_phone || ''} onChange={e => setFormData({...formData, alt_phone: formatPhone(e.target.value)})} maxLength={12} />
              </div>
              <div className="col-md-3">
                <Form.Label>อีเมล</Form.Label>
                <Form.Control type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="col-md-3">
                <Form.Label>LINE ID</Form.Label>
                <Form.Control type="text" value={formData.line_id || ''} onChange={e => setFormData({...formData, line_id: e.target.value})} />
              </div>
              <div className="col-md-4 mt-3">
                <Form.Label>Facebook</Form.Label>
                <Form.Control type="text" value={formData.facebook || ''} onChange={e => setFormData({...formData, facebook: e.target.value})} />
              </div>
              <div className="col-md-4">
                <Form.Label>ผู้ติดต่อสำรอง</Form.Label>
                <Form.Control type="text" value={formData.secondary_contact || ''} onChange={e => setFormData({...formData, secondary_contact: e.target.value})} />
              </div>

              <h5 className="text-primary border-bottom pb-2 mt-4">ที่อยู่จัดส่งเอกสาร</h5>
              <div className="col-md-12">
                <Form.Label>รายละเอียดที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน)</Form.Label>
                <Form.Control as="textarea" rows={2} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <ThaiAddressSelect 
                province={formData.province}
                district={formData.district}
                sub_district={formData.sub_district}
                zipcode={formData.zipcode}
                onChange={(addr) => setFormData({ ...formData, ...addr })}
              />

              <h5 className="text-primary border-bottom pb-2 mt-4">การจัดการงานขาย (CRM)</h5>
              <div className="col-md-4">
                <Form.Label>สถานะลูกค้า</Form.Label>
                <Select
                  options={statusOptions}
                  value={statusOptions.find(s => s.value === formData.customer_status)}
                  onChange={option => setFormData({...formData, customer_status: option?.value || 'ลูกค้าใหม่'})}
                />
              </div>
              <div className="col-md-4">
                <Form.Label>สถานะการขาย (Lead Tracking)</Form.Label>
                <Select
                  options={leadOptions}
                  value={leadOptions.find(l => l.value === formData.lead_status)}
                  onChange={option => setFormData({...formData, lead_status: option?.value || 'สนใจ'})}
                />
              </div>
              <div className="col-md-4">
                <Form.Label>แหล่งที่มา (Source)</Form.Label>
                <Select
                  options={leadSources}
                  value={leadSources.find(l => l.value === formData.source)}
                  onChange={option => setFormData({...formData, source: option?.value || ''})}
                  isClearable
                />
              </div>
              <div className="col-12">
                <Form.Label>หมายเหตุเพิ่มเติม</Form.Label>
                <Form.Control as="textarea" rows={3} value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>
            </div>
            <div className="text-end mt-4 pt-3 border-top">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="submit">บันทึกข้อมูล</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Customers;
