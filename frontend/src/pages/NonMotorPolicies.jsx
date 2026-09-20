import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { TableSkeleton, tableContainerVariants, tableRowVariants } from '../components/TableSkeleton';
import { exportToExcel } from '../utils/exportUtils';
import { motion } from 'framer-motion';
import NonMotorPolicyFormModal from '../components/NonMotorPolicyFormModal';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => sessionStorage.getItem('nonMotorPoliciesSearch') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [showModal, setShowModal] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'descending' });

  // Debounce search input (300ms)
  useEffect(() => {
    sessionStorage.setItem('nonMotorPoliciesSearch', search);
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch non-motor policies and master data
  const { data, isLoading: loading } = useQuery({
    queryKey: ['nonMotorPolicies', debouncedSearch, page],
    queryFn: async () => {
      const [polRes, custRes, typesRes, mdRes] = await Promise.all([
        api.get(`/non-motor-policies?search=${encodeURIComponent(debouncedSearch.trim())}&page=${page}&limit=50`),
        api.get('/customers?all=true'),
        api.get('/non-motor-policies/types'),
        api.get('/master-data')
      ]);

      const policies = polRes.data?.data || (Array.isArray(polRes.data) ? polRes.data : []);
      const totalPages = polRes.data?.totalPages || 1;
      const customers = Array.isArray(custRes.data) ? custRes.data : (custRes.data?.data || []);
      
      const nonMotorTypes = Array.isArray(typesRes.data) ? typesRes.data.map(t => ({ value: t.id, label: t.name })) : [];
      
      const md = Array.isArray(mdRes.data) ? mdRes.data : (mdRes.data?.data || []);
      const companies = md.filter(m => m.category === 'InsuranceCompany').map(m => ({ value: m.value, label: m.value }));
      const jobStatuses = md.filter(m => m.category === 'JobStatus').map(m => ({ value: m.value, label: m.value }));

      return { policies, totalPages, customers, nonMotorTypes, companies, jobStatuses };
    }
  });

  const policies = data?.policies || [];
  const totalPages = data?.totalPages || 1;
  const customers = data?.customers || [];
  const nonMotorTypes = data?.nonMotorTypes || [];
  const companies = data?.companies || [];
  const jobStatuses = data?.jobStatuses || [];

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

  const handleExport = () => {
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

    exportToExcel(dataToExport, 'NonMotorPolicies', 'non_motor_policies.xlsx');
  };

  const handleOpenModal = (p = null) => {
    setInitialData(p);
    setShowModal(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/non-motor-policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nonMotorPolicies'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  });

  const handleDelete = (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'สำเร็จ' || status === 'ชำระครบแล้ว' || status === 'Active') return <span className="badge bg-success">{status}</span>;
    if (status === 'รอดำเนินการ') return <span className="badge bg-warning text-dark">{status}</span>;
    return <span className="badge bg-secondary">{status}</span>;
  };

  const customerOptions = customers.map(c => ({ 
    value: c.id, 
    label: `${c.customer_code || ''} - ${c.first_name || ''} ${c.last_name || ''}`.trim() 
  }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">จัดการกรมธรรม์ Non-Motor (ประกันวินาศภัยอื่น)</h2>
        <div>
          <button className="btn btn-outline-success fw-bold me-2" onClick={handleExport}>
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
            + เพิ่มกรมธรรม์ Non-Motor
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="position-relative">
            <input 
              type="text" 
              className="form-control form-control-lg pe-5" 
              placeholder="ค้นหาเลขกรมธรรม์, ชื่อลูกค้า, ผู้เอาประกัน, บริษัทประกัน, ประเภทประกัน, เบอร์โทร..." 
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
                <th>ลูกค้า / ผู้เอาประกัน</th>
                <th>ประเภทประกัน / บริษัท</th>
                <th>ทุนประกัน</th>
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
                    <td>{p.first_name} {p.last_name}<br/><small className="text-muted">{p.insured_name}</small></td>
                    <td>{p.type_name}<br/><small className="text-muted">{p.company}</small></td>
                    <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.sum_insured)}</td>
                    <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.total_premium)}</td>
                    <td>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.commission_baht)}</td>
                    <td>{formatThaiDate(p.start_date)} - {formatThaiDate(p.expiry_date)}</td>
                    <td>{getStatusBadge(p.status)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(p)} title="แก้ไข">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)} title="ลบ" disabled={deleteMutation.isPending}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan="9">
                      <div className="table-empty-state">
                        <i className="bi bi-inbox empty-icon"></i>
                        <div className="empty-title">ไม่พบข้อมูลกรมธรรม์ Non-Motor</div>
                        <div className="empty-desc">ลองค้นหาด้วยคำค้นอื่น หรือกดปุ่มเพิ่มกรมธรรม์ Non-Motor ด้านบน</div>
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

      <NonMotorPolicyFormModal
        show={showModal}
        onHide={() => setShowModal(false)}
        initialData={initialData}
        customerOptions={customerOptions}
        nonMotorTypes={nonMotorTypes}
        companies={companies}
        jobStatuses={jobStatuses}
      />
    </div>
  );
};

export default NonMotorPolicies;
