import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal, Button, Form, Card, Badge, Row, Col } from 'react-bootstrap';
import Select from 'react-select';
import CloudinaryUpload from '../components/CloudinaryUpload';

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
  return `${baseUrl}${path}`;
};

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '', policy_id: '', vehicle_id: '', document_type_id: '', name: '', note: ''
  });
  const [fileUrl, setFileUrl] = useState('');
  const [localFile, setLocalFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/documents?search=${search}`);
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [typeRes, custRes, polRes, vehRes] = await Promise.all([
        api.get('/documents/types').catch(() => ({ data: [] })),
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/policies').catch(() => ({ data: [] })),
        api.get('/vehicles').catch(() => ({ data: [] }))
      ]);
      setDocumentTypes(Array.isArray(typeRes.data) ? typeRes.data : []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      setPolicies(Array.isArray(polRes.data) ? polRes.data : []);
      setVehicles(Array.isArray(vehRes.data) ? vehRes.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleUploadSuccess = (info) => {
    setFileUrl(info.secure_url);
    setFileType(info.format === 'pdf' ? 'application/pdf' : `image/${info.format}`);
    setFileSize(info.bytes);
    if (!formData.name) {
      setFormData({ ...formData, name: info.original_filename });
    }
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      if (!localFile) return alert('กรุณาเลือกไฟล์เอกสารก่อนบันทึก');
      
      const data = new FormData();
      data.append('file', localFile);
      data.append('customer_id', formData.customer_id);
      data.append('policy_id', formData.policy_id || '');
      data.append('vehicle_id', formData.vehicle_id || '');
      data.append('document_type_id', formData.document_type_id);
      data.append('name', formData.name);
      data.append('note', formData.note || '');

      try {
        await api.post('/documents', data);
        setShowUploadModal(false);
        setLocalFile(null);
        setFormData({ customer_id: '', policy_id: '', vehicle_id: '', document_type_id: '', name: '', note: '' });
        fetchDocuments();
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
      }
    } else {
      if (!fileUrl) return alert('กรุณาอัปโหลดไฟล์ผ่านระบบ Cloudinary ก่อนบันทึก');

      const data = {
        ...formData,
        file_path: fileUrl,
        file_type: fileType,
        file_size: fileSize
      };

      try {
        await api.post('/documents/save-url', data);
        setShowUploadModal(false);
        setFileUrl('');
        setFormData({ customer_id: '', policy_id: '', vehicle_id: '', document_type_id: '', name: '', note: '' });
        fetchDocuments();
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้?')) {
      try {
        await api.delete(`/documents/${id}`);
        fetchDocuments();
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    }
  };

  const openPreview = (doc) => {
    // If it's a Cloudinary URL (starts with http), use it directly. Otherwise use local URL.
    const url = doc.file_path?.startsWith('http') 
      ? doc.file_path 
      : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}${doc.file_path}`;
    setPreviewUrl(url);
    setPreviewType(doc.file_type);
    setShowPreviewModal(true);
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.customer_code} - ${c.first_name} ${c.last_name}` }));
  const policyOptions = policies.filter(p => p.customer_id === formData.customer_id).map(p => ({ value: p.id, label: `${p.policy_no} (${p.type})` }));
  const vehicleOptions = vehicles.filter(v => v.customer_id === formData.customer_id).map(v => ({ value: v.id, label: `${v.plate_no} ${v.plate_province} - ${v.brand}` }));
  const typeOptions = documentTypes.map(t => ({ value: t.id, label: t.name }));

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
        <h2 className="fw-bold">ระบบเอกสาร (Documents)</h2>
        <button className="btn btn-primary fw-bold" onClick={() => setShowUploadModal(true)}>
          <i className="bi bi-cloud-arrow-up-fill me-2"></i> อัปโหลดเอกสาร
        </button>
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
              <h5 className="mb-0 fw-bold text-success" style={{ textShadow: '0 0 10px rgba(0,255,136,0.2)' }}>
                <i className="bi bi-folder2-open me-2 text-warning"></i>
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
                          <Button size="sm" variant="outline-danger" className="px-2 py-1 rounded-pill" onClick={() => handleDelete(d.id)} title="ลบ">
                            <i className="bi bi-trash"></i>
                          </Button>
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

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>อัปโหลดเอกสารใหม่</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSaveDocument}>
            <div className="row g-3">
              <div className="col-md-12">
                <Form.Label>เลือกลูกค้า <span className="text-danger">*</span></Form.Label>
                <Select
                  options={customerOptions}
                  value={customerOptions.find(c => c.value === formData.customer_id)}
                  onChange={option => setFormData({...formData, customer_id: option?.value || '', policy_id: '', vehicle_id: ''})}
                  isClearable
                  required
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ผูกกับกรมธรรม์</Form.Label>
                <Select
                  options={policyOptions}
                  value={policyOptions.find(p => p.value === formData.policy_id)}
                  onChange={option => setFormData({...formData, policy_id: option?.value || ''})}
                  isClearable
                  isDisabled={!formData.customer_id}
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ผูกกับรถยนต์ (รูปรถ)</Form.Label>
                <Select
                  options={vehicleOptions}
                  value={vehicleOptions.find(v => v.value === formData.vehicle_id)}
                  onChange={option => setFormData({...formData, vehicle_id: option?.value || ''})}
                  isClearable
                  isDisabled={!formData.customer_id}
                />
              </div>
              <div className="col-md-12">
                <Form.Label>ประเภทเอกสาร <span className="text-danger">*</span></Form.Label>
                <Select
                  options={typeOptions}
                  value={typeOptions.find(t => t.value === formData.document_type_id)}
                  onChange={option => setFormData({...formData, document_type_id: option?.value || ''})}
                  isClearable
                  required
                />
              </div>
              <div className="col-md-12">
                <Form.Label>ชื่อเอกสารอ้างอิง <span className="text-danger">*</span></Form.Label>
                <Form.Control type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="เช่น ใบเสร็จรับเงิน, รูปรถด้านซ้าย" />
              </div>
              <div className="col-md-12">
                <Form.Label>แนบไฟล์เอกสาร <span className="text-danger">*</span></Form.Label>
                {(() => {
                  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                  if (isLocalhost) {
                    return (
                      <Form.Control 
                        type="file" 
                        required
                        onChange={(e) => {
                          const file = e.target.files[0];
                          setLocalFile(file);
                          if (file && !formData.name) {
                            setFormData({ ...formData, name: file.name.split('.')[0] });
                          }
                        }} 
                      />
                    );
                  } else {
                    return (
                      <div className="d-flex align-items-center">
                        <CloudinaryUpload 
                          onUploadSuccess={handleUploadSuccess} 
                          cloudName="djnuhaq6b" 
                          uploadPreset="unsigned_preset" 
                        />
                        {fileUrl && <span className="ms-3 text-success fw-bold"><i className="bi bi-check-circle-fill"></i> อัปโหลดเรียบร้อยแล้ว</span>}
                      </div>
                    );
                  }
                })()}
              </div>
              <div className="col-12">
                <Form.Label>หมายเหตุ</Form.Label>
                <Form.Control as="textarea" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>
            </div>
            <div className="text-end mt-4 pt-3 border-top">
              <Button variant="secondary" className="me-2" onClick={() => setShowUploadModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="button" onClick={handleSaveDocument} disabled={!fileUrl}><i className="bi bi-save"></i> บันทึกข้อมูล</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

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
