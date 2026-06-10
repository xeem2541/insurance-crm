import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';

import * as XLSX from 'xlsx';

const Policies = () => {
  const [policies, setPolicies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [search, setSearch] = useState(() => sessionStorage.getItem('policiesSearch') || '');
  const [showModal, setShowModal] = useState(false);
  
  // Master Data States
  const [policyTypes, setPolicyTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobStatuses, setJobStatuses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const exportToExcel = () => {
    const dataToExport = policies.map(p => ({
      'เลขกรมธรรม์': p.policy_no,
      'ลูกค้า': `${p.first_name} ${p.last_name}`,
      'ทะเบียนรถ': p.plate_no || '-',
      'บริษัทประกัน': p.company,
      'ประเภท': p.type,
      'เบี้ยรวม': p.total_premium,
      'คอมมิชชั่น': p.commission_baht,
      'วันเริ่มคุ้มครอง': p.start_date ? p.start_date.split('T')[0] : '',
      'วันสิ้นสุด': p.expiry_date ? p.expiry_date.split('T')[0] : '',
      'สถานะ': p.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Policies");
    XLSX.writeFile(wb, "policies_export.xlsx");
  };

  const [formData, setFormData] = useState({
    id: null, customer_id: '', vehicle_id: '', policy_no: '', company: '', type: '', 
    sum_insured: '', net_premium: '', stamp_duty: '', vat: '', total_premium: '',
    commission_percent: '', commission_baht: '', payment_method: '', 
    start_date: '', expiry_date: '', status: 'รอดำเนินการ', sales_person_id: ''
  });

  const fetchData = async () => {
    try {
      const [polRes, custRes, vehRes, mdRes] = await Promise.all([
        api.get(`/policies?search=${search}`),
        api.get('/customers'),
        api.get('/vehicles'),
        api.get('/master-data')
      ]);
      setPolicies(polRes.data);
      setCustomers(custRes.data);
      setVehicles(vehRes.data);
      
      const md = mdRes.data;
      setPolicyTypes(md.filter(m => m.category === 'PolicyType').map(m => ({ value: m.value, label: m.value })));
      setCompanies(md.filter(m => m.category === 'InsuranceCompany').map(m => ({ value: m.value, label: m.value })));
      setJobStatuses(md.filter(m => m.category === 'JobStatus').map(m => ({ value: m.value, label: m.value })));
      setPaymentMethods(md.filter(m => m.category === 'PaymentMethod').map(m => ({ value: m.value, label: m.value })));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    sessionStorage.setItem('policiesSearch', search);
    fetchData();
  }, [search]);

  const handleCalculate = () => {
    const net = parseFloat(formData.net_premium) || 0;
    const stamp = Math.ceil(net * 0.004);
    const v = parseFloat(((net + stamp) * 0.07).toFixed(2));
    const total = net + stamp + v;
    const percent = parseFloat(formData.commission_percent) || 0;
    const comm = parseFloat((net * (percent / 100)).toFixed(2));
    
    setFormData({
      ...formData,
      stamp_duty: stamp,
      vat: v,
      total_premium: total,
      commission_baht: comm
    });
  };

  const handleOpenModal = (p = null) => {
    if (p) {
      setFormData({
        id: p.id,
        customer_id: p.customer_id,
        vehicle_id: p.vehicle_id || '',
        policy_no: p.policy_no,
        company: p.company,
        type: p.type,
        sum_insured: p.sum_insured || '',
        net_premium: p.net_premium || '',
        stamp_duty: p.stamp_duty || '',
        vat: p.vat || '',
        total_premium: p.total_premium || '',
        commission_percent: p.commission_percent || '',
        commission_baht: p.commission_baht || '',
        payment_method: p.payment_method || '',
        start_date: p.start_date ? p.start_date.split('T')[0] : '',
        expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
        status: p.status,
        sales_person_id: p.sales_person_id || ''
      });
    } else {
      setFormData({
        id: null, customer_id: '', vehicle_id: '', policy_no: '', company: '', type: '', 
        sum_insured: '', net_premium: '', stamp_duty: '', vat: '', total_premium: '',
        commission_percent: '', commission_baht: '', payment_method: '', 
        start_date: '', expiry_date: '', status: 'รอดำเนินการ', sales_person_id: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/policies/${formData.id}`, formData);
      } else {
        await api.post('/policies', formData);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'สำเร็จ' || status === 'ชำระครบแล้ว' || status === 'Active') return <span className="badge bg-success">{status}</span>;
    if (status === 'รอดำเนินการ' || status === 'รอถ่ายรูปรถ' || status === 'รอผ่อนชำระ') return <span className="badge bg-warning text-dark">{status}</span>;
    return <span className="badge bg-secondary">{status}</span>;
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.customer_code} - ${c.first_name} ${c.last_name}` }));
  const vehicleOptions = vehicles.filter(v => v.customer_id === formData.customer_id).map(v => ({ value: v.id, label: `${v.plate_no} ${v.plate_province} - ${v.brand}` }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">จัดการข้อมูลกรมธรรม์</h2>
        <div>
          <button className="btn btn-outline-success fw-bold me-2" onClick={exportToExcel}>
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
            + เพิ่มกรมธรรม์
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <input 
            type="text" 
            className="form-control form-control-lg" 
            placeholder="ค้นหาเลขกรมธรรม์, ชื่อลูกค้า, ทะเบียนรถ..." 
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
                <th>เลขกรมธรรม์</th>
                <th>ลูกค้า</th>
                <th>ทะเบียนรถ</th>
                <th>บริษัทประกัน / ประเภท</th>
                <th>เบี้ยรวม</th>
                <th>คอมมิชชั่น</th>
                <th>วันเริ่ม - สิ้นสุด</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {policies.length > 0 ? policies.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.policy_no}</strong></td>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.plate_no ? `${p.plate_no}` : '-'}</td>
                  <td>{p.company}<br/><small className="text-muted">{p.type}</small></td>
                  <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.total_premium)}</td>
                  <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.commission_baht)}</td>
                  <td>{new Date(p.start_date).toLocaleDateString('th-TH')} - {new Date(p.expiry_date).toLocaleDateString('th-TH')}</td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(p)} title="แก้ไข">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => window.open(`/print-policy/${p.id}`, '_blank')} title="พิมพ์ใบเสนอราคา">
                      <i className="bi bi-file-pdf"></i>
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
          <Modal.Title>{formData.id ? 'แก้ไขกรมธรรม์' : 'เพิ่มกรมธรรม์ใหม่'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Label>ลูกค้า <span className="text-danger">*</span></Form.Label>
                <Select
                  options={customerOptions}
                  value={customerOptions.find(c => c.value === formData.customer_id)}
                  onChange={option => setFormData({...formData, customer_id: option?.value || '', vehicle_id: ''})}
                  isDisabled={formData.id !== null}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                  required
                />
              </div>
              <div className="col-md-6">
                <Form.Label>รถยนต์ (อ้างอิงจากลูกค้า)</Form.Label>
                <Select
                  options={vehicleOptions}
                  value={vehicleOptions.find(v => v.value === formData.vehicle_id)}
                  onChange={option => setFormData({...formData, vehicle_id: option?.value || ''})}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                  isDisabled={!formData.customer_id}
                />
              </div>

              <div className="col-12"><hr/></div>

              <div className="col-md-4">
                <Form.Label>เลขกรมธรรม์ <span className="text-danger">*</span></Form.Label>
                <Form.Control type="text" value={formData.policy_no} onChange={e => setFormData({...formData, policy_no: e.target.value})} required />
              </div>
              <div className="col-md-4">
                <Form.Label>บริษัทประกัน <span className="text-danger">*</span></Form.Label>
                <Select
                  options={companies}
                  value={companies.find(c => c.value === formData.company)}
                  onChange={option => setFormData({...formData, company: option?.value || ''})}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                  required
                />
              </div>
              <div className="col-md-4">
                <Form.Label>ประเภทประกัน <span className="text-danger">*</span></Form.Label>
                <Select
                  options={policyTypes}
                  value={policyTypes.find(p => p.value === formData.type)}
                  onChange={option => {
                    const selectedType = option?.value || '';
                    let newPercent = formData.commission_percent;

                    // กำหนดค่า % ตามประเภทกรมธรรม์
                    if (selectedType.includes('2+')) {
                      newPercent = 25;
                    } else if (selectedType.includes('3+')) {
                      newPercent = 25;
                    } else if (selectedType.includes('3')) {
                      newPercent = 18;
                    } else if (selectedType.includes('1')) {
                      newPercent = 18;
                    }

                    // คำนวณคอมมิชชันเป็นบาทใหม่
                    const net = parseFloat(formData.net_premium) || 0;
                    let newCommBaht = formData.commission_baht;
                    if (newPercent !== formData.commission_percent && net > 0) {
                      newCommBaht = parseFloat((net * (newPercent / 100)).toFixed(2));
                    }

                    setFormData({
                      ...formData, 
                      type: selectedType,
                      commission_percent: newPercent,
                      commission_baht: newCommBaht !== formData.commission_baht ? newCommBaht : formData.commission_baht
                    });
                  }}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                  required
                />
              </div>

              <div className="col-md-3">
                <Form.Label>ทุนประกัน</Form.Label>
                <Form.Control type="number" step="0.01" value={formData.sum_insured} onChange={e => setFormData({...formData, sum_insured: e.target.value})} />
              </div>
              <div className="col-md-3">
                <Form.Label>วันเริ่มคุ้มครอง <span className="text-danger">*</span></Form.Label>
                <Form.Control type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <Form.Label>วันหมดอายุ <span className="text-danger">*</span></Form.Label>
                <Form.Control type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <Form.Label>สถานะงาน</Form.Label>
                <Select
                  options={jobStatuses}
                  value={jobStatuses.find(j => j.value === formData.status)}
                  onChange={option => setFormData({...formData, status: option?.value || ''})}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                />
              </div>

              <div className="col-12"><hr/></div>

              {/* Premium Calculation Block */}
              <div className="col-md-12 mb-2 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-primary fw-bold">ส่วนคำนวณเบี้ยและคอมมิชชัน</h5>
                <Button variant="outline-success" size="sm" onClick={handleCalculate}><i className="bi bi-calculator"></i> คำนวณอัตโนมัติ</Button>
              </div>

              <div className="col-md-3">
                <Form.Label>เบี้ยสุทธิ</Form.Label>
                <Form.Control type="number" step="0.01" value={formData.net_premium} onChange={e => setFormData({...formData, net_premium: e.target.value})} onBlur={handleCalculate} />
              </div>
              <div className="col-md-3">
                <Form.Label>อากรแสตมป์</Form.Label>
                <Form.Control type="number" step="0.01" value={formData.stamp_duty} onChange={e => setFormData({...formData, stamp_duty: e.target.value})} />
              </div>
              <div className="col-md-3">
                <Form.Label>VAT (7%)</Form.Label>
                <Form.Control type="number" step="0.01" value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} />
              </div>
              <div className="col-md-3">
                <Form.Label className="fw-bold text-success">เบี้ยรวม (Total)</Form.Label>
                <Form.Control type="number" step="0.01" className="bg-light fw-bold text-success" value={formData.total_premium} onChange={e => setFormData({...formData, total_premium: e.target.value})} />
              </div>

              <div className="col-md-3">
                <Form.Label>ค่าคอมฯ (%)</Form.Label>
                <Form.Control type="number" step="0.01" value={formData.commission_percent} onChange={e => setFormData({...formData, commission_percent: e.target.value})} onBlur={handleCalculate} />
              </div>
              <div className="col-md-3">
                <Form.Label className="fw-bold text-danger">คอมมิชชัน (บาท)</Form.Label>
                <Form.Control type="number" step="0.01" className="bg-light fw-bold text-danger" value={formData.commission_baht} onChange={e => setFormData({...formData, commission_baht: e.target.value})} />
              </div>
              <div className="col-md-6">
                <Form.Label>วิธีชำระเงิน</Form.Label>
                <Select
                  options={paymentMethods}
                  value={paymentMethods.find(m => m.value === formData.payment_method)}
                  onChange={option => setFormData({...formData, payment_method: option?.value || ''})}
                  isClearable
                  placeholder="เลือก..."
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                />
              </div>

            </div>
            <div className="text-end mt-4 pt-3 border-top">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="submit">บันทึกกรมธรรม์</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Policies;
