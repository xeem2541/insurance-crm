import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { TableSkeleton } from '../components/TableSkeleton';
import { tableContainerVariants, tableRowVariants } from '../utils/animationVariants';
import { motion } from 'framer-motion';
import CustomerFormModal from '../components/CustomerFormModal';
import { exportToExcel } from '../utils/exportUtils';

const Customers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => sessionStorage.getItem('customersSearch') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedMonth, setSelectedMonth] = useState(() => sessionStorage.getItem('customersMonth') || ''); // Month filter
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  
  // Debounce search input (300ms)
  useEffect(() => {
    sessionStorage.setItem('customersSearch', search);
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  const prefixes = ['นาย', 'นาง', 'นางสาว', 'บริษัท', 'หจก.', 'คุณ'];

  const handleExport = () => {
    const dataToExport = customers.map(c => ({
      'รหัสลูกค้า': c.customer_code,
      'คำนำหน้า': c.prefix,
      'ชื่อ': c.first_name,
      'นามสกุล': c.last_name,
      'เลขบัตรประชาชน': c.id_card_no,
      'เบอร์โทรศัพท์': c.phone,
      'เบอร์โทรศัพท์สำรอง': c.alt_phone || '',
      'Line ID': c.line_id || '',
      'Facebook': c.facebook || '',
      'วันเกิด': c.dob ? c.dob.split('T')[0] : '',
      'อายุ': c.age || '',
      'ที่อยู่': c.address || '',
      'ตำบล/แขวง': c.sub_district || '',
      'อำเภอ/เขต': c.district || '',
      'จังหวัด': c.province || '',
      'รหัสไปรษณีย์': c.zipcode || '',
      'สถานะลูกค้า': c.customer_status,
      'สถานะ Lead': c.lead_status,
      'ที่มา': c.source || '',
      'วันที่สร้าง': c.created_at ? c.created_at.split('T')[0] : ''
    }));

    exportToExcel(dataToExport, 'Customers', 'customers_export.xlsx');
  };

  const [formData, setFormData] = useState({
    customer_code: '', prefix: '', first_name: '', last_name: '', id_card_no: '', phone: '', alt_phone: '', 
    line_id: '', facebook: '', dob: '', age: '', address: '', sub_district: '', district: '', province: '', zipcode: '',
    secondary_contact: '', customer_status: 'ลูกค้าใหม่', lead_status: 'สนใจ', source: '', note: ''
  });

  // Reset page when search or month changes
  useEffect(() => {
    setPage(1);
    sessionStorage.setItem('customersMonth', selectedMonth);
  }, [search, selectedMonth]);

  // Fetch Customers and Master Data
  const { data, isLoading: loading } = useQuery({
    queryKey: ['customers', debouncedSearch, selectedMonth, page],
    queryFn: async () => {
      const [custRes, mdRes] = await Promise.all([
        api.get(`/customers?search=${encodeURIComponent(debouncedSearch.trim())}&month=${selectedMonth}&page=${page}&limit=50`),
        api.get('/master-data')
      ]);
      const customers = custRes.data?.data || (Array.isArray(custRes.data) ? custRes.data : []);
      const totalPages = custRes.data?.totalPages || 1;
      
      const md = Array.isArray(mdRes.data) ? mdRes.data : (mdRes.data?.data || []);
      const leadSources = md.filter(m => m.category === 'LeadSource').map(m => ({ value: m.value, label: m.value }));
      
      return { customers, totalPages, leadSources };
    }
  });

  const customers = data?.customers || [];
  const totalPages = data?.totalPages || 1;
  const leadSources = data?.leadSources || [];

  const saveMutation = useMutation({
    mutationFn: async (formDataToSave) => {
      if (formDataToSave.id) {
        return await api.put(`/customers/${formDataToSave.id}`, formDataToSave);
      } else {
        return await api.post('/customers', formDataToSave);
      }
    },
    onSuccess: () => {
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
    if (window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่? (หากลูกค้ามีกรมธรรม์ผูกอยู่ จะไม่สามารถลบได้)')) {
      deleteMutation.mutate(id);
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

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h2 className="fw-bold mb-0" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif", color: '#0f172a' }}>
          <i className="bi bi-people-fill me-2" style={{ color: '#3b82f6' }}></i>
          ข้อมูลลูกค้า (CRM)
        </h2>
        <div>
          <button className="btn btn-outline-secondary fw-bold px-3 rounded-3 shadow-sm d-flex align-items-center gap-2" onClick={handleExport}>
            <i className="bi bi-file-earmark-excel-fill text-success"></i> Export Excel
          </button>
          <button className="btn fw-bold px-3 rounded-3 shadow-sm d-flex align-items-center gap-2" onClick={() => { 
            setFormData({
              customer_code: '', prefix: '', first_name: '', last_name: '', phone: '', alt_phone: '', 
              line_id: '', facebook: '', dob: '', age: '', address: '', sub_district: '', district: '', province: '', zipcode: '',
              secondary_contact: '', customer_status: 'ลูกค้าใหม่', lead_status: 'สนใจ', source: '', note: ''
            }); 
            setShowModal(true); 
          }} style={{ background: '#3b82f6', color: 'white', border: 'none' }}>
            <i className="bi bi-person-plus-fill"></i> เพิ่มลูกค้าใหม่
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4 rounded-4" style={{ borderLeft: '4px solid #8b5cf6', background: 'var(--bs-body-bg)' }}>
        <div className="card-body p-3 p-md-4 d-flex gap-3 flex-wrap">
          <div className="position-relative flex-grow-1" style={{ minWidth: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <i className="bi bi-search"></i>
            </span>
            <input 
              type="text" 
              className="form-control form-control-lg ps-5 pe-5 rounded-pill border-secondary-subtle shadow-sm" 
              style={{ fontSize: '1rem' }}
              placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตรประชาชน, ทะเบียนรถ..." 
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
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>
          <div className="d-flex gap-2 align-items-center">
            <input 
              type="month" 
              className="form-control form-control-lg rounded-pill border-secondary-subtle shadow-sm" 
              style={{ maxWidth: '200px', fontSize: '1rem' }}
              value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
          />
          <button className="btn rounded-pill px-4 shadow-sm fw-bold d-flex align-items-center gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ['customers'] })} style={{ background: '#10b981', color: 'white', border: 'none' }}>
              <i className="bi bi-funnel-fill"></i> กรองข้อมูล
            </button>
            {selectedMonth && (
              <button className="btn btn-light rounded-pill border shadow-sm fw-bold text-secondary" onClick={() => setSelectedMonth('')}>
                ล้างค่า
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-hover table-striped align-middle mb-0">
            <thead className="table-light" style={{ borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th className="ps-4 py-3 text-secondary fw-semibold">รหัสลูกค้า</th>
                <th className="py-3 text-secondary fw-semibold">ชื่อ - นามสกุล</th>
                <th className="py-3 text-secondary fw-semibold">ข้อมูลติดต่อ</th>
                <th className="py-3 text-secondary fw-semibold">ทะเบียนรถ</th>
                <th className="py-3 text-secondary fw-semibold text-center">ประเภทประกันภัย</th>
                <th className="py-3 text-secondary fw-semibold text-center">สถานะลูกค้า</th>
                <th className="py-3 text-secondary fw-semibold text-center">สถานะการขาย</th>
                <th className="py-3 text-secondary fw-semibold">ที่มา (Source)</th>
                <th className="pe-4 py-3 text-secondary fw-semibold text-end">จัดการ</th>
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
                {customers.length > 0 ? customers.map(c => (
                  <motion.tr key={c.id} variants={tableRowVariants}>
                    <td className="ps-4"><span className="badge bg-light text-secondary border px-2 py-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.customer_code}</span></td>
                    <td><strong className="text-dark">{c.prefix}{c.first_name} {c.last_name}</strong></td>
                    <td>
                      <div className="small fw-medium text-dark"><i className="bi bi-telephone-fill text-muted me-1"></i> {c.phone}</div>
                      {c.line_id && <div className="small text-success mt-1"><i className="bi bi-line me-1"></i> {c.line_id}</div>}
                    </td>
                    <td><span className="fw-bold text-dark">{c.plate_no || '-'}</span></td>
                    <td className="text-center">{c.motor_type || c.non_motor_type ? <span className={`badge ${c.motor_type ? 'bg-primary' : 'bg-info'} bg-opacity-10 ${c.motor_type ? 'text-primary' : 'text-info'} border ${c.motor_type ? 'border-primary' : 'border-info'}`}>{c.motor_type || c.non_motor_type}</span> : '-'}</td>
                    <td className="text-center">{getStatusBadge(c.customer_status)}</td>
                    <td className="text-center">{getStatusBadge(c.lead_status)}</td>
                    <td className="text-muted">{c.source || '-'}</td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-1">
                        <button className="btn btn-sm btn-light text-primary border shadow-sm" onClick={() => openEdit(c)} title="แก้ไข">
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button className="btn btn-sm btn-light text-danger border shadow-sm" onClick={() => handleDelete(c.id)} title="ลบ">
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan="9">
                      <div className="table-empty-state">
                        <i className="bi bi-inbox empty-icon"></i>
                        <div className="empty-title">ไม่พบข้อมูลลูกค้า</div>
                        <div className="empty-desc">ลองค้นหาด้วยคำค้นอื่น หรือกดปุ่มเพิ่มลูกค้าใหม่ด้านบน</div>
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
          <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="text-muted small fw-semibold">
              แสดงหน้า <span className="text-dark fw-bold">{page}</span> จากทั้งหมด <span className="text-dark fw-bold">{totalPages}</span> หน้า
            </div>
            <div className="btn-group shadow-sm">
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

      <CustomerFormModal
        show={showModal}
        onHide={() => setShowModal(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        prefixes={prefixes}
        leadSources={leadSources}
      />
    </div>
  );
};

export default Customers;
