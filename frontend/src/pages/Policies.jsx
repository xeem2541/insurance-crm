import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { TableSkeleton } from '../components/TableSkeleton';
import { tableContainerVariants, tableRowVariants } from '../utils/animationVariants';
import { motion } from 'framer-motion';
import PolicyFormModal from '../components/PolicyFormModal';
import { exportToExcel } from '../utils/exportUtils';

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543;
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

const Policies = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => sessionStorage.getItem('policiesSearch') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'descending' });

  // Debounce search input (300ms)
  useEffect(() => {
    sessionStorage.setItem('policiesSearch', search);
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const [formData, setFormData] = useState({
    id: null, customer_id: '', vehicle_id: '', plate_no: '', policy_no: '', company: '', type: '', 
    sum_insured: '', net_premium: '', stamp_duty: '', vat: '', total_premium: '',
    commission_percent: '', commission_baht: '', payment_method: '', 
    start_date: '', expiry_date: '', status: 'รอดำเนินการ', sales_person_id: '',
    plate_province: '', vin: '', engine_no: '', tax_expiry: '', prb_start_date: '', prb_expiry_date: '',
    repair_type: 'อู่'
  });

  // Fetch Policies and Master Data
  const { data, isLoading: loading } = useQuery({
    queryKey: ['policies', debouncedSearch, page],
    queryFn: async () => {
      const [polRes, custRes, vehRes, mdRes] = await Promise.all([
        api.get(`/policies?search=${encodeURIComponent(debouncedSearch.trim())}&page=${page}&limit=50`),
        api.get('/customers?all=true'),
        api.get('/vehicles'),
        api.get('/master-data')
      ]);

      const policies = polRes.data?.data || (Array.isArray(polRes.data) ? polRes.data : []);
      const totalPages = polRes.data?.totalPages || 1;
      const customers = Array.isArray(custRes.data) ? custRes.data : (custRes.data?.data || []);
      const vehicles = Array.isArray(vehRes.data) ? vehRes.data : (vehRes.data?.data || []);
      const md = Array.isArray(mdRes.data) ? mdRes.data : (mdRes.data?.data || []);

      const policyTypes = md.filter(m => m.category === 'PolicyType').map(m => ({ value: m.value, label: m.value }));
      const companies = md.filter(m => m.category === 'InsuranceCompany').map(m => ({ value: m.value, label: m.value }));
      const jobStatuses = md.filter(m => m.category === 'JobStatus').map(m => ({ value: m.value, label: m.value }));
      const paymentMethods = md.filter(m => m.category === 'PaymentMethod').map(m => ({ value: m.value, label: m.value }));

      return { policies, totalPages, customers, vehicles, policyTypes, companies, jobStatuses, paymentMethods };
    }
  });

  const policies = React.useMemo(() => data?.policies || [], [data?.policies]);
  const totalPages = data?.totalPages || 1;
  const customers = data?.customers || [];
  const vehicles = data?.vehicles || [];
  const policyTypes = data?.policyTypes || [];
  const companies = data?.companies || [];
  const jobStatuses = data?.jobStatuses || [];
  const paymentMethods = data?.paymentMethods || [];

  const sortedPolicies = React.useMemo(() => {
    let sortablePolicies = [...policies];
    if (sortConfig !== null) {
      sortablePolicies.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'start_date' || sortConfig.key === 'expiry_date') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        } else if (sortConfig.key === 'total_premium' || sortConfig.key === 'commission_baht') {
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

  const handleExport = () => {
    const dataToExport = policies.map(p => ({
      'เลขกรมธรรม์': p.policy_no,
      'ลูกค้า': `${p.first_name} ${p.last_name}`,
      'ทะเบียนรถ': p.plate_no || '-',
      'บริษัทประกัน': p.company,
      'ประเภท': p.type,
      'ประเภทการซ่อม': p.repair_type || 'อู่',
      'เบี้ยรวม': p.total_premium,
      'คอมมิชชั่น': p.commission_baht,
      'วันเริ่มคุ้มครอง': p.start_date ? p.start_date.split('T')[0] : '',
      'วันสิ้นสุด': p.expiry_date ? p.expiry_date.split('T')[0] : '',
      'สถานะ': p.status
    }));

    exportToExcel(dataToExport, 'Policies', 'policies_export.xlsx');
  };

  const saveMutation = useMutation({
    mutationFn: async (formDataToSave) => {
      if (formDataToSave.id) {
        return await api.put(`/policies/${formDataToSave.id}`, formDataToSave);
      } else {
        return await api.post('/policies', formDataToSave);
      }
    },
    onSuccess: () => {
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      deleteMutation.mutate(id);
    }
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
        id: p.id,
        customer_id: p.customer_id,
        vehicle_id: p.vehicle_id || '',
        plate_no: p.plate_no || '',
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
        sales_person_id: p.sales_person_id || '',
        plate_province: p.plate_province || '',
        vin: p.vin || '',
        engine_no: p.engine_no || '',
        tax_expiry: p.tax_expiry ? p.tax_expiry.split('T')[0] : '',
        prb_start_date: p.prb_start_date ? p.prb_start_date.split('T')[0] : '',
        prb_expiry_date: p.prb_expiry_date ? p.prb_expiry_date.split('T')[0] : '',
        repair_type: p.repair_type || 'อู่'
      });
    } else {
      setFormData({
        id: null, customer_id: '', vehicle_id: '', plate_no: '', policy_no: '', company: '', type: '', 
        sum_insured: '', net_premium: '', stamp_duty: '', vat: '', total_premium: '',
        commission_percent: '', commission_baht: '', payment_method: '', 
        start_date: '', expiry_date: '', status: 'รอดำเนินการ', sales_person_id: '',
        plate_province: '', vin: '', engine_no: '', tax_expiry: '', prb_start_date: '', prb_expiry_date: '',
        repair_type: 'อู่'
      });
    }
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    if (status === 'สำเร็จ' || status === 'ชำระครบแล้ว' || status === 'Active') return <span className="badge bg-success">{status}</span>;
    if (status === 'รอดำเนินการ' || status === 'รอถ่ายรูปรถ' || status === 'รอผ่อนชำระ') return <span className="badge bg-warning text-dark">{status}</span>;
    return <span className="badge bg-secondary">{status}</span>;
  };

  const customerOptions = customers.map(c => ({ 
    value: c.id, 
    label: `${c.customer_code || ''} - ${c.first_name || ''} ${c.last_name || ''}`.trim() 
  }));
  const vehicleOptions = vehicles.filter(v => v.customer_id === formData.customer_id).map(v => ({ 
    value: v.id, 
    label: `${v.plate_no || ''} ${v.plate_province && v.plate_province !== 'null' ? v.plate_province : ''} ${v.brand && v.brand !== 'null' ? `- ${v.brand}` : ''}`.trim()
  }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">จัดการข้อมูลกรมธรรม์</h2>
        <div>
          <button className="btn btn-outline-success fw-bold me-2" onClick={handleExport}>
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
            + เพิ่มกรมธรรม์
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="position-relative">
            <input 
              type="text" 
              className="form-control form-control-lg pe-5" 
              placeholder="ค้นหาเลขกรมธรรม์, ชื่อลูกค้า, ทะเบียนรถ, ยี่ห้อ, รุ่น, บริษัทประกัน, เบอร์โทร..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            {search && (
              <button 
                type="button"
                className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted text-decoration-none me-2"
                onClick={() => setSearch('')}
                style={{ fontSize: '1.2rem', padding: '0 8px' }}
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="table-container-enterprise">
        <div className="table-responsive">
          <table className="table table-enterprise align-middle">
            <thead>
              <tr>
                <th>เลขกรมธรรม์</th>
                <th>ลูกค้า</th>
                <th>ทะเบียนรถ</th>
                <th>บริษัทประกัน / ประเภท</th>
                <th>เบี้ยรวม</th>
                <th>คอมมิชชั่น</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('start_date')}>
                  วันเริ่ม - สิ้นสุด {sortConfig.key === 'start_date' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '⇅'}
                </th>
                <th>สถานะ</th>
                <th className="text-end">จัดการ</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={6} columns={9} />
            ) : (
              <motion.tbody
                variants={tableContainerVariants}
                initial="hidden"
                animate="show"
              >
                {sortedPolicies.length > 0 ? sortedPolicies.map(p => (
                  <motion.tr key={p.id} variants={tableRowVariants}>
                    <td><strong>{p.policy_no}</strong></td>
                    <td>{p.first_name} {p.last_name}</td>
                    <td>{p.plate_no ? `${p.plate_no}` : '-'}</td>
                    <td>{p.company}<br/><small className="text-muted">{p.type} {p.repair_type ? `(${p.repair_type})` : ''}</small></td>
                    <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.total_premium)}</td>
                    <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.commission_baht)}</td>
                    <td>{formatThaiDate(p.start_date)} - {formatThaiDate(p.expiry_date)}</td>
                    <td>{getStatusBadge(p.status)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(p)} title="แก้ไข">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger me-2" onClick={() => handleDelete(p.id)} title="ลบ">
                        <i className="bi bi-trash"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" onClick={() => window.open(`/print-policy/${p.id}`, '_blank')} title="พิมพ์ใบเสนอราคา">
                        <i className="bi bi-file-pdf"></i>
                      </button>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan="9">
                      <div className="table-empty-state">
                        <i className="bi bi-inbox empty-icon"></i>
                        <div className="empty-title">ไม่พบข้อมูลกรมธรรม์</div>
                        <div className="empty-desc">ลองค้นหาด้วยคำค้นอื่น หรือกดปุ่มเพิ่มกรมธรรม์ด้านบน</div>
                      </div>
                    </td>
                  </tr>
                )}
              </motion.tbody>
            )}
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <div className="text-muted small">
              แสดงหน้า {page} จากทั้งหมด {totalPages} หน้า
            </div>
            <div className="btn-group">
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <i className="bi bi-chevron-left"></i> ก่อนหน้า
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                ถัดไป <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <PolicyFormModal
        show={showModal}
        onHide={() => setShowModal(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        customerOptions={customerOptions}
        vehicleOptions={vehicleOptions}
        vehicles={vehicles}
        provincesList={provincesList}
        companies={companies}
        policyTypes={policyTypes}
        jobStatuses={jobStatuses}
        paymentMethods={paymentMethods}
        handleCalculate={handleCalculate}
      />
    </div>
  );
};

export default Policies;
