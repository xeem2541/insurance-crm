import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Modal, Button, Card, Badge, Row, Col } from 'react-bootstrap';
import DocumentUploadModal from '../components/DocumentUploadModal';

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const getFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
  const token = localStorage.getItem('token') || '';
  return `${baseUrl}${path}?token=${token}`;
};

const Documents = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'trash'

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '', policy_id: '', vehicle_id: '', document_type_id: '', name: '', note: ''
  });
  const [fileUrl, setFileUrl] = useState('');
  const [localFile, setLocalFile] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', debouncedSearch, viewMode],
    queryFn: async () => {
      const statusParam = viewMode === 'trash' ? '&status=deleted' : '';
      const res = await api.get(`/documents?search=${encodeURIComponent(debouncedSearch.trim())}${statusParam}`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const { data: dependencies = { documentTypes: [], customers: [], policies: [], vehicles: [] } } = useQuery({
    queryKey: ['documentDependencies'],
    queryFn: async () => {
      const [typeRes, custRes, polRes, vehRes] = await Promise.all([
        api.get('/documents/types').catch(() => ({ data: [] })),
        api.get('/customers?all=true').catch(() => ({ data: [] })),
        api.get('/policies?limit=1000').catch(() => ({ data: [] })),
        api.get('/vehicles').catch(() => ({ data: [] }))
      ]);
      return {
        documentTypes: Array.isArray(typeRes.data) ? typeRes.data : (typeRes.data?.data || []),
        customers: Array.isArray(custRes.data) ? custRes.data : (custRes.data?.data || []),
        policies: Array.isArray(polRes.data) ? polRes.data : (polRes.data?.data || []),
        vehicles: Array.isArray(vehRes.data) ? vehRes.data : (vehRes.data?.data || [])
      };
    }
  });

  const { documentTypes, customers, policies, vehicles } = dependencies;

  const saveDocumentMutation = useMutation({
    mutationFn: async (data) => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        const formDataPayload = new FormData();
        formDataPayload.append('file', localFile);
        formDataPayload.append('customer_id', data.customer_id);
        formDataPayload.append('policy_id', data.policy_id || '');
        formDataPayload.append('vehicle_id', data.vehicle_id || '');
        formDataPayload.append('document_type_id', data.document_type_id);
        formDataPayload.append('name', data.name);
        formDataPayload.append('note', data.note || '');
        return await api.post('/documents', formDataPayload);
      } else {
        return await api.post('/documents/save-url', {
          ...data,
          file_path: fileUrl,
          file_type: data.fileType,
          file_size: data.fileSize
        });
      }
    },
    onSuccess: () => {
      setShowUploadModal(false);
      setLocalFile(null);
      setFileUrl('');
      setFormData({ customer_id: '', policy_id: '', vehicle_id: '', document_type_id: '', name: '', note: '' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
    }
  });

  const handleSaveDocument = (e) => {
    e.preventDefault();
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost && !localFile) {
      return alert('กรุณาเลือกไฟล์เอกสารก่อนบันทึก');
    } else if (!isLocalhost && !fileUrl) {
      return alert('กรุณาอัปโหลดไฟล์ผ่านระบบ Cloudinary ก่อนบันทึก');
    }

    saveDocumentMutation.mutate(formData);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
    onError: () => alert('เกิดข้อผิดพลาดในการลบเอกสาร')
  });

  const handleDelete = (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้? (สามารถกู้คืนได้ภายหลัง)')) {
      deleteMutation.mutate(id);
    }
  };

  const restoreMutation = useMutation({
    mutationFn: async (id) => await api.put(`/documents/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
    onError: () => alert('เกิดข้อผิดพลาดในการกู้คืนเอกสาร')
  });

  const handleRestore = (id) => {
    if (window.confirm('ยืนยันการกู้คืนเอกสารนี้กลับสู่ระบบปกติ?')) {
      restoreMutation.mutate(id);
    }
  };

  const openPreview = (doc) => {
    const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    const token = localStorage.getItem('token') || '';
    const url = doc.file_path?.startsWith('http') 
      ? doc.file_path 
      : `${baseUrl}${doc.file_path}?token=${token}`;
    setPreviewUrl(url);
    setPreviewType(doc.file_type);
    setShowPreviewModal(true);
  };

  const safeCustomers = Array.isArray(customers) ? customers : (customers?.data || []);
  const safePolicies = Array.isArray(policies) ? policies : (policies?.data || []);
  const safeVehicles = Array.isArray(vehicles) ? vehicles : (vehicles?.data || []);
  const safeDocumentTypes = Array.isArray(documentTypes) ? documentTypes : (documentTypes?.data || []);

  const customerOptions = safeCustomers.map(c => ({ value: c.id, label: `${c.customer_code || ''} - ${c.first_name || ''} ${c.last_name || ''}`.trim() }));
  const policyOptions = safePolicies.filter(p => p.customer_id === formData.customer_id).map(p => ({ value: p.id, label: `${p.policy_no || ''} (${p.type || ''})` }));
  const vehicleOptions = safeVehicles.filter(v => v.customer_id === formData.customer_id).map(v => ({ value: v.id, label: `${v.plate_no || ''} ${v.plate_province || ''} - ${v.brand || ''}`.trim() }));
  const typeOptions = safeDocumentTypes.map(t => ({ value: t.id, label: t.name }));

  const getGroupedDocuments = () => {
    const groups = {};

    documents.forEach(doc => {
      let groupKey = 'unlinked';
      let title = 'เอกสารทั่วไป / ไม่ผูกกับกรมธรรม์';
      let subtitle = '';
      let policy = null;
      let customer = null;

      if (doc.policy_id) {
        groupKey = `policy-${doc.policy_id}`;
        policy = policies.find(p => p.id === doc.policy_id);
        customer = policy ? customers.find(c => c.id === policy.customer_id) : null;
        
        const comp = policy?.company || 'ไม่ระบุบริษัท';
        const type = policy?.type || 'ไม่ระบุประเภท';
        const polNo = policy?.policy_no ? ` (เลขที่: ${policy.policy_no})` : ' (ยังไม่มีเลขกรมธรรม์)';
        title = `ชุดกรมธรรม์: ${comp} - ${type}${polNo}`;
        subtitle = customer ? `ลูกค้า: ${customer.prefix || ''}${customer.first_name} ${customer.last_name || ''} (${customer.customer_code})` : '';
      } else if (doc.customer_id) {
        groupKey = `customer-${doc.customer_id}`;
        customer = customers.find(c => c.id === doc.customer_id);
        title = customer ? `เอกสารลูกค้า: ${customer.prefix || ''}${customer.first_name} ${customer.last_name || ''} (${customer.customer_code})` : 'เอกสารของลูกค้า';
        subtitle = 'เอกสารส่วนตัวลูกค้า (ไม่ได้ระบุกรมธรรม์)';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          title,
          subtitle,
          files: []
        };
      }
      groups[groupKey].files.push(doc);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.key.startsWith('policy-') && !b.key.startsWith('policy-')) return -1;
      if (!a.key.startsWith('policy-') && b.key.startsWith('policy-')) return 1;
      return 0;
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          {viewMode === 'trash' ? (
            <><i className="bi bi-trash-fill text-danger me-2"></i> ถังขยะเอกสาร (Recycle Bin)</>
          ) : (
            'ระบบเอกสาร (Documents)'
          )}
        </h2>
        <div className="d-flex gap-2">
          {viewMode === 'active' ? (
            <>
              <button className="btn btn-outline-danger fw-bold" onClick={() => setViewMode('trash')}>
                <i className="bi bi-trash-fill me-2"></i> ถังขยะ
              </button>
              <button className="btn btn-primary fw-bold" onClick={() => setShowUploadModal(true)}>
                <i className="bi bi-cloud-arrow-up-fill me-2"></i> อัปโหลดเอกสาร
              </button>
            </>
          ) : (
            <button className="btn btn-outline-primary fw-bold" onClick={() => setViewMode('active')}>
              <i className="bi bi-folder-fill me-2"></i> กลับหน้าระบบเอกสาร
            </button>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <input 
            type="text" 
            className="form-control form-control-lg" 
            placeholder="ค้นหาชื่อเอกสาร, ประเภทเอกสาร, รหัสลูกค้า..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Grouped Document Sets */}
      {getGroupedDocuments().map((group) => (
        <Card key={group.key} className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
          <Card.Header className="bg-dark text-white py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h5 className={`mb-0 fw-bold ${viewMode === 'trash' ? 'text-danger' : 'text-success'}`} style={{ textShadow: viewMode === 'trash' ? '0 0 10px rgba(220,53,69,0.2)' : '0 0 10px rgba(0,255,136,0.2)' }}>
                <i className={`bi bi-folder2-open me-2 ${viewMode === 'trash' ? 'text-danger' : 'text-warning'}`}></i>
                {group.title}
              </h5>
              {group.subtitle && (
                <small className="text-white-50 d-block mt-1">
                  <i className="bi bi-person-fill me-1"></i> {group.subtitle}
                </small>
              )}
            </div>
            <Badge bg="success" className="px-3 py-2 rounded-pill fw-bold">
              {group.files.length} รายการ
            </Badge>
          </Card.Header>
          <Card.Body className="p-4" style={{ backgroundColor: '#fcfcfc' }}>
            <Row className="g-3">
              {group.files.map(d => {
                const isImage = d.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(d.file_path);
                const fileUrl = getFileUrl(d.file_path);
                
                return (
                  <Col key={d.id} xs={12} md={6} xl={4}>
                    <div className="d-flex align-items-center p-3 bg-white rounded-4 border shadow-xs hover-shadow" style={{ transition: 'all 0.2s', height: '100%', minHeight: '130px' }}>
                      {/* Thumbnail Image View */}
                      <div className="me-3 position-relative" style={{ flexShrink: 0 }}>
                        {isImage ? (
                          <img 
                            src={fileUrl} 
                            alt={d.name}
                            className="rounded-3 border object-fit-cover shadow-sm"
                            style={{ width: '80px', height: '110px', cursor: 'pointer' }}
                            onClick={() => openPreview(d)}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/80x110/e0e0e0/808080?text=No+Preview';
                            }}
                          />
                        ) : (
                          <div className="rounded-3 border bg-light d-flex flex-column align-items-center justify-content-center shadow-sm" style={{ width: '80px', height: '110px', color: '#dc3545', cursor: 'pointer' }} onClick={() => openPreview(d)}>
                            <i className="bi bi-file-earmark-pdf-fill fs-1"></i>
                            <span className="small fw-bold text-dark mt-1">PDF</span>
                          </div>
                        )}
                        <span className="position-absolute badge bg-dark text-white rounded-pill px-2 py-1" style={{ bottom: '5px', right: '5px', fontSize: '0.65rem', opacity: 0.8 }}>
                          v.{d.version}
                        </span>
                      </div>

                      {/* File Details & Actions */}
                      <div className="flex-grow-1 min-w-0">
                        <h6 className="mb-1 text-truncate fw-bold text-dark" title={d.name}>{d.name}</h6>
                        <div className="mb-2">
                          <span className="badge bg-light text-dark border me-1" style={{ fontSize: '0.75rem' }}>
                            {d.document_type_name}
                          </span>
                          <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {(d.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        {d.note && (
                          <p className="text-muted small text-truncate mb-2" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                            {d.note}
                          </p>
                        )}
                        <div className="text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                          <div><i className="bi bi-clock me-1"></i> {formatThaiDate(d.created_at)}</div>
                          <div><i className="bi bi-person-circle me-1"></i> {d.uploader_name || 'System'}</div>
                        </div>

                        {/* File Action Buttons */}
                        <div className="d-flex gap-1">
                          <Button size="sm" variant="outline-primary" className="px-2 py-1 rounded-pill" onClick={() => openPreview(d)} title="ดูตัวอย่าง">
                            <i className="bi bi-eye"></i>
                          </Button>
                          <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-sm btn-outline-secondary px-2 py-1 rounded-pill"
                            download
                            title="ดาวน์โหลด"
                          >
                            <i className="bi bi-download"></i>
                          </a>
                          {viewMode === 'trash' ? (
                            <Button size="sm" variant="success" className="px-2 py-1 rounded-pill" onClick={() => handleRestore(d.id)} title="กู้คืนเอกสาร">
                              <i className="bi bi-arrow-counterclockwise"></i> กู้คืน
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline-danger" className="px-2 py-1 rounded-pill" onClick={() => handleDelete(d.id)} title="ย้ายลงถังขยะ">
                              <i className="bi bi-trash"></i>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card.Body>
        </Card>
      ))}

      {documents.length === 0 && (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-folder-x fs-1 text-muted"></i>
          <p className="text-muted mt-2">ไม่พบเอกสารใดๆ ในคลังเอกสาร</p>
        </div>
      )}

      <DocumentUploadModal
        show={showUploadModal}
        onHide={() => setShowUploadModal(false)}
        formData={formData}
        setFormData={setFormData}
        fileUrl={fileUrl}
        setFileUrl={setFileUrl}
        localFile={localFile}
        setLocalFile={setLocalFile}
        handleSaveDocument={handleSaveDocument}
        customerOptions={customerOptions}
        policyOptions={policyOptions}
        vehicleOptions={vehicleOptions}
        typeOptions={typeOptions}
      />

      {/* Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>ตัวอย่างเอกสาร</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center bg-light p-0 d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          {previewType?.includes('pdf') ? (
            <iframe src={previewUrl} title="PDF Viewer" width="100%" height="100%" style={{ border: 'none' }} />
          ) : (
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Documents;
