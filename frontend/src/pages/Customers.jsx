import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';
import { TableSkeleton, tableContainerVariants, tableRowVariants } from '../components/TableSkeleton';
import { motion } from 'framer-motion';
import CustomerFormModal from '../components/CustomerFormModal';

import * as XLSX from 'xlsx';

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

  const exportToExcel = () => {
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

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "customers_export.xlsx");
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">ข้อมูลลูกค้า (CRM)</h2>
        <div>
          <button className="btn btn-outline-success fw-bold me-2" onClick={exportToExcel}>
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button className="btn btn-primary fw-bold" onClick={() => { 
            setFormData({
              customer_code: '', prefix: '', first_name: '', last_name: '', phone: '', alt_phone: '', 
              line_id: '', facebook: '', dob: '', age: '', address: '', sub_district: '', district: '', province: '', zipcode: '',
              secondary_contact: '', customer_status: 'ลูกค้าใหม่', lead_status: 'สนใจ', source: '', note: ''
            }); 
            setShowModal(true); 
          }}>
            + เพิ่มลูกค้าใหม่
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body d-flex gap-2 flex-wrap">
          <div className="position-relative flex-grow-1" style={{ minWidth: '200px' }}>
            <input 
              type="text" 
              className="form-control form-control-lg pe-5" 
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
                ✕
              </button>
            )}
          </div>
          <input 
            type="month" 
            className="form-control form-control-lg" 
            style={{ maxWidth: '200px' }}
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
          />
          <button className="btn btn-success fw-bold px-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}>
            <i className="bi bi-funnel-fill"></i> กรองข้อมูล
          </button>
          {selectedMonth && (
            <button className="btn btn-outline-secondary fw-bold" onClick={() => setSelectedMonth('')}>
              ล้างค่า
            </button>
          )}
        </div>
      </div>

      <div className="table-container-enterprise">
        <div className="table-responsive">
          <table className="table table-enterprise align-middle">
            <thead>
              <tr>
                <th>รหัสลูกค้า</th>
                <th>ชื่อ - นามสกุล</th>
                <th>ข้อมูลติดต่อ</th>
                <th>ทะเบียนรถ</th>
                <th>ประเภทประกันภัย</th>
                <th>สถานะลูกค้า</th>
                <th>สถานะการขาย</th>
                <th>ที่มา (Source)</th>
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
                {customers.length > 0 ? customers.map(c => (
                  <motion.tr key={c.id} variants={tableRowVariants}>
                    <td><span className="badge bg-secondary">{c.customer_code}</span></td>
                    <td><strong>{c.prefix}{c.first_name} {c.last_name}</strong></td>
                    <td>
                      <div className="small"><i className="bi bi-telephone-fill text-muted"></i> {c.phone}</div>
                      {c.line_id && <div className="small text-success"><i className="bi bi-line"></i> {c.line_id}</div>}
                    </td>
                    <td><span className="fw-bold">{c.plate_no || '-'}</span></td>
                    <td>{c.motor_type || c.non_motor_type ? <span className={`badge ${c.motor_type ? 'bg-primary' : 'bg-info'}`}>{c.motor_type || c.non_motor_type}</span> : '-'}</td>
                    <td>{getStatusBadge(c.customer_status)}</td>
                    <td>{getStatusBadge(c.lead_status)}</td>
                    <td>{c.source || '-'}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(c)} title="แก้ไข">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)} title="ลบ">
                        <i className="bi bi-trash"></i>
                      </button>
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
