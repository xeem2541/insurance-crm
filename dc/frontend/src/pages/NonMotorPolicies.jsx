import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import * as XLSX from 'xlsx';

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543; // convert to Buddhist Era
  return `${day}/${month}/${year}`;
};

const NonMotorPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'descending' });

  const sortedPolicies = React.useMemo(() => {
    let sortablePolicies = [...policies];
    if (sortConfig !== null) {
      sortablePolicies.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'start_date' || sortConfig.key === 'expiry_date') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        } else if (sortConfig.key === 'total_premium' || sortConfig.key === 'commission_baht' || sortConfig.key === 'sum_insured') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortablePolicies;
  }, [policies, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Master Data
  const [nonMotorTypes, setNonMotorTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobStatuses, setJobStatuses] = useState([]);

  const [formData, setFormData] = useState({
    id: null, customer_id: '', policy_no: '', company: '', non_motor_type_id: '', insured_name: '',
    sum_insured: '', net_premium: '', stamp_duty: '', vat: '', total_premium: '',
    commission_percent: '', commission_baht: '', start_date: '', expiry_date: '', 
    status: 'รอดำเนินการ', note: '', additional_data: {}
  });

  const fetchData = async () => {
    try {
      const [polRes, custRes, typesRes, mdRes] = await Promise.all([
        api.get(`/non-motor-policies?search=${search}`),
        api.get('/customers'),
        api.get('/non-motor-policies/types'),
        api.get('/master-data')
      ]);
      setPolicies(polRes.data);
      setCustomers(custRes.data);
      setNonMotorTypes(typesRes.data.map(t => ({ value: t.id, label: t.name })));
      
      const md = mdRes.data;
      setCompanies(md.filter(m => m.category === 'InsuranceCompany').map(m => ({ value: m.value, label: m.value })));
      setJobStatuses(md.filter(m => m.category === 'JobStatus').map(m => ({ value: m.value, label: m.value })));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const exportToExcel = () => {
    const dataToExport = policies.map(p => ({
      'เลขกรมธรรม์': p.policy_no,
      'ลูกค้า': `${p.first_name} ${p.last_name}`,
      'ผู้เอาประกันภัย': p.insured_name || '-',
      'บริษัทประกัน': p.company,
      'ประเภทประกัน': p.type_name,
      'เบี้ยรวม': p.total_premium,
      'คอมมิชชั่น': p.commission_baht,
      'วันเริ่มคุ้มครอง': p.start_date ? p.start_date.split('T')[0] : '',
      'วันสิ้นสุด': p.expiry_date ? p.expiry_date.split('T')[0] : '',
      'สถานะ': p.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NonMotorPolicies");
    XLSX.writeFile(wb, "non_motor_policies.xlsx");
  };

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
        ...p,
        start_date: p.start_date ? p.start_date.split('T')[0] : '',
        expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
        additional_data: typeof p.additional_data === 'string' ? JSON.parse(p.additional_data) : (p.additional_data || {})
      });
    } else {
      setFormData({
        id: null, customer_id: '', policy_no: '', company: '', non_motor_type_id: '', insured_name: '',
        sum_insured: '', net_premium: '', stamp_duty: '', vat: '', total_premium: '',
        commission_percent: '', commission_baht: '', start_date: '', expiry_date: '', 
        status: 'รอดำเนินการ', note: '', additional_data: {}
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/non-motor-policies/${formData.id}`, formData);
      } else {
        await api.post('/non-motor-policies', formData);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      try {
        await api.delete(`/non-motor-policies/${id}`);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };

  const updateAdditionalData = (key, value) => {
    setFormData({
      ...formData,
      additional_data: {
        ...formData.additional_data,
        [key]: value
      }
    });
  };

  const renderDynamicFields = () => {
    const typeId = parseInt(formData.non_motor_type_id);
    if (!typeId) return null;

    const t = nonMotorTypes.find(x => x.value === typeId)?.label || '';

    if (t.includes('PA') || t.includes('อุบัติเหตุ')) {
      return (
        <>
          <div className="col-md-4"><Form.Label>จำนวนผู้เอาประกัน</Form.Label><Form.Control type="number" value={formData.additional_data.pa_insured_count || ''} onChange={e => updateAdditionalData('pa_insured_count', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>วงเงินคุ้มครอง</Form.Label><Form.Control type="text" value={formData.additional_data.pa_coverage || ''} onChange={e => updateAdditionalData('pa_coverage', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>อาชีพ</Form.Label><Form.Control type="text" value={formData.additional_data.pa_occupation || ''} onChange={e => updateAdditionalData('pa_occupation', e.target.value)} /></div>
        </>
      );
    } else if (t.includes('ขนส่ง')) {
      return (
        <>
          <div className="col-md-4"><Form.Label>ประเภทสินค้า</Form.Label><Form.Control type="text" value={formData.additional_data.cargo_type || ''} onChange={e => updateAdditionalData('cargo_type', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>มูลค่าสินค้า</Form.Label><Form.Control type="text" value={formData.additional_data.cargo_value || ''} onChange={e => updateAdditionalData('cargo_value', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>เส้นทางขนส่ง</Form.Label><Form.Control type="text" value={formData.additional_data.cargo_route || ''} onChange={e => updateAdditionalData('cargo_route', e.target.value)} /></div>
        </>
      );
    } else if (t.includes('อัคคีภัย') || t.includes('ไฟไหม้')) {
      return (
        <>
          <div className="col-md-4"><Form.Label>ประเภททรัพย์สิน</Form.Label><Form.Control type="text" value={formData.additional_data.fire_property_type || ''} onChange={e => updateAdditionalData('fire_property_type', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>ที่ตั้งทรัพย์สิน</Form.Label><Form.Control type="text" value={formData.additional_data.fire_location || ''} onChange={e => updateAdditionalData('fire_location', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>มูลค่าทรัพย์สิน</Form.Label><Form.Control type="text" value={formData.additional_data.fire_value || ''} onChange={e => updateAdditionalData('fire_value', e.target.value)} /></div>
        </>
      );
    } else if (t.includes('รับผิดต่อบุคคลภายนอก')) {
      return (
        <>
          <div className="col-md-6"><Form.Label>ประเภทธุรกิจ</Form.Label><Form.Control type="text" value={formData.additional_data.liability_business_type || ''} onChange={e => updateAdditionalData('liability_business_type', e.target.value)} /></div>
          <div className="col-md-6"><Form.Label>วงเงินคุ้มครอง</Form.Label><Form.Control type="text" value={formData.additional_data.liability_coverage || ''} onChange={e => updateAdditionalData('liability_coverage', e.target.value)} /></div>
        </>
      );
    } else if (t.includes('รับเหมา')) {
      return (
        <>
          <div className="col-md-4"><Form.Label>ชื่อโครงการ</Form.Label><Form.Control type="text" value={formData.additional_data.construct_project_name || ''} onChange={e => updateAdditionalData('construct_project_name', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>มูลค่าโครงการ</Form.Label><Form.Control type="text" value={formData.additional_data.construct_value || ''} onChange={e => updateAdditionalData('construct_value', e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>ระยะเวลาก่อสร้าง</Form.Label><Form.Control type="text" value={formData.additional_data.construct_period || ''} onChange={e => updateAdditionalData('construct_period', e.target.value)} /></div>
        </>
      );
    } else if (t.includes('วิชาชีพ')) {
      return (
        <>
          <div className="col-md-6"><Form.Label>ประเภทวิชาชีพ</Form.Label><Form.Control type="text" value={formData.additional_data.prof_type || ''} onChange={e => updateAdditionalData('prof_type', e.target.value)} /></div>
          <div className="col-md-6"><Form.Label>วงเงินคุ้มครอง</Form.Label><Form.Control type="text" value={formData.additional_data.prof_coverage || ''} onChange={e => updateAdditionalData('prof_coverage', e.target.value)} /></div>
        </>
      );
    } else if (t.includes('สุขภาพ')) {
      return (
        <>
          <div className="col-md-6"><Form.Label>แผนประกัน</Form.Label><Form.Control type="text" value={formData.additional_data.health_plan || ''} onChange={e => updateAdditionalData('health_plan', e.target.value)} /></div>
          <div className="col-md-6"><Form.Label>อายุผู้เอาประกัน</Form.Label><Form.Control type="number" value={formData.additional_data.health_age || ''} onChange={e => updateAdditionalData('health_age', e.target.value)} /></div>
        </>
      );
    } else if (t.includes('เงินออม') || t.includes('T Life')) {
      return (
        <>
          <div className="col-md-3"><Form.Label>แบบประกัน</Form.Label><Form.Control type="text" value={formData.additional_data.saving_plan || ''} onChange={e => updateAdditionalData('saving_plan', e.target.value)} /></div>
          <div className="col-md-3"><Form.Label>ระยะเวลาชำระเบี้ย</Form.Label><Form.Control type="text" value={formData.additional_data.saving_pay_period || ''} onChange={e => updateAdditionalData('saving_pay_period', e.target.value)} /></div>
          <div className="col-md-3"><Form.Label>ระยะเวลาคุ้มครอง</Form.Label><Form.Control type="text" value={formData.additional_data.saving_cover_period || ''} onChange={e => updateAdditionalData('saving_cover_period', e.target.value)} /></div>
          <div className="col-md-3"><Form.Label>มูลค่าเวนคืน</Form.Label><Form.Control type="text" value={formData.additional_data.saving_surrender || ''} onChange={e => updateAdditionalData('saving_surrender', e.target.value)} /></div>
        </>
      );
    }
    return null;
  };

  const getStatusBadge = (status) => {
    if (status === 'สำเร็จ' || status === 'ชำระครบแล้ว' || status === 'Active') return <span className="badge bg-success">{status}</span>;
    if (status === 'รอดำเนินการ') return <span className="badge bg-warning text-dark">{status}</span>;
    return <span className="badge bg-secondary">{status}</span>;
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.customer_code} - ${c.first_name} ${c.last_name}` }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">จัดการกรมธรรม์ Non-Motor (ประกันวินาศภัยอื่น)</h2>
        <div>
          <button className="btn btn-outline-success fw-bold me-2" onClick={exportToExcel}>
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
            + เพิ่มกรมธรรม์ Non-Motor
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <input 
            type="text" 
            className="form-control form-control-lg" 
            placeholder="ค้นหาเลขกรมธรรม์, ชื่อลูกค้า..." 
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
                <th>ลูกค้า / ผู้เอาประกัน</th>
                <th>ประเภทประกัน / บริษัท</th>
                <th>ทุนประกัน</th>
                <th>เบี้ยรวม</th>
                <th>คอมมิชชั่น</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('start_date')}>
                  วันเริ่ม - สิ้นสุด {sortConfig.key === 'start_date' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '⇅'}
                </th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {sortedPolicies.length > 0 ? sortedPolicies.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.policy_no}</strong></td>
                  <td>{p.first_name} {p.last_name}<br/><small className="text-muted">{p.insured_name}</small></td>
                  <td>{p.type_name}<br/><small className="text-muted">{p.company}</small></td>
                  <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.sum_insured)}</td>
                  <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.total_premium)}</td>
                  <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.commission_baht)}</td>
                  <td>{formatThaiDate(p.start_date)} - {formatThaiDate(p.expiry_date)}</td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(p)} title="แก้ไข">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)} title="ลบ">
                      <i className="bi bi-trash"></i>
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
          <Modal.Title>{formData.id ? 'แก้ไขกรมธรรม์ Non-Motor' : 'เพิ่มกรมธรรม์ Non-Motor'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Label>ลูกค้าอ้างอิง <span className="text-danger">*</span></Form.Label>
                <Select
                  options={customerOptions}
                  value={customerOptions.find(c => c.value === formData.customer_id)}
                  onChange={option => setFormData({...formData, customer_id: option?.value || ''})}
                  isDisabled={formData.id !== null}
                  isClearable
                  placeholder="เลือก..."
                  required
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ชื่อผู้เอาประกันภัย (ถ้าไม่ระบุ จะยึดตามชื่อลูกค้า)</Form.Label>
                <Form.Control type="text" value={formData.insured_name} onChange={e => setFormData({...formData, insured_name: e.target.value})} placeholder="ระบุชื่อ-นามสกุล..." />
              </div>

              <div className="col-12"><hr/></div>

              <div className="col-md-4">
                <Form.Label>ประเภท Non-Motor <span className="text-danger">*</span></Form.Label>
                <Select
                  options={nonMotorTypes}
                  value={nonMotorTypes.find(t => t.value === formData.non_motor_type_id)}
                  onChange={option => setFormData({...formData, non_motor_type_id: option?.value || ''})}
                  isClearable
                  placeholder="เลือก..."
                  required
                />
              </div>
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
                  required
                />
              </div>

              {/* Dynamic Fields Section */}
              {formData.non_motor_type_id && (
                <>
                  <div className="col-12 mt-4">
                    <h5 className="text-primary border-bottom pb-2">ข้อมูลเพิ่มเติมเฉพาะประเภท</h5>
                  </div>
                  {renderDynamicFields()}
                </>
              )}

              <div className="col-12 mt-4"><hr/></div>

              <div className="col-md-3">
                <Form.Label>ทุนประกันรวม</Form.Label>
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
                <Form.Label>สถานะกรมธรรม์</Form.Label>
                <Select
                  options={jobStatuses}
                  value={jobStatuses.find(j => j.value === formData.status)}
                  onChange={option => setFormData({...formData, status: option?.value || ''})}
                  isClearable
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
              
              <div className="col-12">
                <Form.Label>หมายเหตุ</Form.Label>
                <Form.Control as="textarea" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
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

export default NonMotorPolicies;
